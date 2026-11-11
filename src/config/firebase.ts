// Firebase の設定値（コンソールの「プロジェクトの設定 → マイアプリ → Web アプリ」の firebaseConfig）。
// アプリに埋め込まれる公開してよい値で、秘密の鍵ではない。null の間はランキングを使わない
export const FIREBASE_CONFIG: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
} | null = null;

/** Cloud Functions を置く場所（functions/src/index.ts と同じ） */
export const FUNCTIONS_REGION = 'asia-northeast1';
