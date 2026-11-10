// 報酬つき広告と買い切り（プレミアム）の入口。いまはテスト用のモック（広告の代わりに3秒の「テスト広告」画面、
// 購入は保護者の確認のあと購入できたことにする）。本物（AdMob・ストアの課金）は provider を差し替えるだけにする。
import Phaser from 'phaser';
import { MONETIZE } from '../config/balance';
import { choiceDialog } from '../ui/kit/widgets';
import { COLORS, textStyle } from '../ui/theme';
import { getSave, persist } from './store';

export interface MonetizationProvider {
  /** 報酬つき広告を最後まで見たら true（途中で閉じた・広告がなかったら false） */
  showRewarded(scene: Phaser.Scene): Promise<boolean>;
  /** プレミアムの購入。買えたら true */
  purchasePremium(scene: Phaser.Scene): Promise<boolean>;
  /** 購入の復元。プレミアムを持っていたら true */
  restore(): Promise<boolean>;
}

/** テスト用: 広告の代わりに3秒の画面を出す。購入はすぐ成功にする */
const mockProvider: MonetizationProvider = {
  showRewarded(scene) {
    return new Promise((resolve) => {
      const W = scene.scale.gameSize.width;
      const H = scene.scale.gameSize.height;
      const root = scene.add.container(0, 0).setDepth(5000);
      const shade = scene.add
        .rectangle(0, 0, W, H, 0x000000, 0.92)
        .setOrigin(0, 0)
        .setInteractive();
      const title = scene.add
        .text(W / 2, H / 2 - 80, '広告（テスト表示）', textStyle(36, COLORS.text))
        .setOrigin(0.5);
      const note = scene.add
        .text(W / 2, H / 2 - 20, '本番ではここに動画広告が流れます', textStyle(22, COLORS.textDim))
        .setOrigin(0.5);
      const count = scene.add.text(W / 2, H / 2 + 60, '3', textStyle(64, '#ffe27a')).setOrigin(0.5);
      root.add([shade, title, note, count]);
      let n = 3;
      // ゲームスピードやヒットストップに関係なく、実時間で数える
      const timer = setInterval(() => {
        n--;
        if (n > 0) {
          count.setText(`${n}`);
          return;
        }
        clearInterval(timer);
        root.destroy();
        resolve(true);
      }, 1000);
    });
  },
  purchasePremium() {
    return Promise.resolve(true);
  },
  restore() {
    return Promise.resolve(getSave().premium);
  },
};

let provider: MonetizationProvider = mockProvider;

/** 本物の広告・課金をつなぐときに差し替える */
export function setMonetizationProvider(p: MonetizationProvider): void {
  provider = p;
}

export function isPremium(): boolean {
  return getSave().premium;
}

/**
 * 報酬を受け取る: プレミアムなら広告なしですぐ、そうでなければ報酬つき広告を見てから。
 * 受け取れたら true
 */
export async function earnReward(scene: Phaser.Scene): Promise<boolean> {
  if (isPremium()) return true;
  return provider.showRewarded(scene);
}

/** 保護者の確認（かんたんな足し算）。正しければ true */
export function parentalGate(scene: Phaser.Scene): Promise<boolean> {
  return new Promise((resolve) => {
    const a = 11 + Math.floor(Math.random() * 8);
    const b = 6 + Math.floor(Math.random() * 7);
    const answer = a + b;
    const options = [answer - 3, answer, answer + 4].sort(() => Math.random() - 0.5);
    choiceDialog(
      scene,
      `保護者の方へ：${a} + ${b} は？`,
      options.map((v) => ({
        label: `${v}`,
        skin: 'blue',
        onPick: () => resolve(v === answer),
      })),
      '購入の前に、保護者の方の確認をお願いします',
      () => resolve(false),
    );
  });
}

/** プレミアムを買う（保護者の確認 → 購入）。買えたら true */
export async function buyPremium(scene: Phaser.Scene): Promise<boolean> {
  if (isPremium()) return true;
  if (!(await parentalGate(scene))) return false;
  const ok = await provider.purchasePremium(scene);
  if (ok) {
    getSave().premium = true;
    persist();
  }
  return ok;
}

export async function restorePurchases(): Promise<boolean> {
  const ok = await provider.restore();
  if (ok && !getSave().premium) {
    getSave().premium = true;
    persist();
  }
  return ok;
}

export const PREMIUM_PRICE = MONETIZE.premiumPrice;
