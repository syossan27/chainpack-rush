// Indonesian: game data (items, enemies, regions, techniques, achievements, ...).
// Key: Japanese source string → value: translation (keep {placeholders})
import type { Dict } from '../types';

export const DATA: Dict = {
  // src/config/balance.ts
  '感電！': 'Setrum!',
  '爆発！': 'Ledakan!',
  '粉砕！': 'Hancur!',
  '毒爆！': 'Ledakan Racun!',
  '浄化！': 'Penyucian!',
  '封印！': 'Segel!',
  硬い: 'Tangguh',
  速い: 'Gesit',
  金ぴか: 'Keemasan',
  最大HP: 'HP Maks',
  攻撃間隔: 'Jeda Serangan',
  攻撃倍率: 'Pengganda Serangan',
  出撃時間: 'Waktu Ekspedisi',
  バックパック拡張: 'Ransel Lebih Besar',
  消耗品枠: 'Slot Sekali Pakai',
  倉庫容量: 'Kapasitas Gudang',
  '480円': '¥480',

  // src/core/affixes.ts
  鋭い: 'Tajam',
  '攻撃力 +{v}%': 'Serangan +{v}%',
  会心: 'Kritikal',
  '会心率 +{v}%': 'Peluang kritikal +{v}%',
  先駆け: 'Pelopor',
  '3段目までなら ダメージ +{v}%': 'Damage +{v}% di 3 mata rantai pertama',
  締め: 'Penutup',
  '6段目以降なら ダメージ +{v}%': 'Damage +{v}% mulai mata rantai ke-6',
  弱点突き: 'Titik Lemah',
  '状態がついた敵に ダメージ +{v}%': 'Damage +{v}% ke musuh yang terkena efek status',
  ボス特効: 'Pembasmi Bos',
  'ボスに ダメージ +{v}%': 'Damage +{v}% ke bos',
  頑丈: 'Kokoh',
  '防御値 +{v}%': 'Pertahanan +{v}%',
  癒し: 'Penyembuh',
  '連鎖が通るとHP +{v}': 'HP +{v} setiap kali dilewati rantai',
  速攻: 'Sigap',
  'この連鎖のあとの待ち -{v}%': 'Jeda setelah rantai ini -{v}%',
  初撃: 'Pukulan Awal',
  '連鎖の1段目 ダメージ +{v}%': 'Damage +{v}% di mata rantai ke-1',

  // src/core/names.ts
  はやての: 'Kilat',
  ひかりの: 'Cahaya',
  ほのおの: 'Api',
  こおりの: 'Es',
  いかずちの: 'Petir',
  かぜの: 'Angin',
  やみの: 'Bayangan',
  ほしの: 'Bintang',
  つきの: 'Bulan',
  たいようの: 'Mentari',
  まよなかの: 'Malam',
  あかつきの: 'Fajar',
  しろがねの: 'Perak',
  こがねの: 'Emas',
  くろがねの: 'Baja',
  みどりの: 'Hijau',
  あおぞらの: 'Langit Biru',
  ゆうやけの: 'Senja',
  しずかな: 'Tenang',
  げんきな: 'Ceria',
  のんびり: 'Santai',
  ちいさな: 'Mungil',
  おおきな: 'Besar',
  まっすぐな: 'Sejati',
  ゆうしゃ: 'Pahlawan',
  けんし: 'Pendekar',
  まほうつかい: 'Penyihir',
  ぼうけんしゃ: 'Petualang',
  かじや: 'Pandai Besi',
  たびびと: 'Pengembara',
  きし: 'Ksatria',
  かりゅうど: 'Pemburu',
  スライム: 'Slime',
  ドラゴン: 'Naga',
  ゴーレム: 'Golem',
  ねこ: 'Kucing',
  いぬ: 'Anjing',
  うさぎ: 'Kelinci',
  ふくろう: 'Burung Hantu',
  くま: 'Beruang',
  ほうせき: 'Permata',
  たいまつ: 'Obor',
  たて: 'Perisai',
  つるぎ: 'Pedang',
  おの: 'Kapak',
  やり: 'Tombak',
  ゆみ: 'Busur',
  バックパック: 'Ransel',
  '{first}{second}|name': '{second} {first}',
  名無しの冒険者: 'Petualang Tanpa Nama',

  // src/data/achievements.ts
  はじめの一歩: 'Langkah Pertama',
  自分の装備でランを1回終える: 'Selesaikan ekspedisi dengan perlengkapanmu sendiri',
  駆け出し冒険者: 'Petualang Pemula',
  ランを10回終える: 'Selesaikan 10 ekspedisi',
  歴戦の勇者: 'Pahlawan Kawakan',
  ランを50回終える: 'Selesaikan 50 ekspedisi',
  つながる力: 'Saling Terhubung',
  '6段の連鎖を決める': 'Sambung rantai sampai 6 mata rantai',
  連鎖使い: 'Pawang Rantai',
  '10段の連鎖を決める': 'Sambung rantai sampai 10 mata rantai',
  連鎖の達人: 'Master Rantai',
  '14段の連鎖を決める': 'Sambung rantai sampai 14 mata rantai',
  終わらない連鎖: 'Rantai Tanpa Akhir',
  '18段の連鎖を決める': 'Sambung rantai sampai 18 mata rantai',
  重い一撃: 'Pukulan Berat',
  '1回の攻撃で200ダメージ': 'Beri 200 damage dalam sekali serang',
  会心の一撃: 'Pukulan Dahsyat',
  '1回の攻撃で1,000ダメージ': 'Beri 1.000 damage dalam sekali serang',
  山をも砕く: 'Penghancur Gunung',
  '1回の攻撃で5,000ダメージ': 'Beri 5.000 damage dalam sekali serang',
  伝説の一撃: 'Pukulan Legendaris',
  '1回の攻撃で20,000ダメージ': 'Beri 20.000 damage dalam sekali serang',
  ボス討伐: 'Pemburu Bos',
  '1回のランでボスを倒す': 'Kalahkan bos dalam satu ekspedisi',
  奥へ奥へ: 'Makin Dalam',
  '1回のランで5周目に着く': 'Capai putaran 5 dalam satu ekspedisi',
  果てを目指して: 'Menuju Ujung Dunia',
  '1回のランで8周目に着く': 'Capai putaran 8 dalam satu ekspedisi',
  一網打尽の名人: 'Master Sapu Bersih',
  '1回のランで一網打尽を5回':
    'Habisi satu kawanan sekaligus dengan satu rantai, 5 kali dalam satu ekspedisi',
  洞窟へ: 'Menuju Gua',
  洞窟を開放する: 'Buka Gua',
  城壁へ: 'Menuju Benteng',
  城壁を開放する: 'Buka Benteng',
  秘技の目覚め: 'Bakat Tersembunyi',
  必殺技を1つ見つける: 'Temukan satu Jurus Spesial',
  奥義皆伝: 'Mahaguru',
  必殺技をすべて見つける: 'Temukan semua Jurus Spesial',
  紫の輝き: 'Kilau Ungu',
  エピックの装備を手に入れる: 'Dapatkan item Epik',
  金色の伝説: 'Legenda Emas',
  レジェンダリーの装備を手に入れる: 'Dapatkan item Legendaris',
  神話の遺物: 'Pusaka Mitos',
  アーティファクトを手に入れる: 'Dapatkan Artefak',
  魔王討伐: 'Raja Iblis Tumbang',
  '魔王城で魔王を倒す（エンドレスが開放）':
    'Kalahkan Raja Iblis di Kastel Raja Iblis (membuka mode Tanpa Batas)',
  果てなき道: 'Jalan Tanpa Ujung',
  エンドレスで5周目に着く: 'Capai putaran 5 di mode Tanpa Batas',
  深淵へ: 'Menuju Jurang',
  エンドレスで10周目に着く: 'Capai putaran 10 di mode Tanpa Batas',
  伝説の勇者: 'Pahlawan Legendaris',
  エンドレスで15周目に着く: 'Capai putaran 15 di mode Tanpa Batas',
  終わりなき者: 'Sang Abadi',
  エンドレスで20周目に着く: 'Capai putaran 20 di mode Tanpa Batas',

  // src/data/challenges.ts
  レアの意地: 'Kebanggaan Langka',
  'レア以下の装備だけで、洞窟でどこまで削れるか':
    'Hanya perlengkapan Langka atau lebih rendah. Seberapa besar damage-mu di Gua?',
  ひとすじの連鎖: 'Satu Rantai Panjang',
  '起点はひとつだけ。長い一本の連鎖で城壁に挑む':
    'Hanya satu Asal. Taklukkan Benteng dengan satu rantai panjang.',
  属性の試練: 'Ujian Elemen',
  '炎・雷・氷・水・油の装備だけ。コンボで火山を焼き尽くせ':
    'Hanya perlengkapan Api, Petir, Es, Air, dan Minyak. Bakar habis Gunung Berapi dengan kombo!',
  守りなし: 'Tanpa Pertahanan',
  '防具は置けない。やられる前に倒しきれ':
    'Pelindung dilarang. Kalahkan mereka sebelum kamu yang kalah!',

  // src/data/enemies.ts
  コウモリ: 'Kelelawar',
  ゴブリン: 'Goblin',
  甲冑兵: 'Prajurit Zirah',
  狼: 'Serigala',
  骸骨: 'Tengkorak',
  呪術師: 'Dukun',
  大スライム: 'Slime Besar',
  ゴブリン王: 'Raja Goblin',
  鉄の騎士: 'Ksatria Besi',
  スライムの母: 'Induk Slime',
  吸血女王: 'Ratu Vampir',
  呪術王: 'Raja Dukun',
  岩のゴーレム: 'Golem Batu',
  火トカゲ: 'Kadal Api',
  溶岩スライム: 'Slime Lava',
  火の精: 'Roh Api',
  炎竜: 'Naga Api',
  溶岩の巨人: 'Raksasa Lava',
  雪だるま: 'Manusia Salju',
  氷の狼: 'Serigala Es',
  雪男: 'Yeti',
  氷の女王: 'Ratu Es',
  氷原のマンモス: 'Mamut Tundra',
  小悪魔: 'Iblis Kecil',
  ガーゴイル: 'Gargoyle',
  闇の魔導士: 'Penyihir Gelap',
  黒騎士: 'Ksatria Hitam',
  魔王: 'Raja Iblis',
  カカシ: 'Orang-orangan',
  '単体、特殊能力なし（どちらの構成でも可）':
    'Bertarung sendirian, tanpa kemampuan khusus (build apa pun bisa)',
  '取り巻きゴブリンを常に4体呼ぶ（短い連鎖の複数・薙ぎ払いが有利）':
    'Selalu ditemani 4 Goblin pengawal (cocok untuk beberapa rantai pendek dan serangan Sapuan)',
  '一撃120未満のダメージを無効（連鎖の後半や大技で崩す）':
    'Kebal terhadap serangan di bawah 120 damage (tembus dengan mata rantai akhir atau serangan besar)',
  'スライムを常に4体呼ぶ（短い連鎖の複数・薙ぎ払いが有利）':
    'Selalu ditemani 4 Slime (cocok untuk beberapa rantai pendek dan serangan Sapuan)',
  'コウモリを次々に5体まで呼ぶ（全体攻撃・薙ぎ払いが有利）':
    'Terus memanggil Kelelawar, maksimal 5 (cocok untuk serangan Semua dan Sapuan)',
  '毎秒HPが回復する（一気に削り切る長い連鎖が有利）':
    'Memulihkan HP tiap detik (cocok untuk rantai panjang yang cepat menghabisinya)',
  'HPが半分を切ると攻撃が速く強くなる（盾で耐えるか、一気に倒す）':
    'Saat HP di bawah separuh, serangannya makin cepat dan kuat (bertahan dengan perisai, atau kalahkan dengan cepat)',
  'HPが半分を切ると攻撃が速く強くなる。炎が効きにくく、氷が弱点':
    'Saat HP di bawah separuh, serangannya makin cepat dan kuat. Tahan Api; lemah terhadap Es.',
  '溶岩スライムを呼ぶ。炎はほとんど効かず、氷と水が弱点':
    'Memanggil Slime Lava. Api hampir tak mempan; lemah terhadap Es dan Air.',
  '氷の狼を次々に呼ぶ。氷が効きにくく、炎が弱点':
    'Terus memanggil Serigala Es. Tahan Es; lemah terhadap Api.',
  '一撃400未満のダメージを無効。氷が効きにくく、炎が弱点':
    'Kebal terhadap serangan di bawah 400 damage. Tahan Es; lemah terhadap Api.',
  '一撃900未満のダメージを無効。雷が弱点':
    'Kebal terhadap serangan di bawah 900 damage. Lemah terhadap Petir.',
  '小悪魔を呼び続ける最後の敵。物理と炎が効きにくく、雷が弱点':
    'Musuh terakhir. Terus memanggil Iblis Kecil. Tahan Fisik dan Api; lemah terhadap Petir.',

  // src/data/items.ts
  起点石: 'Batu Asal',
  '連鎖の始まり。攻撃力なし。レアリティで出口の数が決まる（コモン1・レア2・エピック3・レジェンダリー4）。':
    'Awal sebuah rantai. Tanpa Serangan. Kelangkaannya menentukan jumlah jalur (Biasa 1, Langka 2, Epik 3, Legendaris 4).',
  速の起点石: 'Batu Asal Gesit',
  'この起点から伸びる線は、伝わるのが0.05秒速い。そのかわり線の攻撃はダメージ -10%。':
    'Garis dari Asal ini meneruskan rantai 0.05 detik lebih cepat, tapi serangannya memberi damage -10%.',
  重い起点石: 'Batu Asal Berat',
  'この起点から伸びる線の攻撃はダメージ +20%。そのかわり伝わるのが0.05秒遅い。':
    'Serangan di garis dari Asal ini memberi damage +20%, tapi rantai diteruskan 0.05 detik lebih lambat.',
  炎の起点石: 'Batu Asal Api',
  'この起点から伸びる線の、炎の攻撃はダメージ +15%。':
    'Di garis dari Asal ini, serangan Api memberi damage +15%.',
  雷の起点石: 'Batu Asal Petir',
  'この起点から伸びる線の、雷の攻撃はダメージ +15%。':
    'Di garis dari Asal ini, serangan Petir memberi damage +15%.',
  打撃の起点石: 'Batu Asal Hantam',
  'この起点から伸びる線の、打撃の攻撃はダメージ +15%。':
    'Di garis dari Asal ini, serangan Hantam memberi damage +15%.',
  盾の起点石: 'Batu Asal Perisai',
  'この起点から伸びる線の、防御装備の防御値 +25%。':
    'Di garis dari Asal ini, item pertahanan memberi Pertahanan +25%.',
  毒の起点石: 'Batu Asal Racun',
  'この起点から伸びる線の、毒の毎秒ダメージ +60%。':
    'Di garis dari Asal ini, damage Racun per detik +60%.',
  吸血の起点石: 'Batu Asal Vampir',
  'この起点から伸びる線の、吸血で回復する量 +50%。':
    'Di garis dari Asal ini, pemulihan Serap Darah +50%.',
  風の起点石: 'Batu Asal Angin',
  'この起点から伸びる線の、風の攻撃はダメージ +15%。':
    'Di garis dari Asal ini, serangan Angin memberi damage +15%.',
  光の起点石: 'Batu Asal Cahaya',
  'この起点から伸びる線の、光の攻撃はダメージ +15%。':
    'Di garis dari Asal ini, serangan Cahaya memberi damage +15%.',
  闇の起点石: 'Batu Asal Kegelapan',
  'この起点から伸びる線の、闇の攻撃はダメージ +15%。':
    'Di garis dari Asal ini, serangan Kegelapan memberi damage +15%.',
  剣: 'Pedang',
  '基本の単体攻撃。': 'Serangan tunggal dasar.',
  大剣: 'Pedang Besar',
  '強力な単体攻撃。ただし次への伝達に0.4秒かかる。':
    'Serangan tunggal yang kuat, tapi butuh 0.4 detik untuk meneruskan rantai.',
  槍: 'Tombak',
  '狙いの後ろの1体にも同じダメージ。':
    'Juga memberi damage yang sama ke 1 musuh di belakang target.',
  斧: 'Kapak',
  '交戦範囲の全敵を薙ぎ払う。': 'Menyapu semua musuh dalam jangkauan.',
  ハンマー: 'Palu',
  '打撃。凍結した敵を粉砕（×2.5）。': 'Hantam. Menghancurkan musuh Beku (×2.5).',
  鉄球: 'Bola Besi',
  '打撃の範囲攻撃。凍結した敵を粉砕（×2.5）。':
    'Serangan area Hantam. Menghancurkan musuh Beku (×2.5).',
  松明: 'Obor',
  '炎。油まみれの敵を爆発させる（×2、範囲に拡大）。':
    'Api. Meledakkan musuh yang berlumur Minyak (×2, menyebar ke area).',
  炎の杖: 'Tongkat Api',
  '炎の範囲攻撃。油まみれの敵を爆発させる。':
    'Serangan area Api. Meledakkan musuh yang berlumur Minyak.',
  雷の杖: 'Tongkat Petir',
  '雷。濡れた敵を感電させる（×3）。': 'Petir. Menyetrum musuh Basah (×3).',
  雷鳴の鈴: 'Lonceng Guntur',
  '画面内の全敵に雷（威力×0.4）。濡れた敵を感電させる。':
    'Petir ke semua musuh di layar (kekuatan ×0.4). Menyetrum musuh Basah.',
  氷の剣: 'Pedang Es',
  '狙いを凍結させる。打撃で粉砕できる。':
    'Membekukan target. Serangan Hantam bisa menghancurkannya.',
  水竜の瓶: 'Botol Naga Air',
  '狙いを濡らす。雷で感電させられる。状態がついた敵へのダメージ×1.2。':
    'Membuat target Basah, jadi Petir bisa menyetrumnya. Musuh yang terkena efek status menerima damage ×1.2.',
  雨雲の杖: 'Tongkat Mendung',
  '画面内の全敵を濡らす。状態がついた敵へのダメージ×1.2。':
    'Membuat semua musuh di layar Basah. Musuh yang terkena efek status menerima damage ×1.2.',
  油瓶: 'Botol Minyak',
  '狙いに油をかける。炎で爆発させられる。状態がついた敵へのダメージ×1.2。':
    'Melumuri target dengan Minyak, jadi Api bisa meledakkannya. Musuh yang terkena efek status menerima damage ×1.2.',
  風の剣: 'Pedang Angin',
  '風。毒の敵に当てると毒が重なる（最大5重）。5重の敵に当てると、残りの毒をまとめて与える（毒爆）。':
    'Angin. Mengenai musuh yang keracunan menumpuk Racunnya (maks. 5 lapis). Mengenai musuh dengan 5 lapis memberi semua sisa Racun sekaligus (Ledakan Racun).',
  嵐の杖: 'Tongkat Badai',
  '風の薙ぎ払い。当たった毒の敵すべてに毒を重ね、5重なら毒爆。':
    'Sapuan Angin. Menumpuk Racun pada semua musuh keracunan yang terkena; di 5 lapis, Ledakan Racun.',
  光の剣: 'Pedang Cahaya',
  '光。狙いに灼光をつける。呪縛の敵を浄化して、勇者のHPを回復する。':
    'Cahaya. Memberi efek Silau ke target. Menyucikan musuh Terikat dan memulihkan HP pahlawan.',
  太陽の杖: 'Tongkat Matahari',
  '光の範囲攻撃。灼光をつけ、呪縛の敵を浄化して勇者のHPを回復する。':
    'Serangan area Cahaya. Memberi efek Silau, menyucikan musuh Terikat, dan memulihkan HP pahlawan.',
  闇の剣: 'Pedang Kegelapan',
  '闇。狙いに呪縛をつける（攻撃力ダウン）。灼光の敵を封印して、攻撃を遅くする。':
    'Kegelapan. Memberi efek Terikat ke target (Serangannya turun). Menyegel musuh Silau dan memperlambat serangannya.',
  闇の杖: 'Tongkat Kegelapan',
  '闇の範囲攻撃。呪縛をつけ、灼光の敵を封印して攻撃を遅くする。':
    'Serangan area Kegelapan. Memberi efek Terikat, menyegel musuh Silau, dan memperlambat serangannya.',
  木の盾: 'Perisai Kayu',
  '連鎖が通ると、終了時に防御値+8。': 'Pertahanan +8 di akhir setiap rantai yang melewatinya.',
  鎖帷子: 'Baju Rantai',
  '連鎖が通ると、終了時に防御値+12。': 'Pertahanan +12 di akhir setiap rantai yang melewatinya.',
  鋼の鎧: 'Zirah Baja',
  '連鎖が通ると、終了時に防御値+20。少し重く、次へ伝わるのが遅め。':
    'Pertahanan +20 di akhir setiap rantai yang melewatinya. Agak berat: lambat meneruskan rantai.',
  短剣: 'Belati',
  '軽い一撃。次の装備へすぐ伝わる。':
    'Serangan ringan. Cepat meneruskan rantai ke item berikutnya.',
  双剣: 'Pedang Kembar',
  '1段で2回斬る。': 'Menebas 2 kali dalam satu mata rantai.',
  弓: 'Busur',
  '狙いの後ろ2体まで射抜く。': 'Menembus hingga 2 musuh di belakang target.',
  大斧: 'Kapak Besar',
  '目の前の敵をまとめて薙ぎ払う重い一撃。次へ伝わるのが遅い。':
    'Serangan berat yang menyapu semua musuh di depanmu. Lambat meneruskan rantai.',
  聖剣: 'Pedang Suci',
  '会心が出やすい（会心率+20%）。': 'Lebih sering kena kritikal (peluang kritikal +20%).',
  雷の槍: 'Tombak Petir',
  '雷の突き。狙いの後ろ1体にも届く。濡れた敵を感電させる。':
    'Tusukan Petir yang juga mengenai 1 musuh di belakang target. Menyetrum musuh Basah.',
  氷の杖: 'Tongkat Es',
  '狙いの周りをまとめて凍結させる。打撃で粉砕できる。':
    'Membekukan target dan musuh di sekitarnya. Serangan Hantam bisa menghancurkan mereka.',
  革鎧: 'Zirah Kulit',
  '連鎖が通ると、終了時に防御値+6。軽く、次へすぐ伝わる。':
    'Pertahanan +6 di akhir setiap rantai yang melewatinya. Ringan: cepat meneruskan rantai.',
  大盾: 'Perisai Besar',
  '連鎖が通ると、終了時に防御値+26。重く、次へ伝わるのが遅い。':
    'Pertahanan +26 di akhir setiap rantai yang melewatinya. Berat: lambat meneruskan rantai.',
  鉄の盾: 'Perisai Besi',
  '連鎖が通ると、終了時に防御値+18。': 'Pertahanan +18 di akhir setiap rantai yang melewatinya.',
  循環の環: 'Cincin Siklus',
  '四方へ連鎖を広げる。この環を通る連鎖は、連鎖倍率の上限が×4.0になる。':
    'Menyebarkan rantai ke 4 arah. Rantai yang melewati cincin ini punya batas pengganda rantai ×4.0.',
  竜牙の剣: 'Pedang Taring Naga',
  '竜を討った剣。ボスへのダメージ×2。': 'Pedang yang pernah menumbangkan naga. Damage ke bos ×2.',
  天雷の大槌: 'Palu Halilintar',
  '画面内の全敵へ雷を落とす。濡れた敵は感電する。':
    'Menyambar semua musuh di layar dengan Petir. Musuh Basah akan tersetrum.',
  毒の短剣: 'Belati Racun',
  '当てた敵を毒にする（5秒間、この一撃の30%を毎秒与える）。毒の敵へのほかの攻撃は×1.2。':
    'Meracuni musuh yang terkena (30% damage serangan ini tiap detik selama 5 detik). Serangan lain ke musuh yang keracunan ×1.2.',
  毒霧の杖: 'Tongkat Kabut Racun',
  '狙いのまわりにも当たり、まとめて毒にする（5秒間、一撃の30%を毎秒）。':
    'Juga mengenai musuh di sekitar target dan meracuni semuanya (30% damage serangan tiap detik selama 5 detik).',
  吸血の剣: 'Pedang Vampir',
  '与えたダメージの8%だけ、勇者のHPが回復する。':
    'Memulihkan HP pahlawan sebesar 8% dari damage yang diberikan.',
  疾風の羽: 'Bulu Badai',
  'この羽のあとに続く装備は、段数を1つ多く数える（連鎖倍率が早く上がる）。次へすぐ伝わる。':
    'Item setelah bulu ini dihitung 1 mata rantai lebih jauh (pengganda rantai naik lebih cepat). Cepat meneruskan rantai.',
  深淵の杯: 'Cawan Kegelapan',
  '当てた敵を毒にし、与えたダメージの15%だけHPが回復する。':
    'Meracuni musuh yang terkena dan memulihkan HP pahlawan sebesar 15% dari damage yang diberikan.',
  賢者の石: 'Batu Bertuah',
  '当てた敵に濡れ・油・凍結をまとめて付ける。後ろの雷・炎・打撃がすべてコンボになる。':
    'Memberi efek Basah, Minyak, dan Beku sekaligus ke musuh yang terkena. Serangan Petir, Api, dan Hantam setelahnya semua jadi kombo.',
  不落の城門: 'Gerbang Kebal',
  'バックパックにある限り、連鎖中も無防備にならず、よろめかない。防御値+40。':
    'Selama ada di ranselmu, kamu tak pernah lengah saat rantai berjalan dan tak pernah terhuyung. Pertahanan +40.',
  号令: 'Seruan Perang',
  '足元のゲージを即満タンにし、次の起点を今すぐ発火。連鎖中は使えない。':
    'Langsung mengisi penuh bar di kaki pahlawan dan memicu Asal berikutnya saat itu juga. Tak bisa dipakai saat rantai berjalan.',
  時止め: 'Henti Waktu',
  '3秒間、敵の行動を止める。': 'Menghentikan semua musuh selama 3 detik.',
  油の大樽: 'Tong Minyak',
  '画面内の全敵に油を付与。': 'Melumuri semua musuh di layar dengan Minyak.',
  雨乞いの符: 'Jimat Hujan',
  '画面内の全敵に濡れを付与。': 'Membuat semua musuh di layar Basah.',
  時の砂: 'Pasir Waktu',
  '出撃時間を5秒のばす。': 'Menambah 5 detik ke waktu ekspedisi.',
  爆弾: 'Bom',
  '画面内の全敵に60ダメージ（攻撃倍率の強化が乗る）。':
    'Memberi 60 damage ke semua musuh di layar (diperkuat oleh peningkatan Pengganda Serangan).',
  幸運の硬貨: 'Koin Hoki',
  '8秒間、会心率+30%。': 'Peluang kritikal +30% selama 8 detik.',
  回復薬: 'Ramuan Pemulih',
  'HPを40回復。': 'Memulihkan 40 HP.',
  物理: 'Fisik',
  打撃: 'Hantam',
  炎: 'Api',
  雷: 'Petir',
  氷: 'Es',
  水: 'Air',
  油: 'Minyak',
  風: 'Angin',
  光: 'Cahaya',
  闇: 'Kegelapan',
  単体: 'Tunggal',
  薙ぎ払い: 'Sapuan',
  範囲: 'Area',
  全体: 'Semua',
  濡れ: 'Basah',
  凍結: 'Beku',
  毒: 'Racun',
  灼光: 'Silau',
  呪縛: 'Terikat',
  コモン: 'Biasa',
  レア: 'Langka',
  エピック: 'Epik',
  レジェンド: 'Legendaris',

  // src/data/referenceLoadouts.ts
  一本型: 'Rantai Tunggal',
  複数型: 'Multi Rantai',
  混合型: 'Campuran',

  // src/data/regions.ts
  草原: 'Padang Rumput',
  'スライム、ゴブリン、狼': 'Slime, Goblin, Serigala',
  洞窟: 'Gua',
  'コウモリ、骸骨、呪術師（群れが多い）': 'Kelelawar, Tengkorak, Dukun (banyak kawanan)',
  城壁: 'Benteng',
  '甲冑兵、ゴブリン、骸骨（硬い）': 'Prajurit Zirah, Goblin, Tengkorak (tangguh)',
  火山: 'Gunung Berapi',
  '火トカゲ、溶岩スライム、火の精': 'Kadal Api, Slime Lava, Roh Api',
  '炎が効きにくい・氷と水が弱点': 'Tahan Api; lemah terhadap Es dan Air',
  氷河: 'Gletser',
  '氷の狼、雪だるま、雪男（速い）': 'Serigala Es, Manusia Salju, Yeti (gesit)',
  '氷が効きにくい・炎が弱点': 'Tahan Es; lemah terhadap Api',
  魔王城: 'Kastel Raja Iblis',
  '小悪魔、ガーゴイル、闇の魔導士': 'Iblis Kecil, Gargoyle, Penyihir Gelap',
  '物理と炎が効きにくい・雷が弱点（ガーゴイルは打撃が弱点）':
    'Tahan Fisik dan Api; lemah terhadap Petir (Gargoyle: lemah terhadap Hantam)',
  エンドレス: 'Tanpa Batas',
  全地域の雑魚: 'Dari semua wilayah',
  '周回ごとにいろいろな敵。装備とゴールドは出ない':
    'Musuh berganti tiap putaran. Tak ada perlengkapan atau emas.',

  // src/data/techniques.ts
  'クリムゾン・バースト': 'Ledakan Bara',
  '油瓶 → 松明か炎の杖 → 炎の杖': 'Botol Minyak → Obor/Tongkat Api → Tongkat Api',
  '油と炎の気配がする…': 'Terasa hawa minyak dan api…',
  'トライ・サンダー': 'Tri Petir',
  '水竜の瓶か雨雲の杖 → 雷の装備 → 雷の装備':
    'Botol Naga Air/Tongkat Mendung → item Petir → item Petir',
  '水と雷の気配がする…': 'Terasa hawa air dan petir…',
  'フロスト・ブレイカー': 'Penghancur Es',
  '氷の剣か氷の杖 → ハンマーか鉄球 → ハンマーか鉄球':
    'Pedang Es/Tongkat Es → Palu/Bola Besi → Palu/Bola Besi',
  '氷と打撃の気配がする…': 'Terasa hawa es dan pukulan berat…',
  'トリプル・スラッシュ': 'Tebasan Tripel',
  '剣か短剣 → 剣か短剣 → 大剣か聖剣': 'Pedang/Belati → Pedang/Belati → Pedang Besar/Pedang Suci',
  '剣が三つ重なる…': 'Tiga pedang berjajar…',
  'サイクロン・アックス': 'Kapak Topan',
  '斧 → 斧か大斧 → 大斧': 'Kapak → Kapak/Kapak Besar → Kapak Besar',
  '斧が三つ重なる…': 'Tiga kapak berjajar…',
  'ヴェノム・クロス': 'Silang Bisa',
  '毒の短剣 → 短剣か毒の短剣 → 吸血の剣': 'Belati Racun → Belati/Belati Racun → Pedang Vampir',
  '毒と血の気配がする…': 'Terasa hawa racun dan darah…',
};
