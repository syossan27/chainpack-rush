# 採用v4騎士・踏み込み横振り上げ攻撃

## 方法・費用
採用画像hero_idle_v4_helm.pngをv2/create-character-v3へ入力、eastを同一画像で固定。新character_id: 3856518c-6f4d-4ff7-95bb-1212c1e38e3a。登録1.0＋v2/animate-character pixminimax custom action 1.0＝合計2.0生成。残数14.9→12.9 / 40。追加生成なし。他方向は自動生成であり、ゲーム素材として未検証。

## 見た目・検証
- 140×96px、9コマ。開始・終端参照は採用64px画像を等倍で左寄りに置いた128×96px画像。APIのネイティブ出力が140×96px。
- 金色の左右角、赤い房、金縁と額飾り、銀鎧・赤紫マントを維持。顔開口は全コマ黒く、顔・目・肌・口の描写なし。頭身も可愛いデフォルメを保持。装飾や角の線には生成由来の細かな変化あり。
- 剣を後ろの側方へ引く予備動作→右への踏み込み→横払い→前上方への振り上げが明瞭。頭上からの振り下ろしではない。横方向と縦方向の2段階の斬撃エフェクトが出ており、中間コマでは太い横エフェクトが手・胴の一部を隠す。
- 膝を曲げて低く構えるが、要求した深いしゃがみは浅め。前傾も控えめ。足を開いた踏み込みと身体の右移動は明確。
- 終端は開始位置・ガードに近く戻り、bboxは開始と一致。ただし画像のピクセルは完全一致でなく、微細なループ差は残る。
- 全コマで足元最下端y=79固定。固定キャンバス、全コマ同一の無切り抜き出力。フレームごとの位置補正やリセンタリングなし。
- ネイティブ・最終とも非透明画素のフレーム端接触は全9コマでなし。合成bbox(21,15)-(118,80)（右下exclusive）。最小余白：左21、右22、上15、下16px。剣先・角・房・斬撃エフェクトまでフレーム内。

## 出力
hero_attack_v4_lunge.gif（白背景4倍nearest-neighbor、150ms/コマ）
hero_attack_v4_lunge_sheet.png / _sheet_big.png
hero_attack_v4_lunge_contact_big.png（3×3比較）
hero_attack_v4_lunge_frame_00.png〜08.png（透明140×96px）
hero_attack_v4_lunge_native_frame_00.png〜08.png（API原画像）
hero_attack_v4_lunge_request.json / _character_request.json（base64省略・認証情報なし）
hero_attack_v4_lunge_export.json（bboxと端接触検査） / _balance.json

生成日: 2026-11-08 JST。
