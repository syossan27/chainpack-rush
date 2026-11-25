import { describe, expect, it } from 'vitest';
import {
  SAVE_VERSION,
  createInitialSave,
  deserializeSave,
  serializeSave,
} from '../../src/core/save';

describe('セーブの読み書き', () => {
  it('初期所持品はすべてコモン', () => {
    const s = createInitialSave();
    expect(s.inventory.map((i) => i.rarity)).toEqual(s.inventory.map(() => 'common'));
  });

  it('初期の装備はすべて右向き1方向', () => {
    const gear = createInitialSave().inventory.filter((i) => i.defId !== 'potion');
    expect(gear.map((i) => i.exits)).toEqual(gear.map(() => ['right']));
  });

  it('書き出して読み直すと同じセーブになる', () => {
    const s = createInitialSave();
    s.gold = 123;
    expect(deserializeSave(serializeSave(s))).toEqual(s);
  });

  it('消したギミックの盤面を使っていたセーブは、仕掛けなしの標準の盤面で読み込む', () => {
    const data = JSON.parse(serializeSave(createInitialSave())) as {
      boards: { active: string; layouts: Record<string, unknown> };
      loadout: { board?: string; cells: unknown[]; gimmicks?: string[] };
    };
    data.boards.active = 'spin';
    data.loadout.board = 'spin';
    data.loadout.gimmicks = data.loadout.cells.map(() => 'rotate');
    data.boards.layouts.spin = data.loadout;
    const s = deserializeSave(JSON.stringify(data));
    expect([s.boards.active, s.loadout.board, 'gimmicks' in s.loadout, s.boards.layouts]).toEqual([
      'standard',
      'standard',
      false,
      {},
    ]);
  });

  it('壊れたデータは初期値で読み込む', () => {
    expect(deserializeSave('{oops').gold).toBe(0);
  });

  it('知らないバージョンのデータは初期値で読み込む', () => {
    const s = createInitialSave();
    s.gold = 123;
    expect(deserializeSave(JSON.stringify({ ...s, version: SAVE_VERSION + 1 })).gold).toBe(0);
  });

  it('データがなければ今の版の初期値', () => {
    expect(deserializeSave(null).version).toBe(4);
  });

  it('版3のセーブ: 最大HP・攻撃間隔・攻撃倍率の段は2倍になる（1段の効き目が半分になったので、強さは同じ）', () => {
    const s = createInitialSave();
    s.upgrades = { ...s.upgrades, maxHp: 3, atb: 4, attack: 7, storage: 2 };
    const old = JSON.parse(serializeSave(s)) as Record<string, unknown>;
    const v3 = deserializeSave(JSON.stringify({ ...old, version: 3 }));
    expect(v3.upgrades).toMatchObject({ maxHp: 6, atb: 8, attack: 14, storage: 2 });
  });

  it('版3から移したセーブを読み直しても、段は2倍にならない', () => {
    const s = createInitialSave();
    s.upgrades = { ...s.upgrades, attack: 7 };
    const old = JSON.parse(serializeSave(s)) as Record<string, unknown>;
    const v3 = deserializeSave(JSON.stringify({ ...old, version: 3 }));
    expect(deserializeSave(serializeSave(v3)).upgrades.attack).toBe(14);
  });
});

describe('読み込み時の出口の直し', () => {
  it('出口0の起点石は読み込み時に右向き1方向のコモンにする', () => {
    const s = createInitialSave();
    const origin = s.inventory.find((i) => i.defId === 'origin_stone')!;
    origin.exits = [];
    const loaded = deserializeSave(serializeSave(s)).inventory.find((i) => i.uid === origin.uid)!;
    expect(loaded.exits).toEqual(['right']);
    expect(loaded.rarity).toBe('common');
  });

  it('出口0の装備（末端）は読み込み後も出口0のまま', () => {
    const s = createInitialSave();
    const sword = s.inventory.find((i) => i.defId === 'sword')!;
    sword.exits = [];
    const loaded = deserializeSave(serializeSave(s));
    expect(loaded.inventory.find((i) => i.uid === sword.uid)!.exits).toEqual([]);
  });
});

describe('読み込み時の起点石のレアリティ', () => {
  it('読み込み時に、起点石のレアリティを出口の数に合わせる', () => {
    const s = createInitialSave();
    const origin = s.inventory.find((i) => i.defId === 'origin_stone')!;
    origin.exits = ['up', 'right', 'down'];
    origin.rarity = 'common';
    const loaded = deserializeSave(serializeSave(s));
    expect(loaded.inventory.find((i) => i.uid === origin.uid)!.rarity).toBe('epic');
  });
});

describe('設定: ゲームスピード', () => {
  const withSpeed = (gameSpeed: number) => {
    const s = createInitialSave();
    return deserializeSave(JSON.stringify({ ...s, settings: { ...s.settings, gameSpeed } }))
      .settings.gameSpeed;
  };

  it('ゲームスピードは既定で×1', () => {
    expect(createInitialSave().settings.gameSpeed).toBe(1);
  });

  it('ゲームスピードが欠けたセーブは×1で読み込む', () => {
    const old = JSON.parse(serializeSave(createInitialSave()));
    delete old.settings.gameSpeed;
    expect(deserializeSave(JSON.stringify(old)).settings.gameSpeed).toBe(1);
  });

  it('範囲外のゲームスピードは×1に戻す', () => {
    expect(withSpeed(99)).toBe(1);
  });

  it('範囲内のゲームスピードは保存した値のまま', () => {
    expect(withSpeed(2)).toBe(2);
  });
});

describe('設定: 消耗品ボタンの位置', () => {
  const withSide = (consumableSide: unknown) => {
    const s = createInitialSave();
    return deserializeSave(JSON.stringify({ ...s, settings: { ...s.settings, consumableSide } }))
      .settings.consumableSide;
  };

  it('既定は右', () => {
    expect(createInitialSave().settings.consumableSide).toBe('right');
  });

  it('左を選んだら、読み直しても左', () => {
    expect(withSide('left')).toBe('left');
  });

  it('位置が欠けた・壊れたセーブは右で読み込む', () => {
    expect(withSide(undefined)).toBe('right');
    expect(withSide('up')).toBe('right');
  });
});
