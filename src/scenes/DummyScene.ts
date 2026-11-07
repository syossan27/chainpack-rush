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
import { getSave } from '../platform/store';
import { BackpackView, originLabel } from '../ui/backpackView';
import { Button } from '../ui/button';
import { FieldView } from '../ui/fieldView';
import { DamageNumbers, Effects } from '../ui/pools';
import { COLORS, H, RUN_LAYOUT, W, textStyle } from '../ui/theme';

export class DummyScene extends Phaser.Scene {
  private combat!: Combat;
  private items!: Map<string, ItemInstance>;
  private field!: FieldView;
  private view!: BackpackView;
  private numbers!: DamageNumbers;
  private effects!: Effects;
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
    this.numbers = new DamageNumbers(this, 60);
    this.effects = new Effects(this, 55);
    this.add
      .rectangle(0, RUN_LAYOUT.middleTop, W, H - RUN_LAYOUT.middleTop, COLORS.panel)
      .setOrigin(0, 0)
      .setDepth(40);
    this.view = new BackpackView(this, RUN_LAYOUT.backpackTop, save.loadout, this.items).setDepth(
      41,
    );
    this.add
      .text(W / 2, 20, 'カカシで試し撃ち', textStyle(36))
      .setOrigin(0.5, 0)
      .setDepth(70);
    this.stats = this.add
      .text(24, RUN_LAYOUT.middleTop + 14, 'ボタンで次の起点を発火', textStyle(24))
      .setDepth(70);
    new Button(
      this,
      W - 130,
      RUN_LAYOUT.middleTop + 130,
      '発火',
      () => {
        if (!this.combat.fireNext()) sfx('error');
      },
      { width: 200, height: 84, fontSize: 34, color: COLORS.ok, silent: true },
    ).setDepth(70);
    new Button(this, 90, 110, '← 配置', () => this.scene.start('Loadout'), {
      width: 150,
      height: 60,
    }).setDepth(70);
  }

  override update(_t: number, delta: number): void {
    const now = this.time.now;
    this.acc += Math.min(delta / 1000, SIM.fixedStep * 5);
    while (this.acc >= SIM.fixedStep) {
      this.combat.step();
      this.acc -= SIM.fixedStep;
      this.handle(this.combat.drainEvents());
    }
    this.field.update(this.combat, now);
    this.view.setBlinkOrigin(this.combat.chain ? null : this.combat.nextOriginUid);
    this.view.tick(now);
    this.numbers.update(delta / 1000);
    this.effects.update(delta / 1000);
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
        this.numbers.show(p.x, p.y, ev.damage, ev.combo ? '#fff060' : '#ffffff');
        this.effects.burst(p.x, p.y, 0xffffff, 3, 160);
        sfx('hit');
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
