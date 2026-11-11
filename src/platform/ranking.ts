// ランキングの送受信（Firebase）。設定値（src/config/firebase.ts）が入るまでは何もしない。
// 端末ごとに匿名でログインする（プレイヤーに登録やログインはしてもらわない）
import { FIREBASE_CONFIG, FUNCTIONS_REGION } from '../config/firebase';
import type { RankMode, ScoreSubmission } from '../core/ranking';
import { NAME_FIRST, NAME_SECOND, type DisplayName, type RewardBand } from '../core/names';

export interface BoardRow {
  rank: number;
  /** Name as word ids (shown in the viewer's language); null = never picked */
  name: DisplayName | null;
  /** Name decoration (cosmetic id) or null */
  deco?: string | null;
  score: number;
  totalDamage: number;
  reachedLoop: number;
}
export interface Board {
  top: BoardRow[];
  total: number;
  at: number;
}
export interface SeasonReward {
  season: string;
  rank: number;
  total: number;
  band: RewardBand;
}

export function rankingReady(): boolean {
  return FIREBASE_CONFIG !== null;
}

type Fb = {
  call: <T>(name: string, data: unknown) => Promise<T>;
  board: (sid: string) => Promise<Board | null>;
};
let fb: Promise<Fb> | null = null;

/** Firebase を必要になったときに読み込んで、匿名でログインする */
function connect(): Promise<Fb> {
  if (!FIREBASE_CONFIG) return Promise.reject(new Error('ranking not configured'));
  fb ??= (async () => {
    const [{ initializeApp }, auth, fns, store] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/functions'),
      import('firebase/firestore'),
    ]);
    const app = initializeApp(FIREBASE_CONFIG!);
    const a = auth.getAuth(app);
    if (!a.currentUser) await auth.signInAnonymously(a);
    const functions = fns.getFunctions(app, FUNCTIONS_REGION);
    const db = store.getFirestore(app);
    return {
      call: async <T>(name: string, data: unknown) =>
        (await fns.httpsCallable<unknown, T>(functions, name)(data)).data,
      board: async (sid: string) => {
        const d = await store.getDoc(store.doc(db, `seasons/${sid}/board/top`));
        return d.exists() ? (d.data() as Board) : null;
      },
    };
  })().catch((e: unknown) => {
    fb = null; // 次にもう一度試す
    throw e;
  });
  return fb;
}

const sid = (mode: RankMode, season: number) => `${mode}-${season}`;

/** 自己ベストを送る。結果: 'best' 記録された / 'kept' 前の記録のほうが上 / 'rejected' 確認で合わなかった / 'offline' */
export async function submitScore(
  sub: ScoreSubmission,
): Promise<'best' | 'kept' | 'rejected' | 'offline'> {
  if (!rankingReady()) return 'offline';
  try {
    const c = await connect();
    const r = await c.call<{ accepted: boolean; best?: boolean }>('submitScore', sub);
    return !r.accepted ? 'rejected' : r.best ? 'best' : 'kept';
  } catch {
    return 'offline';
  }
}

export async function fetchBoard(mode: RankMode, season: number): Promise<Board | null> {
  if (!rankingReady()) return null;
  try {
    return await (await connect()).board(sid(mode, season));
  } catch {
    return null;
  }
}

export async function fetchMyRank(
  mode: RankMode,
  season: number,
): Promise<{ rank: number | null; total: number; score?: number } | null> {
  if (!rankingReady()) return null;
  try {
    return await (await connect()).call('myRank', { mode, season });
  } catch {
    return null;
  }
}

export async function saveName(n: DisplayName): Promise<DisplayName | null> {
  if (!rankingReady()) return null;
  try {
    return (await (await connect()).call<{ name: DisplayName }>('setName', n)).name;
  } catch {
    return null;
  }
}

/** Choose the name decoration others see in the ranking (the server checks you earned it) */
export async function saveDeco(deco: string | null): Promise<boolean> {
  if (!rankingReady()) return false;
  try {
    await (await connect()).call('setDeco', { deco });
    return true;
  } catch {
    return false;
  }
}

/** 終わったシーズンの報酬を受け取る（受け取った分はサーバーで受け取り済みになる） */
export async function claimSeasonRewards(): Promise<SeasonReward[]> {
  if (!rankingReady()) return [];
  try {
    return (await (await connect()).call<{ rewards: SeasonReward[] }>('claimRewards', {})).rewards;
  } catch {
    return [];
  }
}

/** 表示名がまだなければ、ランダムな言葉の組み合わせで決めて送る */
export async function ensureName(save: { rankName: DisplayName | null }): Promise<void> {
  if (save.rankName || !rankingReady()) return;
  const n = randomName();
  if ((await saveName(n)) !== null) save.rankName = n;
}

export function randomName(): DisplayName {
  const r = (n: number) => Math.floor(Math.random() * n);
  return { a: r(NAME_FIRST.length), b: r(NAME_SECOND.length), tag: r(10000) };
}
