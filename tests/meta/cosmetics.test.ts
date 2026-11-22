import { describe, expect, it } from 'vitest';
import {
  COSMETICS,
  cosmeticsForBand,
  getCosmetic,
  ownedFromRewards,
  shownInWardrobe,
  validLook,
  type CosmeticDef,
} from '../../src/core/cosmetics';
import {
  cosmeticCondition,
  cosmeticProgress,
  earnedCosmetics,
  giveCosmetics,
  grantCosmetics,
} from '../../src/core/cosmeticRewards';
import { RANK_REWARDS } from '../../src/core/ranking';
import { createInitialSave, deserializeSave, serializeSave } from '../../src/core/save';
import { REGIONS } from '../../src/data/regions';
import { t } from '../../src/i18n';

describe('挑戦の上位のご褒美（見た目だけ）', () => {
  it('上の順位帯ほど多くもらえ、下の順位帯の分も含む。参加だけでは何もない', () => {
    const top50 = cosmeticsForBand('top50');
    const top10 = cosmeticsForBand('top10');
    const top1 = cosmeticsForBand('top1');
    expect(cosmeticsForBand('joined')).toEqual([]);
    expect(top50.length).toBeGreaterThan(0);
    for (const id of top50) expect(top10).toContain(id);
    for (const id of top10) expect(top1).toContain(id);
    expect(top1).toContain('pet_dragon');
    expect(top10).not.toContain('pet_dragon');
    // Every kind exists at the top
    for (const kind of ['hero', 'pet', 'deco'])
      expect(COSMETICS.some((c) => c.kind === kind && top1.includes(c.id))).toBe(true);
  });

  it('挑戦の順位でもらえるのは今までの7つだけ（小物は入らない。サーバーも同じ関数）', () => {
    expect(cosmeticsForBand('top1')).toEqual([
      'hero_azure',
      'hero_silver_royal',
      'hero_gold',
      'pet_dragon',
      'deco_medal',
      'deco_crown_silver',
      'deco_crown_gold',
    ]);
  });

  it('持ち物は挑戦の報酬からだけ。エンドレスの報酬では増えない', () => {
    expect(ownedFromRewards([{ season: 'endless-24300', band: 'top1' }])).toEqual([]);
    expect(ownedFromRewards([{ season: 'challenge-2', band: 'top10' }])).toEqual(
      cosmeticsForBand('top10'),
    );
    // Several seasons add up; unknown bands are ignored
    const both = ownedFromRewards([
      { season: 'challenge-1', band: 'top50' },
      { season: 'challenge-2', band: 'top1' },
      { season: 'challenge-3', band: 'hacked' },
    ]);
    expect(both).toEqual(cosmeticsForBand('top1'));
  });

  it('身につけられるのは、持っていて種類が合うものだけ', () => {
    const owned = cosmeticsForBand('top10');
    expect(
      validLook({ hero: 'hero_silver_royal', pet: 'pet_dragon', deco: 'hero_azure' }, owned),
    ).toEqual({
      hero: 'hero_silver_royal',
      head: null,
      back: null,
      pet: null, // not owned
      deco: null, // wrong kind
    });
    // Accessories: the wrong place or not owned → null
    expect(
      validLook({ head: 'back_bat_wings', back: 'back_bat_wings' }, ['back_bat_wings']),
    ).toEqual({ hero: null, head: null, back: 'back_bat_wings', pet: null, deco: null });
    expect(validLook({ head: 'head_leaf_crown' }, [])).toEqual({
      hero: null,
      head: null,
      back: null,
      pet: null,
      deco: null,
    });
  });

  it('保存して読み直しても残り、知らない物や持っていない物は消える', () => {
    const s = createInitialSave();
    s.cosmetics = cosmeticsForBand('top1');
    s.look = {
      hero: 'hero_gold',
      head: null,
      back: null,
      pet: 'pet_dragon',
      deco: 'deco_crown_gold',
    };
    const back = deserializeSave(serializeSave(s));
    expect(back.cosmetics).toEqual(s.cosmetics);
    expect(back.look).toEqual(s.look);

    const raw = JSON.parse(serializeSave(s)) as Record<string, unknown>;
    const data = (raw.data ?? raw) as Record<string, unknown>;
    data.cosmetics = ['deco_medal', 'unknown_thing'];
    // An older save: no head/back in the look
    data.look = { hero: 'hero_gold', pet: null, deco: 'deco_medal' };
    const broken = deserializeSave(JSON.stringify(raw));
    expect(broken.cosmetics).toEqual(['deco_medal']);
    expect(broken.look).toEqual({
      hero: null,
      head: null,
      back: null,
      pet: null,
      deco: 'deco_medal',
    });
  });
});

describe('冒険のご褒美の小物', () => {
  it('冒険の小物は7つ（頭3・背中4）で、もらい方は地域の★1かエンドレス10周', () => {
    const acc = COSMETICS.filter((c) => c.kind === 'head' || c.kind === 'back');
    expect(acc.map((c) => [c.id, c.kind, t(c.name), c.source])).toEqual([
      [
        'head_leaf_crown',
        'head',
        '若葉の印',
        { kind: 'regionStars', region: 'grassland', stars: 1 },
      ],
      ['back_bat_wings', 'back', 'コウモリの翼', { kind: 'regionStars', region: 'cave', stars: 1 }],
      [
        'back_knight_flag',
        'back',
        '騎士の旗',
        { kind: 'regionStars', region: 'rampart', stars: 1 },
      ],
      [
        'head_flame_plume',
        'head',
        '炎の羽飾り',
        { kind: 'regionStars', region: 'volcano', stars: 1 },
      ],
      [
        'head_ice_crystal',
        'head',
        '氷の結晶',
        { kind: 'regionStars', region: 'glacier', stars: 1 },
      ],
      [
        'back_demon_wings',
        'back',
        '魔王の翼',
        { kind: 'regionStars', region: 'demon_castle', stars: 1 },
      ],
      ['back_star_ring', 'back', '星の輪', { kind: 'endlessLoop', n: 10 }],
    ]);
  });

  it('★1 は3周目のボスを倒したとき（記録が4周目）。進み具合は倒した周回の数', () => {
    const s = createInitialSave();
    expect(cosmeticProgress(s, 'head_leaf_crown')).toEqual({ have: 0, need: 3 });
    s.progress.best.grassland = 3;
    expect(earnedCosmetics(s)).not.toContain('head_leaf_crown');
    expect(cosmeticProgress(s, 'head_leaf_crown')).toEqual({ have: 2, need: 3 });
    s.progress.best.grassland = 4;
    expect(earnedCosmetics(s)).toContain('head_leaf_crown');
    expect(cosmeticProgress(s, 'head_leaf_crown')).toEqual({ have: 3, need: 3 });
    s.progress.best.grassland = 12;
    expect(cosmeticProgress(s, 'head_leaf_crown')).toEqual({ have: 3, need: 3 });
  });

  it('エンドレスは10周目に着いたら', () => {
    const s = createInitialSave();
    s.endless.bestLoop = 9;
    expect(earnedCosmetics(s)).not.toContain('back_star_ring');
    expect(cosmeticProgress(s, 'back_star_ring')).toEqual({ have: 9, need: 10 });
    s.endless.bestLoop = 10;
    expect(earnedCosmetics(s)).toContain('back_star_ring');
    s.endless.bestLoop = 30;
    expect(cosmeticProgress(s, 'back_star_ring')).toEqual({ have: 10, need: 10 });
  });

  it('順位と課金の見た目は遊んでももらえず、進み具合もない', () => {
    const s = createInitialSave();
    for (const r of REGIONS) s.progress.best[r.id] = 11;
    s.endless.bestLoop = 30;
    const earned = earnedCosmetics(s);
    expect(earned).toEqual(
      COSMETICS.filter((c) => c.kind === 'head' || c.kind === 'back').map((c) => c.id),
    );
    for (const id of cosmeticsForBand('top1')) expect(earned).not.toContain(id);
    expect(cosmeticProgress(s, 'pet_dragon')).toBeNull();
    expect(cosmeticProgress(s, 'no_such_look')).toBeNull();
    const shop: CosmeticDef = {
      id: 'x',
      kind: 'head',
      name: 'x',
      source: { kind: 'shop', productId: 'p' },
    };
    expect(shownInWardrobe(shop, [])).toBe(false);
    expect(shownInWardrobe(shop, ['x'])).toBe(true);
    expect(shownInWardrobe(getCosmetic('head_leaf_crown')!, [])).toBe(true);
    expect(shownInWardrobe(getCosmetic('hero_gold')!, [])).toBe(true);
  });

  it('もらうと持ち物と新しい印に入り、2回目は何も増えない', () => {
    const s = createInitialSave();
    s.progress.best.grassland = 4;
    s.endless.bestLoop = 10;
    expect(grantCosmetics(s)).toEqual(['head_leaf_crown', 'back_star_ring']);
    expect(s.cosmetics).toEqual(['head_leaf_crown', 'back_star_ring']);
    expect(s.newCosmetics).toEqual(['head_leaf_crown', 'back_star_ring']);
    expect(grantCosmetics(s)).toEqual([]);
    expect(giveCosmetics(s, ['head_leaf_crown', 'pet_dragon'])).toEqual(['pet_dragon']);
    expect(s.newCosmetics).toEqual(['head_leaf_crown', 'back_star_ring', 'pet_dragon']);
  });

  it('新しい印と小物の着用は保存して読み直しても残り、古い・壊れた値は直す', () => {
    const s = createInitialSave();
    expect(s.newCosmetics).toEqual([]);
    s.cosmetics = ['head_leaf_crown', 'back_bat_wings'];
    s.newCosmetics = ['head_leaf_crown'];
    s.look = { ...s.look, head: 'head_leaf_crown', back: 'back_bat_wings' };
    const back = deserializeSave(serializeSave(s));
    expect(back.newCosmetics).toEqual(['head_leaf_crown']);
    expect(back.look.head).toBe('head_leaf_crown');
    expect(back.look.back).toBe('back_bat_wings');

    const data = JSON.parse(serializeSave(s)) as Record<string, unknown>;
    delete data.newCosmetics;
    expect(deserializeSave(JSON.stringify(data)).newCosmetics).toEqual([]);
    data.newCosmetics = 'oops';
    expect(deserializeSave(JSON.stringify(data)).newCosmetics).toEqual([]);
    // Unknown ids and looks the player does not own are dropped
    data.newCosmetics = ['head_leaf_crown', 'unknown', 'pet_dragon'];
    expect(deserializeSave(JSON.stringify(data)).newCosmetics).toEqual(['head_leaf_crown']);
  });

  it('開発中に名前を変えた小物（氷の冠・頭の星の輪）を持つセーブも読めて、星の輪は起動時に配り直す', () => {
    const s = createInitialSave();
    const data = JSON.parse(serializeSave(s)) as Record<string, unknown>;
    data.cosmetics = ['head_ice_crown', 'head_star_ring', 'head_leaf_crown'];
    data.newCosmetics = ['head_star_ring', 'head_leaf_crown'];
    data.look = { ...s.look, head: 'head_star_ring', back: 'head_ice_crown' };
    data.endless = { ...s.endless, bestLoop: 10 };
    const back = deserializeSave(JSON.stringify(data));
    expect(back.cosmetics).toEqual(['head_leaf_crown']);
    expect(back.newCosmetics).toEqual(['head_leaf_crown']);
    expect(back.look.head).toBeNull();
    expect(back.look.back).toBeNull();
    expect(grantCosmetics(back)).toEqual(['back_star_ring']);
  });

  it('条件の文', () => {
    expect(cosmeticCondition(getCosmetic('head_leaf_crown')!)).toBe(
      '草原で★1（3周目のボスを倒す）',
    );
    expect(cosmeticCondition(getCosmetic('back_demon_wings')!)).toBe(
      '魔王城で★1（3周目のボスを倒す）',
    );
    expect(cosmeticCondition(getCosmetic('back_star_ring')!)).toBe('エンドレスで10周目に着く');
    expect(cosmeticCondition(getCosmetic('hero_gold')!)).toBe(
      t('{band}でもらえる', { band: t(RANK_REWARDS.top1.label) }),
    );
  });
});
