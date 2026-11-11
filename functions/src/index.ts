// ランキングのサーバー（Cloud Functions for Firebase）。
// 書き込みはすべてここから（ゲームから Firestore へ直接は書けない。firestore.rules を参照）。
//
// - submitScore: 自己ベストを受け付ける。ゲームと同じ計算（src/core）でランを再生し、結果が一致したときだけ記録する
// - setName: 表示名（決まった言葉の組み合わせ）を設定する
// - setDeco: ランキングで名前の横に出す飾りを選ぶ（挑戦の上位でもらった物だけ）
// - myRank: 自分の順位と参加人数
// - buildBoards（5分ごと）: 上位100人の表を作り直す
// - grantRewards（毎日）: 終わったシーズンの順位帯ごとに報酬を配る。ゲームは claimRewards で受け取る
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import { challengeStart, currentChallenge } from '../../src/core/challenge';
import {
  endlessSeason,
  verifySubmission,
  type RankMode,
  type ScoreSubmission,
} from '../../src/core/ranking';
import { rewardBand, validName, type DisplayName } from '../../src/core/names';
import { getCosmetic, ownedFromRewards } from '../../src/core/cosmetics';

initializeApp();
setGlobalOptions({ region: 'asia-northeast1', maxInstances: 10 });

/** App Check を設定し終えたら true にする（不正な端末からの送信をはじく） */
const ENFORCE_APP_CHECK = false;
/** 同じ人が続けて送れる間隔 */
const SUBMIT_INTERVAL_MS = 15_000;
const TOP_N = 100;

const db = (): Firestore => getFirestore();
const seasonId = (mode: RankMode, n: number) => `${mode}-${n}`;

function uidOf(req: { auth?: { uid: string } }): string {
  if (!req.auth) throw new HttpsError('unauthenticated', 'login required');
  return req.auth.uid;
}

export const submitScore = onCall(
  { enforceAppCheck: ENFORCE_APP_CHECK, memory: '512MiB', timeoutSeconds: 30 },
  async (req) => {
    const uid = uidOf(req);
    const sub = req.data as ScoreSubmission;
    if (typeof sub !== 'object' || sub === null) throw new HttpsError('invalid-argument', 'bad');
    const now = Date.now();
    const playerRef = db().doc(`players/${uid}`);
    // 送信の回数制限
    const player = await playerRef.get();
    const last = player.get('lastSubmit') as number | undefined;
    if (last && now - last < SUBMIT_INTERVAL_MS)
      throw new HttpsError('resource-exhausted', 'too fast');
    await playerRef.set({ lastSubmit: now }, { merge: true });

    const v = verifySubmission(sub, now, challengeStart());
    if (!v.ok) {
      await db()
        .collection('rejected')
        .add({ uid, reason: v.reason, at: now, mode: sub.mode ?? null });
      return { accepted: false, reason: v.reason };
    }
    const sid = seasonId(sub.mode, sub.season);
    const entryRef = db().doc(`seasons/${sid}/entries/${uid}`);
    const best = await db().runTransaction(async (tx) => {
      const cur = await tx.get(entryRef);
      const prev = (cur.get('score') as number | undefined) ?? -1;
      if (v.score <= prev) return false;
      tx.set(
        db().doc(`seasons/${sid}`),
        { mode: sub.mode, season: sub.season, updatedAt: now },
        { merge: true },
      );
      tx.set(entryRef, {
        score: v.score,
        totalDamage: v.totalDamage,
        reachedLoop: v.reachedLoop,
        // Word ids, not text: each client shows the name in its own language
        name: (player.get('nameParts') as DisplayName | undefined) ?? null,
        deco: (player.get('deco') as string | undefined) ?? null,
        at: now,
      });
      return true;
    });
    return { accepted: true, best };
  },
);

export const setName = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const uid = uidOf(req);
  const n = req.data as DisplayName;
  if (!validName(n)) throw new HttpsError('invalid-argument', 'bad name');
  const name: DisplayName = { a: n.a, b: n.b, tag: n.tag };
  await db().doc(`players/${uid}`).set({ nameParts: name }, { merge: true });
  return { name };
});

/**
 * Pick the decoration shown next to your name in the ranking (null = none).
 * Only decorations earned from challenge rewards on this server are accepted.
 * Entries of the running seasons are updated too, so the boards show it within minutes.
 */
export const setDeco = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const uid = uidOf(req);
  const deco = (req.data as { deco?: unknown } | null)?.deco ?? null;
  if (deco !== null) {
    if (typeof deco !== 'string' || getCosmetic(deco)?.kind !== 'deco')
      throw new HttpsError('invalid-argument', 'bad deco');
    const rewards = await db().collection(`players/${uid}/rewards`).get();
    const owned = ownedFromRewards(
      rewards.docs.map((d) => ({
        season: d.get('season') as string,
        band: d.get('band') as string,
      })),
    );
    if (!owned.includes(deco)) throw new HttpsError('permission-denied', 'not owned');
  }
  await db().doc(`players/${uid}`).set({ deco }, { merge: true });
  const batch = db().batch();
  for (const sid of activeSeasons(Date.now())) {
    const ref = db().doc(`seasons/${sid}/entries/${uid}`);
    if ((await ref.get()).exists) batch.update(ref, { deco });
  }
  await batch.commit();
  return { deco };
});

/** 自分の順位（スコアが自分より上の人数＋1）と参加人数 */
export const myRank = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const uid = uidOf(req);
  const { mode, season } = req.data as { mode: RankMode; season: number };
  if ((mode !== 'challenge' && mode !== 'endless') || !Number.isInteger(season))
    throw new HttpsError('invalid-argument', 'bad');
  const col = db().collection(`seasons/${seasonId(mode, season)}/entries`);
  const me = await col.doc(uid).get();
  const total = (await col.count().get()).data().count;
  if (!me.exists) return { rank: null, total };
  const above = (await col.where('score', '>', me.get('score')).count().get()).data().count;
  return { rank: above + 1, total, score: me.get('score') as number };
});

/** 今のシーズン（挑戦は今と1つ前、エンドレスは今月） */
function activeSeasons(now: number): string[] {
  const out = [seasonId('endless', endlessSeason(now))];
  const ch = currentChallenge(now, challengeStart());
  if (ch) {
    out.push(seasonId('challenge', ch.period));
    if (ch.period > 0) out.push(seasonId('challenge', ch.period - 1));
  }
  return out;
}

export const buildBoards = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'Asia/Tokyo' },
  async () => {
    const now = Date.now();
    for (const sid of activeSeasons(now)) {
      const col = db().collection(`seasons/${sid}/entries`);
      const snap = await col.orderBy('score', 'desc').limit(TOP_N).get();
      const total = (await col.count().get()).data().count;
      const top = snap.docs.map((d, i) => ({
        rank: i + 1,
        // null = no name chosen (the client shows its own word for an unnamed adventurer)
        name: (d.get('name') as DisplayName | null) ?? null,
        deco: (d.get('deco') as string | null | undefined) ?? null,
        score: d.get('score') as number,
        totalDamage: d.get('totalDamage') as number,
        reachedLoop: d.get('reachedLoop') as number,
      }));
      await db().doc(`seasons/${sid}/board/top`).set({ top, total, at: now });
    }
  },
);

/** 終わったシーズンの報酬を配る（シーズンごとに1回） */
export const grantRewards = onSchedule(
  { schedule: 'every day 05:00', timeZone: 'Asia/Tokyo' },
  async () => {
    const now = Date.now();
    const active = new Set(activeSeasons(now));
    const seasons = await db().collection('seasons').where('rewarded', '==', null).get();
    // rewarded が無いものは null 比較に引っかからないので、全部見て絞る
    const all = seasons.empty ? await db().collection('seasons').get() : seasons;
    for (const s of all.docs) {
      if (active.has(s.id) || s.get('rewarded') === true) continue;
      const entries = await db()
        .collection(`seasons/${s.id}/entries`)
        .orderBy('score', 'desc')
        .get();
      const total = entries.size;
      let batch = db().batch();
      let n = 0;
      for (const [i, e] of entries.docs.entries()) {
        batch.set(db().doc(`players/${e.id}/rewards/${s.id}`), {
          season: s.id,
          rank: i + 1,
          total,
          band: rewardBand(i + 1, total),
          claimed: false,
          at: now,
        });
        if (++n >= 400) {
          await batch.commit();
          batch = db().batch();
          n = 0;
        }
      }
      batch.set(s.ref, { rewarded: true, rewardedAt: now }, { merge: true });
      await batch.commit();
    }
  },
);

/** まだ受け取っていない報酬を返して、受け取り済みにする */
export const claimRewards = onCall({ enforceAppCheck: ENFORCE_APP_CHECK }, async (req) => {
  const uid = uidOf(req);
  const col = db().collection(`players/${uid}/rewards`);
  const snap = await col.where('claimed', '==', false).get();
  const out = snap.docs.map((d) => ({
    season: d.get('season') as string,
    rank: d.get('rank') as number,
    total: d.get('total') as number,
    band: d.get('band') as string,
  }));
  const batch = db().batch();
  for (const d of snap.docs)
    batch.update(d.ref, { claimed: true, claimedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { rewards: out };
});
