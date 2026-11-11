// 初めて遊ぶ人向けの案内（各画面で1回だけ）。説明したい場所だけ明るく残し、矢印と吹き出しで示す。
// 画面のどこかをタップすると次へ。「スキップ」で以降の案内をすべて出さない。
// 最後のステップに onTap があれば「やってみよう」の案内: 光っている場所をタップしたときだけ進み、
// そのボタンを押したのと同じことをする（ホーム → 地域 → 体験ラン → 結果 → 配置 と順に導く）。
import Phaser from 'phaser';
import { getSave, persist } from '../platform/store';
import { sfx } from '../audio/sfx';
import { COLORS, inkStyle, textStyle } from './theme';
import { panel } from './kit/widgets';

/** 案内の種類（各画面で1回） */
export const TUTORIAL_KEYS = [
  'home',
  'stage',
  'run',
  'demoEnd',
  'result',
  'loadoutGo',
  'loadout',
  'smith',
] as const;

/** 最初の出撃の体験ラン（伝説の装備を借りて遊ぶ）。済んだら tutorialSeen に入る。スキップでは飛ばさない */
export const DEMO_KEY = 'demo';

export function demoPending(): boolean {
  return !getSave().tutorialSeen.includes(DEMO_KEY);
}

export function markDemoDone(): void {
  markSeen([DEMO_KEY]);
}
export type TutorialKey = (typeof TUTORIAL_KEYS)[number];

export interface CoachStep {
  /** 明るく残す場所（中心と大きさ）。null なら画面全体を薄暗くするだけ */
  rect: { x: number; y: number; w: number; h: number } | null;
  text: string;
  /**
   * Action step (last step only, needs rect): advances only when the highlighted area is tapped,
   * then closes the tutorial and runs this (the same handler as the button underneath)
   */
  onTap?: () => void;
}

export interface CoachOptions {
  /** 案内が出ている間（ラン中は止める） */
  onStart?: () => void;
  onDone?: () => void;
}

export function tutorialSeen(key: TutorialKey): boolean {
  return getSave().tutorialSeen.includes(key);
}

function markSeen(keys: readonly string[]): void {
  const save = getSave();
  for (const k of keys) if (!save.tutorialSeen.includes(k)) save.tutorialSeen.push(k);
  persist();
}

/** Tutorials currently on screen */
const open = new Set<string>();

/** まだ見ていなければ案内を出す。出したら true */
export function runTutorial(
  scene: Phaser.Scene,
  key: TutorialKey,
  steps: CoachStep[],
  opts: CoachOptions = {},
): boolean {
  // Don't stack the same tutorial when the screen re-renders while it is open
  if (tutorialSeen(key) || steps.length === 0 || open.has(key)) return false;
  open.add(key);
  scene.events.once('shutdown', () => open.delete(key));
  opts.onStart?.();
  const W = scene.scale.gameSize.width;
  const H = scene.scale.gameSize.height;
  const root = scene.add.container(0, 0).setDepth(4000);
  let index = 0;
  let closed = false;

  const finish = (skipAll: boolean) => {
    if (closed) return;
    closed = true;
    open.delete(key);
    markSeen(skipAll ? TUTORIAL_KEYS : [key]);
    root.destroy();
    opts.onDone?.();
  };

  const show = () => {
    root.removeAll(true);
    const step = steps[index]!;
    const r = step.rect;
    const dim = 0x0c0a12;
    const a = 0.72;
    // 暗幕（明るく残す場所のまわりだけを覆う）。タップを下へ通さない
    const shades: Phaser.GameObjects.Rectangle[] = [];
    if (r) {
      const left = r.x - r.w / 2;
      const top = r.y - r.h / 2;
      shades.push(
        scene.add.rectangle(0, 0, W, Math.max(0, top), dim, a).setOrigin(0, 0),
        scene.add.rectangle(0, top + r.h, W, Math.max(0, H - top - r.h), dim, a).setOrigin(0, 0),
        scene.add.rectangle(0, top, Math.max(0, left), r.h, dim, a).setOrigin(0, 0),
        scene.add
          .rectangle(left + r.w, top, Math.max(0, W - left - r.w), r.h, dim, a)
          .setOrigin(0, 0),
      );
    } else {
      shades.push(scene.add.rectangle(0, 0, W, H, dim, a).setOrigin(0, 0));
    }
    // 明るい場所の上にも透明の受け皿を置き、下のボタンが反応しないようにする
    const catcher = scene.add
      .rectangle(0, 0, W, H, 0x000000, 0.001)
      .setOrigin(0, 0)
      .setInteractive();
    root.add([...shades, catcher]);
    const action = r && step.onTap && index === steps.length - 1 ? step.onTap : null;
    catcher.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (action && r) {
        // Only the highlighted area works; other taps are ignored
        const inside = Math.abs(p.x - r.x) <= r.w / 2 && Math.abs(p.y - r.y) <= r.h / 2;
        if (!inside) return;
        sfx('click');
        finish(false);
        action();
        return;
      }
      sfx('click');
      index++;
      if (index >= steps.length) finish(false);
      else show();
    });

    // 枠と矢印
    let bubbleY = H / 2;
    if (r) {
      const frame = scene.add.graphics();
      frame.lineStyle(5, 0xffd25a, 1);
      frame.strokeRoundedRect(r.x - r.w / 2 - 4, r.y - r.h / 2 - 4, r.w + 8, r.h + 8, 14);
      root.add(frame);
      scene.tweens.add({ targets: frame, alpha: 0.35, yoyo: true, repeat: -1, duration: 600 });
      // 吹き出しは、場所の上か下の広い方へ
      const above = r.y - r.h / 2 > H - (r.y + r.h / 2);
      const arrowY = above ? r.y - r.h / 2 - 22 : r.y + r.h / 2 + 22;
      const arrow = scene.add.graphics();
      arrow.fillStyle(0xffd25a, 1);
      arrow.lineStyle(3, 0x0c0a12, 1);
      const dir = above ? 1 : -1; // 1: 下向きの矢印（上から指す）
      const tri = [
        r.x - 18,
        arrowY - 14 * dir,
        r.x + 18,
        arrowY - 14 * dir,
        r.x,
        arrowY + 12 * dir,
      ];
      arrow.fillTriangle(tri[0]!, tri[1]!, tri[2]!, tri[3]!, tri[4]!, tri[5]!);
      arrow.strokeTriangle(tri[0]!, tri[1]!, tri[2]!, tri[3]!, tri[4]!, tri[5]!);
      root.add(arrow);
      scene.tweens.add({ targets: arrow, y: 10 * dir, yoyo: true, repeat: -1, duration: 420 });
      bubbleY = above ? r.y - r.h / 2 - 120 : r.y + r.h / 2 + 120;
    }
    // 吹き出し
    const bw = W - 80;
    const text = scene.add
      .text(W / 2, 0, step.text, {
        ...inkStyle(26),
        align: 'center',
        wordWrap: { width: bw - 60, useAdvancedWrap: true },
        lineSpacing: 6,
      })
      .setOrigin(0.5);
    const bh = text.height + 70;
    bubbleY = Phaser.Math.Clamp(bubbleY, bh / 2 + 20, H - bh / 2 - 20);
    const bubble = panel(scene, W / 2, bubbleY, bw, bh, 'paper');
    text.setY(bubbleY - 12);
    const page = scene.add
      .text(
        W / 2,
        bubbleY + bh / 2 - 22,
        action
          ? `光っているところをタップ（${index + 1}/${steps.length}）`
          : `タップで次へ（${index + 1}/${steps.length}）`,
        textStyle(16, '#7a5a30', false),
      )
      .setOrigin(0.5);
    root.add([bubble, text, page]);
    bubble.setScale(0.9).setAlpha(0);
    scene.tweens.add({ targets: bubble, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });

    // スキップ（以降の案内をすべて出さない）
    const skip = scene.add
      .text(W - 20, 24, 'スキップ ›', {
        ...textStyle(20, COLORS.text),
        backgroundColor: '#0c0a12cc',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    skip.on('pointerup', () => finish(true));
    root.add(skip);
  };

  show();
  return true;
}

/** 案内をもう一度見られるようにする */
export function resetTutorials(): void {
  getSave().tutorialSeen = [];
  persist();
}
