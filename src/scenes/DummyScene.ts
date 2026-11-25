// カカシで試し撃ち: 今の配置で連鎖を何度でも発火できる（時間制限なし、戦利品なし）
// 一連鎖あたりの総ダメージ、持続時間（無防備の長さ）、加算される防御値を表示する
import Phaser from 'phaser';
import { SIM } from '../config/balance';
import { BASE_HERO_STATS, Combat, type CombatEvent } from '../core/combat';
import { heroStats, itemMap } from '../core/economy';
import type { ItemInstance, Loadout } from '../core/types';
import { boardCharmSlots } from '../core/charmSave';
import { activeBoardId } from '../core/boardSave';
import { runMastery } from '../core/mastery';
import { featureRules, runFeatures } from '../core/runRules';
import { getBoard } from '../data/boards';
import { CharmStrip, charmStepLabel } from '../ui/charmStrip';
import { REGIONS } from '../data/regions';
import { sfx, sfxChainStep, sfxCombo } from '../audio/sfx';
import { devRage } from '../platform/debug';
import { hapticMedium } from '../platform/haptics';
import { session } from '../platform/session';
import { gameSpeed, getSave } from '../platform/store';
import { chainContext, showItemDetail } from '../ui/itemInfo';
import { BackpackView, unitLabel } from '../ui/backpackView';
import { Button, panel, ribbon } from '../ui/kit/widgets';
import { FieldView } from '../ui/fieldView';
import { DamageNumbers, Effects } from '../ui/pools';
import { getItemDef } from '../data/items';
import { ElementFx } from '../ui/elementFx';
import { getTechnique, type TechniqueDef } from '../data/techniques';
import { scaleMs, techFxFor } from '../data/techFx';
import { auraTier } from '../ui/aura';
import { COLORS, H, RUN_LAYOUT, W, textStyle } from '../ui/theme';
import { t } from '../i18n';

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
  /** The board to try: the board chosen now */
  private board!: Loadout;
  /** The charms on the board's edge and the combo meter (null: no charm slots) */
  private charmStrip: CharmStrip | null = null;

  constructor() {
    super('Dummy');
  }

  create(): void {
    const save = getSave();
    this.items = itemMap(save);
    this.board = save.loadout;
    this.cameras.main.setBackgroundColor(COLORS.bg);
    // The scarecrow plays by a sortie's rules: charms on the edge, the mastery as it is (it does
    // not grow here, and no technique sparks)
    const f = runFeatures('dummy');
    const charms = f.charms !== 'off' ? boardCharmSlots(save, activeBoardId(save)) : undefined;
    const rules = featureRules(f);
    this.combat = new Combat({
      seed: 1,
      regionId: session.regionId ?? REGIONS[0]!.id,
      loadout: this.board,
      items: this.items,
      hero: save ? heroStats(save) : BASE_HERO_STATS,
      mode: 'dummy',
      mastery: runMastery(save),
      ...(rules ? { rules } : {}),
      ...(charms ? { charms } : {}),
    });
    // Development only: an angry dummy, to check the angry boss look
    if (devRage()) for (const e of this.combat.enemies) e.enraged = true;
    this.field = new FieldView(this, session.regionId ?? REGIONS[0]!.id, getSave().look);
    this.field.setAura(auraTier(this.board, this.items));
    this.numbers = new DamageNumbers(this, 60);
    this.effects = new Effects(this, 55);
    this.elementFx = new ElementFx(this, 56, 40, RUN_LAYOUT.footY - 4);
    this.add
      .rectangle(0, RUN_LAYOUT.middleTop, W, H - RUN_LAYOUT.middleTop, 0x120e1a)
      .setOrigin(0, 0)
      .setDepth(40);
    this.view = new BackpackView(
      this,
      RUN_LAYOUT.backpackTop,
      this.board,
      this.items,
      RUN_LAYOUT.cell,
    ).setDepth(41);
    this.charmStrip = charms
      ? new CharmStrip(this, this.view, getBoard(this.board.board), charms, {
          compact: true,
          meterAt: { x: RUN_LAYOUT.heroScreenX, y: RUN_LAYOUT.groundY - 262 },
        }).setDepth(42)
      : null;
    panel(this, W / 2, RUN_LAYOUT.middleTop + 86, W + 20, 176, 'panel').setDepth(40);
    this.add.existing(ribbon(this, W / 2, 50, t('カカシで試し撃ち'), 360).setDepth(70));
    panel(this, 230, RUN_LAYOUT.middleTop + 86, 420, 140, 'inset').setDepth(70);
    this.stats = this.add
      .text(40, RUN_LAYOUT.middleTop + 26, t('「発火」で次の起点を撃つ'), {
        ...textStyle(22),
        lineSpacing: 2,
        // Stay inside the inset panel (x 20..440) when a translation is longer
        wordWrap: { width: 390, useAdvancedWrap: true },
      })
      .setDepth(71);
    new Button(
      this,
      W - 150,
      RUN_LAYOUT.middleTop + 86,
      t('発火'),
      () => {
        if (!this.combat.fireNext()) sfx('error');
      },
      { width: 240, height: 110, fontSize: 40, skin: 'gold', icon: 'swords', silent: true },
    ).setDepth(70);
    new Button(this, 90, 130, t('配置'), () => this.scene.start('Loadout'), {
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
    this.view.setBlinkOrigin(this.combat.chain ? null : (this.combat.nextUnit ?? null));
    this.view.tick(now);
    this.numbers.update((delta / 1000) * speed);
    this.effects.update((delta / 1000) * speed);
  }

  /** バックパックの装備をタップ: 能力の詳細 */
  /** A special technique on the scarecrow (same look as in a run; see RunScene.showTechnique) */
  private showTechnique(tech: TechniqueDef | undefined, enemyId: number): void {
    const e = this.combat.enemies.find((x) => x.id === enemyId);
    const p = e ? this.field.enemyScreenPos(this.combat, e) : null;
    const fx = techFxFor(tech?.id);
    const timing = this.field.heroSpecial(tech?.id, p, gameSpeed());
    const save = getSave();
    const burst = () => {
      if (p) {
        if (fx) this.elementFx.technique(fx.impact, p.x, p.y);
        this.effects.flash(p.x, p.y, fx?.color ?? 0xffffff, 4);
      }
      if (fx) this.field.techFx.screen(fx, save.settings.shake);
    };
    if (timing.landMs > 0) this.field.techFx.after(scaleMs(timing.landMs, gameSpeed()), burst);
    else burst();
    sfx('explode');
  }

  private setupBackpackTap(): void {
    const loadout = this.board;
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
        this.stats.setText(
          t('起点{origin} 発火中…', { origin: unitLabel(this.board, ev.plan.originUids) }),
        );
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
        this.showTechnique(getTechnique(ev.id), ev.enemyId);
      } else if (ev.type === 'charm') {
        this.charmStrip?.pulse(ev.slot, charmStepLabel(ev.op, ev.value));
        this.charmStrip?.showMeter(ev.m);
      } else if (ev.type === 'combo') {
        this.comboLabel.push(t(ev.label));
        sfxCombo(ev.name);
        hapticMedium();
      } else if (ev.type === 'chainEnd') {
        this.charmStrip?.hideMeter();
        this.stats.setText(
          [
            t('総ダメージ {n}', { n: Math.round(ev.totalDamage) }),
            t('持続（無防備） {sec}秒', { sec: ev.duration.toFixed(1) }),
            t('防御値 +{n}', { n: Math.round(ev.defenseGain) }),
            this.comboLabel.length ? t('コンボ {list}', { list: this.comboLabel.join(' ') }) : '',
          ]
            .filter(Boolean)
            .join('\n'),
        );
        if (ev.defenseGain > 0) sfx('defense');
      }
    }
  }
}
