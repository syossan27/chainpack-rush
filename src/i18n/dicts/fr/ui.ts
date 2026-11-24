// French: screens and messages. Key: Japanese source string → value: translation
// (keep {placeholders} and the meaning of any '|context' key)
import type { Dict } from '../types';

export const UI: Dict = {
  // src/core/challenge.ts
  'レアリティは{rarity}まで（起点は問わない）': "Rareté jusqu'à {rarity} (Origines : au choix)",
  アーティファクトは使えない: 'Artefacts interdits',
  '攻撃装備は {elements} だけ': "Équipement d'attaque : {elements} uniquement",
  '・|sep': ', ',
  防具は使えない: 'Armures interdites',
  '強化と★は使わない（勇者は最初の強さ）':
    'Ni améliorations ni bonus ★ (héros à sa force de départ)',
  'アーティファクト（{item}）は使えない': 'Artefact interdit ({item})',
  '{rarity}より上の装備（{item}）がある': 'Objet au-dessus de {rarity} ({item})',
  '使えない属性の装備（{item}）がある': "Objet d'un élément interdit ({item})",
  '使えない種類の装備（{item}）がある': "Objet d'un type interdit ({item})",
  起点がない: 'Aucune Origine',

  // src/core/cosmetics.ts
  蒼のマント: 'Cape azur',
  白銀の鎧: "Armure d'argent",
  黄金の鎧: "Armure d'or",
  ちびドラゴン: 'Bébé dragon',
  銅のメダル: 'Médaille de bronze',
  銀の王冠: "Couronne d'argent",
  金の王冠: "Couronne d'or",
  若葉の印: 'Marque de feuille',
  コウモリの翼: 'Ailes de chauve-souris',
  騎士の旗: 'Bannière du chevalier',
  炎の羽飾り: 'Plumet de flammes',
  氷の結晶: 'Cristal de glace',
  魔王の翼: 'Ailes du Roi démon',
  星の輪: 'Halo étoilé',

  // src/core/cosmeticRewards.ts
  '{region}で★{stars}（{loop}周目のボスを倒す）':
    '{region} : ★{stars} (bats le boss du tour {loop})',
  'エンドレスで{n}周目に着く': 'Atteins le tour {n} en mode Infini',

  // src/core/diagnose.ts

  // src/core/economy.ts
  見つかりません: 'Introuvable',
  消耗品は合成できません: 'Impossible de fusionner un consommable',
  これ以上のレアリティはありません: 'Déjà à la rareté maximale',
  '装備中は合成に使えません（外してから）':
    "Un objet équipé ne peut pas être fusionné (retire-le d'abord)",
  ロック中は合成に使えません: 'Un objet verrouillé ne peut pas être fusionné',
  '同じ装備があと{n}つ必要': 'Exemplaires manquants : {n}',
  '{cost}G 必要': 'Il te faut {cost}G',

  // src/core/presets.ts

  // src/core/ranking.ts
  '挑戦 第{n}回': 'Défi n°{n}',
  'エンドレス {month}': 'Infini {month}',
  '上位1%': 'Top 1%',
  '上位10%': 'Top 10%',
  '上位50%': 'Top 50%',
  参加: 'Participation',
  '{season} {title}': '{season} · {title}',

  // src/core/shareText.ts
  '挑戦「{name}」でスコア {score}！': 'Score de {score} au Défi « {name} » !',
  'エンドレスで{loop}周目に到達！': 'Tour {loop} atteint en mode Infini !',
  '{region}で{loop}周目に到達！': '{region} : tour {loop} atteint !',
  '最大{step}連鎖・最大ダメージ {damage}': 'Chaîne max {step} · Dégâts max {damage}',

  // src/platform/monetization.ts
  '広告（テスト表示）': 'Pub (test)',
  本番ではここに動画広告が流れます: 'Une pub vidéo passe ici dans le vrai jeu',

  // src/scenes/BaseScene.ts
  基本: 'Les bases',
  '1回のランは30秒。走っている間は時間が止まり、敵と戦っている間だけ減ります。':
    "Une expédition dure 30 secondes. Le chrono s'arrête pendant que le héros marche et ne s'écoule que pendant les combats.",
  '時間は、群れを1回の連鎖でまとめて倒す（一網打尽）と+1.5秒、ボスを倒すと+8秒、時の砂で+5秒のびます。上限はないので、倒し続けるほど長く戦えます。':
    "Éliminer tout un groupe d'une seule chaîne (un coup de filet) ajoute 1.5 s, vaincre un boss ajoute 8 s et le Sable du temps ajoute 5 s. Il n'y a pas de limite : plus tu élimines d'ennemis, plus tu combats longtemps.",
  ダメージの決まり方: 'Calcul des dégâts',
  '・レアリティ：コモン×1、レア×1.5、エピック×2.5、レジェンド×4':
    '• Rareté : Commun ×1, Rare ×1.5, Épique ×2.5, Légendaire ×4',
  '・連鎖倍率：6連鎖目までは1連鎖ごとに×1.2。その先も上限なく伸び続ける（伸びは少しずつ小さく）。循環の環を通ると×4.0まで×1.2ずつ':
    "• Multiplicateur de chaîne : ×1,2 par maillon jusqu'au 6e, puis il continue de croître sans limite (un peu moins à chaque maillon). Par l'Anneau Ouroboros, il croît de ×1,2 par maillon jusqu'à ×4,0",
  '・コンボ：濡れ＋雷で感電×3、油＋炎で爆発×2（周りも巻き込む）、凍結＋打撃で粉砕×2.5。コンボでなくても、状態が付いた敵には×1.2':
    '• Combos : Mouillé + Foudre = Électrochoc ×3, Huile + Feu = Explosion ×2 (touche aussi les ennemis proches), Gelé + Contondant = Fracas ×2.5. Même sans combo, les ennemis avec une altération subissent ×1.2',
  '・強化：拠点の「攻撃倍率」': "• Améliorations : « Multiplicateur d'attaque » à la Base",
  '・会心：8%でダメージ×2（聖剣・会心の追加効果・幸運の硬貨で上がる）':
    "• Critique : 8% de chances de dégâts ×2 (augmentées par l'Épée sacrée, le bonus Critique et la Pièce porte-bonheur)",
  ダメージを伸ばすコツ: 'Astuces pour plus de dégâts',
  '・配置画面の「約」の数字を見ながら並べ替える。ルートの番号を選ぶと、そのルート1本の推定ダメージが出ます。':
    "• Réorganise en surveillant les nombres « ~ » de l'écran Équiper. Choisis un numéro de route pour voir les dégâts estimés de cette route seule.",
  '・コンボを作る。状態を付ける装備（水竜の瓶・雨雲の杖・油瓶・氷の剣・氷の杖）の後ろに、組む属性（雷・炎・打撃）をつなぐ。状態は5秒で消えます。':
    "• Crée des combos. Relie l'élément associé (Foudre, Feu, Contondant) après un objet qui inflige une altération (Fiole du Dragon d’eau, Bâton de pluie, Fiole d'huile, Épée de glace, Bâton de givre). Les altérations disparaissent au bout de 5 secondes.",
  '・光と闇を交互につなぐと、コンボが続く。浄化（勇者のHP回復）と封印（敵の攻撃が少しのあいだ止まる）。風は毒の敵に毒を重ね、5重で毒爆。':
    '• Alterne Lumière et Ténèbres pour enchaîner les combos : Purification (soigne le héros) et Scellé (stoppe les attaques ennemies un instant). Le Vent ajoute des couches de Poison aux ennemis empoisonnés ; à 5 couches, Venin explosif.',
  '・強い装備ほど後ろ（6連鎖目以降）に置く。前のほうは軽い装備や状態付与に。':
    '• Place tes objets les plus forts en fin de chaîne (6e maillon et au-delà). Garde les premiers maillons pour les objets légers et ceux qui infligent des altérations.',
  '・レアリティが一番効きます。奥の地域ほどレア以上が出やすい。':
    "• C'est la rareté qui compte le plus. Les régions lointaines donnent plus souvent du Rare ou mieux.",
  '・装備の左下の✦は追加効果。先駆け（3連鎖目まで強い）は短い連鎖に、締め（6連鎖目以降強い）は長い連鎖に向きます。':
    "• Le ✦ en bas à gauche d'un objet indique un bonus. Avant-garde (fort jusqu'au 3e maillon) convient aux chaînes courtes ; Finisseur (fort dès le 6e maillon) aux chaînes longues.",
  必殺技: 'Coups spéciaux',
  '連鎖のルートで、決まった装備が順に3つつながって通ると、3つ目の一撃が必殺技になります（ダメージ×2.5、勇者が大きく踏み込む）。配置画面では、そのマスに「必殺」と出ます。':
    "Quand une chaîne traverse 3 objets précis dans l'ordre, le 3e coup devient un coup spécial (dégâts ×2.5, et le héros bondit en avant). Sur l'écran Équiper, cette case affiche « Spécial ».",
  短い連鎖と長い連鎖: 'Chaînes courtes ou longues',
  '・次の発火までの待ちは、直前の連鎖で動いた装備の数に比例します（防具も数えます）。短い連鎖は回転が速く、長い連鎖は一撃が大きい。':
    "• L'attente avant le prochain déclenchement dépend du nombre d'objets déclenchés dans la dernière chaîne (les armures comptent aussi). Les chaînes courtes tournent vite ; les longues frappent fort.",
  '・連鎖中は無防備（被ダメージ×1.5）。ただし起点のあと、3マス動くまでは守りが残ります（防具のマスも数えます）。':
    "• Pendant une chaîne, tu es à découvert (dégâts subis ×1.5), mais tu restes protégé jusqu'à ce que la chaîne ait traversé 3 cases après l'origine (les cases d'armure comptent aussi).",
  '・防具のマスは鳴った瞬間に防御値を足します。長い連鎖の途中に防具を通すと、無防備の間も耐えられます。':
    "• Les cases d'armure ajoutent leur Défense dès qu'elles sonnent. Fais passer une longue chaîne par de l'armure pour tenir à découvert.",
  地域と敵: 'Régions et ennemis',
  '・草原 → 洞窟 → 城壁の順に敵が一気に強くなり、そのぶんレアな装備が出やすくなります。3周目のボスを倒すと次の地域が開きます。':
    "• Prairie → Grotte → Remparts : les ennemis deviennent bien plus coriaces, mais l'équipement rare tombe aussi plus souvent. Vaincs le boss du tour 3 pour débloquer la région suivante.",
  '・群れとボスは出撃ごとに変わります。精鋭（硬い・速い・金ぴか）が混ざることも。金ぴかは必ずレア以上を2個落とします。':
    '• Les groupes et les boss changent à chaque expédition. Des élites (Coriace, Rapide, Doré) peuvent apparaître. Les élites « Doré » lâchent toujours 2 objets Rare ou mieux.',
  '・アーティファクトはごくまれに出る特別な装備です。':
    '• Les Artefacts sont des objets spéciaux qui tombent très rarement.',
  ご褒美とプレミアム: 'Récompenses et Premium',
  '・広告を見ると、ご褒美がもらえます：結果画面で「戦利品を2倍にする」（1日3回、同じ数だけ抽選し直してもう1セット）、鍛冶屋で「無料で再抽選」（1日3回）、力尽きたときに「再開」（1回のランで1回、HP全回復＋10秒）。':
    "• Regarde une pub pour obtenir une récompense : « Doubler le butin » sur l'écran des résultats (3 fois par jour ; un nouveau lot de même taille est tiré), « Relance gratuite » à la Forge (3 fois par jour) et « Ressusciter » quand tu tombes (une fois par expédition ; HP au max + 10 s).",
  '・プレミアム（{price}、買い切り）なら、広告を見なくても同じご褒美を受け取れます。設定から買えます。':
    '• Avec Premium ({price}, achat unique), tu reçois les mêmes récompenses sans regarder de pub. Achète-le dans les Réglages.',
  '倉庫・鍛冶屋・合成': 'Réserve, Forge et Fusion',
  '・消耗品枠は、入れた消耗品を覚えています。ランで使い切ったら、倉庫に同じものがあれば自動で入れ直します（ないときは枠にうすく「自動」と出て、手に入ったら入ります）。手で外すと覚えるのをやめます。':
    "• Les places de consommables retiennent ce que tu y mets. Quand tu en épuises un pendant une expédition, le même objet est repris automatiquement dans la Réserve (si tu n'en as plus, la place affiche un « Auto » pâle et se remplit dès que tu en obtiens un). Retire-le à la main pour arrêter.",
  '・倉庫の「自動売却」で、ラン後に戦利品から決まったレアリティ以下を自動で売れます（✦付きを残すかも選べます）。':
    "• Avec la « Vente auto » de la Réserve, le butin d'une rareté choisie ou inférieure est vendu automatiquement après chaque expédition (tu peux choisir de garder les objets ✦).",
  '・倉庫があふれると出撃できません。「一括売却」「まとめて売る」で整理しましょう。大事な装備は詳細カードでロックすると売れなくなります。':
    "• Impossible de partir en expédition si la Réserve déborde. Fais de la place avec « Vente groupée » ou « Vente au choix ». Verrouille l'équipement important sur sa fiche pour qu'il ne puisse pas être vendu.",
  '・鍛冶屋では出口の向きを付け直せます（数は変わりません）。レアリティが高いほど料金も上がります。':
    '• À la Forge, tu peux reforger le sens des sorties (leur nombre ne change pas). Plus la rareté est élevée, plus ça coûte cher.',
  '・同じ装備・同じレアリティを3つ集めると、鍛冶屋の「合成」（倉庫の詳細カードからも）で1つ上のレアリティを狙えます。成功率はコモン→レア80%（20G）、レア→エピック50%（100G）、エピック→レジェンド25%（500G）。失敗すると、材料と同じレアリティのランダムな装備が1つ手に入ります。追加効果と出口の向きは新しく決まります。':
    "• Réunis 3 exemplaires du même objet de même rareté et utilise « Fusionner » à la Forge (ou depuis la fiche d'un objet dans la Réserve) pour viser la rareté supérieure. Taux de réussite : Commun→Rare 80% (20G), Rare→Épique 50% (100G), Épique→Légendaire 25% (500G). En cas d'échec, tu obtiens 1 objet aléatoire de même rareté. Les bonus et le sens des sorties sont tirés à nouveau.",
  設定: 'Réglages',
  ヘルプ: 'Aide',
  ランキング: 'Classement',
  挑戦: 'Défi',
  倉庫: 'Réserve',
  鍛冶屋: 'Forge',
  図鑑: 'Codex',
  出撃: 'Partir !',
  '倉庫があふれています。売却するまで出撃できません':
    'La Réserve est pleine. Vends des objets pour pouvoir partir.',
  冒険の記録: "Journal d'aventure",
  '出撃|stat': 'Expéditions',
  '{n}回': '{n}',
  最大連鎖: 'Chaîne max',
  '{n}連鎖': '{n}',
  最大ダメージ: 'Dégâts max',
  開放した地域: 'Régions débloquées',
  '{region} {n}周': '{region} (tour {n})',
  '最高到達: {list}': 'Record : {list}',
  '　|sep': '  ·  ',
  まだありません: 'Rien pour le moment',
  ロック中: 'Verrouillé',
  '売る {price}G': 'Vendre {price}G',
  売る: 'Vendre',
  アーティファクトを売る: "Vendre l'Artefact",
  '{item}を{price}Gで売ります': 'Vendre {item} pour {price}G ?',
  ロック中の装備は売れません: 'Impossible de vendre un objet verrouillé',
  '売るものをタップで選ぶ（もう一度で外す・長押しで詳細）':
    'Touche les objets à vendre (touche encore pour annuler, maintiens pour les détails)',
  '自動売却：オフ': 'Vente auto : désactivée',
  '自動売却：{rarity}（✦は残す）': 'Vente auto : {rarity} (garde les ✦)',
  '自動売却：{rarity}': 'Vente auto : {rarity}',
  '自動売却：{rarity}以下（✦は残す）': 'Vente auto : {rarity} ou moins (garde les ✦)',
  '自動売却：{rarity}以下': 'Vente auto : {rarity} ou moins',
  '{n}個を売ります（+{gold}G）': 'Objets à vendre : {n} (+{gold}G)',
  '{n}個を売る +{gold}G': 'Vendre ×{n} +{gold}G',
  選んで売る: 'Choisir',
  やめる: 'Annuler',
  まとめて売る: 'Vente au choix',
  '{rarity}  {n}個 +{gold}G': '{rarity}  ×{n} +{gold}G',
  '{rarity}以下  {n}個 +{gold}G': '{rarity} ou moins  ×{n} +{gold}G',
  '{rarity}を一括売却': 'Vente groupée : {rarity}',
  '{rarity}以下を一括売却': 'Vente groupée : {rarity} ou moins',
  '消耗品  {n}個 +{gold}G': 'Consommables  ×{n} +{gold}G',
  消耗品を一括売却: 'Vente groupée : consommables',
  '✦付きは残す：オン': 'Garder les ✦ : oui',
  '✦付きは残す：オフ': 'Garder les ✦ : non',
  一括売却: 'Vente groupée',
  向きの付け直し: 'Reforger',
  合成: 'Fusionner',
  この装備は向きを付け直せません: 'Cet objet ne peut pas être reforgé',
  装備中: 'Équipé',
  付け直す装備を選んでください: 'Choisis un objet à reforger',
  '出口の数は変わらず、方向だけが変わります':
    'Le nombre de sorties ne change pas, seul leur sens change',
  '付け直し {n}回（毎回 料金×1.5）': 'Reforgé ×{n} (coût ×1.5 à chaque fois)',
  '再抽選 {gold}G': 'Relancer {gold}G',
  ゴールドが足りません: "Pas assez d'or",
  '無料で再抽選（今日あと{n}回）': "Relance gratuite (encore {n} aujourd'hui)",
  '▶ 広告を見て無料で再抽選（今日あと{n}回）': "▶ Pub : relance gratuite (encore {n} aujourd'hui)",
  '指定: {n}方向を選ぶ': 'Au choix : sorties ({n})',
  '指定 {gold}G': 'Au choix {gold}G',
  '方向を{n}つ選んでください': 'Choisis le sens des sorties ({n})',
  強化: 'Améliorer',
  '最大HP {hp}（★{stars}で+{bonus}込み）': 'HP max {hp} (dont +{bonus} grâce à ★{stars})',
  '最大HP {hp}': 'HP max {hp}',
  '攻撃間隔 {sec}秒': "Délai d'attaque {sec} s",
  '攻撃倍率 ×{mult}（★{stars}で+{bonus}%込み）':
    "Multiplicateur d'attaque ×{mult} (dont +{bonus}% grâce à ★{stars})",
  '攻撃倍率 ×{mult}': "Multiplicateur d'attaque ×{mult}",
  '出撃 {sec}秒（延長込みの上限 {max}秒）':
    "Durée d'expédition {sec} s (max {max} s avec les bonus)",
  '出撃 {sec}秒': "Durée d'expédition {sec} s",
  '{n}枠': 'Places : {n}',
  '{n}個': 'Capacité : {n}',
  最大: 'MAX',
  切替: 'Changer',
  音量: 'Volume',
  ゲームスピード: 'Vitesse du jeu',
  '検証用。×2 なら30秒のランが15秒で終わります':
    'Pour les tests. À ×2, une expédition de 30 secondes dure 15 secondes.',
  'プレミアム（購入済み）': 'Premium (acheté)',
  'プレミアム {price}': 'Premium {price}',
  広告なしでご褒美を受け取れます: 'Tu reçois les récompenses sans pub',
  'プレミアムになりました！': 'Tu es maintenant Premium !',
  購入を復元: 'Restaurer les achats',
  購入を復元しました: 'Achats restaurés',
  復元できる購入はありません: 'Aucun achat à restaurer',
  '遊び方・強くなるコツ': 'Comment jouer et astuces',
  案内をもう一度: 'Revoir le tutoriel',
  '各画面で、案内がもう一度出ます': 'Le tutoriel de chaque écran va réapparaître',
  振動: 'Vibrations',
  '画面揺れ・光': 'Tremblements et flashs',
  消耗品ボタンの位置: 'Côté des boutons d’objets',
  '重ね（下から順に鳴る）': 'Pile (se déclenche de bas en haut)',
  '一番上 ×{m}（矢印はこの装備）': 'Haut ×{m} (ses flèches mènent la suite)',
  '×{m}': '×{m}',
  同じ装備だけ重ねられます: 'Seul un équipement identique peut s’empiler',
  'アーティファクトは重ねられません（1つで{n}回鳴ります）':
    'Les artefacts ne s’empilent pas (un seul sonne {n} fois)',
  '1マスに重ねられるのは{n}つまで': 'Jusqu’à {n} par case',
  デバッグ機能: 'Mode débogage',
  着せ替えの見た目をすべて試せます: 'Vous pouvez essayer toutes les apparences de la Garde-robe',
  言語: 'Langue',
  '{auto}（{lang}）': '{auto} ({lang})',
  自動: 'Auto',
  端末の言語: "langue de l'appareil",
  'オフ（売らない）': 'Désactivée (ne rien vendre)',
  コモンを売る: 'Vendre Commun',
  レア以下を売る: 'Vendre Rare ou moins',
  エピック以下を売る: 'Vendre Épique ou moins',
  自動売却: 'Vente auto',
  'ラン後に戦利品から売ります。消耗品・アーティファクトは売りません':
    'Vend une partie du butin après chaque expédition. Consommables et Artefacts ne sont jamais vendus.',
  'ようこそ！\n勇者が自動で進んで、敵と戦うゲームだよ。\nまずは「出撃」を押してみよう！':
    'Bienvenue !\nTon héros avance et combat les ennemis tout seul. Pour commencer, touche « Partir ! »',
  '鍛冶屋では、装備の出口の向きを変えたり、\n同じ装備を3つ集めて「合成」して\n上のレアリティを狙えるよ':
    "À la Forge, tu peux changer le sens des sorties d'un objet, ou « Fusionner » 3 exemplaires du même objet pour viser une rareté supérieure.",
  '合成 {gold}G': 'Fusionner {gold}G',
  '合成 {have}/3': 'Fusionner {have}/3',
  '{item}（{rarity}）を3つ使って、{target}の{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    "Utilise 3 × {item} ({rarity}) pour viser {target} {to} ({gold}G).\nTaux de réussite : {rate}%. En cas d'échec, tu obtiens 1 objet {rarity} aléatoire.",
  '{item}（{rarity}）を3つ使って、{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    "Utilise 3 × {item} ({rarity}) pour viser la rareté {to} ({gold}G).\nTaux de réussite : {rate}%. En cas d'échec, tu obtiens 1 objet {rarity} aléatoire.",
  合成する: 'Fusionner',
  ロック: 'Verrouillé',
  '{n}つ': '×{n}',
  合成する装備を選んでください: 'Choisis un objet à fusionner',
  '同じ装備・同じレアリティを3つで、1つ上のレアリティに':
    '3 fois le même objet de même rareté → rareté supérieure',
  '「○つ」の印は、3つ以上揃っている装備です':
    'La marque « ×○ » signale un objet que tu as en 3 exemplaires ou plus',
  '{rarity} ×3 → {target}の{to} ×1': '{rarity} ×3 → {target} {to} ×1',
  '{rarity} ×3 → {to} ×1': '{rarity} ×3 → {to} ×1',
  '成功率 {rate}%': 'Réussite {rate}%',
  '失敗すると{rarity}のランダムな装備が1つ（追加効果・向きは新しく）':
    "En cas d'échec : 1 objet {rarity} aléatoire (nouveaux bonus et sorties)",
  '合成する {gold}G': 'Fusionner {gold}G',
  合成できません: 'Fusion impossible',
  '合成中…': 'Fusion…',
  タップで閉じる: 'Touche pour fermer',
  '合成成功！': 'Réussite !',
  '失敗…': 'Échec…',
  実績: 'Succès',
  '2週替わりの挑戦': 'Défi de la quinzaine',
  'エンドレス（月ごと）': 'Infini (mensuel)',
  挑戦はまだ始まっていません: "Le Défi n'a pas encore commencé",
  '（初めて記録を送るときに決まります）': '(choisi quand tu envoies ton premier score)',
  'あなたの名前: {name}': 'Ton nom : {name}',
  変える: 'Changer',
  つながりませんでした: 'Connexion impossible',
  'シーズンの終わりに: 上位1% {top1}G＋称号 / 上位10% {top10}G＋称号 / 上位50% {top50}G＋称号 / 参加 {joined}G':
    'En fin de saison : Top 1% {top1}G + titre / Top 10% {top10}G + titre / Top 50% {top50}G + titre / Participation {joined}G',
  'ランキングは、サーバーの準備ができたら開きます':
    'Le classement ouvrira quand le serveur sera prêt',
  '挑戦が始まったら、ここに順位が出ます': 'Les rangs apparaîtront ici quand le Défi commencera',
  '読み込み中…': 'Chargement…',
  'あなた: {rank}位 / {total}人（上位{pct}%）': 'Toi : rang {rank} / {total} (top {pct}%)',
  'まだ記録がありません（参加 {total}人）': 'Pas encore de score (joueurs : {total})',
  '{loop}周・{damage}': 'Tour {loop} · {damage}',
  まだ誰も記録していません: 'Aucun score pour le moment',
  '{season}: {rank}位 / {total}人（{band}）  +{gold}G':
    '{season} : rang {rank} / {total} ({band})  +{gold}G',
  '新しい装飾品: {list}': 'Nouveaux cosmétiques : {list}',
  ランキングの報酬: 'Récompenses du classement',
  受け取る: 'Récupérer',
  戻る: 'Retour',
  冒険者: 'Aventurier',
  いつもの色: 'Par défaut',
  ペット: 'Compagnon',
  なし: 'Aucun',
  使用中: 'Utilisé',
  '{band}でもらえる': 'Récompense : {band}',
  着せ替え: 'Garde-robe',
  '冒険や挑戦でもらえる、見た目だけの装飾品':
    'Apparences gagnées en aventure et aux Défis. Elles ne changent que le look.',
  勇者: 'Héros',
  頭: 'Tête',
  背中: 'Dos',
  名前の飾り: 'Badge de nom',
  '舞台: {region}': 'Lieu : {region}',
  '・{rule}': '• {rule}',
  'リリースから2週間後に開放！': 'Ouvre 2 semaines après la sortie !',
  '開放まで あと{n}日': 'Ouverture dans {n} j',
  '2週間ごとに、地域と制限が入れ替わります。':
    'Toutes les 2 semaines, la région et les règles changent.',
  '全員が同じ敵の並びに、自分の装備で挑み、合計ダメージを競います。':
    'Tout le monde affronte les mêmes ennemis avec son propre équipement, et le total de dégâts fait le classement.',
  '強化と★は使わず、勇者は最初の強さ。並べ方の腕が勝負です。':
    'Ni améliorations ni bonus ★ : le héros a sa force de départ. Tout se joue sur ta disposition.',
  '装備とゴールドは出ません。': 'Ni équipement ni or à gagner.',
  '残り {days}日{hours}時間': 'Encore {days} j {hours} h',
  '自己ベスト {score}': 'Record : {score}',
  まだ挑戦していません: 'Pas encore tenté',
  '装備 {n}個・起点 {origins}個': 'Objets : {n} · Origines : {origins}',
  まだ組んでいません: 'Pas encore créé',
  組み直す: 'Recréer',
  '出撃できる形まで組むだけ。並べ方を詰めるのはあなた次第':
    'Ça crée juste un Set jouable. À toi de peaufiner la disposition.',
  挑戦する: "C'est parti !",
  '達成 {done} / {total}': 'Réussis {done} / {total}',
  達成: 'Réussi',
  '見つけた必殺技 {found} / {total}': 'Coups spéciaux trouvés {found} / {total}',
  '発動：{hint}': 'Ordre : {hint}',
  '3つ目の一撃がダメージ×2.5、勇者が大きく踏み込む':
    'Le 3e coup inflige ×2.5 dégâts, et le héros bondit en avant',
  '？？？': '???',
  'ヒント：{teaser}': 'Indice : {teaser}',
  'プレミアム：広告なしでご褒美を受け取れます': 'Premium : reçois les récompenses sans pub',
  'プレミアム {price}｜広告なしでご褒美がもらえる': 'Premium {price} | Récompenses sans pub',
  '詳しく ›': 'Détails ›',
  'プレミアム {price}（買い切り）': 'Premium {price} (achat unique)',
  '広告を見なくても、ご褒美をすぐ受け取れます。\n・結果画面「戦利品を2倍にする」\n・鍛冶屋「無料で再抽選」\n・力尽きたときの「再開」\n（回数はそのまま。強さは変わりません）':
    'Reçois les récompenses tout de suite, sans pub :\n• Résultats : « Doubler le butin »\n• Forge : « Relance gratuite »\n• Quand tu tombes : « Ressusciter »\n(Mêmes limites par jour. Ça ne te rend pas plus fort.)',
  購入する: 'Acheter',

  // src/scenes/DummyScene.ts
  カカシで試し撃ち: 'Essai sur mannequin',
  '「発火」で次の起点を撃つ': 'Touche « Feu ! » pour déclencher la prochaine Origine',
  発火: 'Feu !',
  配置: 'Équiper',
  '起点{origin} 発火中…': 'Origine {origin} en action…',
  '総ダメージ {n}': 'Dégâts totaux {n}',
  '持続（無防備） {sec}秒': 'Durée à découvert : {sec} s',
  '防御値 +{n}': 'Défense +{n}',
  'コンボ {list}': 'Combos {list}',

  // src/scenes/LoadoutScene.ts
  '↶ 戻す': '↶ Annuler',
  全部外す: 'Tout retirer',
  使えない: 'Interdit',
  挑戦へ: 'Défi',
  '「約」の数字が大きいほど強い並べ方。\nいろいろ試してみよう！':
    "Plus le nombre « ~ » est grand, plus la disposition est forte. Essaie plein d'idées !",
  '「約」の数字は敵1体に撃ったときの推定ダメージ（コンボ・会心込み）':
    'Les nombres « ~ » sont les dégâts estimés sur un seul ennemi (combos et critiques inclus)',
  '起点が0個です。出撃できません': 'Aucune Origine placée. Impossible de partir.',
  '倉庫があふれています（タップで売却）': 'La Réserve est pleine (touche pour vendre)',
  全部: 'Tout',
  線を消す: 'Masquer',
  線なし: 'Sans lignes',
  番号を選ぶと表示に戻す: 'Choisis un numéro pour réafficher les lignes',
  起点を置いてください: 'Place une Origine',
  '合計 約{n}': 'Total ~{n}',
  '約{n}・{step}連鎖・{tech}': '~{n} · Chaîne {step} · {tech}',
  '必殺技|fallback': 'Coup spécial',
  '約{n}・{step}連鎖・コンボ{combo}': '~{n} · Chaîne {step} · Combos {combo}',
  '約{n}・{step}連鎖': '~{n} · Chaîne {step}',
  閉じる: 'Fermer',
  '挑戦「{name}」用': 'Défi : {name}',
  制限に合わせる: 'Rendre conforme',
  もう制限に合っています: 'Déjà conforme aux règles',
  '制限に合わせました。並べ方を詰めよう':
    'Set rendu conforme aux règles. Peaufine la disposition !',
  '合う装備が足りず、空いたマスがあります':
    "Pas assez d'objets autorisés : certaines cases restent vides",
  '消耗品|slots': 'Consommables',
  '自動|refill': 'Auto',
  ひとつ前の並べ方に戻しました: 'Dernière modification annulée',
  置きたいマスをタップ: 'Touche une case pour le placer',
  外す: 'Retirer',
  発火順を前へ: 'Déclencher avant',
  枠に入れる: 'Ajouter',
  枠がいっぱい: 'Plus de place',
  置く: 'Placer',
  あふれた分を売る: 'Vendre le surplus',
  '安いものから{n}個を売って倉庫に収めます\n（+{gold}G）':
    'Vend les objets les moins chers (×{n}) pour faire de la place dans la Réserve.\n(+{gold}G)',

  // src/scenes/ResultScene.ts
  '体験おわり！': 'Démo terminée !',
  '力尽きた…': 'Vaincu…',
  '撤退！': 'Retraite !',
  '時間切れ！': 'Temps écoulé !',
  ランキングに記録しました: 'Score enregistré au classement',
  シェア: 'Partager',
  '画像を保存しました（文はコピー済み）': 'Image enregistrée (texte copié)',
  画像を作れませんでした: "Impossible de créer l'image",
  '挑戦「{name}」・{region}': 'Défi « {name} » · {region}',
  'スコア {score}': 'Score {score}',
  '到達 {loop}周目': 'Tour atteint : {loop}',
  ボス撃破: 'Boss vaincus',
  '発火|stat': 'Chaînes lancées',
  ゴールド: 'Or',
  一網打尽: 'Coups de filet',
  '自己ベスト！': 'Nouveau record !',
  '★×{n}獲得！': 'Gain : ★×{n} !',
  '★獲得！': '★ obtenue !',
  '★ボーナス: 攻撃+{atk}%・最大HP+{hp}': 'Bonus ★ : Attaque +{atk}% · HP max +{hp}',
  '新しい地域「{region}」が開放された！': 'Nouvelle région débloquée : {region} !',
  '戦利品 {n}': 'Butin : {n}',
  '自動売却 {n}個 +{gold}G': 'Vente auto ×{n} +{gold}G',
  '消耗品を{n}個 補充': 'Consommables rechargés ×{n}',
  '借りた伝説の装備は、お返ししたよ\n（体験なので戦利品はなし）':
    "L'équipement légendaire prêté a été rendu.\n(C'était une démo : pas de butin.)",
  '挑戦「{name}」': 'Défi « {name} »',
  'スコア（合計ダメージ） {score}': 'Score (dégâts totaux) {score}',
  '自己ベスト {best}（更新！）': 'Record {best} (nouveau !)',
  '自己ベスト {best}': 'Record {best}',
  エンドレスは装備が出ません: "Pas d'équipement en mode Infini",
  '自己ベスト {loop}周目・ダメージ {damage}': 'Record : tour {loop} · dégâts {damage}',
  戦利品なし: 'Pas de butin',
  タップで能力を確認: 'Touche un objet pour voir ses stats',
  タップで早送り: 'Touche pour accélérer',
  '戦利品を2倍にする（今日あと{n}回）': "Doubler le butin (encore {n} aujourd'hui)",
  '▶ 広告を見て戦利品を2倍にする（今日あと{n}回）':
    "▶ Pub : doubler le butin (encore {n} aujourd'hui)",
  '戦利品 {n}（×2）': 'Butin : {n} (×2)',
  '広告のボーナス +{n}個（自動売却 {sold}個 +{gold}G）':
    'Bonus pub +{n} (vente auto ×{sold} +{gold}G)',
  '広告のボーナス +{n}個': 'Bonus pub +{n}',
  拠点へ: 'Vers la Base',
  配置へ: 'Équiper',
  自分で出撃: 'À toi !',
  もう一度: 'Rejouer',
  倉庫があふれています: 'Réserve pleine',
  起点がありません: 'Aucune Origine',
  'これが伝説の装備の力！\n最大{step}連鎖、{damage}ダメージ！':
    "Voilà la puissance de l'équipement légendaire !\nChaîne max : {step} · Dégâts : {damage} !",
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、\nいつかこの姿に！':
    "Maintenant, pars à l'aventure avec ton propre équipement. Collectionne et dispose tes objets, et un jour tu seras aussi fort !",
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、いつかこの姿に！\n「自分で出撃」を押してね':
    "Maintenant, pars à l'aventure avec ton propre équipement. Collectionne et dispose tes objets, et un jour tu seras aussi fort ! Touche « À toi ! »",
  '宝箱から装備をゲット！\n開いたあとにタップすると、能力が見られるよ':
    "Tu as trouvé de l'équipement dans des coffres !\nTouche un objet une fois ouvert pour voir ses stats.",
  '敵を倒すと、宝箱から装備が手に入るよ。\n開いたあとにタップすると、能力が見られる':
    "Vaincs des ennemis pour obtenir de l'équipement dans des coffres. Touche un objet une fois ouvert pour voir ses stats.",

  // src/scenes/RunScene.ts
  '今回だけ、伝説の装備を借りてきたよ！\n装備を集めると、いつかこうなる！':
    "Juste pour cette fois, tu as emprunté de l'équipement légendaire ! Collectionne des objets et un jour tu seras aussi fort !",
  '起点（番号の石）から矢印の向きに、\n装備が順番に攻撃するよ。これが「連鎖」！\n長くつながるほど、ダメージが大きくなる':
    "Depuis une Origine (la pierre numérotée), les objets attaquent tour à tour en suivant les flèches. C'est une « chaîne » ! Plus la chaîne est longue, plus les dégâts sont gros.",
  '勇者は自動で進んで戦うよ。\n群れをまとめて倒したり、ボスを倒すと\n時間がのびる！':
    'Ton héros avance et combat tout seul. Élimine tout un groupe ou vaincs un boss pour gagner du temps !',
  '残り時間。ふだんは0になるか、\nHPがなくなると終わり':
    "Temps restant. D'habitude, l'expédition se termine quand il atteint 0 ou quand tu n'as plus de HP.",
  '残り時間。0になるか、HPがなくなると終わり。\n拾った装備は持ち帰れるよ':
    "Temps restant. L'expédition se termine quand il atteint 0 ou quand tu n'as plus de HP. Tu gardes l'équipement ramassé.",
  '止めたいときはここ。撤退もできるよ。\nさあ、伝説の力を見てみよう！':
    'Touche ici pour faire une pause. Tu peux aussi battre en retraite. Allez, admire la puissance légendaire !',
  '止めたいときはここ。撤退もできるよ':
    'Touche ici pour faire une pause. Tu peux aussi battre en retraite.',
  '{n}周目': 'Tour {n}',
  次の連鎖: 'Chaîne suivante',
  一時停止中: 'Pause',
  再開: 'Reprendre',
  撤退する: 'Retraite',
  ここまでの戦利品を持ち帰ります: "Tu gardes le butin obtenu jusqu'ici",
  '{region}　{loop}周目　×{speed}': '{region}  Tour {loop}  ×{speed}',
  '{region}　{loop}周目': '{region}  Tour {loop}',
  '防御 {n}': 'Défense {n}',
  '連鎖中！': 'Enchaînement !',
  '{step}連鎖・{sec}秒': 'Chaîne {step} · {sec} s',
  'FPS {fps}  敵 {enemies}  粒 {particles}  数字 {numbers}  seed {seed}':
    'FPS {fps}  ennemis {enemies}  particules {particles}  nombres {numbers}  seed {seed}',
  '時間 +{sec}': 'Temps +{sec}',
  '時間 上限': 'Temps max',
  '{loop}周目のボス　{name}': 'Boss du tour {loop}  {name}',
  'NEW RECORD! 最大連鎖': 'NOUVEAU RECORD ! Chaîne max',
  'NEW RECORD! 最大ダメージ': 'NOUVEAU RECORD ! Dégâts max',
  無効: 'Bloqué',
  '激昂！': 'Enragé !',
  'アーティファクト！ {name}': 'Artefact ! {name}',
  '一網打尽！': 'Coup de filet !',
  'ボス撃破！': 'Boss vaincu !',
  '復活！': 'Ressuscité !',
  '再開する（HP全回復・+{sec}秒）': 'Ressusciter (HP max, +{sec} s)',
  '▶ 広告を見て再開（HP全回復・+{sec}秒）': '▶ Pub : ressusciter (HP max, +{sec} s)',
  あきらめる: 'Abandonner',
  '1回のランで1回だけ再開できます': 'Tu peux ressusciter une fois par expédition',

  // src/scenes/StageSelectScene.ts
  地域を選ぶ: 'Choisis une région',
  '出撃！': 'Partir !',
  '出撃する地域を選ぶよ。最初は「草原」。\n奥の地域ほど敵は強いけど、\nいい装備が出やすいよ':
    'Choisis ta destination. Commence par « Prairie ». Les régions lointaines ont des ennemis plus coriaces, mais le bon équipement y tombe plus souvent.',
  '準備ができたら「出撃！」': 'Quand tu es prêt, touche « Partir ! »',
  '「出撃！」を押して、冒険に出よう！': "Touche « Partir ! » pour te lancer dans l'aventure !",
  '敵HP×{hp}〜 攻撃×{atk}〜\n装備・ゴールドは出ない':
    'HP ennemis ×{hp}+  Atq ×{atk}+\nNi équipement ni or',
  '敵HP×{hp} 攻撃×{atk}\nレア以上 {pct}%・最高 {top}':
    'HP ennemis ×{hp}  Atq ×{atk}\nRare ou mieux {pct}% · Max {top}',
  '最高{n}周': 'Record : tour {n}',
  記録なし: 'Aucun record',
  '最高{n}周 {stars}': 'Record : tour {n} {stars}',
  '未到達 {stars}': 'Aucun record {stars}',
  '雑魚: {trend}': 'Ennemis : {trend}',
  'ボス: 全地域から毎周ランダム\n最高ダメージ {damage}':
    'Boss : au hasard parmi toutes les régions, à chaque tour\nRecord de dégâts : {damage}',
  '{n}周目〜': 'Tour {n}+',
  '装備とゴールドは出ない。到達周回と与えたダメージで自己ベストを目指す':
    'Ni équipement ni or. Vise un record de tours atteints et de dégâts infligés.',
  '{note}（ボスはアイコンをタップで特徴）':
    "{note} (touche l'icône d'un boss pour voir ses traits)",
  'ボスは出撃ごとに候補から選ばれます（{n}種）。アイコンをタップで特徴':
    'Chaque expédition tire ses boss de cette liste ({n}). Touche une icône pour voir ses traits.',
  魔王城で魔王を倒すと開放: 'Se débloque en battant le Roi démon au Château démoniaque',
  前の地域の3周目のボスを倒すと開放:
    'Se débloque en battant le boss du tour 3 de la région précédente',

  // src/ui/achievementToast.ts
  '実績達成！': 'Succès débloqué !',
  '新しい見た目！': 'Nouvelle apparence !',
  拠点で勇者をタップして着せ替え: 'Touche le héros à la Base pour changer son apparence',

  // src/ui/backpackView.ts
  '必殺 {step}連鎖': 'Spécial #{step}',
  '{step}連鎖 ×{mult}': '#{step} ×{mult}',

  // src/ui/chestReveal.ts
  '売却|sold': 'Vendu',
  広告: 'Pub',

  // src/ui/discovery.ts

  // src/ui/itemInfo.ts
  上: 'Haut',
  右: 'Droite',
  下: 'Bas',
  左: 'Gauche',
  'アーティファクト（能力 ×{x}・出口の数は固定）': 'Artefact (stats ×{x}, nombre de sorties fixe)',
  消耗品: 'Consommable',
  '{rarity}（能力 ×{x}）': '{rarity} (stats ×{x})',
  '出口: {dirs}': 'Sorties : {dirs}',
  'なし（末端）': 'Aucune (fin de chaîne)',
  '攻撃力 {atk}（{element}・{area}）': 'Attaque {atk} ({element}, {area})',
  '次への伝達 {s}秒': 'Relais {s} s',
  '{n}回攻撃（連鎖数は1つ）': 'Coups par maillon : ×{n}',
  '会心率 +{pct}%': 'Taux critique +{pct}%',
  '付与: {status} → {element}で{combo}': 'Applique : {status} → {combo} avec {element}',
  '付与: {status}': 'Applique : {status}',
  '{status}を消費して{combo}（×{x}、範囲に拡大）':
    "Consomme {status} → {combo} (×{x}, s'étend à une zone)",
  '{status}を消費して{combo}（×{x}）': 'Consomme {status} → {combo} (×{x})',
  '防御値 +{n}（連鎖が通るたびにその場で加算、連鎖数に数えない）':
    'Défense +{n} (ajoutée immédiatement à chaque chaîne qui le traverse ; ne compte pas comme maillon)',
  '連鎖の始まり。攻撃せず、連鎖数にも数えない':
    "Début de chaîne. N'attaque pas et ne compte pas comme maillon.",
  '付け直し {n}回': 'Reforgé ×{n}',
  '売却 {price}G': 'Revente : {price}G',
  アーティファクト: 'Artefact',
  起点: 'Origine',
  防御: 'Défense',
  出口: 'Sorties',
  攻撃力: 'Attaque',
  '強化込み {n}': 'Avec améliorations {n}',
  全体攻撃: 'Attaque globale',
  '威力 ×{x}': 'Puissance ×{x}',
  貫通: 'Perçant',
  '狙いの後ろ {n}体にも同じダメージ': 'Ennemis touchés derrière la cible : {n}',
  連撃: 'Multi-coups',
  会心率: 'Taux critique',
  連鎖倍率の伸び: 'Croissance du multiplicateur',
  '×{v}まで×1.2ずつ': "×1,2 par maillon jusqu'à ×{v}",
  この環を通る連鎖すべて: 'Toute chaîne qui traverse cet anneau',
  吸血: 'Vol de vie',
  '与えたダメージの{pct}%を回復': 'Soigne {pct}% des dégâts infligés',
  疾風: 'Rafale',
  'このあとの装備は連鎖数+{n}': 'Objets suivants : maillon +{n}',
  '5秒間、一撃の30%を毎秒': '30% du coup par seconde pendant 5 s',
  付与: 'Applique',
  '濡れ・油・凍結をまとめて': "Mouillé, Huile et Gelé d'un coup",
  次への伝達: 'Relais',
  '{s}秒': '{s} s',
  防御値: 'Défense',
  鳴るたびに加算: 'Ajoutée à chaque déclenchement',
  守り: 'Protection',
  連鎖中も無防備にならない: 'Jamais à découvert en chaîne',
  この配置: 'Cette disposition',
  どの起点からも届きません: "Aucune Origine ne l'atteint",
  '起点{origin}の{step}連鎖目 ×{mult}': 'Origine {origin}, maillon {step} ×{mult}',
  '1ヒット 約{n}': '~{n} par coup',
  '起点{origin}の連鎖': "Chaîne de l'Origine {origin}",
  連鎖数に数えない: 'Ne compte pas comme maillon',
  '{status}を付ける → {element}の攻撃で{combo}（×{x}）':
    'Applique {status} → {combo} avec les attaques {element} (×{x})',
  '{status}を付ける': 'Applique {status}',
  '{status}の敵に当てると{combo}（×{x}・範囲に拡大）':
    "Cible avec altération {status} → {combo} (×{x}, s'étend à une zone)",
  '{status}の敵に当てると{combo}（×{x}）': 'Cible avec altération {status} → {combo} (×{x})',
  ロックする: 'Verrouiller',

  // src/ui/itemList.ts
  攻撃: 'Attaque',
  倉庫は空です: 'La Réserve est vide',
  '★全部': '★Tout',
  '★{rarity}': '★{rarity}',

  // src/ui/kit/chrome.ts
  '出撃 {n}回': 'Expéditions : {n}',
  拠点: 'Base',

  // src/ui/pools.ts
  '会心 {n}': 'Critique {n}',

  // src/ui/shareCard.ts
  '{loop}周目に到達': 'Tour {loop} atteint',
  '最大{step}連鎖': 'Chaîne max {step}',
  '最大ダメージ {damage}': 'Dégâts max {damage}',

  // src/ui/tutorial.ts
  '光っているところをタップ（{n}/{total}）': "Touche l'endroit lumineux ({n}/{total})",
  'タップで次へ（{n}/{total}）': 'Touche pour continuer ({n}/{total})',
  'スキップ ›': 'Passer ›',
  // src/scenes/BaseScene.ts (guides for the storage / smith / upgrade tabs)
  '使わない装備は「まとめて売る」や\n「一括売却」で、ゴールドにできるよ':
    "Transforme l'équipement inutile en or avec « Vente au choix » ou « Vente groupée ».",
  '装備をタップすると、能力と\n「売る」などのボタンが出るよ。\n押してみよう':
    'Touche un objet pour voir ses stats et des boutons comme « Vendre ». Essaie !',
  '「{upgrade}」を強化してみよう！\n強化は、ずっと残るよ。\n押してみてね':
    "Essaie d'améliorer « {upgrade} » !\nLes améliorations sont permanentes. Touche le bouton !",
  '拾った装備は「倉庫」に入るよ。\n使わない装備は、売ってゴールドにできる。\n「倉庫」を押してね':
    "L'équipement ramassé va dans la « Réserve ». Tu peux vendre celui que tu n'utilises pas contre de l'or. Touche « Réserve » !",
  'ゴールドが貯まったね！\n「鍛冶屋」で、装備の出口の向きを\n変えられるよ。「鍛冶屋」を押してね':
    "Tu as de l'or !\nÀ la « Forge », tu peux changer le sens des sorties d'un objet. Touche « Forge » !",
  'ゴールドが貯まったね！\n「強化」で、勇者をずっと強くできるよ。\n「強化」を押してね':
    "Tu as de l'or !\nAvec « Améliorer », ton héros devient plus fort pour de bon. Touche « Améliorer » !",
  '「再抽選」は、出口の向きがランダムに。\n「指定」は、好きな向きを選べるよ':
    '« Relancer » tourne les sorties dans des sens au hasard. Avec « Au choix », tu choisis toi-même les sens.',
  'この装備をタップして、選んでみよう': 'Touche cet objet pour le sélectionner.',
  '閃いた必殺技: {names}': 'Éclair de génie : {names}',
  '{el} +{n}（Lv{lv}↑）': '{el} +{n} (Niv.{lv}↑)',
  '{el} +{n}（Lv{lv}）': '{el} +{n} (Niv.{lv})',
  '熟練 {list}': 'Maîtrise {list}',
  '閃いた！ {name}': 'Éclair de génie ! {name}',
  レア順: 'Rareté',
  装備ごと: 'Par objet',
  '黄金ゴブリンだ！ 逃げる前に倒せ！': 'Un gobelin doré ! Battez-le avant sa fuite !',
  '{name}を貼った！': '{name} posé !',
  '黄金ゴブリンを倒した！': 'Gobelin doré vaincu !',
  '黄金ゴブリンに逃げられた…': "Le gobelin doré s'est enfui…",
  黄金ゴブリン: 'Gobelin doré',
  'レリックを1つ、盤面のマスへ': 'Posez une relique sur une case du plateau',
  いらない: 'Passer',
  攻撃装備のマスに貼れる: "Sur l'équipement d'attaque",
  どの装備のマスにも貼れる: "Sur n'importe quel équipement",
  ここは盤面の外です: 'C’est hors du plateau',
  '地域を抜けると、新しい盤面がもらえます': 'Termine une région pour gagner un nouveau plateau',
  '新しい盤面！': 'Nouveau plateau !',
  配置画面で切り替えられます: 'Change de plateau dans l’écran Équiper',
  売れません: 'Invendable',
  'アーティファクトは売れません（1種類につき1つ）':
    'Impossible de vendre un artefact (un seul de chaque)',
  '0から遊ぶ（今のセーブは残る）': 'Jouer depuis zéro (ta sauvegarde reste)',
  元のセーブに戻る: 'Revenir à ta sauvegarde',
  '0からやり直す': 'Zéro à nouveau',
  '0のセーブを消して、最初から始めます。元のセーブはそのままです。':
    'Supprime la sauvegarde à zéro et recommence. Ta vraie sauvegarde reste intacte.',
  やり直す: 'Recommencer',
  'コンボ ×{m}': 'Combo ×{m}',
  外してから売れます: 'Retirez-le avant de le vendre',
  アクセサリーはまだありません: "Aucun accessoire pour l'instant",
  'アクセサリー（{n}/{max}）': 'Accessoires ({n}/{max})',
  '{route}・コンボ ×{m}': '{route} · Combo ×{m}',
  '{route}・毎秒 約{d}': '{route} · ~{d}/s',
  'アクセサリー！': 'Accessoire !',
  'アクセサリーを手に入れた！': 'Accessoire obtenu !',
  'アクセサリー入れがいっぱいなので {n}個を売りました（+{gold}G）':
    'Écrin à accessoires plein : {n} vendu(s) (+{gold}G)',
  '1マスに1つだけ（重ねない）': 'Un objet par case (pas d’empilement)',
  重ねた装備がある: 'Équipement empilé sur le plateau',
  ほかの盤面で使っている装備: 'Équipement utilisé sur un autre plateau',
  '{boards}で使っています。\n売ると、その盤面から外れます':
    'Utilisé sur : {boards}.\nSi tu le vends, il quitte ce plateau.',
  'ほかの盤面で使っている装備です（詳細から売れます）':
    'Utilisé sur un autre plateau (vendable depuis sa fiche)',
  '盤面の起点（番号の石）から出口（矢印）をたどって、隣のマスの装備へ連鎖がつながります。勇者の足元のゲージ（攻撃間隔）がたまると起点が発火し、つながった装備が順番に攻撃します。起点は盤面に1つだけ。':
    "Une chaîne part de l'Origine (la pierre numérotée) de ton plateau et suit ses sorties (flèches) vers les objets des cases voisines. Quand la jauge sous le héros (Délai d'attaque) se remplit, l'Origine se déclenche et les objets reliés attaquent l'un après l'autre. Une seule Origine par plateau.",
  盤面と重ね: 'Plateaux et piles',
  '・同じ装備は、同じマスに3つまで重ねられます（深い盤面は4つ）。重ねた装備は下から順に鳴り、上ほど強い（下から×1、×1.5、×2）。矢印の向きは一番上の装備で決まります。':
    "• Tu peux empiler jusqu'à 3 objets identiques sur une case (4 sur le Plateau profond). Une pile se déclenche de bas en haut, et plus c'est haut, plus ça frappe fort (×1, ×1,5, ×2 depuis le bas). C'est l'objet du dessus qui donne la flèche.",
  '・アーティファクトは重ねられませんが、1つで3回鳴ります（深い盤面は4回）。':
    "• Les Artefacts ne s'empilent pas, mais un seul se déclenche 3 fois (4 sur le Plateau profond).",
  '・敵を倒しても連鎖は途切れません。連鎖の数もそのまま、次の敵へ続きます。':
    "• Vaincre un ennemi ne coupe pas la chaîne. Le compte de la chaîne continue sur l'ennemi suivant.",
  '・地域を抜けると、新しい盤面がもらえます。盤面ごとに形や得意なことがちがいます。並べ方とアクセサリーは盤面ごとに覚えていて、配置画面の上の ◀ ▶ で切り替えます。':
    "• Termine une région pour gagner un nouveau plateau. Chaque plateau a sa forme et ses points forts. Chaque plateau garde sa disposition et ses accessoires ; change de plateau avec ◀ ▶ en haut de l'écran Équiper.",
  '・ほかの盤面で使っている装備には、その盤面の名前の印が付きます。まとめて売る・一括売却・合成の材料には入りません。':
    "• L'équipement utilisé sur un autre plateau porte le nom de ce plateau. Il n'est jamais pris par la Vente au choix, la Vente groupée ni comme matériau de fusion.",
  '攻撃力 × レアリティ × 重ね × 連鎖倍率 × コンボ × アクセサリー × 熟練 × 強化 × 追加効果 × 会心（±10%ゆれる）':
    'Attaque × Rareté × Pile × Multiplicateur de chaîne × Combo × Accessoires × Maîtrise × Améliorations × Bonus × Critique (±10% de variation)',
  '・同じ装備がそろったら重ねる。一番上（×2）には一番強いものを。':
    '• Quand tu as des objets identiques, empile-les. Mets le plus fort tout en haut (×2).',
  熟練と必殺技: 'Maîtrise et Coups spéciaux',
  '・装備が鳴るたびに、その属性の熟練がたまります。Lvが1上がるごとに、その属性の装備のダメージ+3%（Lv30まで）。':
    "• Chaque fois qu'un objet se déclenche, la Maîtrise de son élément augmente. Chaque niveau donne +3% de dégâts à l'équipement de cet élément (jusqu'au niv. 30).",
  '・必殺技は全部で{n}つ。はじめは使えず、並びがそろったときに「閃き」で覚えます。閃く確率は、技の属性の熟練Lv×15%。一度覚えた技はずっと使えて、拠点の「図鑑」に載ります。':
    "• Coups spéciaux au total : {n}. Au début, tu n'en as aucun : tu en apprends un par un « éclair de génie » quand sa combinaison se forme. La chance est le niveau de Maîtrise de son élément × 15%. Un coup appris l'est pour toujours et s'ajoute au « Codex » de la Base.",
  アクセサリーとレリック: 'Accessoires et reliques',
  '・アクセサリーは、敵が落とす装備にまれについてきます（ボス・金ぴか・黄金ゴブリンは出やすい）。盤面のふちの枠に付けると、条件に合う連鎖で、連鎖全体のコンボ倍率が上がります（上限×20）。':
    "• Un accessoire accompagne parfois l'équipement lâché par les ennemis (plus souvent avec les boss, les élites dorées et les Gobelins dorés). Placés dans les emplacements au bord du plateau, ils augmentent le multiplicateur de combo de toute la chaîne quand leur condition est remplie (×20 max).",
  '・ボスを倒すたびに、レリックを3つから1つ選んで盤面のマスに置けます。そのマスの装備に効き、そのランの間だけ続きます。':
    "• À chaque boss vaincu, choisis 1 relique parmi 3 et pose-la sur une case du plateau. Elle renforce l'objet de cette case jusqu'à la fin de l'expédition.",
  '・ランの途中で、まれに黄金ゴブリンが現れます。逃げられる前に倒すと、レア以上の装備を4つ落とします。':
    "• De temps en temps, un Gobelin doré apparaît pendant une expédition. Bats-le avant qu'il s'enfuie, et il lâche 4 objets Rares ou mieux.",
  '・挑戦では、熟練・アクセサリー・レリック・黄金ゴブリンはなし。みんな同じ条件で競います。∞では黄金ゴブリンは出ず、アクセサリーも落ちません。':
    "• Les Défis se jouent sans Maîtrise, accessoires, reliques ni Gobelins dorés : tout le monde à égalité. En ∞, aucun Gobelin doré n'apparaît et aucun accessoire ne tombe.",
  '下は倉庫。装備を少し押さえてから、\n盤面へドラッグして置こう':
    "En bas, c'est ta Réserve. Maintiens un objet un instant, puis fais-le glisser sur le plateau.",
  '起点（番号の石）から、矢印の向きに\nつながった装備が順番に攻撃するよ。\n起点は盤面に1つだけ！':
    "Depuis l'Origine (la pierre numérotée), les objets reliés attaquent tour à tour en suivant les flèches. Une seule Origine par plateau !",
  '同じ装備は、同じマスに重ねられる。\n上に重ねたものほど強いよ！':
    "Tu peux empiler des objets identiques sur une case. Plus c'est haut, plus ça frappe fort !",
  '盤面のふちは、アクセサリーの枠。\n手に入れたら、ここに付けよう':
    'Le bord du plateau accueille les accessoires. Quand tu en obtiens un, place-le ici.',
  '地域を抜けると、新しい盤面がもらえる。\nもらった盤面は、ここで切り替えよう':
    'Termine une région pour gagner un nouveau plateau. Change de plateau ici.',
  '盤面と消耗品枠の {n}個をすべて倉庫に戻します。':
    'Renvoie tout le contenu du plateau et des places de consommables dans la Réserve (×{n}).',
  起点石は盤面に1つだけ: 'Une seule Pierre d’Origine par plateau',
  '拾った装備は、拠点の「配置」で\n盤面に置くと強くなるよ':
    "Place l'équipement trouvé sur ton plateau via « Équiper » à la Base pour devenir plus fort.",
  '装備を拾ったら、拠点の「配置」で\n盤面に置くと強くなるよ':
    "Quand tu trouves de l'équipement, place-le sur ton plateau via « Équiper » à la Base pour devenir plus fort.",
  'ここは倉庫。盤面に置いていない\n装備と消耗品が入っているよ':
    "Voici ta Réserve. L'équipement et les consommables qui ne sont pas sur ton plateau sont rangés ici.",
  '装備は「配置」で盤面に並べるよ。\n拾った装備もここで置ける。\n「配置」を押してね':
    "Dans « Équiper », tu places l'équipement sur ton plateau. L'équipement ramassé se place ici aussi. Touche « Équiper » !",
  '盤面の装備は、起点（番号の石）から\n矢印の向きに順番に攻撃するよ。\nこれが「連鎖」！':
    "Les objets du plateau attaquent tour à tour, en partant de l'Origine (la pierre numérotée) et en suivant les flèches. C'est une « chaîne » !",
  起点が盤面にありません: 'Aucune Origine sur ton plateau',
  盤面にある限り: 'Effet actif sur le plateau',
  '装備中・ロック中・ほかの盤面で使用中・アーティファクトは売りません':
    'Jamais vendus : objets équipés, verrouillés ou sur un autre plateau, et Artefacts',
  '使える数: {n}つ（装備中・ロック中・ほかの盤面で使用中は除く）':
    'Utilisables : ×{n} (hors objets équipés, verrouillés ou utilisés sur un autre plateau)',
  挑戦用の配置: 'Disposition de Défi',
  この配置で挑戦できます: 'Cette disposition est prête pour le Défi',
  'ふだんの盤面から組みました。並べ方を詰めよう':
    'Copié depuis ton plateau habituel. Peaufine la disposition !',
  ふだんの盤面から組む: 'Copier mon plateau habituel',
  '今の挑戦用の配置を、ふだんの標準の盤面をもとに組み直します。\n制限に合わない装備は、使える装備に入れ替えます。':
    'Recrée ta disposition de Défi à partir de ton Plateau standard habituel.\nLes objets hors règles sont remplacés par des objets autorisés.',
  配置する: 'Modifier',
  挑戦用の配置を組んでください: "Crée d'abord ta disposition de Défi",
  配置が制限に合っていません: 'Ta disposition ne respecte pas les règles',
  '勇者の足元のゲージがたまるたびに、\n起点が発火して、連鎖が始まるよ':
    "Chaque fois que la jauge sous le héros se remplit, l'Origine se déclenche et une chaîne commence.",
  'マスをタップして仕掛けを置く・外す（残り: {list}）':
    'Touche une case pour poser ou retirer un mécanisme (restants : {list})',
  '発火 {k}/{n} ▶': 'Déclenchement {k}/{n} ▶',
  仕掛け中: 'Pose',
  仕掛け: 'Mécanismes',
  'もう置ける仕掛けがありません（置いたマスをタップで外す）':
    'Plus de mécanisme (touche-en un posé pour le retirer)',
  回転マス: 'Pivot',
  切り替えマス: 'Aiguillage',
  ワープ: 'Portail',
  '{n}回 {step}連鎖': '{n}× chaîne de {step}',
  '試作: 拾って組む': 'Essai : construire en route',
  '起点石1つと、装備{n}つまでを持ち込む。\n残りはランの中で拾って、盤面に置いていく':
    'Emportez 1 pierre d’origine et jusqu’à {n} équipements.\nRamassez le reste pendant la partie et placez-le sur le plateau',
  持込: 'Emporté',
  出発: 'Partir',
  試作のランは何も持ち帰りません: 'Les essais ne gardent rien',
  '最大連鎖 {n}': 'Chaîne max {n}',
  '最大ダメージ {n}': 'Dégâts max {n}',
  '拾った装備 {n}': 'Équipements ramassés {n}',
  配置タイム: 'Temps de placement',
  '手札から盤面へ。並べ替えもできる': 'De la main au plateau. Vous pouvez aussi réorganiser',
  'ゴミ箱（ここへ運ぶと捨てる）': 'Poubelle (glissez ici pour jeter)',
  同じ種類の装備にしか重ねられない: 'Seul le même équipement peut s’empiler',
  アーティファクトは重ねられない: 'Les artefacts ne s’empilent pas',
  これ以上重ねられない: 'Impossible d’empiler plus haut',
  そのマスには置けない: 'Impossible de placer sur cette case',
};
