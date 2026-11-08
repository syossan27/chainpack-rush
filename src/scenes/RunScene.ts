// 出撃（最大30秒）。core の Combat を固定ステップで進め、出てきたイベントを描画するだけ
import Phaser from 'phaser';
import { RARITY, SIM } from '../config/balance';
import { planChain } from '../core/chain';
import { Combat, type CombatEvent } from '../core/combat';
import { consumableSlots, heroStats, itemMap } from '../core/economy';
import { randomSeed } from '../core/rng';
import type { ItemInstance } from '../core/types';
import { getItemDef, RARITY_NAMES } from '../data/items';
import { getEnemyDef } from '../data/enemies';
import { setAudioSuspended, sfx, sfxChainStep } from '../audio/sfx';
import { debugFps, debugSeed, debugStress } from '../platform/debug';
import { hapticMedium, hapticSuccess } from '../platform/haptics';
import { onAppStateChange } from '../platform/lifecycle';
import { session } from '../platform/session';
import { gameSpeed, getSave } from '../platform/store';
import { chainContext, showItemDetail } from '../ui/itemInfo';
import { BackpackView, originLabel } from '../ui/backpackView';
import { FieldView } from '../ui/fieldView';
import { avatar } from '../ui/kit/chrome';
import { Bar, Pill, RoundButton, icon, panel } from '../ui/kit/widgets';
import { iconKey } from '../data/sprites';
import { getRegion } from '../data/regions';
import { DamageNumbers, Effects } from '../ui/pools';
import { COLORS, H, RUN_LAYOUT, W, textStyle } from '../ui/theme';

const MAX_STEPS_PER_FRAME = 5;
const COMBO_COLOR: Record<string, string> = {
  shock: '#fff060',
  explode: '#ff8030',
  shatter: '#c8f0ff',
};

export class RunScene extends Phaser.Scene {
  private combat!: Combat;
  private items!: Map<string, ItemInstance>;
  private field!: FieldView;
  private view!: BackpackView;
  private numbers!: DamageNumbers;
  private effects!: Effects;
  private acc = 0;
  private paused = false;
  /** 装備の詳細を見ているあいだ止める（一時停止の幕は出さない） */
  private inspecting = false;
  private speed = 1;
  private ending = false;
  private seed = 0;
  private regionId = '';
  private shake = true;
  private readonly stress = debugStress();
  private hud!: {
    timer: Phaser.GameObjects.Text;
    loop: Phaser.GameObjects.Text;
    hp: Bar;
    def: Bar;
    hpText: Phaser.GameObjects.Text;
    defText: Phaser.GameObjects.Text;
    next: Phaser.GameObjects.Text;
    nextBadge: Phaser.GameObjects.Text;
    loot: Pill;
    track: Phaser.GameObjects.Graphics;
    banner: Phaser.GameObjects.Text;
    fps: Phaser.GameObjects.Text | null;
    pause: Phaser.GameObjects.Container;
  };
  private trackKey = '';
  private consumableButtons: { icon: Phaser.GameObjects.Image | null; btn: RoundButton }[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super('Run');
  }

  create(): void {
    const save = getSave();
    this.regionId = session.regionId ?? save.progress.unlocked[0]!;
    this.seed = debugSeed() ?? randomSeed();
    this.items = itemMap(save);
    this.shake = save.settings.shake;
    this.combat = new Combat({
      seed: this.seed,
      regionId: this.regionId,
      loadout: save.loadout,
      items: this.items,
      hero: heroStats(save),
      consumableSlots: consumableSlots(save),
    });
    this.acc = 0;
    this.paused = false;
    this.inspecting = false;
    this.speed = gameSpeed();
    this.ending = false;
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.field = new FieldView(this, this.regionId);
    this.numbers = new DamageNumbers(this, 60);
    this.effects = new Effects(this, 55);

    // 中段・下部の背景（石の額縁）
    this.add
      .rectangle(0, RUN_LAYOUT.middleTop, W, H - RUN_LAYOUT.middleTop, 0x120e1a)
      .setOrigin(0, 0)
      .setDepth(40);
    panel(this, W / 2, RUN_LAYOUT.middleTop + 86, W + 20, 176, 'panel').setDepth(40);
    this.consumableButtons = [];
    this.trackKey = '';
    this.view = new BackpackView(this, RUN_LAYOUT.backpackTop, save.loadout, this.items).setDepth(
      41,
    );
    this.buildHud();
    this.buildConsumables();
    this.setupBackpackTap();

    this.unsubscribe = onAppStateChange((active) => {
      if (!active) this.setPaused(true);
    });
    this.events.once('shutdown', () => {
      this.unsubscribe?.();
      setAudioSuspended(false);
    });
    this.handleEvents(this.combat.drainEvents());
  }

  private buildHud(): void {
    const d = 70;
    // 左上: 顔と HP（その上に防御値のゲージを重ねる）
    panel(this, 168, 58, 316, 96, 'plate').setDepth(d);
    avatar(this, 52, 58, 76).setDepth(d + 1);
    const hp = new Bar(this, 98, 46, 220, 30, 'red').setDepth(d + 1);
    const def = new Bar(this, 98, 34, 220, 14, 'blue').setDepth(d + 2);
    def.setRatio(0);
    const hpText = this.add
      .text(108, 46, '', textStyle(18))
      .setOrigin(0, 0.5)
      .setDepth(d + 3);
    icon(this, 112, 84, 'shield', 1.5).setDepth(d + 1);
    const defText = this.add
      .text(126, 84, '', textStyle(16, '#8ad0ff'))
      .setOrigin(0, 0.5)
      .setDepth(d + 1);
    // 中央上: 残り時間と周回の進み具合
    panel(this, W / 2 + 74, 44, 190, 70, 'plate').setDepth(d);
    const timer = this.add
      .text(W / 2 + 74, 42, "30'00", textStyle(44))
      .setOrigin(0.5)
      .setDepth(d + 1);
    const loop = this.add
      .text(W / 2 + 74, 86, '1周目', textStyle(20, COLORS.gold))
      .setOrigin(0.5, 0)
      .setDepth(d + 1);
    const track = this.add.graphics().setDepth(d + 1);
    // 右上: 戦利品
    const loot = new Pill(this, W - 76, 44, 124, 'chest', '0', COLORS.gold).setDepth(d);
    const banner = this.add
      .text(W / 2, 250, '', textStyle(64, '#ffffff'))
      .setOrigin(0.5)
      .setDepth(d + 5)
      .setAlpha(0);
    const fps = debugFps()
      ? this.add.text(10, 150, '', textStyle(16, COLORS.accentText, false)).setDepth(d + 10)
      : null;
    // 中段右: 次に発火する起点
    panel(this, W - 210, RUN_LAYOUT.middleTop + 86, 240, 116, 'inset').setDepth(d);
    this.add
      .text(W - 316, RUN_LAYOUT.middleTop + 44, '次の連鎖', textStyle(18, COLORS.textDim))
      .setDepth(d + 1);
    const nextBadge = this.add
      .text(W - 300, RUN_LAYOUT.middleTop + 100, '', textStyle(40, '#ffe27a'))
      .setOrigin(0.5)
      .setDepth(d + 1);
    const next = this.add
      .text(W - 262, RUN_LAYOUT.middleTop + 100, '', textStyle(24))
      .setOrigin(0, 0.5)
      .setDepth(d + 1);
    new RoundButton(this, W - 50, RUN_LAYOUT.middleTop + 86, 72, 'pause', null, () =>
      this.setPaused(true),
    ).setDepth(d);
    // 一時停止
    const pause = this.add.container(0, 0).setDepth(3000).setVisible(false);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0, 0).setInteractive();
    shade.on('pointerup', () => this.setPaused(false));
    pause.add([
      shade,
      panel(this, W / 2, H / 2, 460, 260, 'panel'),
      this.add.text(W / 2, H / 2 - 40, '一時停止中', textStyle(48, '#ffe27a')).setOrigin(0.5),
      this.add.text(W / 2, H / 2 + 50, 'タップで再開', textStyle(28)).setOrigin(0.5),
    ]);
    this.hud = {
      timer,
      loop,
      hp,
      def,
      hpText,
      defText,
      next,
      nextBadge,
      loot,
      track,
      banner,
      fps,
      pause,
    };
  }

  private buildConsumables(): void {
    const slots = this.combat.consumables;
    this.add
      .text(30, RUN_LAYOUT.middleTop + 18, '消耗品', textStyle(18, COLORS.textDim))
      .setDepth(70);
    slots.forEach((uid, i) => {
      const x = 74 + i * 96;
      const y = RUN_LAYOUT.middleTop + 96;
      const it = uid ? this.items.get(uid) : undefined;
      const img = it ? this.add.image(0, 0, iconKey(it.defId)).setScale(4) : null;
      const btn = new RoundButton(this, x, y, 88, img, null, () => {
        if (this.paused || this.ending) return;
        if (this.combat.useConsumable(i)) {
          this.consumableButtons[i]!.icon?.destroy();
          this.consumableButtons[i]!.icon = null;
          this.handleEvents(this.combat.drainEvents());
        } else if (this.combat.consumables[i]) {
          sfx('error');
        }
      }).setDepth(70);
      this.consumableButtons.push({ icon: img, btn });
    });
  }

  /** 周回の進み具合: 群れの点 → ボスのドクロ */
  private drawTrack(): void {
    const c = this.combat;
    const groupIds = new Set<number>();
    const alive = new Set<number>();
    for (const e of c.enemies) {
      if (e.loop !== c.loop || e.escort || e.def.boss) continue;
      groupIds.add(e.group);
      if (e.alive) alive.add(e.group);
    }
    const n = getRegion(this.regionId).groups.length;
    const cleared = groupIds.size - alive.size;
    const key = `${c.loop}:${cleared}`;
    if (key === this.trackKey) return;
    this.trackKey = key;
    const g = this.hud.track;
    g.clear();
    const x0 = 360;
    const x1 = 560;
    const y = 140;
    g.fillStyle(0x0c0a12, 0.8);
    g.fillRoundedRect(x0 - 14, y - 12, x1 - x0 + 28, 24, 12);
    const step = (x1 - x0) / n;
    g.fillStyle(0xffd25a, 1);
    g.fillRoundedRect(x0 - 8, y - 5, Math.min(x1 - x0 + 16, cleared * step + 16), 10, 5);
    for (let i = 0; i < n; i++) {
      const done = i < cleared;
      g.fillStyle(done ? 0xffd25a : 0x4a4460, 1);
      g.fillCircle(x0 + i * step, y, 7);
      g.lineStyle(2, 0x0c0a12, 1);
      g.strokeCircle(x0 + i * step, y, 7);
    }
    g.fillStyle(cleared >= n ? 0xe83c3c : 0x6a2030, 1);
    g.fillCircle(x1 + 6, y, 13);
    g.lineStyle(3, 0x0c0a12, 1);
    g.strokeCircle(x1 + 6, y, 13);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x1 + 2, y - 2, 3);
    g.fillCircle(x1 + 10, y - 2, 3);
  }

  /** バックパックの装備をタップ: 止めて能力の詳細を出し、閉じたら再開 */
  private setupBackpackTap(): void {
    const loadout = getSave().loadout;
    const zone = this.add
      .zone(0, RUN_LAYOUT.backpackTop, W, this.view.gridHeight)
      .setOrigin(0, 0)
      .setDepth(45)
      .setInteractive();
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.paused || this.ending || this.inspecting) return;
      if (Math.hypot(p.x - p.downX, p.y - p.downY) > 16) return;
      const uid = loadout.cells[this.view.cellAt(p.x, p.y)];
      const it = uid ? this.items.get(uid) : undefined;
      if (!it) return;
      this.inspecting = true;
      setAudioSuspended(true);
      showItemDetail(this, it, {
        context: chainContext(loadout, this.items, it.uid),
        onClose: () => {
          this.inspecting = false;
          this.acc = 0;
          setAudioSuspended(false);
        },
      });
    });
  }

  private setPaused(p: boolean): void {
    if (this.ending) return;
    this.paused = p;
    this.hud.pause.setVisible(p);
    setAudioSuspended(p);
    this.acc = 0;
  }

  override update(_time: number, delta: number): void {
    const now = this.time.now;
    const halted = this.paused || this.inspecting;
    if (!halted && !this.ending) {
      // ゲームスピード: 1フレームで進める固定ステップの数を倍にする（ルールの秒数は変えない）
      const maxSteps = Math.ceil(MAX_STEPS_PER_FRAME * this.speed);
      this.acc += Math.min((delta / 1000) * this.speed, SIM.fixedStep * maxSteps);
      let n = 0;
      while (this.acc >= SIM.fixedStep && n < maxSteps && !this.combat.ended) {
        this.combat.step();
        this.acc -= SIM.fixedStep;
        n++;
        this.handleEvents(this.combat.drainEvents());
      }
    }
    const dt = halted ? 0 : (delta / 1000) * this.speed;
    // 止めているあいだも UI（詳細カードなど）の動きは通常の速さで動かす
    this.tweens.timeScale = halted ? 1 : this.speed;
    if (this.stress) {
      this.effects.burst(400 + Math.random() * 200, 300 + Math.random() * 150, 0xffffff, 12, 260);
      this.numbers.show(300 + Math.random() * 350, 280 + Math.random() * 180, Math.random() * 3000);
    }
    this.field.update(this.combat, now, halted ? 0 : this.speed);
    this.view.tick(now);
    this.numbers.update(dt);
    this.effects.update(dt);
    this.updateHud();
  }

  private updateHud(): void {
    const c = this.combat;
    const r = c.remaining;
    const sec = Math.floor(r);
    const cs = Math.floor((r - sec) * 100);
    this.hud.timer.setText(`${String(sec).padStart(2, '0')}'${String(cs).padStart(2, '0')}`);
    this.hud.timer.setColor(r < 5 ? COLORS.textWarn : COLORS.text);
    this.hud.loop.setText(
      `${getRegion(this.regionId).name}　${c.loop}周目${this.speed !== 1 ? `　×${this.speed}` : ''}`,
    );
    this.hud.hp.setRatio(c.hp / c.maxHp);
    this.hud.def.setRatio(Math.min(1, c.defense / c.maxHp));
    this.hud.hpText.setText(`${Math.ceil(c.hp)}/${c.maxHp}`);
    this.hud.defText.setText(`防御 ${Math.round(c.defense)}`);
    const nextUid = c.nextOriginUid;
    if (nextUid) {
      const plan = planChain(getSave().loadout, this.items, nextUid);
      const idx = c.originOrder.indexOf(nextUid);
      this.hud.nextBadge.setText(originLabel(idx));
      this.hud.next.setText(
        c.chain ? '連鎖中！' : `${plan.maxStep}段・${plan.duration.toFixed(1)}秒`,
      );
    }
    this.view.setBlinkOrigin(c.chain ? null : nextUid);
    this.hud.loot.setValue(`${c.drops.length}`);
    this.drawTrack();
    if (this.hud.fps) {
      this.hud.fps.setText(
        `FPS ${this.game.loop.actualFps.toFixed(0)}  敵 ${this.field.visibleEnemies}  粒 ${this.effects.activeCount()}  数字 ${this.numbers.activeCount()}  seed ${this.seed}`,
      );
    }
  }

  private showBanner(text: string, color = '#ffffff'): void {
    const b = this.hud.banner;
    this.tweens.killTweensOf(b);
    b.setText(text).setColor(color).setAlpha(1).setScale(0.3).setAngle(-6);
    this.tweens.add({ targets: b, scale: 1, angle: 0, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: b, alpha: 0, y: { from: 250, to: 220 }, delay: 700, duration: 320 });
  }

  private enemyPos(id: number): { x: number; y: number } | null {
    const e = this.combat.enemies.find((x) => x.id === id);
    return e ? this.field.enemyScreenPos(this.combat, e) : null;
  }

  private handleEvents(events: CombatEvent[]): void {
    const now = this.time.now;
    const c = this.combat;
    for (const ev of events) {
      switch (ev.type) {
        case 'loopStart':
          if (ev.loop > 1)
            this.showBanner(`${ev.loop}周目　${getEnemyDef(ev.bossId).name}`, COLORS.gold);
          break;
        case 'chainStart':
          this.field.aimId = ev.aimId;
          sfx('fire');
          break;
        case 'step':
          this.field.aimId = c.chain
            ? (c.chain.exec[ev.index]?.aim ?? this.field.aimId)
            : this.field.aimId;
          this.view.glow(ev.cell, ev.step === null ? COLORS.accent : COLORS.chainLine, now, 450);
          if (ev.fromCell !== null) this.view.flashLine(ev.fromCell, ev.cell, COLORS.chainLine);
          if (ev.step !== null) {
            if (ev.whiff) sfx('whiff');
            else sfxChainStep(ev.step);
          }
          break;
        case 'hit': {
          const p = this.enemyPos(ev.enemyId);
          if (!p) break;
          this.field.flashEnemy(ev.enemyId, now);
          if (ev.nullified) this.numbers.showText(p.x, p.y, '無効', 26, '#a0a0b0');
          else
            this.numbers.show(
              p.x,
              p.y,
              ev.damage,
              ev.combo ? (COMBO_COLOR[ev.combo] ?? '#ffffff') : '#ffffff',
            );
          this.effects.burst(p.x, p.y, 0xffffff, 3, 160);
          sfx('hit');
          break;
        }
        case 'combo': {
          const p = this.enemyPos(ev.enemyId);
          this.showBanner(ev.label, COMBO_COLOR[ev.name] ?? '#ffffff');
          if (p)
            this.effects.burst(
              p.x,
              p.y,
              ev.name === 'explode' ? 0xff8030 : ev.name === 'shock' ? 0xfff060 : 0xc8f0ff,
              24,
              320,
            );
          sfx(ev.name === 'shock' ? 'shock' : ev.name === 'explode' ? 'explode' : 'shatter');
          hapticMedium();
          if (this.shake) {
            this.cameras.main.shake(120, 0.006);
            this.cameras.main.flash(80, 255, 255, 255, false);
          }
          break;
        }
        case 'enemyDeath': {
          const p = this.enemyPos(ev.enemyId);
          if (p && !ev.fled)
            this.effects.burst(
              p.x,
              p.y,
              getEnemyDef(ev.defId).color,
              ev.boss ? 40 : 10,
              ev.boss ? 400 : 220,
            );
          if (!ev.fled) sfx('enemyDown');
          break;
        }
        case 'drop': {
          const p = this.enemyPos(ev.enemyId);
          if (p)
            this.numbers.showText(
              p.x,
              p.y - 40,
              `+${RARITY_NAMES[ev.item.rarity]}`,
              22,
              `#${RARITY[ev.item.rarity].color.toString(16).padStart(6, '0')}`,
            );
          sfx('drop');
          if (ev.item.rarity !== 'common') hapticMedium(); // レア以上の取得
          break;
        }
        case 'heroHit':
          this.field.heroHurt(now);
          if (ev.damage > 0) {
            this.numbers.show(
              RUN_LAYOUT.heroScreenX,
              RUN_LAYOUT.groundY - 140,
              ev.damage,
              '#ff6060',
            );
            sfx('heroHurt');
            if (this.shake) this.cameras.main.shake(80, 0.004);
          }
          break;
        case 'chainEnd':
          this.field.aimId = null;
          if (ev.defenseGain > 0) {
            // 通過した防御装備から光の粒が飛んで防御値バーへ
            for (const cell of ev.defenseCells) {
              const cc = this.view.cellCenter(cell);
              this.effects.absorb(
                cc.x,
                cc.y + RUN_LAYOUT.backpackTop,
                20 + 220 * Math.min(1, c.defense / c.maxHp),
                30,
                COLORS.defense,
                12,
              );
            }
            sfx('defense');
          }
          break;
        case 'bossDefeated':
          this.showBanner('ボス撃破！', COLORS.gold);
          sfx('bossDown');
          hapticSuccess();
          break;
        case 'consumable':
          this.showBanner(getItemDef(ev.defId).name, COLORS.accentText);
          sfx('openRare');
          break;
        case 'runEnd':
          this.finish();
          break;
        default:
          break;
      }
    }
  }

  private finish(): void {
    if (this.ending) return;
    this.ending = true;
    sfx('runEnd');
    const r = this.combat.result();
    session.lastResult = { regionId: this.regionId, result: r, seed: this.seed };
    this.showBanner(
      r.reason === 'dead' ? '力尽きた…' : '撤退！',
      r.reason === 'dead' ? COLORS.textWarn : COLORS.text,
    );
    this.time.delayedCall(1300, () => this.scene.start('Result'));
  }
}
