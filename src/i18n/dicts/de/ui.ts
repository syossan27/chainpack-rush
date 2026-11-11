// German: screens and messages. Key: Japanese source string → value: translation
// (keep {placeholders} and the meaning of any '|context' key)
import type { Dict } from '../types';

export const UI: Dict = {
  // src/core/challenge.ts
  'レアリティは{rarity}まで（起点は問わない）': 'Seltenheit bis {rarity} (Ursprünge: beliebig)',
  アーティファクトは使えない: 'Keine Artefakte',
  '起点は{n}つまで': 'Max. Ursprünge: {n}',
  '攻撃装備は {elements} だけ': 'Angriffsausrüstung: nur {elements}',
  '・|sep': ', ',
  防具は使えない: 'Keine Rüstung',
  '強化と★は使わない（勇者は最初の強さ）': 'Kein Training, keine ★-Boni (Held mit Grundwerten)',
  'アーティファクト（{item}）は使えない': 'Artefakte nicht erlaubt ({item})',
  '{rarity}より上の装備（{item}）がある': 'Ausrüstung über {rarity} ({item})',
  '使えない属性の装備（{item}）がある': 'Ausrüstung mit verbotenem Element ({item})',
  '使えない種類の装備（{item}）がある': 'Ausrüstung verbotener Art ({item})',
  '起点が{n}つある（{max}つまで）': 'Ursprünge: {n} (max. {max})',
  起点がない: 'Kein Ursprung',

  // src/core/cosmetics.ts
  蒼のマント: 'Blauer Umhang',
  白銀の鎧: 'Silberrüstung',
  黄金の鎧: 'Goldrüstung',
  ちびドラゴン: 'Babydrache',
  銅のメダル: 'Bronzemedaille',
  銀の王冠: 'Silberkrone',
  金の王冠: 'Goldkrone',

  // src/core/diagnose.ts
  '必殺技の並びがそろう！': 'Vervollständigt einen Spezialangriff!',
  '何か特別なことが起きそうな並び…': 'Bei dieser Reihenfolge könnte etwas Besonderes passieren…',
  状態異常のコンボが増える: 'Mehr Status-Kombos',
  '連鎖が{n}段まで長くなる': 'Kette wächst auf Länge {n}',
  'もっと強い装備（レアリティ・攻撃力）に替える':
    'Tauscht gegen stärkere Ausrüstung (Seltenheit, Angriff)',
  空いているマスも連鎖に使う: 'Nutzt freie Felder für die Kette',
  '強い装備が後ろの段（倍率が高い）に来る':
    'Setzt starke Ausrüstung auf spätere Glieder (höherer Multiplikator)',
  '「{a}」と「{b}」を入れ替える': 'Tausche „{a}“ und „{b}“',
  '「{a}」を倉庫の「{b}」に置きかえる': 'Ersetze „{a}“ durch „{b}“ aus dem Lager',
  '空いているマスに「{item}」を置く': 'Lege „{item}“ auf ein freies Feld',
  'どの起点からも届いていない装備が{n}個': 'Von keinem Ursprung erreicht: {n}',
  '起点から矢印をたどって、つながる向きに置き直そう（光っているマス）':
    'Folge den Pfeilen ab den Ursprüngen und lege diese Gegenstände so um, dass sie verbunden sind (leuchtende Felder)',
  '起点{n}の連鎖が{step}段で止まっている': 'Kette von Ursprung {n} endet bei Glied {step}',
  '長くつなぐほど後ろの段の倍率が上がる。出口の向きを鍛冶屋で変えるのも手':
    'Je länger die Kette, desto höher die Multiplikatoren späterer Glieder. Du kannst die Ausgänge auch in der Schmiede neu ausrichten.',

  // src/core/economy.ts
  見つかりません: 'Nicht gefunden',
  消耗品は合成できません: 'Verbrauchsitems kann man nicht verschmelzen',
  これ以上のレアリティはありません: 'Schon die höchste Seltenheit',
  '装備中は合成に使えません（外してから）':
    'Ausgerüstetes kann man nicht verschmelzen (erst entfernen)',
  ロック中は合成に使えません: 'Gesperrtes kann man nicht verschmelzen',
  '同じ装備があと{n}つ必要': 'Noch {n}× derselbe Gegenstand nötig',
  '{cost}G 必要': '{cost}G nötig',

  // src/core/presets.ts
  '編成{n}': 'Set {n}',

  // src/core/ranking.ts
  '挑戦 第{n}回': 'Prüfung #{n}',
  'エンドレス {month}': 'Endlos {month}',
  '上位1%': 'Top 1%',
  '上位10%': 'Top 10%',
  '上位50%': 'Top 50%',
  参加: 'Teilnahme',
  '{season} {title}': '{season} {title}',

  // src/core/shareText.ts
  '挑戦「{name}」でスコア {score}！': '{score} Punkte in der Prüfung „{name}“!',
  'エンドレスで{loop}周目に到達！': 'Runde {loop} in Endlos erreicht!',
  '{region}で{loop}周目に到達！': '{region}: Runde {loop} erreicht!',
  '最大連鎖 {step}段・最大ダメージ {damage}': 'Längste Kette {step} · Höchster Schaden {damage}',

  // src/platform/monetization.ts
  '広告（テスト表示）': 'Werbung (Test)',
  本番ではここに動画広告が流れます: 'Im echten Spiel läuft hier ein Werbevideo',

  // src/scenes/BaseScene.ts
  基本: 'Grundlagen',
  '起点から出口（矢印）をたどって、隣の装備へ連鎖がつながります。勇者の足元のゲージ（攻撃間隔）がたまると起点が順に発火し、つながった装備が順番に攻撃します。':
    'Eine Kette läuft von einem Ursprung entlang seiner Ausgänge (Pfeile) in die nächsten Gegenstände. Wenn sich die Leiste unter dem Helden (Angriffstakt) füllt, zünden die Ursprünge nacheinander, und die verbundenen Gegenstände greifen der Reihe nach an.',
  '1回のランは30秒。走っている間は時間が止まり、敵と戦っている間だけ減ります。':
    'Eine Expedition dauert 30 Sekunden. Während der Held läuft, steht die Zeit still – sie läuft nur im Kampf ab.',
  '時間は、群れを1回の連鎖でまとめて倒す（一網打尽）と+1.5秒、ボスを倒すと+8秒、時の砂で+5秒のびます。上限はないので、倒し続けるほど長く戦えます。':
    'Besiegst du eine ganze Gruppe mit einer Kette (Gruppen-K.o.), gibt es +1.5 s, für einen Boss +8 s und mit Sand der Zeit +5 s. Es gibt kein Limit: Je mehr du besiegst, desto länger kämpfst du.',
  ダメージの決まり方: 'So entsteht Schaden',
  '攻撃力 × レアリティ × 連鎖倍率 × コンボ × 強化 × 追加効果 × 会心（±10%ゆれる）':
    'Angriff × Seltenheit × Kettenmultiplikator × Kombo × Training × Bonus × Kritisch (±10% Schwankung)',
  '・レアリティ：コモン×1、レア×1.5、エピック×2.5、レジェンダリー×4':
    '• Seltenheit: Gewöhnlich ×1, Selten ×1.5, Episch ×2.5, Legendär ×4',
  '・連鎖倍率：1段ごとに×1.2、6段目で上限×2.5（循環の環を通ると上限×4.0）':
    '• Kettenmultiplikator: ×1.2 pro Glied, ab Glied 6 maximal ×2.5 (durch den Ouroboros-Ring maximal ×4.0)',
  '・コンボ：濡れ＋雷で感電×3、油＋炎で爆発×2（周りも巻き込む）、凍結＋打撃で粉砕×2.5。コンボでなくても、状態が付いた敵には×1.2':
    '• Kombos: Nass + Blitz = Schock ×3, Öl + Feuer = Explosion ×2 (trifft auch Gegner in der Nähe), Gefroren + Wucht = Zertrümmern ×2.5. Auch ohne Kombo erleiden Gegner mit Status ×1.2.',
  '・強化：拠点の「攻撃倍率」': '• Training: „Angriffsmultiplikator“ in der Basis',
  '・会心：8%でダメージ×2（聖剣・会心の追加効果・幸運の硬貨で上がる）':
    '• Kritisch: 8% Chance auf ×2 Schaden (mehr durch das Heilige Schwert, den Bonus „Kritisch“ und die Glücksmünze)',
  ダメージを伸ばすコツ: 'Tipps für mehr Schaden',
  '・配置画面の「約」の数字を見ながら並べ替える。ルートの番号を選ぶと、そのルート1本の推定ダメージが出ます。':
    '• Ordne um und achte dabei auf die „~“-Zahlen unter „Packen“. Wählst du die Nummer einer Route, siehst du den geschätzten Schaden nur dieser Route.',
  '・コンボを作る。状態を付ける装備（水筒・雨雲の杖・油瓶・氷の剣・氷の杖）の後ろに、組む属性（雷・炎・打撃）をつなぐ。状態は5秒で消えます。':
    '• Bau Kombos: Hänge das passende Element (Blitz, Feuer, Wucht) hinter einen Status-Gegenstand (Wasserflasche, Regenstab, Ölflasche, Eisschwert, Froststab). Ein Status hält 5 Sekunden.',
  '・強い装備ほど後ろ（6段目以降）に置く。前の段は軽い装備や状態付与に。':
    '• Setz deine stärkste Ausrüstung ans Ende der Kette (ab Glied 6). Nutze die ersten Glieder für leichte Ausrüstung und Status-Gegenstände.',
  '・レアリティが一番効きます。奥の地域ほどレア以上が出やすい。':
    '• Die Seltenheit zählt am meisten. In tieferen Gebieten gibt es öfter Ausrüstung ab Selten.',
  '・装備の左下の✦は追加効果。先駆け（3段目まで強い）は短い連鎖に、締め（6段目以降強い）は長い連鎖に向きます。':
    '• Das ✦ unten links an einem Gegenstand zeigt einen Bonus. Vorhut (stark bis Glied 3) passt zu kurzen Ketten, Finale (stark ab Glied 6) zu langen.',
  必殺技: 'Spezialangriffe',
  '連鎖のルートで、決まった装備が順に3つつながって通ると、3つ目の一撃が必殺技になります（ダメージ×2.5、勇者が大きく踏み込む）。配置画面では、そのマスに「必殺」と出ます。':
    'Läuft eine Kette der Reihe nach durch 3 bestimmte Gegenstände, wird der 3. Treffer zum Spezialangriff (×2.5 Schaden, und der Held stürmt vor). Unter „Packen“ zeigt das Feld dann „Spezial“.',
  '・必殺技は全部で{n}つ。初めて出すと「発見」と出て、拠点の「図鑑」に発動条件が載ります。まだ見つけていない技は、図鑑でヒントだけ見られます。':
    '• Spezialangriffe zum Entdecken: {n}. Beim ersten Mal erscheint „Spezialangriff entdeckt!“, und das Rezept landet im „Kompendium“ der Basis. Für unentdeckte Angriffe zeigt das Kompendium nur einen Hinweis.',
  短い連鎖と長い連鎖: 'Kurze vs. lange Ketten',
  '・次の発火までの待ちは、直前の連鎖の段数に比例します。短い連鎖は回転が速く、長い連鎖は一撃が大きい。':
    '• Die Wartezeit bis zur nächsten Zündung wächst mit der Länge der letzten Kette. Kurze Ketten sind schnell wieder bereit, lange treffen hart.',
  '・連鎖中は無防備（被ダメージ×1.5）。ただし3段目までは守りが残ります。':
    '• Während einer Kette bist du ungeschützt (×1.5 erlittener Schaden), bis Glied 3 aber noch geschützt.',
  '・無防備中に大きく被弾すると「よろめき」、残りの段が途切れます。防御装備で耐えるか、不落の城門を置くと防げます。':
    '• Ein harter Treffer, während du ungeschützt bist, bringt dich ins Taumeln („Taumelt!“) und bricht den Rest der Kette ab. Halte mit Verteidigungsausrüstung durch oder platziere das Festungstor, um das zu verhindern.',
  地域と敵: 'Gebiete & Gegner',
  '・草原 → 洞窟 → 城壁の順に敵が一気に強くなり、そのぶんレアな装備が出やすくなります。3周目のボスを倒すと次の地域が開きます。':
    '• Von Grasland → Höhle → Burgwall werden die Gegner viel stärker, dafür gibt es auch öfter seltene Ausrüstung. Besiege den Boss in Runde 3, um das nächste Gebiet freizuschalten.',
  '・群れとボスは出撃ごとに変わります。精鋭（硬い・速い・金ぴか）が混ざることも。金ぴかは必ずレア以上を2個落とします。':
    '• Gruppen und Bosse wechseln mit jeder Expedition. Manchmal sind Elite-Gegner dabei (Zäh, Flink, Golden). Goldene lassen immer 2 Gegenstände ab Selten fallen.',
  '・アーティファクトはごくまれに出る特別な装備です。':
    '• Artefakte sind besondere Ausrüstung, die nur sehr selten auftaucht.',
  ご褒美とプレミアム: 'Belohnungen & Premium',
  '・広告を見ると、ご褒美がもらえます：結果画面で「戦利品を2倍にする」（1日3回、同じ数だけ抽選し直してもう1セット）、鍛冶屋で「無料で再抽選」（1日3回）、力尽きたときに「再開」（1回のランで1回、HP全回復＋10秒）。':
    '• Schau Werbung für Belohnungen: „Doppelte Beute“ im Ergebnisbildschirm (3× pro Tag; würfelt noch einmal genauso viel Beute aus), „Gratis neu würfeln“ in der Schmiede (3× pro Tag) und „Wiederbeleben“, wenn du fällst (1× pro Expedition; volle HP + 10 s).',
  '・プレミアム（{price}、買い切り）なら、広告を見なくても同じご褒美を受け取れます。設定から買えます。':
    '• Mit Premium ({price}, einmaliger Kauf) bekommst du dieselben Belohnungen ohne Werbung. Kaufen kannst du es in den „Optionen“.',
  '倉庫・鍛冶屋・合成': 'Lager, Schmiede & Verschmelzen',
  '・消耗品枠は、入れた消耗品を覚えています。ランで使い切ったら、倉庫に同じものがあれば自動で入れ直します（ないときは枠にうすく「自動」と出て、手に入ったら入ります）。手で外すと覚えるのをやめます。':
    '• Item-Slots merken sich, was du hineinlegst. Verbrauchst du ein Item in einer Expedition, wird es automatisch aus dem Lager nachgefüllt (hast du keins, zeigt der Slot blass „Auto“ und füllt sich, sobald du eins bekommst). Nimmst du es von Hand heraus, hört das auf.',
  '・どこを変えれば強くなるか迷ったら、配置画面の「診断」。入れ替え・置きかえ・空きマスを実際に試して、伸びる手を教えてくれます（並べ替えは自分で。「場所を見る」で関係するマスが光ります）。':
    '• Unsicher, was du ändern sollst? Tippe unter „Packen“ auf „Analyse“. Sie probiert Tauschen, Ersetzen und freie Felder aus und zeigt, was hilft (umordnen musst du selbst; „Anzeigen“ lässt die Felder leuchten).',
  '・配置画面の上の1〜5で編成を切り替えられます（凍結型・炎上型などを作り分け）。編成は並べ方の記録だけで、装備は倉庫に置いたまま。今の編成をもう一度押すと名前を変えられます。ほかの編成で使っている装備には「編成○」の印が付き、一括売却などでは売られません。':
    '• Mit 1–5 oben unter „Packen“ wechselst du das Set (z. B. ein Eis-Set und ein Feuer-Set). Ein Set speichert nur die Anordnung; die Ausrüstung bleibt im Lager. Tippe erneut auf das aktuelle Set, um es umzubenennen. Ausrüstung aus einem anderen Set trägt die Markierung „Set ○“ und wird z. B. beim „Massenverkauf“ nicht verkauft.',
  '・倉庫の「自動売却」で、ラン後に戦利品から決まったレアリティ以下を自動で売れます（✦付きを残すかも選べます）。':
    '• Mit „Auto-Verkauf“ im Lager wird Beute bis zu einer gewählten Seltenheit nach jeder Expedition automatisch verkauft (✦-Gegenstände kannst du behalten).',
  '・倉庫があふれると出撃できません。「一括売却」「まとめて売る」で整理しましょう。大事な装備は詳細カードでロックすると売れなくなります。':
    '• Ist das Lager voll, kannst du keine Expedition starten. Schaff Platz mit „Massenverkauf“ oder „Auswahl verkaufen“. Sperre wichtige Ausrüstung in ihrer Detailkarte, dann wird sie nicht verkauft.',
  '・鍛冶屋では出口の向きを付け直せます（数は変わりません）。レアリティが高いほど料金も上がります。':
    '• In der Schmiede kannst du die Richtungen der Ausgänge umschmieden (ihre Anzahl bleibt gleich). Höhere Seltenheit kostet mehr.',
  '・同じ装備・同じレアリティを3つ集めると、鍛冶屋の「合成」（倉庫の詳細カードからも）で1つ上のレアリティを狙えます。成功率はコモン→レア80%（20G）、レア→エピック50%（100G）、エピック→レジェンダリー25%（500G）。失敗すると、材料と同じレアリティのランダムな装備が1つ手に入ります。追加効果と出口の向きは新しく決まります。':
    '• Sammle 3× denselben Gegenstand in gleicher Seltenheit und nutze „Verschmelzen“ in der Schmiede (oder „Fusion“ in der Detailkarte im Lager), um die nächste Seltenheit anzupeilen. Erfolgschance: Gewöhnlich→Selten 80% (20G), Selten→Episch 50% (100G), Episch→Legendär 25% (500G). Bei Fehlschlag bekommst du 1 zufälligen Gegenstand derselben Seltenheit. Boni und Ausgangsrichtungen werden neu ausgewürfelt.',
  設定: 'Optionen',
  ヘルプ: 'Hilfe',
  ランキング: 'Rangliste',
  挑戦: 'Prüfung',
  倉庫: 'Lager',
  鍛冶屋: 'Schmiede',
  図鑑: 'Kompendium',
  出撃: 'Los!',
  '倉庫があふれています。売却するまで出撃できません':
    'Das Lager ist voll. Verkaufe etwas, um loszuziehen.',
  冒険の記録: 'Abenteuerbuch',
  '出撃|stat': 'Expeditionen',
  '{n}回': '{n}',
  最大連鎖: 'Längste Kette',
  '{n}段': '{n}',
  最大ダメージ: 'Höchster Schaden',
  開放した地域: 'Offene Gebiete',
  '{region} {n}周': '{region}: Runde {n}',
  '最高到達: {list}': 'Bestwerte: {list}',
  '　|sep': '  ·  ',
  まだありません: 'Noch keine',
  ロック中: 'Gesperrt',
  '売る {price}G': 'Verkaufen {price}G',
  編成で使っている装備: 'In einem Set verwendet',
  '{presets}で使っています。\n売ると、その編成のマスは空きになります':
    'Verwendet in: {presets}.\nBeim Verkauf wird das Feld in diesem Set leer.',
  売る: 'Verkaufen',
  アーティファクトを売る: 'Artefakt verkaufen',
  '{item}を{price}Gで売ります': '{item} für {price}G verkaufen?',
  ロック中の装備は売れません: 'Gesperrte Ausrüstung kann man nicht verkaufen',
  'ほかの編成で使っている装備です（詳細から売れます）':
    'In einem anderen Set verwendet (über die Details verkaufbar)',
  '売るものをタップで選ぶ（もう一度で外す・長押しで詳細）':
    'Tippe zum Auswählen (nochmal: abwählen, halten: Details)',
  '自動売却：オフ': 'Auto-Verkauf: Aus',
  '自動売却：{rarity}（✦は残す）': 'Auto-Verkauf: {rarity} (✦ behalten)',
  '自動売却：{rarity}': 'Auto-Verkauf: {rarity}',
  '自動売却：{rarity}以下（✦は残す）': 'Auto-Verkauf: bis {rarity} (✦ behalten)',
  '自動売却：{rarity}以下': 'Auto-Verkauf: bis {rarity}',
  '{n}個を売ります（+{gold}G）': 'Gegenstände verkaufen: {n} (+{gold}G)',
  '{n}個を売る +{gold}G': '×{n} verkaufen +{gold}G',
  選んで売る: 'Auswählen',
  やめる: 'Abbrechen',
  まとめて売る: 'Auswahl verkaufen',
  '{rarity}  {n}個 +{gold}G': '{rarity}  ×{n} +{gold}G',
  '{rarity}以下  {n}個 +{gold}G': 'Bis {rarity}  ×{n} +{gold}G',
  '{rarity}を一括売却': 'Massenverkauf: {rarity}',
  '{rarity}以下を一括売却': 'Massenverkauf: bis {rarity}',
  '消耗品  {n}個 +{gold}G': 'Verbrauchsitems  ×{n} +{gold}G',
  消耗品を一括売却: 'Massenverkauf: Verbrauchsitems',
  '✦付きは残す：オン': '✦ behalten: An',
  '✦付きは残す：オフ': '✦ behalten: Aus',
  一括売却: 'Massenverkauf',
  '装備中・ロック中・編成で使用中・アーティファクトは売りません':
    'Ausgerüstetes, Gesperrtes, Set-Ausrüstung und Artefakte werden nie verkauft',
  向きの付け直し: 'Umschmieden',
  合成: 'Verschmelzen',
  この装備は向きを付け直せません: 'Dieser Gegenstand kann nicht umgeschmiedet werden',
  装備中: 'Aktiv',
  付け直す装備を選んでください: 'Wähle einen Gegenstand zum Umschmieden',
  '出口の数は変わらず、方向だけが変わります':
    'Die Zahl der Ausgänge bleibt, nur die Richtungen ändern sich',
  '付け直し {n}回（毎回 料金×1.5）': 'Umgeschmiedet: {n}× (Preis jedes Mal ×1.5)',
  '再抽選 {gold}G': 'Neu würfeln {gold}G',
  ゴールドが足りません: 'Nicht genug Gold',
  '無料で再抽選（今日あと{n}回）': 'Gratis neu würfeln (heute noch {n})',
  '▶ 広告を見て無料で再抽選（今日あと{n}回）': '▶ Werbung: Gratis neu würfeln (heute noch {n})',
  '指定: {n}方向を選ぶ': 'Gezielt: Richtungen ({n})',
  '指定 {gold}G': 'Gezielt {gold}G',
  '方向を{n}つ選んでください': 'Wähle die Richtungen ({n})',
  強化: 'Training',
  '最大HP {hp}（★{stars}で+{bonus}込み）': 'Max. HP {hp} (inkl. +{bonus} durch ★{stars})',
  '最大HP {hp}': 'Max. HP {hp}',
  '攻撃間隔 {sec}秒': 'Angriffstakt {sec}s',
  '攻撃倍率 ×{mult}（★{stars}で+{bonus}%込み）':
    'Angriffsmultiplikator ×{mult} (inkl. +{bonus}% durch ★{stars})',
  '攻撃倍率 ×{mult}': 'Angriffsmultiplikator ×{mult}',
  '出撃 {sec}秒（延長込みの上限 {max}秒）': 'Zeitlimit {sec}s (max. {max}s mit Bonuszeit)',
  '出撃 {sec}秒': 'Zeitlimit {sec}s',
  '{w}×{h}マス': '{w}×{h} Felder',
  '{n}枠': 'Slots: {n}',
  '{n}個': 'Kapazität: {n}',
  最大: 'MAX',
  切替: 'Wechseln',
  音量: 'Lautstärke',
  ゲームスピード: 'Spieltempo',
  '検証用。×2 なら30秒のランが15秒で終わります':
    'Zum Testen. Bei ×2 endet eine 30-Sekunden-Expedition nach 15 Sekunden.',
  'プレミアム（購入済み）': 'Premium (gekauft)',
  'プレミアム {price}': 'Premium {price}',
  広告なしでご褒美を受け取れます: 'Belohnungen ohne Werbung',
  'プレミアムになりました！': 'Du hast jetzt Premium!',
  購入を復元: 'Wiederherstellen',
  購入を復元しました: 'Käufe wiederhergestellt',
  復元できる購入はありません: 'Keine Käufe zum Wiederherstellen',
  '遊び方・強くなるコツ': 'Anleitung & Tipps',
  案内をもう一度: 'Tutorial erneut',
  '各画面で、案内がもう一度出ます': 'Das Tutorial erscheint auf jedem Bildschirm erneut',
  振動: 'Vibration',
  '画面揺れ・光': 'Bildwackeln & Blitze',
  言語: 'Sprache',
  '{auto}（{lang}）': '{auto} ({lang})',
  自動: 'Auto',
  端末の言語: 'Gerätesprache',
  'オフ（売らない）': 'Aus (nicht verkaufen)',
  コモンを売る: 'Gewöhnliche verkaufen',
  レア以下を売る: 'Bis Selten verkaufen',
  エピック以下を売る: 'Bis Episch verkaufen',
  自動売却: 'Auto-Verkauf',
  'ラン後に戦利品から売ります。消耗品・アーティファクトは売りません':
    'Verkauft nach jeder Expedition aus deiner Beute. Verbrauchsitems und Artefakte nie.',
  'ようこそ！\n勇者が自動で進んで、敵と戦うゲームだよ。\nまずは「出撃」を押してみよう！':
    'Willkommen!\nDein Held zieht von selbst los und kämpft gegen Gegner. Tippe zuerst auf „Los!“',
  '装備は「配置」でバックパックに並べるよ。\n拾った装備もここで置ける。\n「配置」を押してね':
    'Unter „Packen“ ordnest du Ausrüstung in deinem Rucksack an. Auch gefundene Ausrüstung kommt hier hinein. Tippe auf „Packen“!',
  '鍛冶屋では、装備の出口の向きを変えたり、\n同じ装備を3つ集めて「合成」して\n上のレアリティを狙えるよ':
    'In der Schmiede kannst du die Ausgänge eines Gegenstands neu ausrichten oder 3 gleiche Gegenstände „Verschmelzen“, um eine höhere Seltenheit anzupeilen.',
  '合成 {gold}G': 'Fusion {gold}G',
  '合成 {have}/3': 'Fusion {have}/3',
  '{item}（{rarity}）を3つ使って、{target}の{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    'Setze 3× {item} ({rarity}) ein, um {target} ({to}) anzupeilen ({gold}G).\nErfolgschance: {rate}%. Bei Fehlschlag gibt es 1 zufälligen Gegenstand ({rarity}).',
  '{item}（{rarity}）を3つ使って、{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    'Setze 3× {item} ({rarity}) ein, um die Seltenheit {to} anzupeilen ({gold}G).\nErfolgschance: {rate}%. Bei Fehlschlag gibt es 1 zufälligen Gegenstand ({rarity}).',
  合成する: 'Verschmelzen',
  ロック: 'Gesperrt',
  '{n}つ': '×{n}',
  合成する装備を選んでください: 'Wähle einen Gegenstand zum Verschmelzen',
  '同じ装備・同じレアリティを3つで、1つ上のレアリティに':
    '3× gleicher Gegenstand, gleiche Seltenheit → nächste Seltenheit',
  '「○つ」の印は、3つ以上揃っている装備です':
    'Die Markierung „×○“ heißt: Davon hast du 3 oder mehr',
  '{rarity} ×3 → {target}の{to} ×1': '{rarity} ×3 → {target} ({to}) ×1',
  '{rarity} ×3 → {to} ×1': '{rarity} ×3 → {to} ×1',
  '使える数: {n}つ（装備中・ロック中・ほかの編成で使用中は除く）':
    'Nutzbar: ×{n} (ohne Ausgerüstetes, Gesperrtes und Ausrüstung anderer Sets)',
  '成功率 {rate}%': 'Erfolgschance {rate}%',
  '失敗すると{rarity}のランダムな装備が1つ（追加効果・向きは新しく）':
    'Bei Fehlschlag: 1 zufälliger Gegenstand ({rarity}, neue Boni und Ausgänge)',
  '合成する {gold}G': 'Verschmelzen {gold}G',
  合成できません: 'Nicht möglich',
  '合成中…': 'Verschmelze…',
  タップで閉じる: 'Tippen zum Schließen',
  '合成成功！': 'Geschafft!',
  '失敗…': 'Fehlschlag…',
  実績: 'Erfolge',
  '2週替わりの挑戦': 'Prüfung (2 Wochen)',
  'エンドレス（月ごと）': 'Endlos (monatlich)',
  挑戦はまだ始まっていません: 'Die Prüfung hat noch nicht begonnen',
  '（初めて記録を送るときに決まります）': '(wird beim ersten Eintrag festgelegt)',
  'あなたの名前: {name}': 'Dein Name: {name}',
  変える: 'Ändern',
  つながりませんでした: 'Keine Verbindung',
  'シーズンの終わりに: 上位1% {top1}G＋称号 / 上位10% {top10}G＋称号 / 上位50% {top50}G＋称号 / 参加 {joined}G':
    'Am Saisonende: Top 1% {top1}G + Titel / Top 10% {top10}G + Titel / Top 50% {top50}G + Titel / Teilnahme {joined}G',
  'ランキングは、サーバーの準備ができたら開きます':
    'Die Rangliste öffnet, sobald der Server bereit ist',
  '挑戦が始まったら、ここに順位が出ます': 'Sobald die Prüfung beginnt, erscheinen hier die Ränge',
  '読み込み中…': 'Lädt…',
  'あなた: {rank}位 / {total}人（上位{pct}%）': 'Du: Platz {rank} von {total} (Top {pct}%)',
  'まだ記録がありません（参加 {total}人）': 'Noch kein Eintrag (Spieler: {total})',
  '{loop}周・{damage}': 'Runde {loop} · {damage}',
  まだ誰も記録していません: 'Noch keine Einträge',
  '{season}: {rank}位 / {total}人（{band}）  +{gold}G':
    '{season}: Platz {rank} von {total} ({band})  +{gold}G',
  '新しい装飾品: {list}': 'Neue Kosmetik: {list}',
  ランキングの報酬: 'Ranglisten-Belohnung',
  受け取る: 'Abholen',
  装飾品: 'Kosmetik',
  戻る: 'Zurück',
  '挑戦で上位に入るともらえる、見た目だけの装飾品':
    'Kosmetik für Top-Ränge in Prüfungen. Ändert nur dein Aussehen.',
  冒険者: 'Abenteurer',
  挑戦で上位に入るともらえます: 'Für Top-Ränge in einer Prüfung',
  勇者の色: 'Heldenfarben',
  いつもの色: 'Standard',
  ペット: 'Begleiter',
  なし: 'Keine',
  '名前の飾り（ランキング）': 'Namensdeko (Rangliste)',
  使用中: 'Aktiv',
  '{band}でもらえる': 'Belohnung für {band}',
  '舞台: {region}': 'Gebiet: {region}',
  '・{rule}': '• {rule}',
  'リリースから2週間後に開放！': 'Öffnet 2 Wochen nach Release!',
  '開放まで あと{n}日': 'Öffnet in {n} T.',
  '2週間ごとに、地域と制限が入れ替わります。': 'Alle 2 Wochen wechseln Gebiet und Regeln.',
  '全員が同じ敵の並びに、自分の装備で挑み、合計ダメージを競います。':
    'Alle treten mit eigener Ausrüstung gegen dieselben Gegner an und kämpfen um den höchsten Gesamtschaden.',
  '強化と★は使わず、勇者は最初の強さ。並べ方の腕が勝負です。':
    'Kein Training, keine ★-Boni: Der Held hat seine Grundwerte. Es zählt nur, wie gut du packst.',
  '装備とゴールドは出ません。': 'Keine Ausrüstung, kein Gold.',
  '残り {days}日{hours}時間': 'Noch {days} T. {hours} Std.',
  '自己ベスト {score}': 'Bestwert: {score}',
  まだ挑戦していません: 'Noch nicht versucht',
  '装備 {n}個・起点 {origins}個': 'Ausrüstung: {n} · Ursprünge: {origins}',
  まだ組んでいません: 'Noch nicht gepackt',
  挑戦用の編成: 'Prüfungs-Set',
  この編成で挑戦できます: 'Dieses Set ist bereit für die Prüfung',
  'ふだんの編成から組みました。並べ方を詰めよう':
    'Aus deinem normalen Set übernommen. Jetzt der Feinschliff!',
  ふだんの編成から組む: 'Normales Set übernehmen',
  '今の挑戦用の編成を、ふだんの編成をもとに組み直します。\n制限に合わない装備は、同じ種類の使える装備に入れ替えます。':
    'Baue dein Prüfungs-Set aus deinem normalen Set neu auf.\nAusrüstung, die gegen die Regeln verstößt, wird durch erlaubte Ausrüstung derselben Art ersetzt.',
  組み直す: 'Neu packen',
  '出撃できる形まで組むだけ。並べ方を詰めるのはあなた次第':
    'Es wird nur startklar gepackt. Den Feinschliff machst du.',
  編成する: 'Bearbeiten',
  挑戦する: 'Antreten!',
  挑戦用の編成を組んでください: 'Pack zuerst dein Prüfungs-Set',
  編成が制限に合っていません: 'Dein Set erfüllt die Regeln nicht',
  '達成 {done} / {total}': 'Erreicht {done} / {total}',
  達成: 'Erreicht',
  '見つけた必殺技 {found} / {total}': 'Entdeckte Spezialangriffe {found} / {total}',
  '発動：{hint}': 'Reihenfolge: {hint}',
  '3つ目の一撃がダメージ×2.5、勇者が大きく踏み込む':
    'Der 3. Treffer macht ×2.5 Schaden, und der Held stürmt vor',
  '？？？': '???',
  'ヒント：{teaser}': 'Hinweis: {teaser}',
  'プレミアム：広告なしでご褒美を受け取れます': 'Premium: Belohnungen ohne Werbung',
  'プレミアム {price}｜広告なしでご褒美がもらえる': 'Premium {price} | Belohnungen ohne Werbung',
  '詳しく ›': 'Mehr ›',
  'プレミアム {price}（買い切り）': 'Premium {price} (einmaliger Kauf)',
  '広告を見なくても、ご褒美をすぐ受け取れます。\n・結果画面「戦利品を2倍にする」\n・鍛冶屋「無料で再抽選」\n・力尽きたときの「再開」\n（回数はそのまま。強さは変わりません）':
    'Werbe-Belohnungen sofort, ganz ohne Werbung:\n• Ergebnis: „Doppelte Beute“\n• Schmiede: „Gratis neu würfeln“\n• Wenn du fällst: „Wiederbeleben“\n(Gleiche Tageslimits. Du wirst dadurch nicht stärker.)',
  購入する: 'Kaufen',

  // src/scenes/DummyScene.ts
  カカシで試し撃ち: 'Übungspuppe',
  '「発火」で次の起点を撃つ': 'Tippe auf „Zünden!“, um den nächsten Ursprung zu zünden',
  発火: 'Zünden!',
  配置: 'Packen',
  '起点{origin} 発火中…': 'Ursprung {origin} zündet…',
  '総ダメージ {n}': 'Gesamtschaden {n}',
  '持続（無防備） {sec}秒': 'Dauer (ungeschützt) {sec}s',
  '防御値 +{n}': 'Verteidigung +{n}',
  'コンボ {list}': 'Kombos {list}',

  // src/scenes/LoadoutScene.ts
  '↶ 戻す': '↶ Zurück',
  全部外す: 'Alles raus',
  使えない: 'Verboten',
  挑戦へ: 'Zur Prüfung',
  '下は倉庫。装備を少し押さえてから、\nバックパックへドラッグして置こう':
    'Unten ist dein Lager. Halte einen Gegenstand kurz gedrückt und zieh ihn dann in den Rucksack.',
  '起点（番号の石）から、矢印の向きに\nつながった装備が順番に攻撃するよ。\n後ろの段ほどダメージが大きい！':
    'Ab einem Ursprung (dem nummerierten Stein) greifen verbundene Gegenstände der Reihe nach entlang der Pfeile an. Spätere Glieder treffen härter!',
  '「約」の数字が大きいほど強い並べ方。\nいろいろ試してみよう！':
    'Je größer die „~“-Zahl, desto stärker die Anordnung. Probier verschiedene Ideen aus!',
  '「約」の数字は敵1体に撃ったときの推定ダメージ（コンボ・会心込み）':
    '„~“-Zahlen sind der geschätzte Schaden gegen einen Gegner (inkl. Kombos und Krits)',
  '起点が0個です。出撃できません': 'Kein Ursprung platziert. Du kannst nicht losziehen.',
  '倉庫があふれています（タップで売却）': 'Lager voll (tippen zum Verkaufen)',
  全部: 'Alle',
  線を消す: 'Linien aus',
  線なし: 'Ohne Linien',
  番号を選ぶと表示に戻す: 'Wähle eine Nummer, um die Linien wieder zu zeigen',
  起点を置いてください: 'Platziere einen Ursprung',
  '合計 約{n}': 'Gesamt ~{n}',
  '約{n}・{step}段・{tech}': '~{n} · Kette {step} · {tech}',
  '必殺技|fallback': 'Spezialangriff',
  '約{n}・{step}段・コンボ{combo}': '~{n} · Kette {step} · Kombos {combo}',
  '約{n}・{step}段': '~{n} · Kette {step}',
  診断: 'Analyse',
  配置の診断: 'Rucksack-Analyse',
  'いまの推定ダメージ 合計 約{n}': 'Aktuelle Schätzung: ~{n} gesamt',
  'いまの装備では、これ以上の手は見つかりませんでした。\nいい並べ方です！':
    'Mit deiner Ausrüstung gibt es keine besseren Züge.\nSuper Anordnung!',
  '+約{n}': '+~{n}',
  '（+{pct}%）': '(+{pct}%)',
  場所を見る: 'Anzeigen',
  閉じる: 'Schließen',
  '挑戦「{name}」用': 'Prüfung: {name}',
  制限に合わせる: 'Anpassen',
  '{name} に切り替えました': 'Gewechselt zu {name}',
  もう制限に合っています: 'Erfüllt die Regeln bereits',
  '制限に合わせました。並べ方を詰めよう': 'An die Regeln angepasst. Jetzt der Feinschliff!',
  '合う装備が足りず、空いたマスがあります':
    'Nicht genug erlaubte Ausrüstung – einige Felder sind leer',
  '編成の名前（8文字まで）': 'Set-Name (bis zu 8 Zeichen)',
  '消耗品|slots': 'Items',
  '自動|refill': 'Auto',
  ひとつ前の並べ方に戻しました: 'Letzte Änderung rückgängig gemacht',
  'バックパックと消耗品枠の {n}個をすべて倉庫に戻します。\n起点の発火順もリセットされます。':
    'Alles aus Rucksack und Item-Slots kommt zurück ins Lager (×{n}).\nAuch die Zündreihenfolge der Ursprünge wird zurückgesetzt.',
  置きたいマスをタップ: 'Tippe auf ein Feld zum Platzieren',
  外す: 'Entfernen',
  発火順を前へ: 'Früher zünden',
  枠に入れる: 'In Slot legen',
  枠がいっぱい: 'Slots voll',
  置く: 'Platzieren',
  あふれた分を売る: 'Überschuss verkaufen',
  '安いものから{n}個を売って倉庫に収めます\n（+{gold}G）':
    'Verkauft die billigsten Gegenstände (×{n}), damit alles ins Lager passt.\n(+{gold}G)',

  // src/scenes/ResultScene.ts
  '体験おわり！': 'Demo vorbei!',
  '力尽きた…': 'Besiegt…',
  '撤退！': 'Rückzug!',
  ランキングに記録しました: 'In der Rangliste eingetragen',
  シェア: 'Teilen',
  '画像を保存しました（文はコピー済み）': 'Bild gespeichert (Text kopiert)',
  画像を作れませんでした: 'Bild konnte nicht erstellt werden',
  '挑戦「{name}」・{region}': 'Prüfung „{name}“ · {region}',
  'スコア {score}': 'Punkte {score}',
  '到達 {loop}周目': 'Runde {loop} erreicht',
  ボス撃破: 'Bosse besiegt',
  '発火|stat': 'Zündungen',
  ゴールド: 'Gold',
  一網打尽: 'Gruppen-K.o.',
  '自己ベスト！': 'Neuer Rekord!',
  '★×{n}獲得！': '★×{n} erhalten!',
  '★獲得！': '★ erhalten!',
  '★ボーナス: 攻撃+{atk}%・最大HP+{hp}': '★-Bonus: Angriff +{atk}% · Max. HP +{hp}',
  '新しい地域「{region}」が開放された！': 'Neues Gebiet frei: {region}!',
  '戦利品 {n}': 'Beute: {n}',
  '自動売却 {n}個 +{gold}G': 'Auto-verkauft ×{n} +{gold}G',
  '消耗品を{n}個 補充': 'Verbrauchsitems aufgefüllt ×{n}',
  '借りた伝説の装備は、お返ししたよ\n（体験なので戦利品はなし）':
    'Die geliehene legendäre Ausrüstung ist zurückgegeben.\n(Es war eine Demo, also keine Beute.)',
  '挑戦「{name}」': 'Prüfung „{name}“',
  'スコア（合計ダメージ） {score}': 'Punkte (Gesamtschaden) {score}',
  '自己ベスト {best}（更新！）': 'Bestwert {best} (neu!)',
  '自己ベスト {best}': 'Bestwert {best}',
  エンドレスは装備が出ません: 'Endlos bringt keine Ausrüstung',
  '自己ベスト {loop}周目・ダメージ {damage}': 'Bestwert: Runde {loop} · Schaden {damage}',
  戦利品なし: 'Keine Beute',
  タップで能力を確認: 'Tippe auf einen Gegenstand für seine Werte',
  タップで早送り: 'Tippen zum Vorspulen',
  '戦利品を2倍にする（今日あと{n}回）': 'Doppelte Beute (heute noch {n})',
  '▶ 広告を見て戦利品を2倍にする（今日あと{n}回）': '▶ Werbung: Doppelte Beute (heute noch {n})',
  '戦利品 {n}（×2）': 'Beute: {n} (×2)',
  '広告のボーナス +{n}個（自動売却 {sold}個 +{gold}G）':
    'Werbebonus +{n} (auto-verkauft ×{sold} +{gold}G)',
  '広告のボーナス +{n}個': 'Werbebonus +{n}',
  拠点へ: 'Zur Basis',
  配置へ: 'Zum Packen',
  自分で出撃: 'Du bist dran!',
  もう一度: 'Nochmal',
  倉庫があふれています: 'Lager voll',
  起点がありません: 'Kein Ursprung',
  'これが伝説の装備の力！\n最大{step}段の連鎖、{damage}ダメージ！':
    'Das ist die Kraft legendärer Ausrüstung!\nKettenlänge {step} und {damage} Schaden!',
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、\nいつかこの姿に！':
    'Ab jetzt geht’s mit eigener Ausrüstung los. Sammle und packe Ausrüstung – eines Tages bist du auch so stark!',
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、いつかこの姿に！\n「自分で出撃」を押してね':
    'Ab jetzt geht’s mit eigener Ausrüstung los. Sammle und packe Ausrüstung – eines Tages bist du auch so stark! Tippe auf „Du bist dran!“',
  '宝箱から装備をゲット！\n開いたあとにタップすると、能力が見られるよ':
    'Ausrüstung aus Truhen erhalten!\nTippe nach dem Öffnen auf einen Gegenstand, um seine Werte zu sehen.',
  '敵を倒すと、宝箱から装備が手に入るよ。\n開いたあとにタップすると、能力が見られる':
    'Besiege Gegner, um Ausrüstung aus Truhen zu bekommen. Tippe nach dem Öffnen auf einen Gegenstand, um seine Werte zu sehen.',
  '拾った装備は、拠点の「配置」で\nバックパックに置くと強くなるよ':
    'Leg gefundene Ausrüstung unter „Packen“ in der Basis in deinen Rucksack, um stärker zu werden.',
  '装備を拾ったら、拠点の「配置」で\nバックパックに置くと強くなるよ':
    'Findest du Ausrüstung, leg sie unter „Packen“ in der Basis in deinen Rucksack, um stärker zu werden.',

  // src/scenes/RunScene.ts
  '今回だけ、伝説の装備を借りてきたよ！\n装備を集めると、いつかこうなる！':
    'Nur dieses eine Mal hast du legendäre Ausrüstung geliehen! Sammle Ausrüstung, dann wirst du eines Tages auch so stark!',
  'バックパックの装備は、起点（番号の石）から\n矢印の向きに順番に攻撃するよ。\nこれが「連鎖」！':
    'Die Gegenstände im Rucksack greifen der Reihe nach an – ab einem Ursprung (dem nummerierten Stein) entlang der Pfeile. Das ist eine „Kette“!',
  '起点（番号の石）から矢印の向きに、\n装備が順番に攻撃するよ。これが「連鎖」！\n長くつながるほど、ダメージが大きくなる':
    'Ab einem Ursprung (dem nummerierten Stein) greifen Gegenstände der Reihe nach entlang der Pfeile an. Das ist eine „Kette“! Je länger die Kette, desto größer der Schaden.',
  '勇者の足元のゲージがたまるたびに、\n起点が①→②→①…の順に1つずつ発火するよ。\n次に動く起点は「次の連鎖」に出る':
    'Jedes Mal, wenn sich die Leiste unter dem Helden füllt, zündet ein Ursprung, einer nach dem anderen: ①→②→①… Welcher als Nächstes zündet, steht unter „Nächste Kette“.',
  '勇者は自動で進んで戦うよ。\n群れをまとめて倒したり、ボスを倒すと\n時間がのびる！':
    'Dein Held läuft und kämpft automatisch. Besiege eine ganze Gruppe auf einmal oder einen Boss, um mehr Zeit zu bekommen!',
  '残り時間。ふだんは0になるか、\nHPがなくなると終わり':
    'Restzeit. Normalerweise endet die Expedition bei 0 oder wenn deine HP aufgebraucht sind.',
  '残り時間。0になるか、HPがなくなると終わり。\n拾った装備は持ち帰れるよ':
    'Restzeit. Die Expedition endet bei 0 oder wenn deine HP aufgebraucht sind. Gefundene Ausrüstung behältst du.',
  '止めたいときはここ。撤退もできるよ。\nさあ、伝説の力を見てみよう！':
    'Hier pausierst du. Du kannst auch den Rückzug antreten. Und jetzt: Sieh dir legendäre Kraft in Aktion an!',
  '止めたいときはここ。撤退もできるよ': 'Hier pausierst du. Du kannst auch den Rückzug antreten.',
  '{n}周目': 'Runde {n}',
  次の連鎖: 'Nächste Kette',
  一時停止中: 'Pause',
  再開: 'Weiter',
  撤退する: 'Rückzug',
  ここまでの戦利品を持ち帰ります: 'Du behältst die bisherige Beute',
  '{region}　{loop}周目　×{speed}': '{region}  Runde {loop}  ×{speed}',
  '{region}　{loop}周目': '{region}  Runde {loop}',
  '防御 {n}': 'Verteidigung {n}',
  '連鎖中！': 'Kette läuft!',
  '{step}段・{sec}秒': 'Kette {step} · {sec}s',
  'FPS {fps}  敵 {enemies}  粒 {particles}  数字 {numbers}  seed {seed}':
    'FPS {fps}  Gegner {enemies}  Partikel {particles}  Zahlen {numbers}  Seed {seed}',
  '時間 +{sec}': 'Zeit +{sec}',
  '時間 上限': 'Zeit max.',
  '{loop}周目のボス　{name}': 'Boss der Runde {loop}  {name}',
  'NEW RECORD! 最大連鎖': 'NEUER REKORD! Längste Kette',
  'NEW RECORD! 最大ダメージ': 'NEUER REKORD! Höchster Schaden',
  無効: 'Geblockt',
  '激昂！': 'In Rage!',
  'アーティファクト！ {name}': 'Artefakt! {name}',
  'よろめき！': 'Taumelt!',
  '一網打尽！': 'Gruppen-K.o.!',
  'ボス撃破！': 'Boss besiegt!',
  '復活！': 'Wiederbelebt!',
  '再開する（HP全回復・+{sec}秒）': 'Wiederbeleben (volle HP, +{sec}s)',
  '▶ 広告を見て再開（HP全回復・+{sec}秒）': '▶ Werbung: Wiederbeleben (volle HP, +{sec}s)',
  あきらめる: 'Aufgeben',
  '1回のランで1回だけ再開できます': 'Du kannst dich einmal pro Expedition wiederbeleben',

  // src/scenes/StageSelectScene.ts
  地域を選ぶ: 'Gebiet wählen',
  '出撃！': 'Los!',
  起点がバックパックにありません: 'Kein Ursprung im Rucksack',
  '出撃する地域を選ぶよ。最初は「草原」。\n奥の地域ほど敵は強いけど、\nいい装備が出やすいよ':
    'Wähle, wohin es geht. Starte mit „Grasland“. In tieferen Gebieten sind die Gegner stärker, aber gute Ausrüstung gibt es öfter.',
  '準備ができたら「出撃！」': 'Bist du bereit, tippe auf „Los!“',
  '「出撃！」を押して、冒険に出よう！': 'Tippe auf „Los!“ und zieh ins Abenteuer!',
  '敵HP×{hp}〜 攻撃×{atk}〜\n装備・ゴールドは出ない':
    'Gegner-HP ×{hp}+  Angriff ×{atk}+\nKeine Ausrüstung, kein Gold',
  '敵HP×{hp} 攻撃×{atk}\nレア以上 +{pct}%': 'Gegner-HP ×{hp}  Angriff ×{atk}\nAb Selten +{pct}%',
  '最高{n}周': 'Rekord: Runde {n}',
  記録なし: 'Kein Rekord',
  '最高{n}周 {stars}': 'Rekord: Runde {n} {stars}',
  '未到達 {stars}': 'Kein Rekord {stars}',
  '雑魚: {trend}': 'Gegner: {trend}',
  'ボス: 全地域から毎周ランダム\n最高ダメージ {damage}':
    'Bosse: jede Runde zufällig aus allen Gebieten\nHöchster Schaden: {damage}',
  '{n}周目〜': 'Runde {n}+',
  '装備とゴールドは出ない。到達周回と与えたダメージで自己ベストを目指す':
    'Keine Ausrüstung, kein Gold. Hol dir Bestwerte bei erreichten Runden und Schaden.',
  '{note}（ボスはアイコンをタップで特徴）': '{note} (tippe auf ein Boss-Symbol für Details)',
  'ボスは出撃ごとに候補から選ばれます（{n}種）。アイコンをタップで特徴':
    'Jede Expedition wählt ihre Bosse aus dieser Liste ({n}). Tippe auf ein Symbol für Details.',
  魔王城で魔王を倒すと開放: 'Frei, wenn du den Dämonenkönig in der Dämonenburg besiegst',
  前の地域の3周目のボスを倒すと開放:
    'Frei, wenn du den Boss in Runde 3 des vorigen Gebiets besiegst',

  // src/ui/achievementToast.ts
  '実績達成！': 'Erfolg erreicht!',

  // src/ui/backpackView.ts
  '必殺 {step}段': 'Spezial #{step}',
  '{step}段 ×{mult}': '#{step} ×{mult}',

  // src/ui/chestReveal.ts
  '売却|sold': 'Verkauft',
  広告: 'Werbung',

  // src/ui/discovery.ts
  図鑑に登録: 'Ins Kompendium eingetragen',
  'NEW  必殺技を発見！': 'NEU  Spezialangriff entdeckt!',
  '【{name}】': '„{name}“',

  // src/ui/itemInfo.ts
  上: 'Oben',
  右: 'Rechts',
  下: 'Unten',
  左: 'Links',
  'アーティファクト（能力 ×{x}・出口の数は固定）': 'Artefakt (Werte ×{x}, feste Zahl an Ausgängen)',
  消耗品: 'Item',
  '{rarity}（能力 ×{x}）': '{rarity} (Werte ×{x})',
  '出口: {dirs}': 'Ausgänge: {dirs}',
  'なし（末端）': 'Keine (Kettenende)',
  '攻撃力 {atk}（{element}・{area}）': 'Angriff {atk} ({element}, {area})',
  '次への伝達 {s}秒': 'Weitergabe {s}s',
  '1段で{n}回攻撃': '{n} Treffer pro Glied',
  '会心率 +{pct}%': 'Krit-Chance +{pct}%',
  '付与: {status} → {element}で{combo}': 'Gibt Status {status} → {combo} mit {element}',
  '付与: {status}': 'Gibt Status {status}',
  '{status}を消費して{combo}（×{x}、範囲に拡大）':
    'Verbraucht {status} für {combo} (×{x}, trifft eine Fläche)',
  '{status}を消費して{combo}（×{x}）': 'Verbraucht {status} für {combo} (×{x})',
  '防御値 +{n}（連鎖が通ると終了時に加算、段数に数えない）':
    'Verteidigung +{n} (wird am Ende einer durchlaufenden Kette addiert; zählt nicht als Glied)',
  '連鎖の始まり。攻撃せず、段数にも数えない':
    'Hier beginnt eine Kette. Greift nicht an und zählt nicht als Glied.',
  '付け直し {n}回': 'Umgeschmiedet: {n}×',
  '売却 {price}G': 'Verkaufswert {price}G',
  アーティファクト: 'Artefakt',
  起点: 'Ursprung',
  防御: 'Rüstung',
  出口: 'Ausgänge',
  攻撃力: 'Angriff',
  '強化込み {n}': 'Mit Training {n}',
  全体攻撃: 'Trifft alle',
  '威力 ×{x}': 'Stärke ×{x}',
  貫通: 'Durchbohren',
  '狙いの後ろ {n}体にも同じダメージ': 'Gleicher Schaden für {n} hinter dem Ziel',
  連撃: 'Mehrfachtreffer',
  会心率: 'Krit-Chance',
  連鎖倍率の上限: 'Multiplikator-Limit',
  この環を通る連鎖すべて: 'Alle Ketten durch diesen Ring',
  吸血: 'Lebensraub',
  '与えたダメージの{pct}%を回復': 'Heilt {pct}% des verursachten Schadens',
  疾風: 'Rückenwind',
  'このあとの装備は段数+{n}': 'Spätere Gegenstände: Glied +{n}',
  '5秒間、一撃の30%を毎秒': '30% des Treffers pro Sekunde für 5 s',
  付与: 'Gibt Status',
  '濡れ・油・凍結をまとめて': 'Nass, Öl und Gefroren auf einmal',
  次への伝達: 'Weitergabe',
  '{s}秒': '{s}s',
  防御値: 'Verteidigung',
  連鎖終了時に加算: 'Kommt am Kettenende dazu',
  守り: 'Schutz',
  連鎖中も無防備にならない: 'In Ketten nie ungeschützt',
  バックパックにある限り: 'Solange im Rucksack',
  '{n}方向': '{n}',
  出口の数は固定: 'Feste Zahl an Ausgängen',
  レアリティで出口の数が決まる: 'Seltenheit bestimmt die Zahl der Ausgänge',
  この配置: 'Diese Anordnung',
  どの起点からも届きません: 'Von keinem Ursprung erreicht',
  '起点{origin}の{step}段目 ×{mult}': 'Ursprung {origin}, Glied {step} ×{mult}',
  '1ヒット 約{n}': '~{n} pro Treffer',
  '起点{origin}の連鎖': 'Kette von Ursprung {origin}',
  段数に数えない: 'Zählt nicht als Glied',
  '{status}を付ける → {element}の攻撃で{combo}（×{x}）':
    'Gibt Status {status} → Angriff mit {element}: {combo} (×{x})',
  '{status}を付ける': 'Gibt Status {status}',
  '{status}の敵に当てると{combo}（×{x}・範囲に拡大）':
    'Treffer bei Status {status}: {combo} (×{x}, trifft eine Fläche)',
  '{status}の敵に当てると{combo}（×{x}）': 'Treffer bei Status {status}: {combo} (×{x})',
  ロックする: 'Sperren',

  // src/ui/itemList.ts
  攻撃: 'Angriff',
  倉庫は空です: 'Das Lager ist leer',
  '★全部': '★Alle',
  '★{rarity}': '★{rarity}',

  // src/ui/kit/chrome.ts
  '出撃 {n}回': 'Expeditionen: {n}',
  拠点: 'Basis',

  // src/ui/pools.ts
  '会心 {n}': 'Krit {n}',

  // src/ui/shareCard.ts
  '{loop}周目に到達': 'Runde {loop} erreicht',
  '最大連鎖 {step}段': 'Längste Kette: {step}',
  '最大ダメージ {damage}': 'Höchster Schaden: {damage}',

  // src/ui/tutorial.ts
  '光っているところをタップ（{n}/{total}）': 'Tippe auf die leuchtende Stelle ({n}/{total})',
  'タップで次へ（{n}/{total}）': 'Tippen zum Fortfahren ({n}/{total})',
  'スキップ ›': 'Überspringen ›',
};
