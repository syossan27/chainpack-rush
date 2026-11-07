// シード付き乱数（mulberry32）

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [0, n) の整数 */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[this.int(arr.length)]!;
  }

  /** [値, 重み] の組から重み付きで選ぶ */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = this.next() * total;
    for (const [v, w] of entries) {
      r -= w;
      if (r < 0) return v;
    }
    return entries[entries.length - 1]![0];
  }

  /** 重複なしで k 個選ぶ（順序は元の配列順に揃える） */
  sample<T>(arr: readonly T[], k: number): T[] {
    const pool = arr.slice();
    const chosen = new Set<T>();
    for (let i = 0; i < k && pool.length > 0; i++) {
      const idx = this.int(pool.length);
      chosen.add(pool[idx]!);
      pool.splice(idx, 1);
    }
    return arr.filter((x) => chosen.has(x));
  }

  getState(): number {
    return this.state;
  }
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
