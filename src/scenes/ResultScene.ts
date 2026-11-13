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
import { Button, fitText, ink, panel, ribbon } from '../ui/kit/widgets';
import { ChestReveal } from '../ui/chestReveal';
import { showItemDetail } from '../ui/itemInfo';
import { COLORS, H, W, textStyle } from '../ui/theme';
import { buildShareImage, shareImage } from '../ui/shareCard';
import { shareText, type ShareSummary } from '../core/shareText';
import { itemMap } from '../core/economy';
import { challengeLoadoutOf } from '../core/challengeLoadout';
import { rankScore } from '../core/ranking';
import { ensureName, rankingReady, submitScore } from '../platform/ranking';
import { num, t } from '../i18n';

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
  /** 画面の下に一言 */
  private flash(msg: string): void {
    const txt = fitText(
      this.add
        .text(W / 2, H - 200, msg, textStyle(24, COLORS.gold))
        .setOrigin(0.5)
        .setDepth(2000),
      W - 40,
    );
    this.tweens.add({
      targets: txt,
      alpha: 0,
      delay: 1500,
      duration: 500,
      onComplete: () => txt.destroy(),
    });
  }

  private stamp(x: number, y: number, text: string, delay: number, size = 20, maxW = 260): void {
    const txt = this.add
      .text(x, y, text, {
        ...textStyle(size, '#ffffff'),
        backgroundColor: '#d8402a',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setAngle(-10)
      .setDepth(20)
      .setAlpha(0);
    // Settle at a scale that keeps a long translation compact (the stamp tween starts at 2.4x)
    const fit = Math.min(1, maxW / txt.width);
    txt.setScale(2.4 * fit);
    this.tweens.add({
      targets: txt,
      alpha: 1,
      scale: fit,
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
    const challenge = last.challenge ?? null;
    let challengeBest = false;
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
      loop: regionId === 'endless' ? save.endless.bestLoop : (save.progress.best[regionId] ?? 0),
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
      if (challenge) {
        // 挑戦: 地域の記録・ゴールド・★には数えない。今の期間の自己ベスト（合計ダメージ）だけ
        const score = Math.round(result.stats.totalDamage);
        if (save.challenge.period !== challenge.period)
          save.challenge = { period: challenge.period, best: 0, bestLoop: 0 };
        challengeBest = score > save.challenge.best;
        if (challengeBest)
          save.challenge = { period: challenge.period, best: score, bestLoop: result.reachedLoop };
        save.stats.runs++;
      } else {
        unlocked = recordRun(save, regionId, result).unlocked;
        achieved = checkAchievements(save, result);
      }
    }
    persist();
    session.lastResult = null;

    const dead = result.reason === 'dead';
    // 見出し（傾いて出てくるリボン）
    const title = ribbon(
      this,
      W / 2,
      110,
      t(demo ? '体験おわり！' : dead ? '力尽きた…' : '撤退！'),
      420,
    );
    title.setScale(0.3).setAngle(-8);
    this.tweens.add({ targets: title, scale: 1, angle: 0, duration: 380, ease: 'Back.easeOut' });
    // ランキング: シーズンの自己ベストなら送る（Firebase の設定が入るまでは何もしない）
    const sub = last.submission;
    if (sub && rankingReady()) {
      const key = `${sub.mode}-${sub.season}`;
      const score = rankScore(sub.mode, {
        totalDamage: result.stats.totalDamage,
        reachedLoop: result.reachedLoop,
      });
      if (score > (save.rankSent[key] ?? -1)) {
        void ensureName(save)
          .then(() => submitScore(sub))
          .then((res) => {
            if (res === 'best' || res === 'kept') {
              save.rankSent[key] = Math.max(score, save.rankSent[key] ?? -1);
              persist();
            }
            if (res === 'best' && this.scene.isActive()) this.flash(t('ランキングに記録しました'));
          });
      }
    }
    // 結果を画像にして共有（体験ランは借りた装備なので出さない）
    if (!demo) {
      // Names stay as data keys: the share card and share text translate them
      const summary: ShareSummary = {
        regionName: getRegion(regionId).name,
        reachedLoop: result.reachedLoop,
        maxStep: result.stats.maxStep,
        maxDamage: result.stats.maxDamage,
        totalDamage: result.stats.totalDamage,
        ...(challenge ? { challengeName: challenge.name } : {}),
        endless: regionId === 'endless',
      };
      let sharing = false;
      new Button(
        this,
        W - 72,
        110,
        t('シェア'),
        () => {
          if (sharing) return;
          sharing = true;
          void (async () => {
            const blob = await buildShareImage(
              this,
              summary,
              challenge ? challengeLoadoutOf(save) : save.loadout,
              itemMap(save),
            );
            const res = blob ? await shareImage(blob, shareText(summary)) : 'failed';
            sharing = false;
            if (res === 'saved') this.flash(t('画像を保存しました（文はコピー済み）'));
            else if (res === 'failed' && !blob) this.flash(t('画像を作れませんでした'));
          })();
        },
        { width: 120, height: 60, fontSize: 22, skin: 'blue' },
      );
    }
    const regionName = t(getRegion(regionId).name);
    fitText(
      this.add
        .text(
          W / 2,
          190,
          challenge
            ? t('挑戦「{name}」・{region}', { name: t(challenge.name), region: regionName })
            : regionName,
          textStyle(28, COLORS.textDim),
        )
        .setOrigin(0.5),
      W - 40,
    );
    fitText(
      this.add
        .text(
          W / 2,
          246,
          challenge
            ? t('スコア {score}', { score: num(result.stats.totalDamage) })
            : t('到達 {loop}周目', { loop: result.reachedLoop }),
          textStyle(56, '#ffe27a'),
        )
        .setOrigin(0.5),
      W - 40,
    );
    // 記録（羊皮紙）
    panel(this, W / 2, 408, W - 60, 206, 'paper');
    // 自己ベストを更新した記録（初めてのランは、比べるものがないので出さない）
    const comparable = !demo && !challenge && !prev.first;
    const stats: { label: string; value: string; isNew: boolean }[] = [
      { label: t('ボス撃破'), value: `${result.stats.bossesDefeated}`, isNew: false },
      {
        label: t('発火|stat'),
        value: t('{n}回', { n: result.stats.fires }),
        isNew: false,
      },
      {
        label: t('最大連鎖'),
        value: t('{n}連鎖', { n: result.stats.maxStep }),
        isNew: comparable && result.stats.maxStep > prev.step,
      },
      {
        label: t('最大ダメージ'),
        value: `${Math.round(result.stats.maxDamage)}`,
        isNew: comparable && Math.round(result.stats.maxDamage) > prev.damage,
      },
      { label: t('ゴールド'), value: `+${result.stats.gold ?? 0}G`, isNew: false },
      {
        label: t('一網打尽'),
        value: t('{n}回', { n: result.stats.sweeps }),
        isNew: false,
      },
    ];
    stats.forEach(({ label, value, isNew }, i) => {
      const x = i % 2 === 0 ? 70 : W / 2 + 20;
      const y = 330 + Math.floor(i / 2) * 52;
      const val = ink(this, x + 270, y - 2, value, 28).setOrigin(1, 0);
      // The label shares the column with the right-aligned value
      const lbl = fitText(ink(this, x, y, label, 22, '#7a5a30'), 270 - val.width - 12);
      if (isNew) {
        val.setColor('#d8402a');
        // Right after the label (measured, so it follows translated labels too)
        this.stamp(x + lbl.displayWidth + 30, y + 2, 'NEW!', 500 + i * 120, 15);
      }
    });
    if (challenge ? challengeBest : !demo && !prev.first && result.reachedLoop > prev.loop)
      this.stamp(W / 2 + 200, 220, t('自己ベスト！'), 400);
    // 地域の★（3・6・10周目のボス撃破）。★ごとに攻撃+3%・最大HP+5
    const gained = demo || challenge ? 0 : regionStars(save, regionId) - prev.stars;
    if (gained > 0) {
      this.stamp(
        W / 2 - 200,
        220,
        gained > 1 ? t('★×{n}獲得！', { n: gained }) : t('★獲得！'),
        700,
      );
      fitText(
        this.add
          .text(
            W / 2,
            290,
            t('★ボーナス: 攻撃+{atk}%・最大HP+{hp}', {
              atk: Math.round(PROGRESS.starAttack * 100 * gained),
              hp: PROGRESS.starHp * gained,
            }),
            textStyle(20, '#ffe27a'),
          )
          .setOrigin(0.5),
        W - 40,
      );
    }
    if (achieved.length > 0) showAchievements(this, achieved, 62, 1400);
    if (unlocked) {
      fitText(
        this.add
          .text(
            W / 2,
            530,
            t('新しい地域「{region}」が開放された！', { region: t(getRegion(unlocked).name) }),
            textStyle(28, COLORS.accentText),
          )
          .setOrigin(0.5),
        W - 40,
      );
    }
    let lootRibbon = ribbon(this, W / 2, 590, t('戦利品 {n}', { n: added.length }), 300).setScale(
      0.8,
    );
    // 戦利品の帯の下の一言（自動売却・もう1回の結果）
    const lootNote = fitText(
      this.add
        .text(
          W / 2,
          624,
          [
            auto.uids.length > 0
              ? t('自動売却 {n}個 +{gold}G', { n: auto.uids.length, gold: auto.gold })
              : '',
            refilled > 0 ? t('消耗品を{n}個 補充', { n: refilled }) : '',
          ]
            .filter(Boolean)
            .join(t('・|sep')),
          textStyle(18, COLORS.gold),
        )
        .setOrigin(0.5),
      W - 40,
    );
    panel(this, W / 2, 850, W - 30, 420, 'inset');

    // 宝箱で受け取る: レアリティの低い順に開ける（タップで早送り）
    const hint = this.add
      .text(W / 2, 1036, '', textStyle(20, COLORS.textDim))
      .setOrigin(0.5)
      .setDepth(10);
    let reveal: ChestReveal | null = null;
    const emptyText = this.add
      .text(W / 2, 760, '', {
        ...textStyle(28, COLORS.textDim),
        wordWrap: { width: W - 80, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
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
      // One key per line: each line is a complete statement on its own
      const best = num(save.challenge.best);
      emptyText.setText(
        items.length === 0
          ? demo
            ? t('借りた伝説の装備は、お返ししたよ\n（体験なので戦利品はなし）')
            : challenge
              ? [
                  t('挑戦「{name}」', { name: t(challenge.name) }),
                  t('スコア（合計ダメージ） {score}', { score: num(result.stats.totalDamage) }),
                  challengeBest
                    ? t('自己ベスト {best}（更新！）', { best })
                    : t('自己ベスト {best}', { best }),
                ].join('\n')
              : regionId === 'endless'
                ? [
                    t('エンドレスは装備が出ません'),
                    t('自己ベスト {loop}周目・ダメージ {damage}', {
                      loop: save.endless.bestLoop,
                      damage: num(save.endless.bestDamage),
                    }),
                  ].join('\n')
                : t('戦利品なし')
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
        onDone: () => fitText(hint.setScale(1).setText(t('タップで能力を確認')), W - 40),
      });
      fitText(hint.setScale(1).setText(t('タップで早送り')), W - 40);
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
        isPremium()
          ? t('戦利品を2倍にする（今日あと{n}回）', { n: left })
          : t('▶ 広告を見て戦利品を2倍にする（今日あと{n}回）', { n: left }),
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
        t('戦利品 {n}（×2）', { n: added.length + more.length }),
        360,
      ).setScale(0.8);
      fitText(
        lootNote.setScale(1).setText(
          sold.uids.length > 0
            ? t('広告のボーナス +{n}個（自動売却 {sold}個 +{gold}G）', {
                n: more.length,
                sold: sold.uids.length,
                gold: sold.gold,
              })
            : t('広告のボーナス +{n}個', { n: more.length }),
        ),
        W - 40,
      );
      showLoot(added, more, [...auto.uids, ...sold.uids], true);
      refreshExtra();
    };
    refreshExtra();
    // After a challenge run, go back to the challenge page
    const toBase = () => this.scene.start('Base', challenge ? { page: 'challenge' } : {});
    new Button(this, W / 2 - 170, H - 110, t('拠点へ'), toBase, {
      width: 300,
      height: 100,
      fontSize: 34,
      skin: 'blue',
      icon: 'home',
    });
    // 同じ地域へもう一度。倉庫があふれている・起点がないときは配置画面へ
    // 挑戦は地域を覚えない（開放していない地域のこともある）。「もう一度」は同じ挑戦
    if (!challenge) session.regionId = regionId;
    // 挑戦は装備が出ないので、倉庫があふれていても同じ挑戦はできる
    const block = challenge ? null : sortieBlock(save);
    const again = () => {
      if (!block && challenge) session.challenge = challenge;
      this.scene.start(block ? 'Loadout' : 'Run');
    };
    new Button(
      this,
      W / 2 + 170,
      H - 110,
      t(block ? '配置へ' : demo ? '自分で出撃' : 'もう一度'),
      again,
      { width: 300, height: 100, fontSize: 34, skin: 'gold', icon: block ? 'bag' : 'swords' },
    );
    // Above the 300px-wide button
    if (block)
      fitText(
        this.add
          .text(
            W / 2 + 170,
            H - 178,
            t(block === 'storageFull' ? '倉庫があふれています' : '起点がありません'),
            textStyle(18, COLORS.textWarn),
          )
          .setOrigin(0.5),
        320,
      );
    if (demo) {
      runTutorial(this, 'demoEnd', [
        {
          rect: { x: W / 2, y: 408, w: W - 50, h: 216 },
          text: t('これが伝説の装備の力！\n最大{step}連鎖、{damage}ダメージ！', {
            step: result.stats.maxStep,
            damage: Math.round(result.stats.maxDamage),
          }),
        },
        {
          rect: { x: W / 2 + 170, y: H - 110, w: 312, h: 112 },
          text: t(
            block
              ? 'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、\nいつかこの姿に！'
              : 'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、いつかこの姿に！\n「自分で出撃」を押してね',
          ),
          onTap: again,
        },
      ]);
      return;
    }
    runTutorial(this, 'result', [
      {
        rect: { x: W / 2, y: 850, w: W - 26, h: 424 },
        text: t(
          added.length > 0
            ? '宝箱から装備をゲット！\n開いたあとにタップすると、能力が見られるよ'
            : '敵を倒すと、宝箱から装備が手に入るよ。\n開いたあとにタップすると、能力が見られる',
        ),
      },
      {
        rect: { x: W / 2 - 170, y: H - 110, w: 312, h: 112 },
        // Not an action step: the player should still be able to inspect the loot here
        text: t(
          added.length > 0
            ? '拾った装備は、拠点の「配置」で\nバックパックに置くと強くなるよ'
            : '装備を拾ったら、拠点の「配置」で\nバックパックに置くと強くなるよ',
        ),
      },
    ]);
  }
}
