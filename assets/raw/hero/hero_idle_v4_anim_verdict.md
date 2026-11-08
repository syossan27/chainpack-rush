# 採用騎士v4・呼吸idleループ

character_id 3856518c-6f4d-4ff7-95bb-1212c1e38e3a、v2 animate-character / pixminimax。採用hero_idle_v4_helm.pngを開始画像・終端画像の両方に指定。生成1回、消費1.0、残り11.9 / 40。追加生成なし。

## 出力と境界
9コマ、64×64px透過。APIのネイティブ68×80px画像を、全コマ共通crop(2,8,66,72)でロスレス切り出し。全非透明画素はネイティブの合成bbox(11,12,57,64)に収まるため、描かれた画素の除去なし。個別位置合わせ、架空の移動、拡大縮小なし。出力の余白は左9px、右9px、上4px、下8px以上。角・房・剣・マントは全コマでフレーム内、端接触なし。足元の最下端は全コマy=55で固定。

## 見た目とループ品質
元の金色角、赤い房、金縁と黒一色の顔開口、重鎧・マント・可愛い頭身は良好に維持。顔・目・口なし。
頭と肩の上下はおおむね1px程度。足は動かず、剣はほぼ同じ位置で保持。マントは端がひらひら上下し、赤い房も小さく横へ揺れる。呼吸自体はごく控えめで、マントと房の動きが主役。
開始と最終は非常に近いがピクセル完全一致ではない。透明画素のRGBを無視した最終→先頭の差は54画素、隣接コマ差131〜682画素に比べ小さく、継ぎ目は比較的自然。完全無欠のseamlessとは主張しない。房・マントの形状や鎧の色の数ピクセルには生成ゆらぎがある。最終と先頭が似ているため、ループ端で少し静止感が出る可能性もある。ゲームidleの試作として使用可能。

## ファイル
hero_idle_v4_anim.gif — 白背景4倍nearest-neighbor、150ms/コマ
hero_idle_v4_anim_sheet.png / _sheet_big.png — 透明横シート / 4倍
hero_idle_v4_anim_contact_big.png — 3×3比較4倍
hero_idle_v4_anim_frame_00.png〜08.png — 64×64px透明フレーム
hero_idle_v4_anim_native_frame_00.png〜08.png — 未加工API出力
hero_idle_v4_anim_request.json — 画像base64省略、認証情報なし
hero_idle_v4_anim_export.json / _balance.json — 固定crop情報 / 残数

生成日: 2026-11-08 JST。
