// カカシで試し撃ち: 今の配置で連鎖を何度でも発火できる（時間制限なし、戦利品なし）
// 一連鎖あたりの総ダメージ、持続時間（無防備の長さ）、加算される防御値を表示する
import Phaser from 'phaser';
import { SIM } from '../config/balance';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../core/combat';
import { heroStats, itemMap } from '../core/economy';
import type { ItemInstance } from '../core/types';
import { REGIONS } from '../data/regions';
import { sfx, sfxChainStep } from '../audio/sfx';
import { hapticMedium } from '../platform/haptics';
import { session } from '../platform/session';
import { gameSpeed, getSave } from '../platform/store';
import { chainContext, showItemDetail } from '../ui/itemInfo';
import { BackpackView, originLabel } from '../ui/backpackView';
import { Button, panel, ribbon } from '../ui/kit/widgets';
import { FieldView } from '../ui/fieldView';
import { DamageNumbers, Effects } from '../ui/pools';
import { getItemDef } from '../data/items';
import { ElementFx } from '../ui/elementFx';
import { getTechnique } from '../data/techniques';
import { auraTier } from '../ui/aura';
import { COLORS, H, RUN_LAYOUT, W, textStyle } from '../ui/theme';

export class DummyScene extends Phaser.Scene {
  private combat!: Combat;
  private items!: Map<string, ItemInstance>;
  private field!: FieldView;
  private view!: BackpackView;
  private numbers!: DamageNumbers;
  private effects!: Effects;
  private elementFx!: ElementFx;
  private stats!: Phaser.GameObjects.Text;
  private acc = 0;
  private comboLabel: string[] = [];

  constructor() {
    super('Dummy');
  }

  create(): void {
    const save = getSave();
    this.items = itemMap(save);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.combat = new Combat({
      seed: 1,
      regionId: session.regionId ?? REGIONS[0]!.id,
      loadout: save.loadout,
      items: this.items,
      hero: save ? heroStats(save) : BASE_HERO_STATS,
      mode: 'dummy',
    });
    this.field = new FieldView(this, session.regionId ?? REGIONS[0]!.id);
    this.field.setAura(auraTier(save.loadout, this.items));
    this.numbers = new DamageNumbers(this, 60);
    this.effects = new Effects(this, 55);
    this.elementFx = new ElementFx(this, 56, 40, RUN_LAYOUT.footY - 4);
    this.add
      .rectangle(0, RUN_LAYOUT.middleTop, W, H - RUN_LAYOUT.middleTop, 0x120e1a)
      .setOrigin(0, 0)
      .setDepth(40);
    this.view = new BackpackView(this, RUN_LAYOUT.backpackTop, save.loadout, this.items).setDepth(
      41,
    );
    panel(this, W / 2, RUN_LAYOUT.middleTop + 86, W + 20, 176, 'panel').setDepth(40);
    this.add.existing(ribbon(this, W / 2, 50, 'カカシで試し撃ち', 360).setDepth(70));
    panel(this, 230, RUN_LAYOUT.middleTop + 86, 420, 140, 'inset').setDepth(70);
    this.stats = this.add
      .text(40, RUN_LAYOUT.middleTop + 26, '「発火」で次の起点を撃つ', {
        ...textStyle(22),
        lineSpacing: 2,
      })
      .setDepth(71);
    new Button(
      this,
      W - 150,
      RUN_LAYOUT.middleTop + 86,
      '発火',
      () => {
        if (!this.combat.fireNext()) sfx('error');
      },
      { width: 240, height: 110, fontSize: 40, skin: 'gold', icon: 'swords', silent: true },
    ).setDepth(70);
    new Button(this, 90, 130, '配置', () => this.scene.start('Loadout'), {
      width: 150,
      height: 64,
      skin: 'gray',
      icon: 'back',
    }).setDepth(70);
    this.setupBackpackTap();
  }

  override update(_t: number, delta: number): void {
    const now = this.time.now;
    const speed = gameSpeed();
    this.tweens.timeScale = speed;
    this.acc += Math.min((delta / 1000) * speed, SIM.fixedStep * Math.ceil(5 * speed));
    while (this.acc >= SIM.fixedStep) {
      this.combat.step();
      this.acc -= SIM.fixedStep;
      this.handle(this.combat.drainEvents());
    }
    this.field.update(this.combat, now, speed);
    this.view.setBlinkOrigin(this.combat.chain ? null : this.combat.nextOriginUid);
    this.view.tick(now);
    this.numbers.update((delta / 1000) * speed);
    this.effects.update((delta / 1000) * speed);
  }

  /** バックパックの装備をタップ: 能力の詳細 */
  private setupBackpackTap(): void {
    const loadout = getSave().loadout;
    const zone = this.add
      .zone(0, RUN_LAYOUT.backpackTop, W, this.view.gridHeight)
      .setOrigin(0, 0)
      .setDepth(45)
      .setInteractive();
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (Math.hypot(p.x - p.downX, p.y - p.downY) > 16) return;
      const uid = loadout.cells[this.view.cellAt(p.x, p.y)];
      const it = uid ? this.items.get(uid) : undefined;
      if (it) showItemDetail(this, it, { context: chainContext(loadout, this.items, it.uid) });
    });
  }

  private handle(events: CombatEvent[]): void {
    const now = this.time.now;
    for (const ev of events) {
      if (ev.type === 'chainStart') {
        this.comboLabel = [];
        sfx('fire');
        this.stats.setText(`起点${originLabel(ev.originIndex)} 発火中…`);
      } else if (ev.type === 'step') {
        this.view.glow(ev.cell, ev.step === null ? COLORS.accent : COLORS.chainLine, now, 450);
        if (ev.fromCell !== null) this.view.flashLine(ev.fromCell, ev.cell, COLORS.chainLine);
        if (ev.step !== null) sfxChainStep(ev.step);
      } else if (ev.type === 'hit') {
        const e = this.combat.enemies.find((x) => x.id === ev.enemyId);
        if (!e) continue;
        const p = this.field.enemyScreenPos(this.combat, e);
        this.field.flashEnemy(e.id, now);
        this.numbers.show(p.x, p.y, ev.damage, ev.combo ? '#fff060' : undefined, ev.crit, ev.step);
        this.effects.burst(p.x, p.y, 0xffffff, 3, 160);
        {
          const src = this.items.get(ev.itemUid);
          this.elementFx.hit(
            p.x,
            p.y,
            src ? getItemDef(src.defId).element : 'fire',
            Math.min(1, ev.damage / 200),
            ev.combo,
          );
        }
        sfx('hit');
      } else if (ev.type === 'technique') {
        const t = getTechnique(ev.id);
        const e = this.combat.enemies.find((x) => x.id === ev.enemyId);
        this.field.heroSpecial(0xffe060);
        if (e) {
          const p = this.field.enemyScreenPos(this.combat, e);
          this.elementFx.special(p.x, p.y, t?.element);
          this.effects.flash(p.x, p.y, 0xffffff, 4);
        }
        sfx('explode');
      } else if (ev.type === 'combo') {
        this.comboLabel.push(ev.label);
        sfx(ev.name === 'shock' ? 'shock' : ev.name === 'explode' ? 'explode' : 'shatter');
        hapticMedium();
      } else if (ev.type === 'chainEnd') {
        this.stats.setText(
          [
            `総ダメージ ${Math.round(ev.totalDamage)}`,
            `持続（無防備） ${ev.duration.toFixed(1)}秒`,
            `防御値 +${Math.round(ev.defenseGain)}`,
            this.comboLabel.length ? `コンボ ${this.comboLabel.join(' ')}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        );
        if (ev.defenseGain > 0) sfx('defense');
      }
    }
  }
}
