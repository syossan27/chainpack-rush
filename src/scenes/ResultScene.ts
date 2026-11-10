// リザルト: 終了理由、到達周回、戦利品の宝箱開封（レアリティの低い順。高いほど派手）、最大連鎖段数、最大ダメージ
import Phaser from 'phaser';
import {
  acceptLoot,
  adRemaining,
  autoSellDrops,
  consumeItems,
  recordAd,
  recordRun,
  rollExtraLoot,
  sortieBlock,
} from '../core/economy';
import { Rng, randomSeed } from '../core/rng';
import { earnReward, isPremium } from '../platform/monetization';
import type { ItemInstance, Rarity } from '../core/types';
import { getRegion } from '../data/regions';
import { session } from '../platform/session';
import { getSave, persist } from '../platform/store';
import { Button, ink, panel, ribbon } from '../ui/kit/widgets';
import { ChestReveal } from '../ui/chestReveal';
import { showItemDetail } from '../ui/itemInfo';
import { COLORS, H, W, textStyle } from '../ui/theme';

const ORDER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
const ICON = 100;
const COLS = 6;

export class ResultScene extends Phaser.Scene {
  private shake = true;

  constructor() {
    super('Result');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const last = session.lastResult;
    const save = getSave();
    this.shake = save.settings.shake;
    if (!last) {
      this.scene.start('Base');
      return;
    }
    const { result, regionId } = last;
    // 撤退の確定: 戦利品をすべて倉庫へ、記録を更新して保存
    consumeItems(save, result.usedConsumables);
    const added = acceptLoot(save, result.drops);
    // 自動売却（倉庫で設定したレアリティ以下）
    const auto = autoSellDrops(save, added);
    const { unlocked } = recordRun(save, regionId, result);
    persist();
    session.lastResult = null;

    const dead = result.reason === 'dead';
    // 見出し（傾いて出てくるリボン）
    const title = ribbon(this, W / 2, 110, dead ? '力尽きた…' : '撤退！', 420);
    title.setScale(0.3).setAngle(-8);
    this.tweens.add({ targets: title, scale: 1, angle: 0, duration: 380, ease: 'Back.easeOut' });
    this.add
      .text(W / 2, 190, `${getRegion(regionId).name}`, textStyle(28, COLORS.textDim))
      .setOrigin(0.5);
    this.add
      .text(W / 2, 246, `到達 ${result.reachedLoop}周目`, textStyle(56, '#ffe27a'))
      .setOrigin(0.5);
    // 記録（羊皮紙）
    panel(this, W / 2, 408, W - 60, 206, 'paper');
    const stats: [string, string][] = [
      ['ボス撃破', `${result.stats.bossesDefeated}`],
      ['発火', `${result.stats.fires}回`],
      ['最大連鎖', `${result.stats.maxStep}段`],
      ['最大ダメージ', `${Math.round(result.stats.maxDamage)}`],
      ['時間の延長', `+${result.stats.timeGained.toFixed(1)}秒`],
      ['一網打尽', `${result.stats.sweeps}回`],
    ];
    stats.forEach(([k, v], i) => {
      const x = i % 2 === 0 ? 70 : W / 2 + 20;
      const y = 330 + Math.floor(i / 2) * 52;
      ink(this, x, y, k, 22, '#7a5a30');
      ink(this, x + 270, y - 2, v, 28).setOrigin(1, 0);
    });
    if (unlocked) {
      this.add
        .text(
          W / 2,
          530,
          `新しい地域「${getRegion(unlocked).name}」が開放された！`,
          textStyle(28, COLORS.accentText),
        )
        .setOrigin(0.5);
    }
    ribbon(this, W / 2, 590, `戦利品 ${added.length}`, 300).setScale(0.8);
    // 戦利品の帯の下の一言（自動売却・もう1回の結果）
    const lootNote = this.add
      .text(
        W / 2,
        624,
        auto.uids.length > 0 ? `自動売却 ${auto.uids.length}個 +${auto.gold}G` : '',
        textStyle(18, COLORS.gold),
      )
      .setOrigin(0.5);
    panel(this, W / 2, 850, W - 30, 420, 'inset');

    // 宝箱で受け取る: レアリティの低い順に開ける（タップで早送り）
    const hint = this.add
      .text(W / 2, 1036, '', textStyle(20, COLORS.textDim))
      .setOrigin(0.5)
      .setDepth(10);
    let reveal: ChestReveal | null = null;
    const emptyText = this.add.text(W / 2, 760, '', textStyle(28, COLORS.textDim)).setOrigin(0.5);
    const showLoot = (items: ItemInstance[], sold: readonly string[]) => {
      reveal?.root.destroy();
      reveal = null;
      emptyText.setText(items.length === 0 ? '戦利品なし' : '');
      if (items.length === 0) return;
      const queue = items.slice().sort((a, b) => ORDER[a.rarity] - ORDER[b.rarity]);
      reveal = new ChestReveal(this, queue, {
        sold: new Set(sold),
        position: (i) => ({
          x: (W - COLS * (ICON + 8)) / 2 + (i % COLS) * (ICON + 8) + ICON / 2,
          y: 700 + Math.floor(i / COLS) * (ICON + 34),
        }),
        iconSize: ICON,
        shake: this.shake,
        onTapItem: (it) => showItemDetail(this, it),
        onDone: () => hint.setText('タップで能力を確認'),
      });
      hint.setText('タップで早送り');
      reveal.start();
    };
    this.input.on('pointerup', () => {
      if (reveal && !reveal.finished) reveal.fastForward();
    });
    showLoot(added, auto.uids);

    // 報酬つき広告: 戦利品をもう1回（1日の回数まで。プレミアムは広告なし）
    const extraBtn = new Button(this, W / 2, 1086, '', () => void takeExtra(), {
      width: W - 80,
      height: 58,
      fontSize: 22,
      skin: 'green',
    });
    const refreshExtra = () => {
      const left = adRemaining(save, 'extraLoot');
      extraBtn.setText(`${isPremium() ? '' : '▶ 広告を見て'}戦利品をもう1回（今日あと${left}回）`);
      extraBtn.setVisible(left > 0);
    };
    let busy = false;
    const takeExtra = async () => {
      if (busy || adRemaining(save, 'extraLoot') <= 0) return;
      busy = true;
      const ok = await earnReward(this);
      busy = false;
      if (!ok) return;
      recordAd(save, 'extraLoot');
      const more = rollExtraLoot(
        save,
        regionId,
        result.reachedLoop,
        added.length,
        new Rng(randomSeed()),
      );
      const sold = autoSellDrops(save, more);
      persist();
      lootNote.setText(
        `もう1回の戦利品 ${more.length}個${sold.uids.length > 0 ? `（自動売却 ${sold.uids.length}個 +${sold.gold}G）` : ''}`,
      );
      showLoot(more, sold.uids);
      refreshExtra();
    };
    refreshExtra();
    new Button(this, W / 2 - 170, H - 110, '拠点へ', () => this.scene.start('Base'), {
      width: 300,
      height: 100,
      fontSize: 34,
      skin: 'blue',
      icon: 'home',
    });
    // 同じ地域へもう一度。倉庫があふれている・起点がないときは配置画面へ
    session.regionId = regionId;
    const block = sortieBlock(save);
    new Button(
      this,
      W / 2 + 170,
      H - 110,
      block ? '配置へ' : 'もう一度',
      () => this.scene.start(block ? 'Loadout' : 'Run'),
      { width: 300, height: 100, fontSize: 34, skin: 'gold', icon: block ? 'bag' : 'swords' },
    );
    if (block)
      this.add
        .text(
          W / 2 + 170,
          H - 178,
          block === 'storageFull' ? '倉庫があふれています' : '起点がありません',
          textStyle(18, COLORS.textWarn),
        )
        .setOrigin(0.5);
  }
}
