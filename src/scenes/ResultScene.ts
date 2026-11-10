// リザルト: 終了理由、到達周回、戦利品の宝箱開封（レアリティの低い順。高いほど派手）、最大連鎖段数、最大ダメージ
import { markDemoDone, runTutorial } from '../ui/tutorial';
import { sfx } from '../audio/sfx';
import { PROGRESS } from '../config/balance';
import { showAchievements } from '../ui/achievementToast';
import { checkAchievements } from '../core/achievements';
import type { AchievementDef } from '../data/achievements';
import Phaser from 'phaser';
import {
  acceptLoot,
  regionStars,
  refillConsumables,
  adRemaining,
  autoSellDrops,
  consumeItems,
  doubleLoot,
  recordAd,
  recordRun,
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
/** 戦利品を並べる枠（宝箱の箱の中）。数が多いほどアイコンを小さく、列を増やして収める */
const LOOT_TOP = 652;
const LOOT_BOTTOM = 1026;
const LOOT_WIDTH = W - 50;

export function lootLayout(n: number): {
  icon: number;
  cols: number;
  rowH: number;
  names: boolean;
} {
  for (let icon = 100; icon >= 40; icon -= 4) {
    const cols = Math.max(1, Math.floor(LOOT_WIDTH / (icon + 8)));
    // 小さいときは名前を出さない（重なるので）。名前はタップで見られる
    const names = icon >= 76;
    const rowH = icon + (names ? 34 : 10);
    if (Math.ceil(n / cols) * rowH <= LOOT_BOTTOM - LOOT_TOP) return { icon, cols, rowH, names };
  }
  return { icon: 40, cols: Math.floor(LOOT_WIDTH / 48), rowH: 50, names: false };
}

export class ResultScene extends Phaser.Scene {
  private shake = true;

  constructor() {
    super('Result');
  }

  /** 「NEW RECORD!」のはんこ: ぽんと押されて、少し傾いたまま残る */
  private stamp(x: number, y: number, text: string, delay: number, size = 20): void {
    const t = this.add
      .text(x, y, text, {
        ...textStyle(size, '#ffffff'),
        backgroundColor: '#d8402a',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setAngle(-10)
      .setDepth(20)
      .setAlpha(0)
      .setScale(2.4);
    this.tweens.add({
      targets: t,
      alpha: 1,
      scale: 1,
      delay,
      duration: 220,
      ease: 'Back.easeOut',
      onStart: () => sfx('openEpic'),
    });
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
    const demo = last.demo === true;
    // 撤退の確定: 戦利品をすべて倉庫へ、記録を更新して保存。
    // 体験ラン（借りた伝説の装備）は、倉庫にも記録にも残さない
    let added: ItemInstance[] = [];
    let auto: { uids: string[]; gold: number } = { uids: [], gold: 0 };
    let unlocked: string | null = null;
    let refilled = 0;
    // 記録の更新（このランの前の記録と比べる）
    const prev = {
      step: save.stats.maxStep,
      damage: save.stats.maxDamage,
      loop: save.progress.best[regionId] ?? 0,
      first: save.stats.runs === 0,
      stars: regionStars(save, regionId),
    };
    let achieved: AchievementDef[] = [];
    if (demo) markDemoDone();
    else {
      consumeItems(save, result.usedConsumables);
      added = acceptLoot(save, result.drops);
      // 使い切った消耗品の枠へ、倉庫（今回の戦利品も含む）から同じものを入れ直す
      refilled = refillConsumables(save).length;
      // 自動売却（倉庫で設定したレアリティ以下）
      auto = autoSellDrops(save, added);
      unlocked = recordRun(save, regionId, result).unlocked;
      achieved = checkAchievements(save, result);
    }
    persist();
    session.lastResult = null;

    const dead = result.reason === 'dead';
    // 見出し（傾いて出てくるリボン）
    const title = ribbon(
      this,
      W / 2,
      110,
      demo ? '体験おわり！' : dead ? '力尽きた…' : '撤退！',
      420,
    );
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
    // 自己ベストを更新した記録（初めてのランは、比べるものがないので出さない）
    const newRecord = new Set<string>();
    if (!demo && !prev.first) {
      if (result.stats.maxStep > prev.step) newRecord.add('最大連鎖');
      if (Math.round(result.stats.maxDamage) > prev.damage) newRecord.add('最大ダメージ');
    }
    stats.forEach(([k, v], i) => {
      const x = i % 2 === 0 ? 70 : W / 2 + 20;
      const y = 330 + Math.floor(i / 2) * 52;
      ink(this, x, y, k, 22, '#7a5a30');
      const val = ink(this, x + 270, y - 2, v, 28).setOrigin(1, 0);
      if (newRecord.has(k)) {
        val.setColor('#d8402a');
        this.stamp(x + k.length * 22 + 30, y + 2, 'NEW!', 500 + i * 120, 15);
      }
    });
    if (!demo && !prev.first && result.reachedLoop > prev.loop)
      this.stamp(W / 2 + 200, 220, '自己ベスト！', 400);
    // 地域の★（3・6・10周目のボス撃破）。★ごとに攻撃+3%・最大HP+5
    const gained = demo ? 0 : regionStars(save, regionId) - prev.stars;
    if (gained > 0) {
      this.stamp(W / 2 - 200, 220, `★${gained > 1 ? `×${gained}` : ''}獲得！`, 700);
      this.add
        .text(
          W / 2,
          290,
          `★ボーナス: 攻撃+${Math.round(PROGRESS.starAttack * 100 * gained)}%・最大HP+${PROGRESS.starHp * gained}`,
          textStyle(20, '#ffe27a'),
        )
        .setOrigin(0.5);
    }
    if (achieved.length > 0) showAchievements(this, achieved, 62, 1400);
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
    let lootRibbon = ribbon(this, W / 2, 590, `戦利品 ${added.length}`, 300).setScale(0.8);
    // 戦利品の帯の下の一言（自動売却・もう1回の結果）
    const lootNote = this.add
      .text(
        W / 2,
        624,
        [
          auto.uids.length > 0 ? `自動売却 ${auto.uids.length}個 +${auto.gold}G` : '',
          refilled > 0 ? `消耗品を${refilled}個 補充` : '',
        ]
          .filter(Boolean)
          .join('・'),
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
    const byRarity = (list: ItemInstance[]) =>
      list.slice().sort((a, b) => ORDER[a.rarity] - ORDER[b.rarity]);
    /** first: 開けた状態で並べる分（最初の戦利品）、bonus: 宝箱から開ける広告のご褒美の分 */
    const showLoot = (
      first: ItemInstance[],
      bonus: ItemInstance[],
      sold: readonly string[],
      preopened: boolean,
    ) => {
      reveal?.root.destroy();
      reveal = null;
      const items = [...byRarity(first), ...byRarity(bonus)];
      emptyText.setText(
        items.length === 0
          ? demo
            ? '借りた伝説の装備は、お返ししたよ\n（体験なので戦利品はなし）'
            : '戦利品なし'
          : '',
      );
      if (items.length === 0) return;
      const queue = items;
      const lay = lootLayout(queue.length);
      reveal = new ChestReveal(this, queue, {
        sold: new Set(sold),
        preopened: preopened ? first.length : 0,
        bonus: new Set(bonus.map((i) => i.uid)),
        position: (i) => ({
          x: (W - lay.cols * (lay.icon + 8)) / 2 + (i % lay.cols) * (lay.icon + 8) + lay.icon / 2,
          y: LOOT_TOP + lay.icon / 2 + Math.floor(i / lay.cols) * lay.rowH,
        }),
        iconSize: lay.icon,
        names: lay.names,
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
    showLoot(added, [], auto.uids, false);

    // 報酬つき広告: 戦利品2倍（このリザルトで1回・1日の回数まで。プレミアムは広告なし）
    let doubled = false;
    const extraBtn = new Button(this, W / 2, 1086, '', () => void takeExtra(), {
      width: W - 80,
      height: 58,
      fontSize: 22,
      skin: 'green',
    });
    const refreshExtra = () => {
      const left = adRemaining(save, 'extraLoot');
      extraBtn.setText(
        `${isPremium() ? '' : '▶ 広告を見て'}戦利品を2倍にする（今日あと${left}回）`,
      );
      extraBtn.setVisible(left > 0 && !doubled && added.length > 0);
    };
    let busy = false;
    const takeExtra = async () => {
      if (busy || doubled || adRemaining(save, 'extraLoot') <= 0) return;
      busy = true;
      const ok = await earnReward(this);
      busy = false;
      if (!ok) return;
      recordAd(save, 'extraLoot');
      doubled = true;
      const more = doubleLoot(
        save,
        added.length,
        regionId,
        result.reachedLoop,
        new Rng(randomSeed()),
      );
      const sold = autoSellDrops(save, more);
      persist();
      lootRibbon.destroy();
      lootRibbon = ribbon(
        this,
        W / 2,
        590,
        `戦利品 ${added.length + more.length}（×2）`,
        360,
      ).setScale(0.8);
      lootNote.setText(
        `広告のボーナス +${more.length}個${sold.uids.length > 0 ? `（自動売却 ${sold.uids.length}個 +${sold.gold}G）` : ''}`,
      );
      showLoot(added, more, [...auto.uids, ...sold.uids], true);
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
      block ? '配置へ' : demo ? '自分で出撃' : 'もう一度',
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
    if (demo) {
      runTutorial(this, 'demoEnd', [
        {
          rect: { x: W / 2, y: 408, w: W - 50, h: 216 },
          text: `これが伝説の装備の力！\n最大${result.stats.maxStep}段の連鎖、${Math.round(result.stats.maxDamage)}ダメージ！`,
        },
        {
          rect: { x: W / 2 + 170, y: H - 110, w: 312, h: 112 },
          text: 'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、\nいつかこの姿に！',
        },
      ]);
      return;
    }
    runTutorial(this, 'result', [
      {
        rect: { x: W / 2, y: 850, w: W - 26, h: 424 },
        text: '宝箱から装備をゲット！\n開いたあとにタップすると、能力が見られるよ',
      },
      {
        rect: { x: W / 2 - 170, y: H - 110, w: 312, h: 112 },
        text: '拠点の「配置」で、拾った装備を\nバックパックに置くと強くなるよ',
      },
    ]);
  }
}
