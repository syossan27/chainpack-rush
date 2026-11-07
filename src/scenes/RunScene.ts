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
import { getSave } from '../platform/store';
import { BackpackView, originLabel } from '../ui/backpackView';
import { Button } from '../ui/button';
import { FieldView } from '../ui/fieldView';
import { ItemIcon } from '../ui/itemIcon';
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
  private ending = false;
  private seed = 0;
  private regionId = '';
  private shake = true;
  private readonly stress = debugStress();
  private hud!: {
    timer: Phaser.GameObjects.Text;
    loop: Phaser.GameObjects.Text;
    hpBar: Phaser.GameObjects.Rectangle;
    defBar: Phaser.GameObjects.Rectangle;
    hpText: Phaser.GameObjects.Text;
    next: Phaser.GameObjects.Text;
    loot: Phaser.GameObjects.Text;
    banner: Phaser.GameObjects.Text;
    fps: Phaser.GameObjects.Text | null;
    pause: Phaser.GameObjects.Container;
  };
  private consumableButtons: { icon: ItemIcon | null; bg: Phaser.GameObjects.Rectangle }[] = [];
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
    this.ending = false;
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.field = new FieldView(this, this.regionId);
    this.numbers = new DamageNumbers(this, 60);
    this.effects = new Effects(this, 55);

    // 中段・下部の背景
    this.add
      .rectangle(0, RUN_LAYOUT.middleTop, W, H - RUN_LAYOUT.middleTop, COLORS.panel)
      .setOrigin(0, 0)
      .setDepth(40);
    this.view = new BackpackView(this, RUN_LAYOUT.backpackTop, save.loadout, this.items).setDepth(
      41,
    );
    this.buildHud();
    this.buildConsumables();

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
    const timer = this.add
      .text(W / 2, 14, "30'00", textStyle(56))
      .setOrigin(0.5, 0)
      .setDepth(d);
    const loop = this.add
      .text(W / 2, 80, '1周目', textStyle(26, COLORS.gold))
      .setOrigin(0.5, 0)
      .setDepth(d);
    this.add
      .rectangle(20, 30, 220, 26, COLORS.hpBack)
      .setOrigin(0, 0.5)
      .setStrokeStyle(3, 0x0c0a12)
      .setDepth(d);
    const hpBar = this.add.rectangle(20, 30, 220, 22, COLORS.hp).setOrigin(0, 0.5).setDepth(d);
    // 防御値バーは HP バーの上に重ねる
    const defBar = this.add
      .rectangle(20, 30, 0, 10, COLORS.defense)
      .setOrigin(0, 0.5)
      .setDepth(d + 1);
    const hpText = this.add.text(24, 48, '', textStyle(20)).setDepth(d);
    const next = this.add
      .text(W - 20, RUN_LAYOUT.middleTop + 24, '', textStyle(24))
      .setOrigin(1, 0)
      .setDepth(d);
    const loot = this.add
      .text(W - 20, 20, '', textStyle(24, COLORS.gold))
      .setOrigin(1, 0)
      .setDepth(d);
    const banner = this.add
      .text(W / 2, 220, '', textStyle(54, '#ffffff'))
      .setOrigin(0.5)
      .setDepth(d + 5)
      .setAlpha(0);
    const fps = debugFps()
      ? this.add.text(10, 90, '', textStyle(18, COLORS.accentText, false)).setDepth(d + 10)
      : null;
    const pause = this.add.container(0, 0).setDepth(3000).setVisible(false);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0, 0).setInteractive();
    shade.on('pointerup', () => this.setPaused(false));
    pause.add([
      shade,
      this.add
        .text(W / 2, H / 2, '一時停止中\nタップで再開', { ...textStyle(48), align: 'center' })
        .setOrigin(0.5),
    ]);
    new Button(this, W - 60, RUN_LAYOUT.middleTop + 150, 'Ⅱ', () => this.setPaused(true), {
      width: 76,
      height: 60,
    }).setDepth(d);
    this.hud = { timer, loop, hpBar, defBar, hpText, next, loot, banner, fps, pause };
  }

  private buildConsumables(): void {
    const slots = this.combat.consumables;
    this.add
      .text(20, RUN_LAYOUT.middleTop + 16, '消耗品', textStyle(20, COLORS.textDim))
      .setDepth(70);
    slots.forEach((uid, i) => {
      const x = 70 + i * 100;
      const y = RUN_LAYOUT.middleTop + 100;
      const bg = this.add
        .rectangle(x, y, 88, 88, COLORS.cell)
        .setStrokeStyle(3, COLORS.cellEdge)
        .setDepth(70)
        .setInteractive();
      const it = uid ? this.items.get(uid) : undefined;
      const icon = it ? new ItemIcon(this, x, y, it, 88).setDepth(71) : null;
      bg.on('pointerup', () => {
        if (this.paused || this.ending) return;
        if (this.combat.useConsumable(i)) {
          icon?.destroy();
          this.consumableButtons[i]!.icon = null;
          this.handleEvents(this.combat.drainEvents());
        } else if (this.combat.consumables[i]) {
          sfx('error');
        }
      });
      this.consumableButtons.push({ icon, bg });
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
    if (!this.paused && !this.ending) {
      this.acc += Math.min(delta / 1000, SIM.fixedStep * MAX_STEPS_PER_FRAME);
      let n = 0;
      while (this.acc >= SIM.fixedStep && n < MAX_STEPS_PER_FRAME && !this.combat.ended) {
        this.combat.step();
        this.acc -= SIM.fixedStep;
        n++;
        this.handleEvents(this.combat.drainEvents());
      }
    }
    const dt = this.paused ? 0 : delta / 1000;
    if (this.stress) {
      this.effects.burst(400 + Math.random() * 200, 300 + Math.random() * 150, 0xffffff, 12, 260);
      this.numbers.show(300 + Math.random() * 350, 280 + Math.random() * 180, Math.random() * 3000);
    }
    this.field.update(this.combat, now);
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
    this.hud.loop.setText(`${c.loop}周目`);
    this.hud.hpBar.width = 220 * (c.hp / c.maxHp);
    this.hud.defBar.width = 220 * Math.min(1, c.defense / c.maxHp);
    this.hud.hpText.setText(
      `HP ${Math.ceil(c.hp)}/${c.maxHp}${c.defense > 0 ? `  防御 ${Math.round(c.defense)}` : ''}`,
    );
    const nextUid = c.nextOriginUid;
    if (nextUid) {
      const plan = planChain(getSave().loadout, this.items, nextUid);
      const idx = c.originOrder.indexOf(nextUid);
      this.hud.next.setText(
        `次: 起点${originLabel(idx)}　${plan.maxStep}段・${plan.duration.toFixed(1)}秒`,
      );
    }
    this.view.setBlinkOrigin(c.chain ? null : nextUid);
    this.hud.loot.setText(c.drops.length > 0 ? `戦利品 ${c.drops.length}` : '');
    if (this.hud.fps) {
      this.hud.fps.setText(
        `FPS ${this.game.loop.actualFps.toFixed(0)}  敵 ${this.field.visibleEnemies}  粒 ${this.effects.activeCount()}  数字 ${this.numbers.activeCount()}  seed ${this.seed}`,
      );
    }
  }

  private showBanner(text: string, color = '#ffffff'): void {
    const b = this.hud.banner;
    this.tweens.killTweensOf(b);
    b.setText(text).setColor(color).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: b, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: b, alpha: 0, delay: 700, duration: 300 });
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
