import { describe, expect, it } from 'vitest';
import { PROGRESS } from '../../src/config/balance';
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
import { fixLook, looksAllOpen, rankingDeco } from '../../src/core/wardrobe';
import { REGIONS } from '../../src/data/regions';
import { t } from '../../src/i18n';

/** The adventure accessories (worn on the head or the back) in catalog order */
const ACCESSORIES = COSMETICS.filter((c) => c.kind === 'head' || c.kind === 'back');
/** Loops whose boss must fall for ★1 in a region */
const STAR1_LOOPS = PROGRESS.starLoops[0]!;

/** The endless loop that earns the star ring */
function starRingLoop(): number {
  const source = getCosmetic('back_star_ring')!.source;
  if (source.kind !== 'endlessLoop') throw new Error('back_star_ring is not an endless reward');
  return source.n;
}

/** A save's raw JSON, as stored */
function rawSave(s = createInitialSave()): Record<string, unknown> {
  return JSON.parse(serializeSave(s)) as Record<string, unknown>;
}

describe('挑戦の上位のご褒美（見た目だけ）', () => {
  it('参加しただけでは何ももらえない', () => {
    expect(cosmeticsForBand('joined')).toEqual([]);
  });

  it('上の順位帯は、下の順位帯の分もすべてもらえる', () => {
    const top50 = cosmeticsForBand('top50');
    expect(top50.length).toBeGreaterThan(0);
    expect(cosmeticsForBand('top10')).toEqual(expect.arrayContaining(top50));
    expect(cosmeticsForBand('top1')).toEqual(expect.arrayContaining(cosmeticsForBand('top10')));
  });

  it('ちびドラゴンは1位帯だけのご褒美', () => {
    expect(cosmeticsForBand('top1')).toContain('pet_dragon');
    expect(cosmeticsForBand('top10')).not.toContain('pet_dragon');
  });

  it.each(['hero', 'pet', 'deco'])('1位帯では %s の見た目ももらえる', (kind) => {
    const top1 = cosmeticsForBand('top1');
    expect(COSMETICS.some((c) => c.kind === kind && top1.includes(c.id))).toBe(true);
  });

  it('挑戦の順位でもらえるのは順位のご褒美の見た目だけ（小物は入らない。サーバーも同じ関数）', () => {
    const rankLooks = COSMETICS.filter((c) => c.source.kind === 'rank').map((c) => c.id);
    const top1 = cosmeticsForBand('top1');
    expect(top1).toEqual(rankLooks);
    expect(top1.filter((id) => ACCESSORIES.some((c) => c.id === id))).toEqual([]);
  });

  it('エンドレスの報酬では持ち物は増えない', () => {
    expect(ownedFromRewards([{ season: 'endless-24300', band: 'top1' }])).toEqual([]);
  });

  it('挑戦の報酬では、その順位帯の見た目を持ち物にする', () => {
    expect(ownedFromRewards([{ season: 'challenge-2', band: 'top10' }])).toEqual(
      cosmeticsForBand('top10'),
    );
  });

  it('何回分もの挑戦の報酬は合わさり、知らない順位帯は無視する', () => {
    const both = ownedFromRewards([
      { season: 'challenge-1', band: 'top50' },
      { season: 'challenge-2', band: 'top1' },
      { season: 'challenge-3', band: 'hacked' },
    ]);
    expect(both).toEqual(cosmeticsForBand('top1'));
  });

  it('持っていない見た目は身につけられない', () => {
    const owned = cosmeticsForBand('top10');
    expect(validLook({ hero: 'hero_silver_royal', pet: 'pet_dragon' }, owned)).toEqual({
      hero: 'hero_silver_royal',
      head: null,
      back: null,
      pet: null,
      deco: null,
    });
    expect(validLook({ head: 'head_leaf_crown' }, [])).toEqual({
      hero: null,
      head: null,
      back: null,
      pet: null,
      deco: null,
    });
  });

  it('種類の違う場所には身につけられない（小物の頭と背中も）', () => {
    expect(validLook({ deco: 'hero_azure' }, cosmeticsForBand('top10')).deco).toBeNull();
    expect(
      validLook({ head: 'back_bat_wings', back: 'back_bat_wings' }, ['back_bat_wings']),
    ).toEqual({ hero: null, head: null, back: 'back_bat_wings', pet: null, deco: null });
  });

  it('持ち物と着ている見た目は保存して読み直しても残る', () => {
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
  });

  describe('読み直すと、知らない物や持っていない物は消える', () => {
    const broken = () => {
      const raw = rawSave();
      const data = (raw.data ?? raw) as Record<string, unknown>;
      data.cosmetics = ['deco_medal', 'unknown_thing'];
      // An older save: no head/back in the look
      data.look = { hero: 'hero_gold', pet: null, deco: 'deco_medal' };
      return deserializeSave(JSON.stringify(raw));
    };

    it('知らない物は持ち物から消える', () => {
      expect(broken().cosmetics).toEqual(['deco_medal']);
    });

    it('持っていない物は外れる（頭と背中のない古いセーブも読める）', () => {
      expect(broken().look).toEqual({
        hero: null,
        head: null,
        back: null,
        pet: null,
        deco: 'deco_medal',
      });
    });
  });
});

describe('冒険のご褒美の小物', () => {
  it('地域ごとに1つずつ、地域の順に、その地域の★1でもらえる小物がある', () => {
    const byRegion = ACCESSORIES.flatMap((c) =>
      c.source.kind === 'regionStars' ? [[c.source.region, c.source.stars]] : [],
    );
    expect(byRegion).toEqual(REGIONS.map((r) => [r.id, 1]));
  });

  it('地域の★でもらえない小物は、エンドレスの周回でもらう星の輪だけ', () => {
    const others = ACCESSORIES.filter((c) => c.source.kind !== 'regionStars');
    expect(others.map((c) => [c.id, c.source.kind])).toEqual([['back_star_ring', 'endlessLoop']]);
  });

  it('進み具合は倒したボスの周回の数で、目標は★1の周回', () => {
    const s = createInitialSave();
    expect(cosmeticProgress(s, 'head_leaf_crown')).toEqual({ have: 0, need: STAR1_LOOPS });
    s.progress.best.grassland = STAR1_LOOPS;
    expect(cosmeticProgress(s, 'head_leaf_crown')).toEqual({
      have: STAR1_LOOPS - 1,
      need: STAR1_LOOPS,
    });
  });

  it('★1の周回に着いただけ（そのボスをまだ倒していない）ではもらえない', () => {
    const s = createInitialSave();
    s.progress.best.grassland = STAR1_LOOPS;
    expect(earnedCosmetics(s)).not.toContain('head_leaf_crown');
  });

  it('★1の周回のボスを倒すと（記録が次の周回）もらえる', () => {
    const s = createInitialSave();
    s.progress.best.grassland = STAR1_LOOPS + 1;
    expect(earnedCosmetics(s)).toContain('head_leaf_crown');
    expect(cosmeticProgress(s, 'head_leaf_crown')).toEqual({
      have: STAR1_LOOPS,
      need: STAR1_LOOPS,
    });
  });

  it('★の進み具合は目標で止まる', () => {
    const s = createInitialSave();
    s.progress.best.grassland = STAR1_LOOPS + 9;
    expect(cosmeticProgress(s, 'head_leaf_crown')).toEqual({
      have: STAR1_LOOPS,
      need: STAR1_LOOPS,
    });
  });

  it('星の輪は、エンドレスでその周回に着く前はもらえず、進み具合は着いた周回', () => {
    const n = starRingLoop();
    const s = createInitialSave();
    s.endless.bestLoop = n - 1;
    expect(earnedCosmetics(s)).not.toContain('back_star_ring');
    expect(cosmeticProgress(s, 'back_star_ring')).toEqual({ have: n - 1, need: n });
  });

  it('星の輪は、エンドレスでその周回に着いたらもらえる', () => {
    const s = createInitialSave();
    s.endless.bestLoop = starRingLoop();
    expect(earnedCosmetics(s)).toContain('back_star_ring');
  });

  it('エンドレスの進み具合は目標で止まる', () => {
    const n = starRingLoop();
    const s = createInitialSave();
    s.endless.bestLoop = n * 3;
    expect(cosmeticProgress(s, 'back_star_ring')).toEqual({ have: n, need: n });
  });

  it('どこまで遊んでも、遊んでもらえるのは冒険の小物だけ（順位の見た目は入らない）', () => {
    const s = createInitialSave();
    for (const r of REGIONS) s.progress.best[r.id] = Math.max(...PROGRESS.starLoops) + 1;
    s.endless.bestLoop = starRingLoop() * 3;
    const earned = earnedCosmetics(s);
    expect(earned).toEqual(ACCESSORIES.map((c) => c.id));
    expect(earned.filter((id) => cosmeticsForBand('top1').includes(id))).toEqual([]);
  });

  it('順位の見た目と知らない見た目には進み具合がない', () => {
    const s = createInitialSave();
    expect(cosmeticProgress(s, 'pet_dragon')).toBeNull();
    expect(cosmeticProgress(s, 'no_such_look')).toBeNull();
  });

  it('お店の見た目は、持つまで着せ替えに出ない', () => {
    const shop: CosmeticDef = {
      id: 'x',
      kind: 'head',
      name: 'x',
      source: { kind: 'shop', productId: 'p' },
    };
    expect(shownInWardrobe(shop, [])).toBe(false);
    expect(shownInWardrobe(shop, ['x'])).toBe(true);
  });

  it('冒険と順位の見た目は、持っていなくても着せ替えに出る', () => {
    expect(shownInWardrobe(getCosmetic('head_leaf_crown')!, [])).toBe(true);
    expect(shownInWardrobe(getCosmetic('hero_gold')!, [])).toBe(true);
  });

  describe('小物を渡す', () => {
    /** A save that has earned the grassland accessory and the star ring */
    const earnedSave = () => {
      const s = createInitialSave();
      s.progress.best.grassland = STAR1_LOOPS + 1;
      s.endless.bestLoop = starRingLoop();
      return s;
    };

    it('もらえる小物は持ち物と新しい印に入る', () => {
      const s = earnedSave();
      expect(grantCosmetics(s)).toEqual(['head_leaf_crown', 'back_star_ring']);
      expect(s.cosmetics).toEqual(['head_leaf_crown', 'back_star_ring']);
      expect(s.newCosmetics).toEqual(['head_leaf_crown', 'back_star_ring']);
    });

    it('2回目は何も増えない', () => {
      const s = earnedSave();
      grantCosmetics(s);
      expect(grantCosmetics(s)).toEqual([]);
    });

    it('渡すと、持っていない物だけが増えて新しい印が付く', () => {
      const s = earnedSave();
      grantCosmetics(s);
      expect(giveCosmetics(s, ['head_leaf_crown', 'pet_dragon'])).toEqual(['pet_dragon']);
      expect(s.newCosmetics).toEqual(['head_leaf_crown', 'back_star_ring', 'pet_dragon']);
    });
  });

  describe('新しい印と小物の着用の保存', () => {
    /** A save owning two accessories, wearing both, one still marked new */
    const wearing = () => {
      const s = createInitialSave();
      s.cosmetics = ['head_leaf_crown', 'back_bat_wings'];
      s.newCosmetics = ['head_leaf_crown'];
      s.look = { ...s.look, head: 'head_leaf_crown', back: 'back_bat_wings' };
      return s;
    };

    it('新しいセーブには新しい印がない', () => {
      expect(createInitialSave().newCosmetics).toEqual([]);
    });

    it('新しい印と小物の着用は保存して読み直しても残る', () => {
      const back = deserializeSave(serializeSave(wearing()));
      expect(back.newCosmetics).toEqual(['head_leaf_crown']);
      expect(back.look.head).toBe('head_leaf_crown');
      expect(back.look.back).toBe('back_bat_wings');
    });

    it.each([
      ['新しい印のない古いセーブ', undefined],
      ['新しい印が壊れたセーブ', 'oops'],
    ])('%sは、新しい印を空にして読む', (_, value) => {
      const data = rawSave(wearing());
      if (value === undefined) delete data.newCosmetics;
      else data.newCosmetics = value;
      expect(deserializeSave(JSON.stringify(data)).newCosmetics).toEqual([]);
    });

    it('新しい印のうち、知らない物と持っていない物は読み直すと消える', () => {
      const data = rawSave(wearing());
      data.newCosmetics = ['head_leaf_crown', 'unknown', 'pet_dragon'];
      expect(deserializeSave(JSON.stringify(data)).newCosmetics).toEqual(['head_leaf_crown']);
    });
  });

  describe('開発中に名前を変えた小物（氷の冠・頭の星の輪）を持つセーブ', () => {
    const renamed = () => {
      const s = createInitialSave();
      const data = rawSave(s);
      data.cosmetics = ['head_ice_crown', 'head_star_ring', 'head_leaf_crown'];
      data.newCosmetics = ['head_star_ring', 'head_leaf_crown'];
      data.look = { ...s.look, head: 'head_star_ring', back: 'head_ice_crown' };
      data.endless = { ...s.endless, bestLoop: starRingLoop() };
      return deserializeSave(JSON.stringify(data));
    };

    it('読めて、古い名前の小物は持ち物・新しい印・着用から消える', () => {
      const back = renamed();
      expect(back.cosmetics).toEqual(['head_leaf_crown']);
      expect(back.newCosmetics).toEqual(['head_leaf_crown']);
      expect(back.look.head).toBeNull();
      expect(back.look.back).toBeNull();
    });

    it('星の輪は起動時に配り直す', () => {
      expect(grantCosmetics(renamed())).toEqual(['back_star_ring']);
    });
  });

  describe('もらい方の文', () => {
    it('地域の小物は「地域で★1（★1の周回のボスを倒す）」', () => {
      expect(cosmeticCondition(getCosmetic('head_leaf_crown')!)).toBe(
        `草原で★1（${STAR1_LOOPS}周目のボスを倒す）`,
      );
      expect(cosmeticCondition(getCosmetic('back_demon_wings')!)).toBe(
        `魔王城で★1（${STAR1_LOOPS}周目のボスを倒す）`,
      );
    });

    it('星の輪は「エンドレスで N周目に着く」', () => {
      expect(cosmeticCondition(getCosmetic('back_star_ring')!)).toBe(
        `エンドレスで${starRingLoop()}周目に着く`,
      );
    });

    it('順位の見た目は「順位帯でもらえる」', () => {
      expect(cosmeticCondition(getCosmetic('hero_gold')!)).toBe(
        t('{band}でもらえる', { band: t(RANK_REWARDS.top1.label) }),
      );
    });
  });
});

describe('設定の「デバッグ機能」（見た目を全部試せる）', () => {
  it('新しいセーブでは OFF', () => {
    expect(createInitialSave().settings.debug).toBe(false);
  });

  it.each([
    ['壊れた値', 'yes'],
    ['値がない', undefined],
  ])('%sは OFF として読む', (_, value) => {
    const data = rawSave() as { settings: Record<string, unknown> };
    if (value === undefined) delete data.settings.debug;
    else data.settings.debug = value;
    expect(deserializeSave(JSON.stringify(data)).settings.debug).toBe(false);
  });

  it('ON は保存して読み直しても残る', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    expect(deserializeSave(serializeSave(s)).settings.debug).toBe(true);
  });

  it('OFF のときは全部持っている扱いにならない', () => {
    expect(looksAllOpen(createInitialSave(), true)).toBe(false);
  });

  it('ON で、その版で使えるときは全部持っている扱い', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    expect(looksAllOpen(s, true)).toBe(true);
  });

  it('出す版では、ON のままのセーブでも全部持っている扱いにならない', () => {
    const s = createInitialSave();
    s.settings.debug = true;
    expect(looksAllOpen(s, false)).toBe(false);
  });

  describe('持っていない見た目を着けたとき', () => {
    /** ON, owning only the leaf mark, wearing something in every place */
    const dressed = () => {
      const s = createInitialSave();
      s.cosmetics = ['head_leaf_crown'];
      s.settings.debug = true;
      s.look = {
        ...s.look,
        hero: 'hero_gold',
        head: 'head_leaf_crown',
        back: 'back_star_ring',
        pet: 'pet_dragon',
        deco: 'deco_crown_gold',
      };
      return s;
    };

    it('ON のあいだは、読み直しても外れない', () => {
      const s = dressed();
      const back = deserializeSave(serializeSave(s));
      fixLook(back, true);
      expect(back.look).toEqual(s.look);
    });

    it('OFF にすると、本当に持っている物だけが残る', () => {
      const back = deserializeSave(serializeSave(dressed()));
      back.settings.debug = false;
      fixLook(back, true);
      expect(back.look).toEqual({
        hero: null,
        head: 'head_leaf_crown',
        back: null,
        pet: null,
        deco: null,
      });
    });

    it('出す版では、ON のままのセーブも OFF として外す', () => {
      const s = dressed();
      fixLook(s, false);
      expect(s.look.back).toBeNull();
      expect(s.look.head).toBe('head_leaf_crown');
    });
  });

  it('ランキングに送る名前の飾りは、ON でも本当に持っている物だけ', () => {
    expect(COSMETICS.some((c) => c.id === 'deco_crown_gold')).toBe(true);
    const s = createInitialSave();
    s.settings.debug = true;
    s.look.deco = 'deco_crown_gold';
    expect(rankingDeco(s)).toBeNull();
    s.cosmetics = ['deco_crown_gold'];
    expect(rankingDeco(s)).toBe('deco_crown_gold');
  });

  it('名前の飾りを着けていなければ、ランキングに飾りを送らない', () => {
    const s = createInitialSave();
    s.cosmetics = ['deco_crown_gold'];
    s.look.deco = null;
    expect(rankingDeco(s)).toBeNull();
  });
});
