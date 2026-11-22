import { describe, expect, it } from 'vitest';
import { FIELD, NO_LUCK, PROGRESS } from '../../src/config/balance';
import { heroStats, regionStars, totalStars } from '../../src/core/economy';
import { createInitialSave } from '../../src/core/save';
import { rarityWeights } from '../../src/core/loot';
import { Combat } from '../../src/core/combat';
import { REGIONS, bossPoolForLoop, getRegion } from '../../src/data/regions';
import { groupSpan, rollLoop } from '../../src/core/layout';
import { Rng } from '../../src/core/rng';
import { ARCHETYPES, buildReference } from '../../tools/referenceBoards';
import { referenceHeroStats } from '../../tools/simLib';

/** Forty loops of every region, rolled in order as a run would (seed 7) */
const rolls = REGIONS.flatMap((r) => {
  const rng = new Rng(7);
  let prevBoss: string | undefined;
  return Array.from({ length: 40 }, (_, i) => {
    const loop = i + 1;
    const l = rollLoop(r, loop, rng, prevBoss);
    const roll = { region: r, loop, l, prevBoss };
    prevBoss = l.bossId;
    return roll;
  });
});
const groups = rolls.flatMap(({ region, loop, l }) =>
  l.groups.map((g, i) => ({ region, loop, g, prev: l.groups[i - 1] })),
);
const where = (x: { region: { id: string }; loop: number }) => `${x.region.id}/${x.loop}`;
const endOf = (g: { x: number; enemies: readonly string[] }) => g.x + groupSpan(g.enemies.length);

describe('regions（周回ごとの抽選）', () => {
  it('群れの数は地域ごとに決まっている', () => {
    const wrong = rolls.filter((x) => x.l.groups.length !== x.region.groupCount);
    expect(wrong.map(where)).toEqual([]);
  });

  it('群れの大きさは地域の範囲に収まる', () => {
    const wrong = groups.filter(
      (x) =>
        x.g.enemies.length < x.region.groupSize[0] || x.g.enemies.length > x.region.groupSize[1],
    );
    expect(wrong.map(where)).toEqual([]);
  });

  it('前の群れの最後尾から次の先頭まで、FIELD.minGroupGap 以上あく', () => {
    const tooClose = groups.filter((x) => x.prev && x.g.x - endOf(x.prev) < FIELD.minGroupGap);
    expect(tooClose.map(where)).toEqual([]);
  });

  it('最後の群れからボスまでも、FIELD.minGroupGap 以上あく', () => {
    const tooClose = rolls.filter((x) => x.l.bossX - endOf(x.l.groups.at(-1)!) < FIELD.minGroupGap);
    expect(tooClose.map(where)).toEqual([]);
  });

  it('上限つきの雑魚は、1つの群れに上限までしか出ない', () => {
    const over = groups.filter((x) =>
      x.region.mobs.some(
        (m) =>
          m.maxPerGroup !== undefined &&
          x.g.enemies.filter((id) => id === m.id).length > m.maxPerGroup,
      ),
    );
    expect(over.map(where)).toEqual([]);
  });

  it('群れに出るのは、その地域の雑魚だけ', () => {
    const strangers = groups.filter((x) =>
      x.g.enemies.some((id) => !x.region.mobs.some((m) => m.id === id)),
    );
    expect(strangers.map(where)).toEqual([]);
  });

  it('ボスはその周回の候補から選ばれる', () => {
    const wrong = rolls.filter((x) => !bossPoolForLoop(x.region, x.loop).includes(x.l.bossId));
    expect(wrong.map(where)).toEqual([]);
  });

  it('候補が2体以上なら、前の周回と同じボスは続かない', () => {
    const repeats = rolls.filter(
      (x) =>
        bossPoolForLoop(x.region, x.loop).length > 1 && x.prevBoss && x.l.bossId === x.prevBoss,
    );
    expect(repeats.map(where)).toEqual([]);
  });

  it('シードが違えば並びも変わる', () => {
    const r = REGIONS[0]!;
    const a = JSON.stringify(rollLoop(r, 1, new Rng(1)));
    const differs = [2, 3, 4, 5, 6].some((k) => JSON.stringify(rollLoop(r, 1, new Rng(k))) !== a);
    expect(differs).toBe(true);
  });

  it('参考配置のランで、画面内の敵は同時に FIELD.maxOnScreen 体以内（ボスと取り巻きを含む）', () => {
    const hero = referenceHeroStats();
    const over: string[] = [];
    for (const ref of ARCHETYPES) {
      const { loadout, items } = buildReference(ref);
      for (const r of REGIONS) {
        for (const seed of [1, 2, 3, 4, 5]) {
          const c = new Combat({
            seed,
            regionId: r.id,
            loadout,
            items,
            hero,
            rules: { keepCountOnKill: true },
          });
          let max = 0;
          while (!c.ended) {
            c.step();
            const n = c.enemies.filter(
              (e) =>
                e.alive && e.x - c.heroX <= FIELD.viewRange && c.heroX - e.x <= FIELD.viewBehind,
            ).length;
            max = Math.max(max, n);
          }
          if (max > FIELD.maxOnScreen) over.push(`${ref.id}/${r.id}/${seed}: ${max}`);
        }
      }
    }
    expect(over).toEqual([]);
  });
});

/** Each region next to the one after it, in the order they open */
const deeper = REGIONS.slice(1).map((b, i) => [REGIONS[i]!.id, b.id, REGIONS[i]!, b] as const);

describe('地域の強さと戦利品: 奥の地域ほど', () => {
  it.each(deeper)('%s → %s: 敵の体力と攻撃の倍率が上がる', (_a, _b, a, b) => {
    expect(b.power.hp).toBeGreaterThan(a.power.hp);
    expect(b.power.atk).toBeGreaterThan(a.power.atk);
  });

  it.each(deeper)('%s → %s: コモンが出にくくなる', (_a, _b, a, b) => {
    expect(b.loot.rarity[0]).toBeLessThan(a.loot.rarity[0]);
  });

  it.each(deeper)('%s → %s: レジェンダリーは出にくくならない', (_a, _b, a, b) => {
    expect(b.loot.rarity[3]).toBeGreaterThanOrEqual(a.loot.rarity[3]);
  });

  it.each(deeper)('%s → %s: アーティファクトは出にくくならない', (_a, _b, a, b) => {
    expect(b.loot.artifactMult).toBeGreaterThanOrEqual(a.loot.artifactMult);
  });
});

describe('地域の強さと戦利品', () => {
  const { loadout, items } = buildReference(ARCHETYPES[0]!);
  /** The first ordinary enemy's HP and attack against its own definition */
  const powerOf = (regionId: string) => {
    const c = new Combat({
      seed: 1,
      regionId,
      loadout,
      items,
      hero: referenceHeroStats(),
      luck: NO_LUCK,
    });
    const e = c.enemies.find((x) => !x.def.boss)!;
    return { hp: e.maxHp / e.def.hp, atk: e.atk / e.def.atk };
  };

  it.each(REGIONS.map((r) => r.id))('%s の雑魚には、地域の体力と攻撃の倍率がかかる', (regionId) => {
    const r = getRegion(regionId);
    const v = powerOf(regionId);
    expect(v.hp).toBeCloseTo(r.power.hp);
    expect(v.atk).toBeCloseTo(r.power.atk);
  });

  /** The rarest rarity that can come at loop 10 */
  const top = (id: string, boss = false) =>
    rarityWeights(10, boss, getRegion(id).loot).reduce((b, [r, w]) => (w > 0 ? r : b), 'common');

  it.each([
    ['grassland', false, 'epic'],
    ['grassland', true, 'epic'],
    ['cave', false, 'epic'],
    ['cave', true, 'legendary'],
    ['rampart', false, 'legendary'],
  ] as const)(
    '地域ごとにレアリティの上限がある（草原・洞窟はエピックまで、洞窟のボスはまれにレジェンダリー、城壁からレジェンダリー）: %s ボス=%s → %s',
    (regionId, boss, rarity) => {
      expect(top(regionId, boss)).toBe(rarity);
    },
  );

  it('周回が進むとコモンが出にくくなる', () => {
    const w = (loop: number) =>
      Object.fromEntries(rarityWeights(loop, false, getRegion('grassland').loot));
    expect(w(5).common).toBeLessThan(w(1).common);
  });

  it('周回が進んでも、地域のレアリティの上限は超えない', () => {
    const g = Object.fromEntries(rarityWeights(5, false, getRegion('grassland').loot));
    expect(g.legendary).toBe(0);
  });

  it.each(REGIONS.map((r) => r.id))('%s のレアリティの重みは足して1', (regionId) => {
    const sum = rarityWeights(3, false, getRegion(regionId).loot).reduce((s, [, w]) => s + w, 0);
    expect(sum).toBeCloseTo(1);
  });

  it.each(['grassland', 'cave'])(
    'アーティファクトはレジェンダリーより厳しい: %s では出ない',
    (regionId) => {
      expect(getRegion(regionId).loot.artifactMult).toBe(0);
    },
  );

  it('城壁ではアーティファクトが出る', () => {
    expect(getRegion('rampart').loot.artifactMult).toBeGreaterThan(0);
  });

  it('下限より上がない地域でも、下限のレアリティで出る（黄金ゴブリンの1個目は草原でもエピック）', () => {
    const w = Object.fromEntries(rarityWeights(1, true, getRegion('grassland').loot, 'legendary'));
    expect(w.legendary).toBe(1);
  });
});

describe('地域の★', () => {
  const [firstStar] = PROGRESS.starLoops;

  it('★の周目のボスを倒す（次の周目に着く）と★がつく', () => {
    const s = createInitialSave();
    s.progress.best.grassland = firstStar! + 1;
    expect(regionStars(s, 'grassland')).toBe(1);
  });

  it('★の周目に着いただけ（ボスはまだ）では★はつかない', () => {
    const s = createInitialSave();
    s.progress.best.grassland = firstStar!;
    expect(regionStars(s, 'grassland')).toBe(0);
  });

  it('★の周目をすべて越えると、その地域の★は PROGRESS.starLoops の数', () => {
    const s = createInitialSave();
    s.progress.best.cave = PROGRESS.starLoops.at(-1)! + 1;
    expect(regionStars(s, 'cave')).toBe(PROGRESS.starLoops.length);
  });

  it('★の合計は、地域ごとの★を足したもの', () => {
    const s = createInitialSave();
    s.progress.best.grassland = firstStar! + 1;
    s.progress.best.cave = PROGRESS.starLoops.at(-1)! + 1;
    expect(totalStars(s)).toBe(regionStars(s, 'grassland') + regionStars(s, 'cave'));
  });

  it('★1つごとに、攻撃が PROGRESS.starAttack、最大HPが PROGRESS.starHp 上がる', () => {
    const s = createInitialSave();
    const base = heroStats(s);
    s.progress.best.grassland = firstStar! + 1;
    s.progress.best.cave = PROGRESS.starLoops.at(-1)! + 1;
    const stars = totalStars(s);
    const hs = heroStats(s);
    expect(stars).toBeGreaterThan(1);
    expect(hs.attackMult - base.attackMult).toBeCloseTo(stars * PROGRESS.starAttack);
    expect(hs.maxHp - base.maxHp).toBe(stars * PROGRESS.starHp);
  });
});

describe('敵の絵', () => {
  it('どの地域の敵（ボス・お供も）にも絵がある', async () => {
    const { REGIONS } = await import('../../src/data/regions');
    const { UNIT_SPRITES } = await import('../../src/data/sprites');
    const { getEnemyDef } = await import('../../src/data/enemies');
    for (const r of REGIONS) {
      const ids = [...r.mobs.map((m) => m.id), ...r.bossPools.flat()];
      for (const b of r.bossPools.flat()) {
        const e = getEnemyDef(b).escortId;
        if (e) ids.push(e);
      }
      for (const id of ids) expect(UNIT_SPRITES[id], id).toBeDefined();
    }
  });
});
