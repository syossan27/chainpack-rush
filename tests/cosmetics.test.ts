import { describe, expect, it } from 'vitest';
import { COSMETICS, cosmeticsForBand, ownedFromRewards, validLook } from '../src/core/cosmetics';
import { createInitialSave, deserializeSave, serializeSave } from '../src/core/save';

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
      pet: null, // not owned
      deco: null, // wrong kind
    });
  });

  it('保存して読み直しても残り、知らない物や持っていない物は消える', () => {
    const s = createInitialSave();
    s.cosmetics = cosmeticsForBand('top1');
    s.look = { hero: 'hero_gold', pet: 'pet_dragon', deco: 'deco_crown_gold' };
    const back = deserializeSave(serializeSave(s));
    expect(back.cosmetics).toEqual(s.cosmetics);
    expect(back.look).toEqual(s.look);

    const raw = JSON.parse(serializeSave(s)) as Record<string, unknown>;
    const data = (raw.data ?? raw) as Record<string, unknown>;
    data.cosmetics = ['deco_medal', 'unknown_thing'];
    data.look = { hero: 'hero_gold', pet: null, deco: 'deco_medal' };
    const broken = deserializeSave(JSON.stringify(raw));
    expect(broken.cosmetics).toEqual(['deco_medal']);
    expect(broken.look).toEqual({ hero: null, pet: null, deco: 'deco_medal' });
  });
});
