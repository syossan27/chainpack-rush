# Chainpack Rush — 30-Second Loot Chains

バックパックに並べた装備が連鎖して自動で戦う、30秒ハクスラ（iOS / Android、Capacitor + Phaser 3）。

## 開発

```bash
npm install
npm run dev        # LAN 公開。スマホのブラウザで http://<PCのIP>:5173 を開いて確認
npm test           # Vitest（src/core のロジック）
npm run build      # 型チェック + 本番ビルド（dist/）
npm run lint
npm run sim        # 参考配置 × 3地域 × 100回の自動実行と受け入れ基準3の判定（NG があると終了コード1）
```

- `?seed=123` を付けて開くと、ランの乱数シードを固定できる（デバッグ用）。
- `?fps=1` で FPS・表示中の敵・エフェクト・ダメージ数字の数を表示する。
- `?stress=1` でラン中にエフェクト200個・ダメージ数字50個を出し続ける（`?fps=1&stress=1` で実機の 60fps 計測。iPhone 12 / Pixel 6a 相当で確認する）。

## 構成

- `src/core` — Phaser 非依存のゲームロジック（連鎖・ダメージ・戦闘・抽選・経済・保存）。ESLint で phaser の import を禁止。
- `src/config/balance.ts` と `src/data` — 数値はここにだけ書く。
- `src/scenes` / `src/ui` / `src/audio` — 描画・入力・合成音。core が出すイベントを描画するだけ。
- `src/platform` — Capacitor プラグイン（保存・振動・アプリ状態）のラッパー。ブラウザではフォールバックで動く。
- `tools/sim.ts` — バランス検証。
- 仕様にない判断は `DECISIONS.md`。

## ネイティブアプリ

```bash
npm run build && npx cap sync
npx cap run android
npx cap run ios        # Mac + Xcode が必要
```

アイコンとスプラッシュは `assets/icon-*.png`（1024×1024）と `assets/splash*.png`（2732×2732）から `@capacitor/assets` で生成する。元画像は仮素材の勇者から作っている（本素材ができたら差し替える）:

```bash
npm run store-assets   # assets/icon-*.png, assets/splash*.png を作り直す
npm run assets         # ios/ と android/ のアイコン・スプラッシュを生成
```

### 手で変えたネイティブ側の設定

| ファイル | 変更 |
| --- | --- |
| `android/app/src/main/AndroidManifest.xml` | `MainActivity` に `android:screenOrientation="portrait"` |
| `android/app/src/main/res/values/styles.xml` | `AppTheme.NoActionBar` / `AppTheme.NoActionBarLaunch` に `android:windowFullscreen=true`（ステータスバー非表示） |
| `ios/App/App/Info.plist` | 対応向きを縦のみに、`UIRequiresFullScreen`、`UIStatusBarHidden=true`、`UIViewControllerBasedStatusBarAppearance=false` |
| `android/app/build.gradle` | `android/keystore.properties` があれば release ビルドに署名する `signingConfigs.release` |
| `android/.gitignore` | `keystore.properties`、`*.jks`、`*.keystore` を除外 |
| アイコン・スプラッシュ | `npm run assets`（`@capacitor/assets`）で生成したものに置き換え |

### ストア申請の準備

- Android の署名: `android/keystore.properties`（コミットしない）に `storeFile` / `storePassword` / `keyAlias` / `keyPassword` を書くと、`android/app/build.gradle` の release ビルドが署名する。鍵は `keytool -genkey -v -keystore chainpack-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias chainpack` で作る。
- iOS の署名: Xcode の Signing & Capabilities でチームを選ぶ（Automatically manage signing）。
- バンドル ID: `com.chainpack.rush`（`capacitor.config.ts`）。

## アセット（PixelLab）

v1 はコードで描く仮素材で完結している。仮素材は本素材と同じコマ寸法（勇者64×64、雑魚48×48、ボス96×96、アイコン16×16）で描き、キャラクターは×2（勇者128、雑魚96、ボス192）、アイコンは×4（64）で表示する。

本素材への差し替えは `src/data/sprites.ts` の各キャラクターの `anims` に横一列の PNG（`assets/sprites/` からの相対パス）とコマ数・fps を書くだけ。Boot で読み込まれ、登録のない動作は仮素材で動き続ける。`assets/sprites/` へ置くのは人が出来を確認してから。

絵柄の参照は採用済みの `assets/raw/hero_idle_v2_64.png`（この作業環境には無かったため、リポジトリには未収録）。生成ルール・制作順・無料枠の扱いは仕様書 第10章（生成前に必ず承認を取る、1回の承認で1種類まで、並列投入しない）。

```bash
claude mcp add --transport http pixellab https://api.pixellab.ai/mcp \
  --header "Authorization: Bearer $PIXELLAB_API_TOKEN"
```
