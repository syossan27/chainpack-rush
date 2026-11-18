// Trial (dive): the floor map and the law pick, drawn over the run screen between fights.
// Throwaway UI kept out of RunScene's main code.
import Phaser from 'phaser';
import { nextChoices, type DivePos, type DiveState, type NodeKind } from '../core/dive';
import { getLaw, type LawId } from '../data/laws';
import { getRegion } from '../data/regions';
import { t } from '../i18n';
import type { IconName } from './kit/icons';
import { Button, RoundButton, bindTap, fitText, panel } from './kit/widgets';
import { COLORS, H, W, textStyle } from './theme';

const DEPTH = 300;
const KIND_ICON: Record<NodeKind, IconName> = {
  fight: 'swords',
  elite: 'crown',
  camp: 'home',
  boss: 'skull',
};

function kindName(kind: NodeKind): string {
  return kind === 'fight'
    ? t('戦闘')
    : kind === 'elite'
      ? t('精鋭')
      : kind === 'camp'
        ? t('野営')
        : t('ボス');
}

/** The laws held, as one line (or "none") */
export function lawLine(laws: readonly LawId[]): string {
  return laws.length === 0
    ? t('掟: なし')
    : t('掟: {names}', { names: laws.map((id) => t(getLaw(id).name)).join(' / ') });
}

export interface DiveMapHandlers {
  onChoose: (pos: DivePos) => void;
  /** Give up the dive (the bag is halved, as when falling) */
  onGiveUp: () => void;
}

/**
 * The floor map: rows top to bottom with the boss last, roads between nodes, the node reached
 * last ringed, and the nodes the dive can go to lit. With one way on, it goes there by itself
 */
export class DiveMapView {
  private readonly root: Phaser.GameObjects.Container;
  private auto: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, dive: DiveState, maxHp: number, on: DiveMapHandlers) {
    this.root = scene.add.container(0, 0).setDepth(DEPTH);
    const dim = scene.add.rectangle(0, 0, W, H, 0x0c0a12, 0.97).setOrigin(0, 0).setInteractive();
    this.root.add(dim);
    const region = t(getRegion(dive.regionId).name);
    const head = [
      fitText(
        scene.add
          .text(
            W / 2,
            110,
            t('{region}　地下{floor}階', { region, floor: dive.floor }),
            textStyle(40, '#ffe27a'),
          )
          .setOrigin(0.5),
        W - 60,
      ),
      fitText(
        scene.add
          .text(
            W / 2,
            164,
            t('HP {hp}/{max}　袋 {n}個', {
              hp: Math.ceil(dive.hp),
              max: maxHp,
              n: dive.bag.length,
            }),
            textStyle(24),
          )
          .setOrigin(0.5),
        W - 60,
      ),
      scene.add
        .text(W / 2, 200, lawLine(dive.laws), {
          ...textStyle(20, COLORS.accentText),
          align: 'center',
          wordWrap: { width: W - 60, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 0),
    ];
    this.root.add(head);

    const choices = nextChoices(dive.map, dive.pos);
    const can = (r: number, c: number) => choices.some((p) => p.row === r && p.col === c);
    // Rows from y=320 down to the boss at y=950 (its caption stays above the note)
    const top = 320;
    const gap = (950 - top) / Math.max(1, dive.map.length - 1);
    const at = (r: number, c: number) => ({
      x: 90 + ((W - 180) * (c + 0.5)) / dive.map[r]!.length,
      y: top + r * gap,
    });
    // Roads (the ones from the node reached last are bright)
    const roads = scene.add.graphics();
    dive.map.forEach((row, r) =>
      row.forEach((node, c) => {
        const a = at(r, c);
        for (const j of node.next) {
          const b = at(r + 1, j);
          const lit = dive.pos?.row === r && dive.pos.col === c;
          roads.lineStyle(lit ? 8 : 5, lit ? 0xffd25a : 0x4a4460, 1);
          roads.lineBetween(a.x, a.y, b.x, b.y);
        }
      }),
    );
    this.root.add(roads);
    // Nodes
    dive.map.forEach((row, r) =>
      row.forEach((node, c) => {
        const p = at(r, c);
        const here = dive.pos?.row === r && dive.pos.col === c;
        if (here) this.root.add(scene.add.circle(p.x, p.y, 66, 0xffd25a, 0.9));
        const go = can(r, c);
        const btn = new RoundButton(
          scene,
          p.x,
          p.y,
          104,
          KIND_ICON[node.kind],
          kindName(node.kind),
          () => {
            if (!go) return;
            this.stopAuto();
            on.onChoose({ row: r, col: c });
          },
        ).setLit(go);
        // Behind the floor's way (rows already passed) or out of reach: dim
        if (!go && !here) btn.setAlpha(0.45);
        if (go)
          scene.tweens.add({ targets: btn, scale: 1.08, yoyo: true, repeat: -1, duration: 520 });
        this.root.add(btn);
      }),
    );
    const note = fitText(
      scene.add
        .text(
          W / 2,
          1090,
          choices.length === 1 ? t('この先は1本道。進みます…') : t('行き先を選ぼう'),
          textStyle(26),
        )
        .setOrigin(0.5),
      W - 60,
    );
    const giveUp = new Button(
      scene,
      W / 2,
      1190,
      t('あきらめて帰る（袋は半分）'),
      () => {
        this.stopAuto();
        on.onGiveUp();
      },
      { width: 420, height: 64, fontSize: 22, skin: 'gray' },
    );
    this.root.add([note, giveUp]);
    if (choices.length === 1)
      this.auto = scene.time.delayedCall(900, () => on.onChoose(choices[0]!));
  }

  private stopAuto(): void {
    this.auto?.remove();
    this.auto = null;
  }

  destroy(): void {
    this.stopAuto();
    this.root.destroy();
  }
}

/** Pick one law of the offer (cards with the name and what it does) */
export function showLawPick(
  scene: Phaser.Scene,
  laws: readonly LawId[],
  onPick: (id: LawId) => void,
): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0).setDepth(DEPTH + 10);
  const dim = scene.add.rectangle(0, 0, W, H, 0x0c0a12, 0.85).setOrigin(0, 0).setInteractive();
  const title = fitText(
    scene.add.text(W / 2, 300, t('掟をひとつ選ぼう'), textStyle(40, '#ffe27a')).setOrigin(0.5),
    W - 60,
  );
  const sub = fitText(
    scene.add
      .text(W / 2, 352, t('この潜りが終わるまで効く'), textStyle(22, COLORS.textDim))
      .setOrigin(0.5),
    W - 60,
  );
  root.add([dim, title, sub]);
  laws.forEach((id, i) => {
    const law = getLaw(id);
    const y = 480 + i * 190;
    const card = scene.add.container(W / 2, y);
    const bg = panel(scene, 0, 0, W - 80, 166, 'paper');
    const name = fitText(
      scene.add.text(0, -36, t(law.name), textStyle(32, '#3a2a18')).setOrigin(0.5),
      W - 140,
    );
    const desc = scene.add
      .text(0, 22, t(law.description), {
        ...textStyle(22, '#3a2a18', false),
        align: 'center',
        wordWrap: { width: W - 140, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0.5);
    const hit = scene.add.zone(0, 0, W - 80, 166).setInteractive({ useHandCursor: true });
    // Press and release on the card (a finger lifted as the pick appears does not choose)
    bindTap(hit, () => {
      root.destroy();
      onPick(id);
    });
    card.add([bg, name, desc, hit]);
    root.add(card);
  });
  return root;
}
