# Web で公開する（Firebase Hosting）

ゲームを普通の Web ページとして公開して、家族や友人に遊んでもらうための手順。
Claude のアカウントは要らず、スマホの Chrome・Safari でも PC でも開ける。ホーム画面に追加すると、アプリのように全画面で開く。

- 費用: Hosting は無料のプラン（Spark）でも使える。家族や友人に遊んでもらう程度なら0円。
- 公開されるのは試遊版（`npm run build:trial`。2週替わりの挑戦が開いた状態）。リリースのときは通常の `npm run build` に戻す。
- セーブは端末のブラウザに残る（端末やブラウザを変えると別のセーブになる）。

## 1. はじめの1回だけ

1. Firebase のプロジェクトを作る（`docs/ranking-server-setup.md` の 1-1。ランキングと同じプロジェクトでよい）。
2. 自分の PC に Node.js を入れて、Firebase のツールを入れる。
   ```bash
   npm install -g firebase-tools
   ```
3. ログインする（ブラウザが開くので、Google アカウントでログイン）。
   ```bash
   firebase login
   ```
4. リポジトリを手元に取ってきて、使うプロジェクトを選ぶ（プロジェクト ID は Firebase のコンソールのプロジェクトの設定に出ている）。
   ```bash
   git clone https://github.com/syossan27/chainpack-rush.git
   cd chainpack-rush
   git checkout claude/zealous-newton-kv0quu
   npm install
   firebase use --add
   ```

## 2. 公開する（更新するたびに）

```bash
git pull
npm install
firebase deploy --only hosting
```

終わると `Hosting URL: https://<プロジェクトID>.web.app` と出る。そのURLを送れば、誰でも遊べる。

- ビルド（`npm run build:trial`）は、公開の前に自動で行われる（`firebase.json` の `predeploy`）。
- ランキングのサーバー（Cloud Functions）を反映するときは、Blaze のプランが必要（`docs/ranking-server-setup.md`）。Hosting だけなら要らない。
