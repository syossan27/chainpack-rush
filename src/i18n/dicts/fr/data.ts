// French: game data (items, enemies, regions, techniques, achievements, ...).
// Key: Japanese source string → value: translation (keep {placeholders})
import type { Dict } from '../types';

export const DATA: Dict = {
  // src/config/balance.ts
  '感電！': 'Électrochoc !',
  '爆発！': 'Explosion !',
  '粉砕！': 'Fracas !',
  '毒爆！': 'Venin explosif !',
  '浄化！': 'Purification !',
  '封印！': 'Scellé !',
  硬い: 'Coriace',
  速い: 'Rapide',
  金ぴか: 'Doré',
  最大HP: 'HP max',
  攻撃間隔: "Délai d'attaque",
  攻撃倍率: "Multiplicateur d'attaque",
  出撃時間: "Durée d'expédition",
  バックパック拡張: 'Sac à dos agrandi',
  消耗品枠: 'Places de consommables',
  倉庫容量: 'Taille de la Réserve',
  '480円': '¥480',

  // src/core/affixes.ts
  鋭い: 'Tranchant',
  '攻撃力 +{v}%': 'Attaque +{v}%',
  会心: 'Critique',
  '会心率 +{v}%': 'Taux critique +{v}%',
  先駆け: 'Avant-garde',
  '3段目までなら ダメージ +{v}%': 'Dégâts +{v}% sur les 3 premiers maillons',
  締め: 'Finisseur',
  '6段目以降なら ダメージ +{v}%': 'Dégâts +{v}% à partir du 6e maillon',
  弱点突き: 'Opportuniste',
  '状態がついた敵に ダメージ +{v}%': 'Dégâts +{v}% contre les ennemis avec une altération',
  ボス特効: 'Tueur de boss',
  'ボスに ダメージ +{v}%': 'Dégâts +{v}% contre les boss',
  頑丈: 'Solide',
  '防御値 +{v}%': 'Défense +{v}%',
  癒し: 'Soin',
  '連鎖が通るとHP +{v}': 'HP +{v} quand une chaîne le traverse',
  速攻: 'Vif',
  'この連鎖のあとの待ち -{v}%': 'Attente après cette chaîne -{v}%',
  初撃: 'Premier coup',
  '連鎖の1段目 ダメージ +{v}%': 'Dégâts +{v}% sur le 1er maillon',

  // src/core/names.ts
  はやての: 'de la tempête',
  ひかりの: 'de lumière',
  ほのおの: 'des flammes',
  こおりの: 'de glace',
  いかずちの: 'de la foudre',
  かぜの: 'du vent',
  やみの: 'des ténèbres',
  ほしの: 'des étoiles',
  つきの: 'de la lune',
  たいようの: 'du soleil',
  まよなかの: 'de minuit',
  あかつきの: "de l'aube",
  しろがねの: "d'argent",
  こがねの: "d'or",
  くろがねの: 'de fer',
  みどりの: 'de jade',
  あおぞらの: "d'azur",
  ゆうやけの: 'du crépuscule',
  しずかな: 'tranquille',
  げんきな: 'énergique',
  のんびり: 'sans souci',
  ちいさな: 'de poche',
  おおきな: 'énorme',
  まっすぐな: 'au cœur pur',
  ゆうしゃ: 'Héros',
  けんし: 'Bretteur',
  まほうつかい: 'Mage',
  ぼうけんしゃ: 'Aventurier',
  かじや: 'Forgeron',
  たびびと: 'Voyageur',
  きし: 'Chevalier',
  かりゅうど: 'Chasseur',
  スライム: 'Slime',
  ドラゴン: 'Dragon',
  ゴーレム: 'Golem',
  ねこ: 'Chat',
  いぬ: 'Chien',
  うさぎ: 'Lapin',
  ふくろう: 'Hibou',
  くま: 'Ours',
  ほうせき: 'Joyau',
  たいまつ: 'Torche',
  たて: 'Bouclier',
  つるぎ: 'Lame',
  おの: 'Hache',
  やり: 'Lance',
  ゆみ: 'Arc',
  バックパック: 'Sac à dos',
  '{first}{second}|name': '{second} {first}',
  名無しの冒険者: 'Aventurier sans nom',

  // src/data/achievements.ts
  はじめの一歩: 'Premiers pas',
  自分の装備でランを1回終える: 'Termine une expédition avec ton propre équipement',
  駆け出し冒険者: 'Aventurier débutant',
  ランを10回終える: 'Termine 10 expéditions',
  歴戦の勇者: 'Héros aguerri',
  ランを50回終える: 'Termine 50 expéditions',
  つながる力: 'La force du lien',
  '6段の連鎖を決める': 'Réussis une chaîne de 6 maillons',
  連鎖使い: 'Adepte des chaînes',
  '10段の連鎖を決める': 'Réussis une chaîne de 10 maillons',
  連鎖の達人: 'Maître des chaînes',
  '14段の連鎖を決める': 'Réussis une chaîne de 14 maillons',
  終わらない連鎖: 'Chaîne sans fin',
  '18段の連鎖を決める': 'Réussis une chaîne de 18 maillons',
  重い一撃: 'Coup lourd',
  '1回の攻撃で200ダメージ': 'Inflige 200 dégâts en un seul coup',
  会心の一撃: 'Coup magistral',
  '1回の攻撃で1,000ダメージ': 'Inflige 1 000 dégâts en un seul coup',
  山をも砕く: 'Brise-montagne',
  '1回の攻撃で5,000ダメージ': 'Inflige 5 000 dégâts en un seul coup',
  伝説の一撃: 'Coup légendaire',
  '1回の攻撃で20,000ダメージ': 'Inflige 20 000 dégâts en un seul coup',
  ボス討伐: 'Chasseur de boss',
  '1回のランでボスを倒す': 'Vaincs un boss pendant une expédition',
  奥へ奥へ: 'Toujours plus loin',
  '1回のランで5周目に着く': 'Atteins le tour 5 en une expédition',
  果てを目指して: 'Vers le bout du monde',
  '1回のランで8周目に着く': 'Atteins le tour 8 en une expédition',
  一網打尽の名人: 'Roi du coup de filet',
  '1回のランで一網打尽を5回': "Élimine tout un groupe d'une seule chaîne, 5 fois en une expédition",
  洞窟へ: 'Vers la Grotte',
  洞窟を開放する: 'Débloque la Grotte',
  城壁へ: 'Vers les Remparts',
  城壁を開放する: 'Débloque les Remparts',
  秘技の目覚め: 'Talent caché',
  必殺技を1つ見つける: 'Découvre un coup spécial',
  奥義皆伝: 'Grand maître',
  必殺技をすべて見つける: 'Découvre tous les coups spéciaux',
  紫の輝き: 'Éclat violet',
  エピックの装備を手に入れる: 'Obtiens un objet Épique',
  金色の伝説: 'Légende dorée',
  レジェンダリーの装備を手に入れる: 'Obtiens un objet Légendaire',
  神話の遺物: 'Relique mythique',
  アーティファクトを手に入れる: 'Obtiens un Artefact',
  魔王討伐: 'Roi démon vaincu',
  '魔王城で魔王を倒す（エンドレスが開放）':
    'Vaincs le Roi démon au Château démoniaque (débloque le mode Infini)',
  果てなき道: 'Route sans fin',
  エンドレスで5周目に着く: 'Atteins le tour 5 en mode Infini',
  深淵へ: "Vers l'abîme",
  エンドレスで10周目に着く: 'Atteins le tour 10 en mode Infini',
  伝説の勇者: 'Héros légendaire',
  エンドレスで15周目に着く: 'Atteins le tour 15 en mode Infini',
  終わりなき者: "L'Éternel",
  エンドレスで20周目に着く: 'Atteins le tour 20 en mode Infini',

  // src/data/challenges.ts
  レアの意地: 'Fierté du Rare',
  'レア以下の装備だけで、洞窟でどこまで削れるか':
    'Équipement Rare ou moins uniquement. Combien de dégâts infligeras-tu dans la Grotte ?',
  ひとすじの連鎖: 'Chaîne solitaire',
  '起点はひとつだけ。長い一本の連鎖で城壁に挑む':
    'Une seule Origine. Affronte les Remparts avec une seule longue chaîne.',
  属性の試練: 'Épreuve des éléments',
  '炎・雷・氷・水・油の装備だけ。コンボで火山を焼き尽くせ':
    'Équipement Feu, Foudre, Glace, Eau et Huile uniquement. Embrase le Volcan à coups de combos !',
  守りなし: 'Sans défense',
  '防具は置けない。やられる前に倒しきれ':
    "Armures interdites. Abats-les avant qu'ils ne t'abattent !",

  // src/data/enemies.ts
  コウモリ: 'Chauve-souris',
  ゴブリン: 'Gobelin',
  甲冑兵: 'Soldat en armure',
  狼: 'Loup',
  骸骨: 'Squelette',
  呪術師: 'Sorcier',
  大スライム: 'Slime géant',
  ゴブリン王: 'Roi gobelin',
  鉄の騎士: 'Chevalier de fer',
  スライムの母: 'Mère des slimes',
  吸血女王: 'Reine vampire',
  呪術王: 'Roi sorcier',
  岩のゴーレム: 'Golem de pierre',
  火トカゲ: 'Salamandre',
  溶岩スライム: 'Slime de lave',
  火の精: 'Esprit du feu',
  炎竜: 'Dragon de feu',
  溶岩の巨人: 'Géant de lave',
  雪だるま: 'Bonhomme de neige',
  氷の狼: 'Loup de glace',
  雪男: 'Yéti',
  氷の女王: 'Reine des glaces',
  氷原のマンモス: 'Mammouth de la toundra',
  小悪魔: 'Diablotin',
  ガーゴイル: 'Gargouille',
  闇の魔導士: 'Mage noir',
  黒騎士: 'Chevalier noir',
  魔王: 'Roi démon',
  カカシ: 'Mannequin',
  '単体、特殊能力なし（どちらの構成でも可）':
    'Combat seul, sans capacité spéciale (tout type de build convient)',
  '取り巻きゴブリンを常に4体呼ぶ（短い連鎖の複数・薙ぎ払いが有利）':
    'Garde toujours 4 gobelins à ses côtés (plusieurs chaînes courtes et les attaques Balayage sont efficaces)',
  '一撃120未満のダメージを無効（連鎖の後半や大技で崩す）':
    'Ignore les coups de moins de 120 dégâts (perce sa garde avec les derniers maillons ou de gros coups)',
  'スライムを常に4体呼ぶ（短い連鎖の複数・薙ぎ払いが有利）':
    'Garde toujours 4 slimes à ses côtés (plusieurs chaînes courtes et les attaques Balayage sont efficaces)',
  'コウモリを次々に5体まで呼ぶ（全体攻撃・薙ぎ払いが有利）':
    "Appelle sans cesse des chauves-souris, jusqu'à 5 (les attaques Tous et Balayage sont efficaces)",
  '毎秒HPが回復する（一気に削り切る長い連鎖が有利）':
    "Récupère des HP chaque seconde (les longues chaînes qui l'achèvent vite sont efficaces)",
  'HPが半分を切ると攻撃が速く強くなる（盾で耐えるか、一気に倒す）':
    'Sous la moitié de ses HP, attaque plus vite et plus fort (tiens bon avec des boucliers, ou abats-le vite)',
  'HPが半分を切ると攻撃が速く強くなる。炎が効きにくく、氷が弱点':
    'Sous la moitié de ses HP, attaque plus vite et plus fort. Résiste au Feu ; faible contre la Glace.',
  '溶岩スライムを呼ぶ。炎はほとんど効かず、氷と水が弱点':
    "Appelle des slimes de lave. Le Feu ne marche presque pas ; faible contre la Glace et l'Eau.",
  '氷の狼を次々に呼ぶ。氷が効きにくく、炎が弱点':
    'Appelle sans cesse des loups de glace. Résiste à la Glace ; faible contre le Feu.',
  '一撃400未満のダメージを無効。氷が効きにくく、炎が弱点':
    'Ignore les coups de moins de 400 dégâts. Résiste à la Glace ; faible contre le Feu.',
  '一撃900未満のダメージを無効。雷が弱点':
    'Ignore les coups de moins de 900 dégâts. Faible contre la Foudre.',
  '小悪魔を呼び続ける最後の敵。物理と炎が効きにくく、雷が弱点':
    "L'ennemi final. Appelle sans cesse des diablotins. Résiste au Physique et au Feu ; faible contre la Foudre.",

  // src/data/items.ts
  起点石: "Pierre d'origine",
  '連鎖の始まり。攻撃力なし。レアリティで出口の数が決まる（コモン1・レア2・エピック3・レジェンダリー4）。':
    "Le début d'une chaîne. Pas d'Attaque. Sa rareté fixe le nombre de sorties (Commun 1, Rare 2, Épique 3, Légendaire 4).",
  速の起点石: "Pierre d'origine rapide",
  'この起点から伸びる線は、伝わるのが0.05秒速い。そのかわり線の攻撃はダメージ -10%。':
    'Les lignes de cette Origine passent la chaîne 0.05 s plus vite, mais leurs attaques infligent -10% de dégâts.',
  重い起点石: "Pierre d'origine lourde",
  'この起点から伸びる線の攻撃はダメージ +20%。そのかわり伝わるのが0.05秒遅い。':
    'Les attaques sur les lignes de cette Origine infligent +20% de dégâts, mais la chaîne passe 0.05 s plus lentement.',
  炎の起点石: "Pierre d'origine de feu",
  'この起点から伸びる線の、炎の攻撃はダメージ +15%。':
    'Sur les lignes de cette Origine, les attaques de Feu infligent +15% de dégâts.',
  雷の起点石: "Pierre d'origine de foudre",
  'この起点から伸びる線の、雷の攻撃はダメージ +15%。':
    'Sur les lignes de cette Origine, les attaques de Foudre infligent +15% de dégâts.',
  打撃の起点石: "Pierre d'origine contondante",
  'この起点から伸びる線の、打撃の攻撃はダメージ +15%。':
    'Sur les lignes de cette Origine, les attaques contondantes infligent +15% de dégâts.',
  盾の起点石: "Pierre d'origine de bouclier",
  'この起点から伸びる線の、防御装備の防御値 +25%。':
    'Sur les lignes de cette Origine, les objets de défense donnent +25% de Défense.',
  毒の起点石: "Pierre d'origine de poison",
  'この起点から伸びる線の、毒の毎秒ダメージ +60%。':
    'Sur les lignes de cette Origine, le Poison inflige +60% de dégâts par seconde.',
  吸血の起点石: "Pierre d'origine vampire",
  'この起点から伸びる線の、吸血で回復する量 +50%。':
    'Sur les lignes de cette Origine, le Vol de vie soigne +50%.',
  風の起点石: "Pierre d'origine de vent",
  'この起点から伸びる線の、風の攻撃はダメージ +15%。':
    'Sur les lignes de cette Origine, les attaques de Vent infligent +15% de dégâts.',
  光の起点石: "Pierre d'origine de lumière",
  'この起点から伸びる線の、光の攻撃はダメージ +15%。':
    'Sur les lignes de cette Origine, les attaques de Lumière infligent +15% de dégâts.',
  闇の起点石: "Pierre d'origine des ténèbres",
  'この起点から伸びる線の、闇の攻撃はダメージ +15%。':
    'Sur les lignes de cette Origine, les attaques de Ténèbres infligent +15% de dégâts.',
  剣: 'Épée',
  '基本の単体攻撃。': 'Une attaque de base sur une seule cible.',
  大剣: 'Grande épée',
  '強力な単体攻撃。ただし次への伝達に0.4秒かかる。':
    'Une puissante attaque sur une seule cible, mais elle met 0.4 s à passer la chaîne.',
  槍: 'Lance',
  '狙いの後ろの1体にも同じダメージ。':
    'Inflige aussi les mêmes dégâts à 1 ennemi derrière la cible.',
  斧: 'Hache',
  '交戦範囲の全敵を薙ぎ払う。': 'Balaie tous les ennemis à portée.',
  ハンマー: 'Marteau',
  '打撃。凍結した敵を粉砕（×2.5）。': 'Contondant. Fracasse les ennemis Gelés (×2.5).',
  鉄球: 'Boulet',
  '打撃の範囲攻撃。凍結した敵を粉砕（×2.5）。':
    'Attaque de zone contondante. Fracasse les ennemis Gelés (×2.5).',
  松明: 'Torche',
  '炎。油まみれの敵を爆発させる（×2、範囲に拡大）。':
    "Feu. Fait exploser les ennemis couverts d'Huile (×2, s'étend à une zone).",
  炎の杖: 'Bâton de feu',
  '炎の範囲攻撃。油まみれの敵を爆発させる。':
    "Attaque de zone de Feu. Fait exploser les ennemis couverts d'Huile.",
  雷の杖: 'Bâton de foudre',
  '雷。濡れた敵を感電させる（×3）。': 'Foudre. Électrocute les ennemis Mouillés (×3).',
  雷鳴の鈴: 'Cloche du tonnerre',
  '画面内の全敵に雷（威力×0.4）。濡れた敵を感電させる。':
    "Foudre sur tous les ennemis à l'écran (puissance ×0.4). Électrocute les ennemis Mouillés.",
  氷の剣: 'Épée de glace',
  '狙いを凍結させる。打撃で粉砕できる。':
    'Gèle la cible. Les attaques contondantes peuvent la fracasser.',
  水竜の瓶: 'Fiole du Dragon d’eau',
  '狙いを濡らす。雷で感電させられる。状態がついた敵へのダメージ×1.2。':
    "Mouille la cible : la Foudre peut alors l'électrocuter. Les ennemis avec une altération subissent ×1.2 dégâts.",
  雨雲の杖: 'Bâton de pluie',
  '画面内の全敵を濡らす。状態がついた敵へのダメージ×1.2。':
    "Mouille tous les ennemis à l'écran. Les ennemis avec une altération subissent ×1.2 dégâts.",
  油瓶: "Fiole d'huile",
  '狙いに油をかける。炎で爆発させられる。状態がついた敵へのダメージ×1.2。':
    "Couvre la cible d'Huile : le Feu peut alors la faire exploser. Les ennemis avec une altération subissent ×1.2 dégâts.",
  風の剣: 'Épée de vent',
  '風。毒の敵に当てると毒が重なる（最大5重）。5重の敵に当てると、残りの毒をまとめて与える（毒爆）。':
    "Vent. Toucher un ennemi empoisonné ajoute une couche de Poison (jusqu'à 5). Toucher un ennemi à 5 couches inflige tout le Poison restant d'un coup (Venin explosif).",
  嵐の杖: 'Bâton de tempête',
  '風の薙ぎ払い。当たった毒の敵すべてに毒を重ね、5重なら毒爆。':
    'Un Balayage de Vent. Ajoute une couche de Poison à chaque ennemi empoisonné touché ; à 5 couches, Venin explosif.',
  光の剣: 'Épée de lumière',
  '光。狙いに灼光をつける。呪縛の敵を浄化して、勇者のHPを回復する。':
    'Lumière. Rend la cible Éblouie. Purifie les ennemis Envoûtés et soigne le héros.',
  太陽の杖: 'Bâton solaire',
  '光の範囲攻撃。灼光をつけ、呪縛の敵を浄化して勇者のHPを回復する。':
    'Attaque de zone de Lumière. Éblouit, purifie les ennemis Envoûtés et soigne le héros.',
  闇の剣: 'Épée des ténèbres',
  '闇。狙いに呪縛をつける（攻撃力ダウン）。灼光の敵を封印して、攻撃を遅くする。':
    'Ténèbres. Rend la cible Envoûtée (baisse son Attaque). Scelle les ennemis Éblouis et ralentit leurs attaques.',
  闇の杖: 'Bâton des ténèbres',
  '闇の範囲攻撃。呪縛をつけ、灼光の敵を封印して攻撃を遅くする。':
    'Attaque de zone de Ténèbres. Envoûte, scelle les ennemis Éblouis et ralentit leurs attaques.',
  木の盾: 'Bouclier en bois',
  '連鎖が通ると、終了時に防御値+8。': '+8 de Défense à la fin de chaque chaîne qui le traverse.',
  鎖帷子: 'Cotte de mailles',
  '連鎖が通ると、終了時に防御値+12。': '+12 de Défense à la fin de chaque chaîne qui la traverse.',
  鋼の鎧: "Armure d'acier",
  '連鎖が通ると、終了時に防御値+20。少し重く、次へ伝わるのが遅め。':
    '+20 de Défense à la fin de chaque chaîne qui la traverse. Un peu lourde : passe la chaîne lentement.',
  短剣: 'Dague',
  '軽い一撃。次の装備へすぐ伝わる。': "Un coup léger. Passe vite la chaîne à l'objet suivant.",
  双剣: 'Lames jumelles',
  '1段で2回斬る。': 'Frappe deux fois en un seul maillon.',
  弓: 'Arc',
  '狙いの後ろ2体まで射抜く。': "Transperce jusqu'à 2 ennemis derrière la cible.",
  大斧: 'Grande hache',
  '目の前の敵をまとめて薙ぎ払う重い一撃。次へ伝わるのが遅い。':
    'Un coup lourd qui balaie tous les ennemis devant toi. Passe la chaîne lentement.',
  聖剣: 'Épée sacrée',
  '会心が出やすい（会心率+20%）。': 'Coups critiques plus fréquents (taux critique +20%).',
  雷の槍: 'Lance de foudre',
  '雷の突き。狙いの後ろ1体にも届く。濡れた敵を感電させる。':
    "Un coup d'estoc de Foudre qui touche aussi 1 ennemi derrière la cible. Électrocute les ennemis Mouillés.",
  氷の杖: 'Bâton de givre',
  '狙いの周りをまとめて凍結させる。打撃で粉砕できる。':
    'Gèle la cible et les ennemis autour. Les attaques contondantes peuvent les fracasser.',
  革鎧: 'Armure de cuir',
  '連鎖が通ると、終了時に防御値+6。軽く、次へすぐ伝わる。':
    '+6 de Défense à la fin de chaque chaîne qui la traverse. Légère : passe vite la chaîne.',
  大盾: 'Grand bouclier',
  '連鎖が通ると、終了時に防御値+26。重く、次へ伝わるのが遅い。':
    '+26 de Défense à la fin de chaque chaîne qui le traverse. Lourd : passe la chaîne lentement.',
  鉄の盾: 'Bouclier de fer',
  '連鎖が通ると、終了時に防御値+18。': '+18 de Défense à la fin de chaque chaîne qui le traverse.',
  循環の環: "Anneau d'Ouroboros",
  '四方へ連鎖を広げる。この環を通る連鎖は、連鎖倍率の上限が×4.0になる。':
    'Répand la chaîne dans les 4 directions. Les chaînes qui traversent cet anneau voient leur plafond de multiplicateur passer à ×4.0.',
  竜牙の剣: 'Croc-de-dragon',
  '竜を討った剣。ボスへのダメージ×2。':
    "L'épée qui a terrassé un dragon. Dégâts contre les boss ×2.",
  天雷の大槌: 'Maillet foudroyant',
  '画面内の全敵へ雷を落とす。濡れた敵は感電する。':
    "Abat la Foudre sur tous les ennemis à l'écran. Les ennemis Mouillés sont électrocutés.",
  毒の短剣: 'Dague empoisonnée',
  '当てた敵を毒にする（5秒間、この一撃の30%を毎秒与える）。毒の敵へのほかの攻撃は×1.2。':
    "Empoisonne l'ennemi touché (30% des dégâts de ce coup chaque seconde pendant 5 s). Les autres attaques infligent ×1.2 aux ennemis empoisonnés.",
  毒霧の杖: 'Bâton de brume toxique',
  '狙いのまわりにも当たり、まとめて毒にする（5秒間、一撃の30%を毎秒）。':
    'Touche aussi les ennemis autour de la cible et les empoisonne tous (30% du coup chaque seconde pendant 5 s).',
  吸血の剣: 'Épée vampire',
  '与えたダメージの8%だけ、勇者のHPが回復する。': 'Soigne le héros de 8% des dégâts infligés.',
  疾風の羽: 'Plume de rafale',
  'この羽のあとに続く装備は、段数を1つ多く数える（連鎖倍率が早く上がる）。次へすぐ伝わる。':
    'Les objets après cette plume comptent un maillon de plus (le multiplicateur de chaîne monte plus vite). Passe vite la chaîne.',
  深淵の杯: "Calice de l'abîme",
  '当てた敵を毒にし、与えたダメージの15%だけHPが回復する。':
    "Empoisonne l'ennemi touché et soigne le héros de 15% des dégâts infligés.",
  賢者の石: 'Pierre philosophale',
  '当てた敵に濡れ・油・凍結をまとめて付ける。後ろの雷・炎・打撃がすべてコンボになる。':
    "Applique Mouillé, Huile et Gelé d'un coup aux ennemis touchés. Les attaques de Foudre, de Feu et contondantes qui suivent deviennent toutes des combos.",
  不落の城門: 'Porte imprenable',
  'バックパックにある限り、連鎖中も無防備にならず、よろめかない。防御値+40。':
    "Tant qu'elle est dans ton sac à dos, tu n'es jamais à découvert pendant les chaînes et jamais sonné. +40 de Défense.",
  号令: 'Ralliement',
  '足元のゲージを即満タンにし、次の起点を今すぐ発火。連鎖中は使えない。':
    'Remplit aussitôt la jauge sous le héros et déclenche tout de suite la prochaine Origine. Inutilisable pendant une chaîne.',
  時止め: 'Arrêt du temps',
  '3秒間、敵の行動を止める。': 'Fige tous les ennemis pendant 3 secondes.',
  油の大樽: "Tonneau d'huile",
  '画面内の全敵に油を付与。': "Couvre d'Huile tous les ennemis à l'écran.",
  雨乞いの符: 'Talisman de pluie',
  '画面内の全敵に濡れを付与。': "Mouille tous les ennemis à l'écran.",
  時の砂: 'Sable du temps',
  '出撃時間を5秒のばす。': "Ajoute 5 secondes à l'expédition.",
  爆弾: 'Bombe',
  '画面内の全敵に60ダメージ（攻撃倍率の強化が乗る）。':
    "Inflige 60 dégâts à tous les ennemis à l'écran (augmentés par l'amélioration Multiplicateur d'attaque).",
  幸運の硬貨: 'Pièce porte-bonheur',
  '8秒間、会心率+30%。': 'Taux critique +30% pendant 8 secondes.',
  回復薬: 'Potion de soin',
  'HPを40回復。': 'Rend 40 HP.',
  物理: 'Physique',
  打撃: 'Contondant',
  炎: 'Feu',
  雷: 'Foudre',
  氷: 'Glace',
  水: 'Eau',
  油: 'Huile',
  風: 'Vent',
  光: 'Lumière',
  闇: 'Ténèbres',
  単体: 'Unique',
  薙ぎ払い: 'Balayage',
  範囲: 'Zone',
  全体: 'Tous',
  濡れ: 'Mouillé',
  凍結: 'Gelé',
  毒: 'Poison',
  灼光: 'Ébloui',
  呪縛: 'Envoûté',
  コモン: 'Commun',
  レア: 'Rare',
  エピック: 'Épique',
  レジェンド: 'Légendaire',

  // src/data/referenceLoadouts.ts
  一本型: 'Chaîne unique',
  複数型: 'Multichaîne',
  混合型: 'Mixte',

  // src/data/regions.ts
  草原: 'Prairie',
  'スライム、ゴブリン、狼': 'Slimes, gobelins, loups',
  洞窟: 'Grotte',
  'コウモリ、骸骨、呪術師（群れが多い）':
    'Chauves-souris, squelettes, sorciers (beaucoup de groupes)',
  城壁: 'Remparts',
  '甲冑兵、ゴブリン、骸骨（硬い）': 'Soldats en armure, gobelins, squelettes (coriaces)',
  火山: 'Volcan',
  '火トカゲ、溶岩スライム、火の精': 'Salamandres, slimes de lave, esprits du feu',
  '炎が効きにくい・氷と水が弱点': "Résiste au Feu ; faible contre la Glace et l'Eau",
  氷河: 'Glacier',
  '氷の狼、雪だるま、雪男（速い）': 'Loups de glace, bonshommes de neige, yétis (rapides)',
  '氷が効きにくい・炎が弱点': 'Résiste à la Glace ; faible contre le Feu',
  魔王城: 'Château démoniaque',
  '小悪魔、ガーゴイル、闇の魔導士': 'Diablotins, gargouilles, mages noirs',
  '物理と炎が効きにくい・雷が弱点（ガーゴイルは打撃が弱点）':
    'Résiste au Physique et au Feu ; faible contre la Foudre (gargouilles : faibles au Contondant)',
  エンドレス: 'Infini',
  全地域の雑魚: 'De toutes les régions',
  '周回ごとにいろいろな敵。装備とゴールドは出ない':
    'Des ennemis variés à chaque tour. Ni équipement ni or.',

  // src/data/techniques.ts
  'クリムゾン・バースト': 'Rafale écarlate',
  '油瓶 → 松明か炎の杖 → 炎の杖': "Fiole d'huile → Torche/Bâton de feu → Bâton de feu",
  '油と炎の気配がする…': "On sent l'huile et le feu…",
  'トライ・サンダー': 'Triple tonnerre',
  '水竜の瓶か雨雲の杖 → 雷の装備 → 雷の装備':
    'Fiole du Dragon d’eau/Bâton de pluie → objet Foudre → objet Foudre',
  '水と雷の気配がする…': "On sent l'eau et la foudre…",
  'フロスト・ブレイカー': 'Brise-givre',
  '氷の剣か氷の杖 → ハンマーか鉄球 → ハンマーか鉄球':
    'Épée de glace/Bâton de givre → Marteau/Boulet → Marteau/Boulet',
  '氷と打撃の気配がする…': 'On sent la glace et un coup lourd…',
  'トリプル・スラッシュ': 'Triple entaille',
  '剣か短剣 → 剣か短剣 → 大剣か聖剣': 'Épée/Dague → Épée/Dague → Grande épée/Épée sacrée',
  '剣が三つ重なる…': "Trois lames s'alignent…",
  'サイクロン・アックス': 'Hache cyclone',
  '斧 → 斧か大斧 → 大斧': 'Hache → Hache/Grande hache → Grande hache',
  '斧が三つ重なる…': "Trois haches s'alignent…",
  'ヴェノム・クロス': 'Croix venimeuse',
  '毒の短剣 → 短剣か毒の短剣 → 吸血の剣':
    'Dague empoisonnée → Dague/Dague empoisonnée → Épée vampire',
  '毒と血の気配がする…': 'On sent le poison et le sang…',
};
