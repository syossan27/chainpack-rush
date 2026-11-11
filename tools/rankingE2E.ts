// ランキングの通し確認（Firebase エミュレーター上で、送信 → 記録 → 順位 → 不正の拒否）。
// 使い方: cd functions && npm run build && cd .. &&
//   npx firebase emulators:exec --only functions,firestore,auth --project demo-chainpack-rush "npx tsx tools/rankingE2E.ts"
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { Combat, type RunConfig } from '../src/core/combat';
import { createInitialSave } from '../src/core/save';
import { heroStats, itemMap, totalStars } from '../src/core/economy';
import { buildSubmission, endlessSeason } from '../src/core/ranking';

const app = initializeApp({ apiKey: 'demo', projectId: 'demo-chainpack-rush', appId: 'demo' });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const fns = getFunctions(app, 'asia-northeast1');
connectFunctionsEmulator(fns, '127.0.0.1', 5001);
const call = <T>(name: string, data: unknown) =>
  httpsCallable<unknown, T>(fns, name)(data).then((r) => r.data);

let failed = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  console.log(
    `${ok ? 'OK ' : 'NG '} ${label}${detail !== undefined ? ` ${JSON.stringify(detail)}` : ''}`,
  );
  if (!ok) failed++;
};

await signInAnonymously(auth);
const s = createInitialSave();
const cfg: RunConfig = {
  seed: 1234,
  regionId: 'endless',
  loadout: s.loadout,
  items: itemMap(s),
  hero: heroStats(s),
  consumableSlots: 3,
};
const c = new Combat(cfg);
while (!c.ended) {
  if (c.tick === 120) c.useConsumable(0);
  c.step();
}
const season = endlessSeason(Date.now());
const sub = buildSubmission('endless', season, cfg, c.result(), s, totalStars(s));

check(
  '名前を設定',
  (await call<{ name: string }>('setName', { a: 1, b: 2, tag: 7 })).name.length > 0,
);
const r1 = await call<{ accepted: boolean; best?: boolean }>('submitScore', sub);
check('正しい記録は受け付けて、自己ベストになる', r1.accepted && r1.best === true, r1);
const me = await call<{ rank: number | null; total: number }>('myRank', {
  mode: 'endless',
  season,
});
check('自分の順位が出る', me.rank === 1 && me.total === 1, me);

// 続けて送ると間隔の制限ではじかれる
let limited = false;
try {
  await call('submitScore', sub);
} catch (e) {
  limited = String((e as Error).message).includes('too fast');
}
check('続けて送ると、間隔の制限ではじく', limited);

// 結果を盛った記録（間隔をあけてから）
await new Promise((r) => setTimeout(r, 15_500));
const fake = JSON.parse(JSON.stringify(sub));
fake.claim.totalDamage *= 3;
const r2 = await call<{ accepted: boolean; reason?: string }>('submitScore', fake);
check('結果を盛った記録ははじく', !r2.accepted && r2.reason === 'mismatch', r2);

console.log(failed === 0 ? 'ALL OK' : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
