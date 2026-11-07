// 地域の一覧と敵情報（雑魚の傾向、ボスの出現順と特徴）
import Phaser from 'phaser';
import { sortieBlock } from '../core/economy';
import { BOSS_TRAITS, getEnemyDef } from '../data/enemies';
import { REGIONS } from '../data/regions';
import { getSave } from '../platform/store';
import { session } from '../platform/session';
import { Button } from '../ui/button';
import { COLORS, H, W, textStyle } from '../ui/theme';

export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super('StageSelect');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const save = getSave();
    if (!session.regionId || !save.progress.unlocked.includes(session.regionId)) {
      session.regionId =
        save.progress.unlocked[save.progress.unlocked.length - 1] ?? REGIONS[0]!.id;
    }
    this.add.text(W / 2, 60, '地域を選ぶ', textStyle(40)).setOrigin(0.5);
    const root = this.add.container(0, 0);
    const render = () => {
      root.removeAll(true);
      REGIONS.forEach((r, i) => {
        const y = 130 + i * 290;
        const unlocked = save.progress.unlocked.includes(r.id);
        const sel = session.regionId === r.id;
        const card = this.add
          .rectangle(W / 2, y + 130, W - 40, 270, sel ? COLORS.panelLight : COLORS.panel)
          .setStrokeStyle(sel ? 5 : 2, sel ? COLORS.accent : COLORS.panelEdge)
          .setInteractive({ useHandCursor: true });
        card.on('pointerup', () => {
          if (!unlocked) return;
          session.regionId = r.id;
          render();
        });
        root.add(card);
        root.add(
          this.add.text(
            50,
            y + 16,
            `${i + 1}. ${r.name}`,
            textStyle(36, unlocked ? COLORS.text : COLORS.textDim),
          ),
        );
        const best = save.progress.best[r.id];
        root.add(
          this.add
            .text(
              W - 50,
              y + 24,
              unlocked ? `最高 ${best ?? '-'}周` : '前の地域の3周目のボスを倒すと開放',
              textStyle(22, unlocked ? COLORS.gold : COLORS.textDim),
            )
            .setOrigin(1, 0),
        );
        if (!unlocked) return;
        root.add(
          this.add.text(50, y + 70, `雑魚: ${r.mobTrend}`, textStyle(22, COLORS.textDim, false)),
        );
        r.bosses.forEach((b, k) => {
          root.add(
            this.add.text(
              50,
              y + 108 + k * 36,
              `${k + 1}周目 ${getEnemyDef(b).name}: ${BOSS_TRAITS[b] ?? ''}`,
              {
                ...textStyle(19, COLORS.text, false),
                wordWrap: { width: W - 100 },
              },
            ),
          );
        });
        root.add(
          this.add.text(
            50,
            y + 222,
            '4周目以降は繰り返し（周回ごとに HP・攻撃が上がる）',
            textStyle(18, COLORS.textDim, false),
          ),
        );
      });
    };
    render();

    new Button(this, 130, H - 120, '← 拠点', () => this.scene.start('Base'), {
      width: 200,
      height: 76,
    });
    new Button(this, W / 2 + 20, H - 120, '配置', () => this.scene.start('Loadout'), {
      width: 180,
      height: 76,
    });
    const block = sortieBlock(save);
    new Button(this, W - 130, H - 120, '出撃！', () => this.scene.start('Run'), {
      width: 200,
      height: 76,
      disabled: block !== null,
      color: COLORS.ok,
    });
    if (block) {
      this.add
        .text(
          W / 2,
          H - 50,
          block === 'noOrigin'
            ? '起点がバックパックにありません'
            : '倉庫があふれています（売却してください）',
          textStyle(24, COLORS.textWarn),
        )
        .setOrigin(0.5);
    }
  }
}
