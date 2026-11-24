// Indonesian: screens and messages. Key: Japanese source string → value: translation
// (keep {placeholders} and the meaning of any '|context' key)
import type { Dict } from '../types';

export const UI: Dict = {
  // src/core/challenge.ts
  'レアリティは{rarity}まで（起点は問わない）': 'Kelangkaan maks. {rarity} (Asal: bebas)',
  アーティファクトは使えない: 'Artefak dilarang',
  '攻撃装備は {elements} だけ': 'Perlengkapan serang: hanya {elements}',
  '・|sep': ', ',
  防具は使えない: 'Pelindung dilarang',
  '強化と★は使わない（勇者は最初の強さ）':
    'Tanpa peningkatan dan bonus ★ (pahlawan dengan kekuatan awal)',
  'アーティファクト（{item}）は使えない': 'Artefak dilarang ({item})',
  '{rarity}より上の装備（{item}）がある': 'Ada perlengkapan di atas {rarity} ({item})',
  '使えない属性の装備（{item}）がある': 'Ada perlengkapan dengan elemen terlarang ({item})',
  '使えない種類の装備（{item}）がある': 'Ada perlengkapan dengan jenis terlarang ({item})',
  起点がない: 'Tidak ada Asal',

  // src/core/cosmetics.ts
  蒼のマント: 'Jubah Biru',
  白銀の鎧: 'Zirah Perak',
  黄金の鎧: 'Zirah Emas',
  ちびドラゴン: 'Naga Cilik',
  銅のメダル: 'Medali Perunggu',
  銀の王冠: 'Mahkota Perak',
  金の王冠: 'Mahkota Emas',
  若葉の印: 'Tanda Daun Muda',
  コウモリの翼: 'Sayap Kelelawar',
  騎士の旗: 'Panji Ksatria',
  炎の羽飾り: 'Hiasan Bulu Api',
  氷の結晶: 'Kristal Es',
  魔王の翼: 'Sayap Raja Iblis',
  星の輪: 'Lingkaran Bintang',

  // src/core/cosmeticRewards.ts
  '{region}で★{stars}（{loop}周目のボスを倒す）':
    '★{stars} di {region} (kalahkan Bos Putaran {loop})',
  'エンドレスで{n}周目に着く': 'Capai putaran {n} di mode Tanpa Batas',

  // src/core/diagnose.ts

  // src/core/economy.ts
  見つかりません: 'Tidak ditemukan',
  消耗品は合成できません: 'Item sekali pakai tak bisa difusi',
  これ以上のレアリティはありません: 'Sudah di kelangkaan tertinggi',
  '装備中は合成に使えません（外してから）': 'Item yang sedang dipakai tak bisa difusi (lepas dulu)',
  ロック中は合成に使えません: 'Item terkunci tak bisa difusi',
  '同じ装備があと{n}つ必要': 'Butuh {n} lagi item yang sama',
  '{cost}G 必要': 'Butuh {cost}G',

  // src/core/presets.ts

  // src/core/ranking.ts
  '挑戦 第{n}回': 'Tantangan #{n}',
  'エンドレス {month}': 'Tanpa Batas {month}',
  '上位1%': '1% Teratas',
  '上位10%': '10% Teratas',
  '上位50%': '50% Teratas',
  参加: 'Peserta',
  '{season} {title}': '{season} {title}',

  // src/core/shareText.ts
  '挑戦「{name}」でスコア {score}！': 'Skor {score} di Tantangan "{name}"!',
  'エンドレスで{loop}周目に到達！': 'Mencapai Putaran {loop} di mode Tanpa Batas!',
  '{region}で{loop}周目に到達！': 'Mencapai Putaran {loop} di {region}!',
  '最大{step}連鎖・最大ダメージ {damage}': 'Rantai maks. {step} · Damage maks. {damage}',

  // src/platform/monetization.ts
  '広告（テスト表示）': 'Iklan (tes)',
  本番ではここに動画広告が流れます: 'Di game asli, iklan video diputar di sini',

  // src/scenes/BaseScene.ts
  基本: 'Dasar',
  '1回のランは30秒。走っている間は時間が止まり、敵と戦っている間だけ減ります。':
    'Satu ekspedisi berlangsung 30 detik. Waktu berhenti saat pahlawan berjalan dan hanya berkurang saat bertarung.',
  '時間は、群れを1回の連鎖でまとめて倒す（一網打尽）と+1.5秒、ボスを倒すと+8秒、時の砂で+5秒のびます。上限はないので、倒し続けるほど長く戦えます。':
    'Menghabisi satu kawanan sekaligus dengan satu rantai (Sapu Bersih) menambah 1.5 detik, mengalahkan bos menambah 8 detik, dan Pasir Waktu menambah 5 detik. Tak ada batasnya, jadi makin banyak yang kamu kalahkan, makin lama kamu bertarung.',
  ダメージの決まり方: 'Cara Damage Dihitung',
  '・レアリティ：コモン×1、レア×1.5、エピック×2.5、レジェンド×4':
    '• Kelangkaan: Biasa ×1, Langka ×1.5, Epik ×2.5, Legendaris ×4',
  '・連鎖倍率：6連鎖目までは1連鎖ごとに×1.2。その先も上限なく伸び続ける（伸びは少しずつ小さく）。循環の環を通ると×4.0まで×1.2ずつ':
    '• Pengali rantai: ×1,2 per mata rantai sampai ke-6, lalu terus naik tanpa batas (sedikit lebih kecil tiap mata rantai). Lewat Cincin Ouroboros naik ×1,2 per mata rantai sampai ×4,0',
  '・コンボ：濡れ＋雷で感電×3、油＋炎で爆発×2（周りも巻き込む）、凍結＋打撃で粉砕×2.5。コンボでなくても、状態が付いた敵には×1.2':
    '• Kombo: Basah + Petir = Setrum ×3, Minyak + Api = Ledakan ×2 (musuh di sekitar ikut kena), Beku + Hantam = Hancur ×2.5. Meski bukan kombo, musuh yang terkena efek status menerima ×1.2',
  '・強化：拠点の「攻撃倍率」': '• Peningkatan: "Pengganda Serangan" di Markas',
  '・会心：8%でダメージ×2（聖剣・会心の追加効果・幸運の硬貨で上がる）':
    '• Kritikal: peluang 8% untuk damage ×2 (naik dengan Pedang Suci, bonus Kritikal, dan Koin Hoki)',
  ダメージを伸ばすコツ: 'Tips Damage Lebih Besar',
  '・配置画面の「約」の数字を見ながら並べ替える。ルートの番号を選ぶと、そのルート1本の推定ダメージが出ます。':
    '• Susun ulang sambil melihat angka "~" di layar Susun. Pilih nomor rute untuk melihat perkiraan damage rute itu saja.',
  '・コンボを作る。状態を付ける装備（水竜の瓶・雨雲の杖・油瓶・氷の剣・氷の杖）の後ろに、組む属性（雷・炎・打撃）をつなぐ。状態は5秒で消えます。':
    '• Buat kombo. Sambungkan elemen pasangannya (Petir, Api, Hantam) setelah item pemberi status (Botol Naga Air, Tongkat Mendung, Botol Minyak, Pedang Es, Tongkat Es). Efek status hilang setelah 5 detik.',
  '・光と闇を交互につなぐと、コンボが続く。浄化（勇者のHP回復）と封印（敵の攻撃が少しのあいだ止まる）。風は毒の敵に毒を重ね、5重で毒爆。':
    '• Sambungkan Cahaya dan Kegelapan berselang-seling agar kombo terus berlanjut: Penyucian (memulihkan HP pahlawan) dan Segel (serangan musuh berhenti sesaat). Angin menumpuk Racun pada musuh keracunan; di 5 lapis, Ledakan Racun.',
  '・強い装備ほど後ろ（6連鎖目以降）に置く。前のほうは軽い装備や状態付与に。':
    '• Taruh perlengkapan terkuatmu di akhir rantai (mata rantai ke-6 dan seterusnya). Pakai mata rantai awal untuk perlengkapan ringan dan item pemberi status.',
  '・レアリティが一番効きます。奥の地域ほどレア以上が出やすい。':
    '• Kelangkaan paling berpengaruh. Makin dalam wilayahnya, makin sering item Langka ke atas jatuh.',
  '・装備の左下の✦は追加効果。先駆け（3連鎖目まで強い）は短い連鎖に、締め（6連鎖目以降強い）は長い連鎖に向きます。':
    '• ✦ di kiri bawah item menandakan bonus. Pelopor (kuat sampai mata rantai ke-3) cocok untuk rantai pendek; Penutup (kuat mulai mata rantai ke-6) cocok untuk rantai panjang.',
  必殺技: 'Jurus Spesial',
  '連鎖のルートで、決まった装備が順に3つつながって通ると、3つ目の一撃が必殺技になります（ダメージ×2.5、勇者が大きく踏み込む）。配置画面では、そのマスに「必殺」と出ます。':
    'Saat rantai melewati 3 item tertentu secara berurutan, serangan ke-3 menjadi Jurus Spesial (damage ×2.5, dan pahlawan menerjang maju). Di layar Susun, kotak itu menampilkan "Spesial".',
  短い連鎖と長い連鎖: 'Rantai Pendek vs. Panjang',
  '・次の発火までの待ちは、直前の連鎖で動いた装備の数に比例します（防具も数えます）。短い連鎖は回転が速く、長い連鎖は一撃が大きい。':
    '• Jeda sebelum pemicuan berikutnya sebanding dengan jumlah item yang aktif di rantai sebelumnya (pelindung juga dihitung). Rantai pendek berputar cepat; rantai panjang menghantam keras.',
  '・連鎖中は無防備（被ダメージ×1.5）。ただし起点のあと、3マス動くまでは守りが残ります（防具のマスも数えます）。':
    '• Saat rantai berjalan, kamu lengah (damage yang diterima ×1.5), tapi tetap terlindungi sampai rantai melewati 3 petak setelah asal (petak pelindung juga dihitung).',
  '・防具のマスは鳴った瞬間に防御値を足します。長い連鎖の途中に防具を通すと、無防備の間も耐えられます。':
    '• Petak pelindung menambah Pertahanan saat berbunyi. Lewatkan rantai panjang melalui pelindung agar tetap bertahan saat lengah.',
  地域と敵: 'Wilayah & Musuh',
  '・草原 → 洞窟 → 城壁の順に敵が一気に強くなり、そのぶんレアな装備が出やすくなります。3周目のボスを倒すと次の地域が開きます。':
    '• Musuh jauh lebih kuat dari Padang Rumput → Gua → Benteng, tapi perlengkapan langka juga lebih sering jatuh. Kalahkan bos putaran 3 untuk membuka wilayah berikutnya.',
  '・群れとボスは出撃ごとに変わります。精鋭（硬い・速い・金ぴか）が混ざることも。金ぴかは必ずレア以上を2個落とします。':
    '• Kawanan dan bos berganti tiap ekspedisi. Musuh elit (Tangguh, Gesit, Keemasan) bisa muncul. Elit Keemasan selalu menjatuhkan 2 item Langka ke atas.',
  '・アーティファクトはごくまれに出る特別な装備です。':
    '• Artefak adalah perlengkapan spesial yang sangat jarang jatuh.',
  ご褒美とプレミアム: 'Hadiah & Premium',
  '・広告を見ると、ご褒美がもらえます：結果画面で「戦利品を2倍にする」（1日3回、同じ数だけ抽選し直してもう1セット）、鍛冶屋で「無料で再抽選」（1日3回）、力尽きたときに「再開」（1回のランで1回、HP全回復＋10秒）。':
    '• Tonton iklan untuk dapat hadiah: "Gandakan Jarahan" di layar hasil (3 kali sehari; mengundi satu set lagi dengan jumlah yang sama), "Acak Ulang Gratis" di Pandai Besi (3 kali sehari), dan "Bangkit" saat kamu tumbang (sekali per ekspedisi; HP penuh + 10 detik).',
  '・プレミアム（{price}、買い切り）なら、広告を見なくても同じご褒美を受け取れます。設定から買えます。':
    '• Dengan Premium ({price}, sekali beli), kamu dapat hadiah yang sama tanpa menonton iklan. Beli di Pengaturan.',
  '倉庫・鍛冶屋・合成': 'Gudang, Pandai Besi & Fusi',
  '・消耗品枠は、入れた消耗品を覚えています。ランで使い切ったら、倉庫に同じものがあれば自動で入れ直します（ないときは枠にうすく「自動」と出て、手に入ったら入ります）。手で外すと覚えるのをやめます。':
    '• Slot item sekali pakai mengingat isinya. Saat item itu habis dalam ekspedisi, item yang sama diisi ulang otomatis dari Gudang (kalau tidak punya, slot menampilkan "Auto" samar dan terisi begitu kamu mendapatkannya). Lepas secara manual untuk menghentikannya.',
  '・倉庫の「自動売却」で、ラン後に戦利品から決まったレアリティ以下を自動で売れます（✦付きを残すかも選べます）。':
    '• Dengan "Jual Otomatis" di Gudang, jarahan dengan kelangkaan pilihanmu ke bawah otomatis terjual setelah tiap ekspedisi (kamu bisa memilih untuk menyimpan item ✦).',
  '・倉庫があふれると出撃できません。「一括売却」「まとめて売る」で整理しましょう。大事な装備は詳細カードでロックすると売れなくなります。':
    '• Kamu tak bisa berangkat saat Gudang penuh. Kosongkan dengan "Jual Massal" atau "Pilih & Jual". Kunci perlengkapan penting di kartu detailnya agar tidak bisa dijual.',
  '・鍛冶屋では出口の向きを付け直せます（数は変わりません）。レアリティが高いほど料金も上がります。':
    '• Di Pandai Besi kamu bisa menempa ulang arah jalur (jumlahnya tetap). Makin tinggi kelangkaannya, makin mahal biayanya.',
  '・同じ装備・同じレアリティを3つ集めると、鍛冶屋の「合成」（倉庫の詳細カードからも）で1つ上のレアリティを狙えます。成功率はコモン→レア80%（20G）、レア→エピック50%（100G）、エピック→レジェンド25%（500G）。失敗すると、材料と同じレアリティのランダムな装備が1つ手に入ります。追加効果と出口の向きは新しく決まります。':
    '• Kumpulkan 3 item yang sama dengan kelangkaan yang sama, lalu pakai "Fusi" di Pandai Besi (atau di kartu detail di Gudang) untuk mencoba naik ke kelangkaan berikutnya. Peluang berhasil: Biasa→Langka 80% (20G), Langka→Epik 50% (100G), Epik→Legendaris 25% (500G). Kalau gagal, kamu dapat 1 item acak dengan kelangkaan yang sama. Bonus dan arah jalur diacak ulang.',
  設定: 'Pengaturan',
  ヘルプ: 'Bantuan',
  ランキング: 'Peringkat',
  挑戦: 'Tantangan',
  倉庫: 'Gudang',
  鍛冶屋: 'Pandai Besi',
  図鑑: 'Ensiklopedia',
  出撃: 'Berangkat!',
  '倉庫があふれています。売却するまで出撃できません':
    'Gudang penuh. Jual beberapa item agar bisa berangkat.',
  冒険の記録: 'Catatan Petualangan',
  '出撃|stat': 'Ekspedisi',
  '{n}回': '{n}',
  最大連鎖: 'Rantai Maks',
  '{n}連鎖': '{n}',
  最大ダメージ: 'Damage Maks',
  開放した地域: 'Wilayah Terbuka',
  '{region} {n}周': '{region} Putaran {n}',
  '最高到達: {list}': 'Terbaik: {list}',
  '　|sep': '  ·  ',
  まだありません: 'Belum ada',
  ロック中: 'Terkunci',
  '売る {price}G': 'Jual {price}G',
  売る: 'Jual',
  アーティファクトを売る: 'Jual Artefak',
  '{item}を{price}Gで売ります': 'Jual {item} seharga {price}G?',
  ロック中の装備は売れません: 'Perlengkapan terkunci tak bisa dijual',
  '売るものをタップで選ぶ（もう一度で外す・長押しで詳細）':
    'Ketuk item untuk memilih (ketuk lagi untuk batal, tahan untuk detail)',
  '自動売却：オフ': 'Jual Otomatis: Mati',
  '自動売却：{rarity}（✦は残す）': 'Jual Otomatis: {rarity} (simpan ✦)',
  '自動売却：{rarity}': 'Jual Otomatis: {rarity}',
  '自動売却：{rarity}以下（✦は残す）': 'Jual Otomatis: {rarity} ke bawah (simpan ✦)',
  '自動売却：{rarity}以下': 'Jual Otomatis: {rarity} ke bawah',
  '{n}個を売ります（+{gold}G）': 'Item yang dijual: {n} (+{gold}G)',
  '{n}個を売る +{gold}G': 'Jual ×{n} +{gold}G',
  選んで売る: 'Pilih Item',
  やめる: 'Batal',
  まとめて売る: 'Pilih & Jual',
  '{rarity}  {n}個 +{gold}G': '{rarity}  ×{n} +{gold}G',
  '{rarity}以下  {n}個 +{gold}G': '{rarity} ke bawah  ×{n} +{gold}G',
  '{rarity}を一括売却': 'Jual Massal: {rarity}',
  '{rarity}以下を一括売却': 'Jual Massal: {rarity} ke bawah',
  '消耗品  {n}個 +{gold}G': 'Item Sekali Pakai  ×{n} +{gold}G',
  消耗品を一括売却: 'Jual Massal: Item Sekali Pakai',
  '✦付きは残す：オン': 'Simpan Item ✦: Nyala',
  '✦付きは残す：オフ': 'Simpan Item ✦: Mati',
  一括売却: 'Jual Massal',
  向きの付け直し: 'Tempa Ulang',
  合成: 'Fusi',
  この装備は向きを付け直せません: 'Item ini tak bisa ditempa ulang',
  装備中: 'Dipakai',
  付け直す装備を選んでください: 'Pilih item untuk ditempa ulang',
  '出口の数は変わらず、方向だけが変わります': 'Jumlah jalur tetap; hanya arahnya yang berubah',
  '付け直し {n}回（毎回 料金×1.5）': 'Ditempa ulang ×{n} (biaya ×1.5 tiap kali)',
  '再抽選 {gold}G': 'Acak Ulang {gold}G',
  ゴールドが足りません: 'Emas tidak cukup',
  '無料で再抽選（今日あと{n}回）': 'Acak Ulang Gratis (sisa {n} hari ini)',
  '▶ 広告を見て無料で再抽選（今日あと{n}回）':
    '▶ Tonton Iklan: Acak Ulang Gratis (sisa {n} hari ini)',
  '指定: {n}方向を選ぶ': 'Atur: pilih jalur ({n})',
  '指定 {gold}G': 'Atur {gold}G',
  '方向を{n}つ選んでください': 'Pilih arah jalur ({n})',
  強化: 'Tingkatkan',
  '最大HP {hp}（★{stars}で+{bonus}込み）': 'HP Maks {hp} (termasuk +{bonus} dari ★{stars})',
  '最大HP {hp}': 'HP Maks {hp}',
  '攻撃間隔 {sec}秒': 'Jeda Serangan {sec} dtk',
  '攻撃倍率 ×{mult}（★{stars}で+{bonus}%込み）':
    'Pengganda Serangan ×{mult} (termasuk +{bonus}% dari ★{stars})',
  '攻撃倍率 ×{mult}': 'Pengganda Serangan ×{mult}',
  '出撃 {sec}秒（延長込みの上限 {max}秒）':
    'Waktu Ekspedisi {sec} dtk (maks. {max} dtk dengan tambahan)',
  '出撃 {sec}秒': 'Waktu Ekspedisi {sec} dtk',
  '{n}枠': '{n} slot',
  '{n}個': 'Kapasitas {n}',
  最大: 'MAKS',
  切替: 'Ubah',
  音量: 'Volume',
  ゲームスピード: 'Kecepatan Game',
  '検証用。×2 なら30秒のランが15秒で終わります':
    'Untuk pengujian. Di ×2, ekspedisi 30 detik selesai dalam 15 detik.',
  'プレミアム（購入済み）': 'Premium (Dimiliki)',
  'プレミアム {price}': 'Premium {price}',
  広告なしでご褒美を受け取れます: 'Dapat hadiah tanpa iklan',
  'プレミアムになりました！': 'Kamu sekarang Premium!',
  購入を復元: 'Pulihkan Pembelian',
  購入を復元しました: 'Pembelian dipulihkan',
  復元できる購入はありません: 'Tidak ada pembelian untuk dipulihkan',
  '遊び方・強くなるコツ': 'Cara Main & Tips',
  案内をもう一度: 'Ulangi Tutorial',
  '各画面で、案内がもう一度出ます': 'Tutorial di tiap layar akan muncul lagi',
  振動: 'Getaran',
  '画面揺れ・光': 'Guncangan & Kilatan Layar',
  消耗品ボタンの位置: 'Sisi Tombol Item',
  '重ね（下から順に鳴る）': 'Tumpukan (berbunyi dari bawah ke atas)',
  '一番上 ×{m}（矢印はこの装備）': 'Teratas ×{m} (panahnya dari item ini)',
  '×{m}': '×{m}',
  同じ装備だけ重ねられます: 'Hanya perlengkapan yang sama yang bisa ditumpuk',
  'アーティファクトは重ねられません（1つで{n}回鳴ります）':
    'Artefak tidak bisa ditumpuk (satu berbunyi {n} kali)',
  '1マスに重ねられるのは{n}つまで': 'Maks. {n} per petak',
  デバッグ機能: 'Mode Debug',
  着せ替えの見た目をすべて試せます: 'Kamu bisa mencoba semua tampilan di Lemari',
  言語: 'Bahasa',
  '{auto}（{lang}）': '{auto} ({lang})',
  自動: 'Otomatis',
  端末の言語: 'bahasa perangkat',
  'オフ（売らない）': 'Mati (tidak dijual)',
  コモンを売る: 'Jual Biasa',
  レア以下を売る: 'Jual Langka ke bawah',
  エピック以下を売る: 'Jual Epik ke bawah',
  自動売却: 'Jual Otomatis',
  'ラン後に戦利品から売ります。消耗品・アーティファクトは売りません':
    'Menjual dari jarahanmu setelah tiap ekspedisi. Item sekali pakai dan Artefak tidak akan dijual.',
  'ようこそ！\n勇者が自動で進んで、敵と戦うゲームだよ。\nまずは「出撃」を押してみよう！':
    'Selamat datang!\nPahlawanmu akan maju dan melawan musuh sendiri. Pertama, coba ketuk "Berangkat!"',
  '鍛冶屋では、装備の出口の向きを変えたり、\n同じ装備を3つ集めて「合成」して\n上のレアリティを狙えるよ':
    'Di Pandai Besi, kamu bisa mengubah arah jalur item, atau memakai "Fusi" pada 3 item yang sama untuk mengincar kelangkaan lebih tinggi.',
  '合成 {gold}G': 'Fusi {gold}G',
  '合成 {have}/3': 'Fusi {have}/3',
  '{item}（{rarity}）を3つ使って、{target}の{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    'Pakai 3 × {item} ({rarity}) untuk mengincar {target} {to} ({gold}G).\nPeluang berhasil: {rate}%. Kalau gagal, kamu dapat 1 item {rarity} acak.',
  '{item}（{rarity}）を3つ使って、{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    'Pakai 3 × {item} ({rarity}) untuk mengincar {to} ({gold}G).\nPeluang berhasil: {rate}%. Kalau gagal, kamu dapat 1 item {rarity} acak.',
  合成する: 'Fusi',
  ロック: 'Terkunci',
  '{n}つ': '×{n}',
  合成する装備を選んでください: 'Pilih item untuk difusi',
  '同じ装備・同じレアリティを3つで、1つ上のレアリティに':
    '3 item yang sama dengan kelangkaan sama → naik 1 kelangkaan',
  '「○つ」の印は、3つ以上揃っている装備です': 'Tanda "×○" berarti kamu punya 3 atau lebih item itu',
  '{rarity} ×3 → {target}の{to} ×1': '{rarity} ×3 → {target} {to} ×1',
  '{rarity} ×3 → {to} ×1': '{rarity} ×3 → {to} ×1',
  '成功率 {rate}%': 'Peluang berhasil {rate}%',
  '失敗すると{rarity}のランダムな装備が1つ（追加効果・向きは新しく）':
    'Kalau gagal: 1 item {rarity} acak (bonus dan jalur baru)',
  '合成する {gold}G': 'Fusi {gold}G',
  合成できません: 'Tak Bisa Fusi',
  '合成中…': 'Sedang fusi…',
  タップで閉じる: 'Ketuk untuk menutup',
  '合成成功！': 'Berhasil!',
  '失敗…': 'Gagal…',
  実績: 'Pencapaian',
  '2週替わりの挑戦': 'Tantangan 2 Mingguan',
  'エンドレス（月ごと）': 'Tanpa Batas (Bulanan)',
  挑戦はまだ始まっていません: 'Tantangan belum dimulai',
  '（初めて記録を送るときに決まります）': '(ditentukan saat pertama kali mengirim skor)',
  'あなたの名前: {name}': 'Namamu: {name}',
  変える: 'Ubah',
  つながりませんでした: 'Gagal terhubung',
  'シーズンの終わりに: 上位1% {top1}G＋称号 / 上位10% {top10}G＋称号 / 上位50% {top50}G＋称号 / 参加 {joined}G':
    'Di akhir musim: 1% Teratas {top1}G + gelar / 10% Teratas {top10}G + gelar / 50% Teratas {top50}G + gelar / Peserta {joined}G',
  'ランキングは、サーバーの準備ができたら開きます': 'Peringkat dibuka setelah server siap',
  '挑戦が始まったら、ここに順位が出ます': 'Peringkat akan muncul di sini setelah Tantangan dimulai',
  '読み込み中…': 'Memuat…',
  'あなた: {rank}位 / {total}人（上位{pct}%）': 'Kamu: #{rank} dari {total} ({pct}% teratas)',
  'まだ記録がありません（参加 {total}人）': 'Belum ada skor (pemain: {total})',
  '{loop}周・{damage}': 'Putaran {loop} · {damage}',
  まだ誰も記録していません: 'Belum ada skor',
  '{season}: {rank}位 / {total}人（{band}）  +{gold}G':
    '{season}: #{rank} dari {total} ({band})  +{gold}G',
  '新しい装飾品: {list}': 'Kosmetik baru: {list}',
  ランキングの報酬: 'Hadiah Peringkat',
  受け取る: 'Klaim',
  戻る: 'Kembali',
  冒険者: 'Petualang',
  いつもの色: 'Bawaan',
  ペット: 'Peliharaan',
  なし: 'Tidak ada',
  使用中: 'Digunakan',
  '{band}でもらえる': 'Hadiah {band}',
  着せ替え: 'Lemari',
  '冒険や挑戦でもらえる、見た目だけの装飾品':
    'Tampilan dari petualangan dan Tantangan. Hanya mengubah penampilan.',
  勇者: 'Pahlawan',
  頭: 'Kepala',
  背中: 'Punggung',
  名前の飾り: 'Hiasan Nama',
  '舞台: {region}': 'Lokasi: {region}',
  '・{rule}': '• {rule}',
  'リリースから2週間後に開放！': 'Dibuka 2 minggu setelah rilis!',
  '開放まで あと{n}日': 'Dibuka dalam {n} hari',
  '2週間ごとに、地域と制限が入れ替わります。': 'Setiap 2 minggu, wilayah dan aturannya berganti.',
  '全員が同じ敵の並びに、自分の装備で挑み、合計ダメージを競います。':
    'Semua pemain menghadapi musuh yang sama dengan perlengkapan masing-masing dan bersaing dalam total damage.',
  '強化と★は使わず、勇者は最初の強さ。並べ方の腕が勝負です。':
    'Tanpa peningkatan dan bonus ★: pahlawan dengan kekuatan awal. Semuanya soal keahlianmu menyusun.',
  '装備とゴールドは出ません。': 'Tak ada perlengkapan atau emas yang jatuh.',
  '残り {days}日{hours}時間': 'Sisa {days} hari {hours} jam',
  '自己ベスト {score}': 'Terbaik: {score}',
  まだ挑戦していません: 'Belum dicoba',
  '装備 {n}個・起点 {origins}個': 'Perlengkapan: {n} · Asal: {origins}',
  まだ組んでいません: 'Belum disusun',
  組み直す: 'Susun Ulang',
  '出撃できる形まで組むだけ。並べ方を詰めるのはあなた次第':
    'Ini hanya menyusun sampai bisa berangkat. Menyempurnakannya terserah kamu.',
  挑戦する: 'Mulai!',
  '達成 {done} / {total}': 'Selesai {done} / {total}',
  達成: 'Selesai',
  '見つけた必殺技 {found} / {total}': 'Jurus Spesial ditemukan {found} / {total}',
  '発動：{hint}': 'Urutan: {hint}',
  '3つ目の一撃がダメージ×2.5、勇者が大きく踏み込む':
    'Serangan ke-3 memberi damage ×2.5 saat pahlawan menerjang maju',
  '？？？': '???',
  'ヒント：{teaser}': 'Petunjuk: {teaser}',
  'プレミアム：広告なしでご褒美を受け取れます': 'Premium: dapat hadiah tanpa iklan',
  'プレミアム {price}｜広告なしでご褒美がもらえる': 'Premium {price} | Hadiah tanpa iklan',
  '詳しく ›': 'Detail ›',
  'プレミアム {price}（買い切り）': 'Premium {price} (sekali beli)',
  '広告を見なくても、ご褒美をすぐ受け取れます。\n・結果画面「戦利品を2倍にする」\n・鍛冶屋「無料で再抽選」\n・力尽きたときの「再開」\n（回数はそのまま。強さは変わりません）':
    'Dapatkan hadiah iklan langsung, tanpa menonton iklan:\n• Hasil: "Gandakan Jarahan"\n• Pandai Besi: "Acak Ulang Gratis"\n• Saat tumbang: "Bangkit"\n(Batas harian tetap sama. Tidak membuatmu lebih kuat.)',
  購入する: 'Beli',

  // src/scenes/DummyScene.ts
  カカシで試し撃ち: 'Latihan Orang-orangan',
  '「発火」で次の起点を撃つ': 'Ketuk "Picu!" untuk memicu Asal berikutnya',
  発火: 'Picu!',
  配置: 'Susun',
  '起点{origin} 発火中…': 'Asal {origin} terpicu…',
  '総ダメージ {n}': 'Total damage {n}',
  '持続（無防備） {sec}秒': 'Durasi (lengah) {sec} dtk',
  '防御値 +{n}': 'Pertahanan +{n}',
  'コンボ {list}': 'Kombo {list}',

  // src/scenes/LoadoutScene.ts
  '↶ 戻す': '↶ Urungkan',
  全部外す: 'Lepas Semua',
  使えない: 'Dilarang',
  挑戦へ: 'Tantangan',
  '「約」の数字が大きいほど強い並べ方。\nいろいろ試してみよう！':
    'Makin besar angka "~", makin kuat susunannya. Coba macam-macam ide!',
  '「約」の数字は敵1体に撃ったときの推定ダメージ（コンボ・会心込み）':
    'Angka "~" adalah perkiraan damage ke satu musuh (termasuk kombo dan kritikal)',
  '起点が0個です。出撃できません': 'Belum ada Asal. Kamu tak bisa berangkat.',
  '倉庫があふれています（タップで売却）': 'Gudang penuh (ketuk untuk menjual)',
  全部: 'Semua',
  線を消す: 'Hapus Garis',
  線なし: 'Tanpa Garis',
  番号を選ぶと表示に戻す: 'Pilih nomor untuk menampilkan garis lagi',
  起点を置いてください: 'Taruh sebuah Asal',
  '合計 約{n}': 'Total ~{n}',
  '約{n}・{step}連鎖・{tech}': '~{n} · Rantai {step} · {tech}',
  '必殺技|fallback': 'Jurus Spesial',
  '約{n}・{step}連鎖・コンボ{combo}': '~{n} · Rantai {step} · Kombo {combo}',
  '約{n}・{step}連鎖': '~{n} · Rantai {step}',
  閉じる: 'Tutup',
  '挑戦「{name}」用': 'Tantangan: {name}',
  制限に合わせる: 'Sesuaikan Aturan',
  もう制限に合っています: 'Sudah sesuai aturan',
  '制限に合わせました。並べ方を詰めよう':
    'Sudah disesuaikan dengan aturan. Sekarang sempurnakan susunannya!',
  '合う装備が足りず、空いたマスがあります':
    'Perlengkapan yang diizinkan kurang, jadi ada kotak kosong',
  '消耗品|slots': 'Item Sekali Pakai',
  '自動|refill': 'Auto',
  ひとつ前の並べ方に戻しました: 'Perubahan terakhir dibatalkan',
  置きたいマスをタップ: 'Ketuk kotak tujuan',
  外す: 'Lepas',
  発火順を前へ: 'Picu Lebih Awal',
  枠に入れる: 'Masukkan ke Slot',
  枠がいっぱい: 'Slot Penuh',
  置く: 'Taruh',
  あふれた分を売る: 'Jual Kelebihan',
  '安いものから{n}個を売って倉庫に収めます\n（+{gold}G）':
    'Jual item termurah (×{n}) agar muat di Gudang.\n(+{gold}G)',

  // src/scenes/ResultScene.ts
  '体験おわり！': 'Demo Selesai!',
  '力尽きた…': 'Tumbang…',
  '撤退！': 'Mundur!',
  '時間切れ！': 'Waktu habis!',
  ランキングに記録しました: 'Skor tersimpan di Peringkat',
  シェア: 'Bagikan',
  '画像を保存しました（文はコピー済み）': 'Gambar disimpan (teks disalin)',
  画像を作れませんでした: 'Gagal membuat gambar',
  '挑戦「{name}」・{region}': 'Tantangan "{name}" · {region}',
  'スコア {score}': 'Skor {score}',
  '到達 {loop}周目': 'Mencapai Putaran {loop}',
  ボス撃破: 'Bos Dikalahkan',
  '発火|stat': 'Rantai Dipicu',
  ゴールド: 'Emas',
  一網打尽: 'Sapu Bersih',
  '自己ベスト！': 'Rekor Baru!',
  '★×{n}獲得！': 'Dapat ★×{n}!',
  '★獲得！': 'Dapat ★!',
  '★ボーナス: 攻撃+{atk}%・最大HP+{hp}': 'Bonus ★: Serangan +{atk}% · HP Maks +{hp}',
  '新しい地域「{region}」が開放された！': 'Wilayah baru terbuka: {region}!',
  '戦利品 {n}': 'Jarahan: {n}',
  '自動売却 {n}個 +{gold}G': 'Terjual otomatis ×{n} +{gold}G',
  '消耗品を{n}個 補充': 'Item sekali pakai diisi ulang ×{n}',
  '借りた伝説の装備は、お返ししたよ\n（体験なので戦利品はなし）':
    'Perlengkapan legendaris pinjaman sudah dikembalikan.\n(Ini demo, jadi tak ada jarahan.)',
  '挑戦「{name}」': 'Tantangan "{name}"',
  'スコア（合計ダメージ） {score}': 'Skor (total damage) {score}',
  '自己ベスト {best}（更新！）': 'Terbaik {best} (baru!)',
  '自己ベスト {best}': 'Terbaik {best}',
  エンドレスは装備が出ません: 'Mode Tanpa Batas tidak menjatuhkan perlengkapan',
  '自己ベスト {loop}周目・ダメージ {damage}': 'Terbaik: Putaran {loop} · Damage {damage}',
  戦利品なし: 'Tak ada jarahan',
  タップで能力を確認: 'Ketuk item untuk melihat statistiknya',
  タップで早送り: 'Ketuk untuk mempercepat',
  '戦利品を2倍にする（今日あと{n}回）': 'Gandakan Jarahan (sisa {n} hari ini)',
  '▶ 広告を見て戦利品を2倍にする（今日あと{n}回）':
    '▶ Tonton Iklan: Gandakan Jarahan (sisa {n} hari ini)',
  '戦利品 {n}（×2）': 'Jarahan: {n} (×2)',
  '広告のボーナス +{n}個（自動売却 {sold}個 +{gold}G）':
    'Bonus iklan +{n} (terjual otomatis ×{sold} +{gold}G)',
  '広告のボーナス +{n}個': 'Bonus iklan +{n}',
  拠点へ: 'Ke Markas',
  配置へ: 'Ke Susun',
  自分で出撃: 'Giliranmu!',
  もう一度: 'Main Lagi',
  倉庫があふれています: 'Gudang penuh',
  起点がありません: 'Tidak ada Asal',
  'これが伝説の装備の力！\n最大{step}連鎖、{damage}ダメージ！':
    'Inilah kekuatan perlengkapan legendaris!\nRantai sampai {step} mata rantai dan {damage} damage!',
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、\nいつかこの姿に！':
    'Mulai sekarang, bertualanglah dengan perlengkapanmu sendiri. Kumpulkan dan susun perlengkapan, suatu hari kamu akan sekuat ini!',
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、いつかこの姿に！\n「自分で出撃」を押してね':
    'Mulai sekarang, bertualanglah dengan perlengkapanmu sendiri. Kumpulkan dan susun perlengkapan, suatu hari kamu akan sekuat ini! Ketuk "Giliranmu!"',
  '宝箱から装備をゲット！\n開いたあとにタップすると、能力が見られるよ':
    'Dapat perlengkapan dari peti!\nKetuk item setelah peti terbuka untuk melihat statistiknya.',
  '敵を倒すと、宝箱から装備が手に入るよ。\n開いたあとにタップすると、能力が見られる':
    'Kalahkan musuh untuk dapat perlengkapan dari peti. Ketuk item setelah peti terbuka untuk melihat statistiknya.',

  // src/scenes/RunScene.ts
  '今回だけ、伝説の装備を借りてきたよ！\n装備を集めると、いつかこうなる！':
    'Khusus kali ini, kamu meminjam perlengkapan legendaris! Kumpulkan perlengkapan dan suatu hari kamu akan sekuat ini!',
  '起点（番号の石）から矢印の向きに、\n装備が順番に攻撃するよ。これが「連鎖」！\n長くつながるほど、ダメージが大きくなる':
    'Mulai dari Asal (batu bernomor), item menyerang bergiliran mengikuti panah. Itulah "rantai"! Makin panjang rantainya, makin besar damage-nya.',
  '勇者は自動で進んで戦うよ。\n群れをまとめて倒したり、ボスを倒すと\n時間がのびる！':
    'Pahlawanmu maju dan bertarung otomatis. Habisi satu kawanan sekaligus atau kalahkan bos untuk menambah waktu!',
  '残り時間。ふだんは0になるか、\nHPがなくなると終わり':
    'Sisa waktu. Biasanya ekspedisi berakhir saat waktu habis atau HP-mu habis.',
  '残り時間。0になるか、HPがなくなると終わり。\n拾った装備は持ち帰れるよ':
    'Sisa waktu. Ekspedisi berakhir saat waktu habis atau HP-mu habis. Perlengkapan yang kamu pungut boleh dibawa pulang.',
  '止めたいときはここ。撤退もできるよ。\nさあ、伝説の力を見てみよう！':
    'Ketuk di sini untuk jeda. Kamu juga bisa mundur. Sekarang, lihat kekuatan legendaris beraksi!',
  '止めたいときはここ。撤退もできるよ': 'Ketuk di sini untuk jeda. Kamu juga bisa mundur.',
  '{n}周目': 'Putaran {n}',
  次の連鎖: 'Rantai Berikutnya',
  一時停止中: 'Dijeda',
  再開: 'Lanjutkan',
  撤退する: 'Mundur',
  ここまでの戦利品を持ち帰ります: 'Jarahan sejauh ini akan kamu bawa pulang',
  '{region}　{loop}周目　×{speed}': '{region}  Putaran {loop}  ×{speed}',
  '{region}　{loop}周目': '{region}  Putaran {loop}',
  '防御 {n}': 'Pertahanan {n}',
  '連鎖中！': 'Rantai Aktif!',
  '{step}連鎖・{sec}秒': 'Rantai {step} · {sec} dtk',
  'FPS {fps}  敵 {enemies}  粒 {particles}  数字 {numbers}  seed {seed}':
    'FPS {fps}  musuh {enemies}  partikel {particles}  angka {numbers}  seed {seed}',
  '時間 +{sec}': 'Waktu +{sec}',
  '時間 上限': 'Waktu Maks',
  '{loop}周目のボス　{name}': 'Bos Putaran {loop}  {name}',
  'NEW RECORD! 最大連鎖': 'NEW RECORD! Rantai Maks',
  'NEW RECORD! 最大ダメージ': 'NEW RECORD! Damage Maks',
  無効: 'Kebal',
  '激昂！': 'Mengamuk!',
  'アーティファクト！ {name}': 'Artefak! {name}',
  '一網打尽！': 'Sapu Bersih!',
  'ボス撃破！': 'Bos Tumbang!',
  '復活！': 'Bangkit!',
  '再開する（HP全回復・+{sec}秒）': 'Bangkit (HP penuh, +{sec} dtk)',
  '▶ 広告を見て再開（HP全回復・+{sec}秒）': '▶ Tonton Iklan & Bangkit (HP penuh, +{sec} dtk)',
  あきらめる: 'Menyerah',
  '1回のランで1回だけ再開できます': 'Kamu bisa bangkit sekali per ekspedisi',

  // src/scenes/StageSelectScene.ts
  地域を選ぶ: 'Pilih Wilayah',
  '出撃！': 'Berangkat!',
  '出撃する地域を選ぶよ。最初は「草原」。\n奥の地域ほど敵は強いけど、\nいい装備が出やすいよ':
    'Pilih tujuanmu. Mulai dari "Padang Rumput". Makin dalam wilayahnya, makin kuat musuhnya, tapi perlengkapan bagus juga lebih sering jatuh.',
  '準備ができたら「出撃！」': 'Kalau sudah siap, ketuk "Berangkat!"',
  '「出撃！」を押して、冒険に出よう！': 'Ketuk "Berangkat!" untuk memulai petualanganmu!',
  '敵HP×{hp}〜 攻撃×{atk}〜\n装備・ゴールドは出ない':
    'HP Musuh ×{hp}+  Serangan ×{atk}+\nTanpa perlengkapan/emas',
  '敵HP×{hp} 攻撃×{atk}\nレア以上 {pct}%・最高 {top}':
    'HP Musuh ×{hp}  Serangan ×{atk}\nLangka ke atas {pct}% · Hingga {top}',
  '最高{n}周': 'Terbaik: Putaran {n}',
  記録なし: 'Belum ada rekor',
  '最高{n}周 {stars}': 'Terbaik: Putaran {n} {stars}',
  '未到達 {stars}': 'Belum ada rekor {stars}',
  '雑魚: {trend}': 'Musuh: {trend}',
  'ボス: 全地域から毎周ランダム\n最高ダメージ {damage}':
    'Bos: acak dari semua wilayah tiap putaran\nDamage terbaik: {damage}',
  '{n}周目〜': 'Putaran {n}+',
  '装備とゴールドは出ない。到達周回と与えたダメージで自己ベストを目指す':
    'Tanpa perlengkapan atau emas. Kejar rekor terbaik untuk putaran yang dicapai dan damage yang diberikan.',
  '{note}（ボスはアイコンをタップで特徴）': '{note} (ketuk ikon bos untuk melihat cirinya)',
  'ボスは出撃ごとに候補から選ばれます（{n}種）。アイコンをタップで特徴':
    'Tiap ekspedisi memilih bos dari daftar ini ({n}). Ketuk ikon untuk melihat cirinya.',
  魔王城で魔王を倒すと開放: 'Terbuka setelah kamu mengalahkan Raja Iblis di Kastel Raja Iblis',
  前の地域の3周目のボスを倒すと開放:
    'Terbuka setelah kamu mengalahkan bos putaran 3 di wilayah sebelumnya',

  // src/ui/achievementToast.ts
  '実績達成！': 'Pencapaian Terbuka!',
  '新しい見た目！': 'Tampilan Baru!',
  拠点で勇者をタップして着せ替え: 'Ketuk pahlawan di Markas untuk berganti tampilan',

  // src/ui/backpackView.ts
  '必殺 {step}連鎖': 'Spesial #{step}',
  '{step}連鎖 ×{mult}': '#{step} ×{mult}',

  // src/ui/chestReveal.ts
  '売却|sold': 'Terjual',
  広告: 'Iklan',

  // src/ui/discovery.ts

  // src/ui/itemInfo.ts
  上: 'Atas',
  右: 'Kanan',
  下: 'Bawah',
  左: 'Kiri',
  'アーティファクト（能力 ×{x}・出口の数は固定）': 'Artefak (stat ×{x}, jumlah jalur tetap)',
  消耗品: 'Sekali Pakai',
  '{rarity}（能力 ×{x}）': '{rarity} (stat ×{x})',
  '出口: {dirs}': 'Jalur: {dirs}',
  'なし（末端）': 'Tidak ada (ujung rantai)',
  '攻撃力 {atk}（{element}・{area}）': 'Serangan {atk} ({element}, {area})',
  '次への伝達 {s}秒': 'Waktu oper {s} dtk',
  '{n}回攻撃（連鎖数は1つ）': 'Serang ×{n} per mata rantai',
  '会心率 +{pct}%': 'Peluang kritikal +{pct}%',
  '付与: {status} → {element}で{combo}': 'Memberi: {status} → {combo} dengan {element}',
  '付与: {status}': 'Memberi: {status}',
  '{status}を消費して{combo}（×{x}、範囲に拡大）':
    'Menghabiskan {status} untuk {combo} (×{x}, menyebar ke area)',
  '{status}を消費して{combo}（×{x}）': 'Menghabiskan {status} untuk {combo} (×{x})',
  '防御値 +{n}（連鎖が通るたびにその場で加算、連鎖数に数えない）':
    'Pertahanan +{n} (langsung ditambahkan setiap kali rantai lewat; tidak dihitung sebagai mata rantai)',
  '連鎖の始まり。攻撃せず、連鎖数にも数えない':
    'Awal rantai. Tidak menyerang dan tidak dihitung sebagai mata rantai.',
  '付け直し {n}回': 'Ditempa ulang ×{n}',
  '売却 {price}G': 'Harga jual {price}G',
  アーティファクト: 'Artefak',
  起点: 'Asal',
  防御: 'Pertahanan',
  出口: 'Jalur',
  攻撃力: 'Serangan',
  '強化込み {n}': 'Dengan peningkatan {n}',
  全体攻撃: 'Serang Semua',
  '威力 ×{x}': 'Kekuatan ×{x}',
  貫通: 'Tembus',
  '狙いの後ろ {n}体にも同じダメージ': 'Damage sama ke {n} musuh di belakang target',
  連撃: 'Serangan Beruntun',
  会心率: 'Peluang Kritikal',
  連鎖倍率の伸び: 'Kenaikan pengali rantai',
  '×{v}まで×1.2ずつ': '×1,2 per mata rantai sampai ×{v}',
  この環を通る連鎖すべて: 'Semua rantai yang melewati cincin ini',
  吸血: 'Serap Darah',
  '与えたダメージの{pct}%を回復': 'Memulihkan {pct}% dari damage yang diberikan',
  疾風: 'Badai',
  'このあとの装備は連鎖数+{n}': 'Item setelahnya dihitung mata rantai +{n}',
  '5秒間、一撃の30%を毎秒': '30% damage serangan tiap detik selama 5 detik',
  付与: 'Memberi',
  '濡れ・油・凍結をまとめて': 'Basah, Minyak, dan Beku sekaligus',
  次への伝達: 'Waktu Oper',
  '{s}秒': '{s} dtk',
  防御値: 'Pertahanan',
  鳴るたびに加算: 'Ditambahkan setiap kali berbunyi',
  守り: 'Perlindungan',
  連鎖中も無防備にならない: 'Tak pernah lengah saat rantai berjalan',
  この配置: 'Susunan Ini',
  どの起点からも届きません: 'Tak terjangkau Asal mana pun',
  '起点{origin}の{step}連鎖目 ×{mult}': 'Asal {origin}, mata rantai ke-{step} ×{mult}',
  '1ヒット 約{n}': '~{n} per serangan',
  '起点{origin}の連鎖': 'Rantai Asal {origin}',
  連鎖数に数えない: 'Tidak dihitung sebagai mata rantai',
  '{status}を付ける → {element}の攻撃で{combo}（×{x}）':
    'Memberi {status} → serangan {element} memicu {combo} (×{x})',
  '{status}を付ける': 'Memberi {status}',
  '{status}の敵に当てると{combo}（×{x}・範囲に拡大）':
    'Serangan ke musuh {status} memicu {combo} (×{x}, menyebar ke area)',
  '{status}の敵に当てると{combo}（×{x}）': 'Serangan ke musuh {status} memicu {combo} (×{x})',
  ロックする: 'Kunci',

  // src/ui/itemList.ts
  攻撃: 'Serangan',
  倉庫は空です: 'Gudang kosong',
  '★全部': '★Semua',
  '★{rarity}': '★{rarity}',

  // src/ui/kit/chrome.ts
  '出撃 {n}回': 'Ekspedisi: {n}',
  拠点: 'Markas',

  // src/ui/pools.ts
  '会心 {n}': 'Krit {n}',

  // src/ui/shareCard.ts
  '{loop}周目に到達': 'Mencapai Putaran {loop}',
  '最大{step}連鎖': 'Rantai Maks {step}',
  '最大ダメージ {damage}': 'Damage Maks {damage}',

  // src/ui/tutorial.ts
  '光っているところをタップ（{n}/{total}）': 'Ketuk bagian yang menyala ({n}/{total})',
  'タップで次へ（{n}/{total}）': 'Ketuk untuk lanjut ({n}/{total})',
  'スキップ ›': 'Lewati ›',
  // src/scenes/BaseScene.ts (guides for the storage / smith / upgrade tabs)
  '使わない装備は「まとめて売る」や\n「一括売却」で、ゴールドにできるよ':
    'Ubah perlengkapan yang tidak terpakai jadi emas dengan "Pilih & Jual" atau "Jual Massal".',
  '装備をタップすると、能力と\n「売る」などのボタンが出るよ。\n押してみよう':
    'Ketuk item untuk melihat statistiknya dan tombol seperti "Jual". Coba ketuk!',
  '「{upgrade}」を強化してみよう！\n強化は、ずっと残るよ。\n押してみてね':
    'Coba tingkatkan "{upgrade}"!\nPeningkatan berlaku selamanya. Ketuk tombolnya!',
  '拾った装備は「倉庫」に入るよ。\n使わない装備は、売ってゴールドにできる。\n「倉庫」を押してね':
    'Perlengkapan yang kamu pungut masuk ke "Gudang". Perlengkapan yang tidak terpakai bisa dijual jadi emas. Ketuk "Gudang"!',
  'ゴールドが貯まったね！\n「鍛冶屋」で、装備の出口の向きを\n変えられるよ。「鍛冶屋」を押してね':
    'Emasmu sudah terkumpul!\nDi "Pandai Besi", kamu bisa mengubah arah jalur item. Ketuk "Pandai Besi"!',
  'ゴールドが貯まったね！\n「強化」で、勇者をずっと強くできるよ。\n「強化」を押してね':
    'Emasmu sudah terkumpul!\nDengan "Tingkatkan", pahlawanmu jadi lebih kuat selamanya. Ketuk "Tingkatkan"!',
  '「再抽選」は、出口の向きがランダムに。\n「指定」は、好きな向きを選べるよ':
    '"Acak Ulang" mengubah arah jalur secara acak. Dengan "Atur", kamu memilih arahnya sendiri.',
  'この装備をタップして、選んでみよう': 'Ketuk item ini untuk memilihnya.',
  '閃いた必殺技: {names}': 'Ilham: {names}',
  '{el} +{n}（Lv{lv}↑）': '{el} +{n} (Lv{lv}↑)',
  '{el} +{n}（Lv{lv}）': '{el} +{n} (Lv{lv})',
  '熟練 {list}': 'Penguasaan {list}',
  '閃いた！ {name}': 'Dapat ilham! {name}',
  レア順: 'Kelangkaan',
  装備ごと: 'Per item',
  '黄金ゴブリンだ！ 逃げる前に倒せ！': 'Goblin Emas! Kalahkan sebelum kabur!',
  '{name}を貼った！': '{name} dipasang!',
  '黄金ゴブリンを倒した！': 'Goblin Emas dikalahkan!',
  '黄金ゴブリンに逃げられた…': 'Goblin Emas kabur…',
  黄金ゴブリン: 'Goblin Emas',
  'レリックを1つ、盤面のマスへ': 'Pasang satu relik di petak papan',
  いらない: 'Lewati',
  攻撃装備のマスに貼れる: 'Untuk peralatan serang',
  どの装備のマスにも貼れる: 'Untuk peralatan apa pun',
  ここは盤面の外です: 'Itu di luar papan',
  '地域を抜けると、新しい盤面がもらえます': 'Tuntaskan wilayah untuk mendapat papan baru',
  '新しい盤面！': 'Papan baru!',
  配置画面で切り替えられます: 'Ganti papan di layar Susun',
  売れません: 'Tak bisa dijual',
  'アーティファクトは売れません（1種類につき1つ）': 'Artefak tak bisa dijual (satu per jenis)',
  '0から遊ぶ（今のセーブは残る）': 'Main dari nol (save tetap ada)',
  元のセーブに戻る: 'Kembali ke save-mu',
  '0からやり直す': 'Ulang dari nol',
  '0のセーブを消して、最初から始めます。元のセーブはそのままです。':
    'Hapus save nol dan mulai dari awal. Save aslimu tetap seperti semula.',
  やり直す: 'Ulangi',
  'コンボ ×{m}': 'Kombo ×{m}',
  外してから売れます: 'Lepas dulu sebelum dijual',
  アクセサリーはまだありません: 'Belum ada aksesori',
  'アクセサリー（{n}/{max}）': 'Aksesori ({n}/{max})',
  '{route}・コンボ ×{m}': '{route} · Kombo ×{m}',
  '{route}・毎秒 約{d}': '{route} · ~{d}/dtk',
  'アクセサリー！': 'Aksesori!',
  'アクセサリーを手に入れた！': 'Dapat aksesori!',
  'アクセサリー入れがいっぱいなので {n}個を売りました（+{gold}G）':
    'Kotak aksesori penuh: {n} dijual (+{gold}G)',
  '1マスに1つだけ（重ねない）': 'Satu per petak (tanpa tumpuk)',
  重ねた装備がある: 'Ada perlengkapan bertumpuk',
  ほかの盤面で使っている装備: 'Perlengkapan Dipakai di Papan Lain',
  '{boards}で使っています。\n売ると、その盤面から外れます':
    'Dipakai di {boards}.\nKalau dijual, perlengkapan ini keluar dari papan itu.',
  'ほかの盤面で使っている装備です（詳細から売れます）':
    'Dipakai di papan lain (bisa dijual dari detailnya)',
  '盤面の起点（番号の石）から出口（矢印）をたどって、隣のマスの装備へ連鎖がつながります。勇者の足元のゲージ（攻撃間隔）がたまると起点が発火し、つながった装備が順番に攻撃します。起点は盤面に1つだけ。':
    'Rantai berjalan dari Asal (batu bernomor) di papanmu mengikuti jalurnya (panah) ke item di petak sebelah. Saat bar di bawah pahlawan (Jeda Serangan) penuh, Asal terpicu dan item yang tersambung menyerang satu per satu. Hanya satu Asal per papan.',
  盤面と重ね: 'Papan dan Tumpukan',
  '・同じ装備は、同じマスに3つまで重ねられます（深い盤面は4つ）。重ねた装備は下から順に鳴り、上ほど強い（下から×1、×1.5、×2）。矢印の向きは一番上の装備で決まります。':
    '• Item yang sama bisa ditumpuk sampai 3 di satu petak (4 di Papan Dalam). Tumpukan berbunyi dari bawah ke atas, dan makin atas makin kuat (dari bawah ×1, ×1,5, ×2). Arah panah ditentukan item paling atas.',
  '・アーティファクトは重ねられませんが、1つで3回鳴ります（深い盤面は4回）。':
    '• Artefak tidak bisa ditumpuk, tapi satu saja berbunyi 3 kali (4 kali di Papan Dalam).',
  '・敵を倒しても連鎖は途切れません。連鎖の数もそのまま、次の敵へ続きます。':
    '• Mengalahkan musuh tidak memutus rantai. Hitungan rantai berlanjut ke musuh berikutnya.',
  '・地域を抜けると、新しい盤面がもらえます。盤面ごとに形や得意なことがちがいます。並べ方とアクセサリーは盤面ごとに覚えていて、配置画面の上の ◀ ▶ で切り替えます。':
    '• Tuntaskan wilayah untuk mendapat papan baru. Tiap papan punya bentuk dan keunggulan sendiri. Susunan dan aksesori diingat per papan; ganti papan dengan ◀ ▶ di atas layar Susun.',
  '・ほかの盤面で使っている装備には、その盤面の名前の印が付きます。まとめて売る・一括売却・合成の材料には入りません。':
    '• Perlengkapan yang dipakai di papan lain diberi tanda nama papan itu. Perlengkapan itu tidak ikut Pilih & Jual, Jual Massal, atau jadi bahan Fusi.',
  '攻撃力 × レアリティ × 重ね × 連鎖倍率 × コンボ × アクセサリー × 熟練 × 強化 × 追加効果 × 会心（±10%ゆれる）':
    'Serangan × Kelangkaan × Tumpukan × Pengganda rantai × Kombo × Aksesori × Penguasaan × Peningkatan × Bonus × Kritikal (variasi ±10%)',
  '・同じ装備がそろったら重ねる。一番上（×2）には一番強いものを。':
    '• Kalau punya item yang sama, tumpuk. Taruh yang terkuat di paling atas (×2).',
  熟練と必殺技: 'Penguasaan dan Jurus Spesial',
  '・装備が鳴るたびに、その属性の熟練がたまります。Lvが1上がるごとに、その属性の装備のダメージ+3%（Lv30まで）。':
    '• Setiap kali item berbunyi, Penguasaan elemennya bertambah. Tiap naik 1 level, damage perlengkapan elemen itu +3% (sampai Lv30).',
  '・必殺技は全部で{n}つ。はじめは使えず、並びがそろったときに「閃き」で覚えます。閃く確率は、技の属性の熟練Lv×15%。一度覚えた技はずっと使えて、拠点の「図鑑」に載ります。':
    '• Jurus Spesial seluruhnya: {n}. Awalnya belum bisa dipakai; kamu mempelajarinya lewat "ilham" saat susunannya terbentuk. Peluang ilham = level Penguasaan elemen jurus × 15%. Jurus yang sudah dipelajari bisa dipakai selamanya dan masuk "Ensiklopedia" di Markas.',
  アクセサリーとレリック: 'Aksesori dan Relik',
  '・アクセサリーは、敵が落とす装備にまれについてきます（ボス・金ぴか・黄金ゴブリンは出やすい）。盤面のふちの枠に付けると、条件に合う連鎖で、連鎖全体のコンボ倍率が上がります（上限×20）。':
    '• Aksesori kadang ikut jatuh bersama perlengkapan dari musuh (lebih sering dari bos, elite keemasan, dan Goblin Emas). Pasang di slot tepi papan; kalau syaratnya terpenuhi, pengganda kombo seluruh rantai naik (maks. ×20).',
  '・ボスを倒すたびに、レリックを3つから1つ選んで盤面のマスに置けます。そのマスの装備に効き、そのランの間だけ続きます。':
    '• Setiap kali mengalahkan bos, pilih 1 dari 3 relik dan taruh di petak papan. Relik itu memperkuat item di petak tersebut sampai ekspedisi selesai.',
  '・ランの途中で、まれに黄金ゴブリンが現れます。逃げられる前に倒すと、レア以上の装備を4つ落とします。':
    '• Sesekali Goblin Emas muncul di tengah ekspedisi. Kalahkan sebelum kabur, dan ia menjatuhkan 4 perlengkapan Langka ke atas.',
  '・挑戦では、熟練・アクセサリー・レリック・黄金ゴブリンはなし。みんな同じ条件で競います。∞では黄金ゴブリンは出ず、アクセサリーも落ちません。':
    '• Di Tantangan tidak ada Penguasaan, aksesori, relik, atau Goblin Emas: semua bersaing dengan syarat sama. Di ∞, Goblin Emas tidak muncul dan aksesori tidak jatuh.',
  '下は倉庫。装備を少し押さえてから、\n盤面へドラッグして置こう':
    'Gudangmu ada di bawah. Tahan sebentar sebuah item, lalu seret ke papan.',
  '起点（番号の石）から、矢印の向きに\nつながった装備が順番に攻撃するよ。\n起点は盤面に1つだけ！':
    'Mulai dari Asal (batu bernomor), item yang tersambung menyerang bergiliran mengikuti panah. Hanya satu Asal per papan!',
  '同じ装備は、同じマスに重ねられる。\n上に重ねたものほど強いよ！':
    'Item yang sama bisa ditumpuk di satu petak. Makin atas, makin kuat!',
  '盤面のふちは、アクセサリーの枠。\n手に入れたら、ここに付けよう':
    'Tepi papan adalah slot aksesori. Kalau sudah dapat, pasang di sini.',
  '地域を抜けると、新しい盤面がもらえる。\nもらった盤面は、ここで切り替えよう':
    'Tuntaskan wilayah untuk mendapat papan baru. Ganti papan di sini.',
  '盤面と消耗品枠の {n}個をすべて倉庫に戻します。':
    'Kembalikan semua isi papan dan slot sekali pakai ke Gudang (×{n}).',
  起点石は盤面に1つだけ: 'Hanya satu Batu Asal per papan',
  '拾った装備は、拠点の「配置」で\n盤面に置くと強くなるよ':
    'Taruh perlengkapan yang kamu temukan di papan lewat "Susun" di Markas agar makin kuat.',
  '装備を拾ったら、拠点の「配置」で\n盤面に置くと強くなるよ':
    'Kalau dapat perlengkapan, taruh di papan lewat "Susun" di Markas agar makin kuat.',
  'ここは倉庫。盤面に置いていない\n装備と消耗品が入っているよ':
    'Ini Gudang. Perlengkapan dan item sekali pakai yang tidak ada di papan disimpan di sini.',
  '装備は「配置」で盤面に並べるよ。\n拾った装備もここで置ける。\n「配置」を押してね':
    'Susun perlengkapan di papanmu lewat "Susun". Perlengkapan yang kamu pungut juga ditaruh di sana. Ketuk "Susun"!',
  '盤面の装備は、起点（番号の石）から\n矢印の向きに順番に攻撃するよ。\nこれが「連鎖」！':
    'Item di papanmu menyerang bergiliran, mulai dari Asal (batu bernomor) mengikuti panah. Itulah "rantai"!',
  起点が盤面にありません: 'Tidak ada Asal di papanmu',
  盤面にある限り: 'Selama ada di papanmu',
  '装備中・ロック中・ほかの盤面で使用中・アーティファクトは売りません':
    'Item yang dipakai, terkunci, ada di papan lain, dan Artefak tidak akan dijual',
  '使える数: {n}つ（装備中・ロック中・ほかの盤面で使用中は除く）':
    'Bisa dipakai: ×{n} (tidak termasuk yang dipakai, terkunci, atau ada di papan lain)',
  挑戦用の配置: 'Susunan Tantangan',
  この配置で挑戦できます: 'Susunan ini siap untuk Tantangan',
  'ふだんの盤面から組みました。並べ方を詰めよう':
    'Disusun dari papan biasamu. Sekarang sempurnakan susunannya!',
  ふだんの盤面から組む: 'Salin Papan Biasa',
  '今の挑戦用の配置を、ふだんの標準の盤面をもとに組み直します。\n制限に合わない装備は、使える装備に入れ替えます。':
    'Susun ulang susunan Tantangan berdasarkan Papan Standar biasamu.\nPerlengkapan yang melanggar aturan diganti dengan perlengkapan yang diizinkan.',
  配置する: 'Atur Susunan',
  挑戦用の配置を組んでください: 'Susun susunan Tantangan dulu',
  配置が制限に合っていません: 'Susunanmu tidak memenuhi aturan',
  '勇者の足元のゲージがたまるたびに、\n起点が発火して、連鎖が始まるよ':
    'Setiap kali bar di bawah pahlawan penuh, Asal terpicu dan rantai pun dimulai.',
  'マスをタップして仕掛けを置く・外す（残り: {list}）':
    'Ketuk petak untuk memasang atau melepas mekanisme (sisa: {list})',
  '発火 {k}/{n} ▶': 'Tembakan {k}/{n} ▶',
  仕掛け中: 'Memasang',
  仕掛け: 'Mekanisme',
  'もう置ける仕掛けがありません（置いたマスをタップで外す）':
    'Mekanisme sudah habis (ketuk yang terpasang untuk melepasnya)',
  回転マス: 'Petak Putar',
  切り替えマス: 'Petak Wesel',
  ワープ: 'Warp',
  '{n}回 {step}連鎖': '{n}× {step} Rantai',
  '試作: 拾って組む': 'Uji: Rakit Sambil Jalan',
  '起点石1つと、装備{n}つまでを持ち込む。\n残りはランの中で拾って、盤面に置いていく':
    'Bawa 1 Batu Asal dan hingga {n} perlengkapan.\nSisanya dipungut saat jalan dan ditaruh di papan',
  持込: 'Bawa',
  出発: 'Berangkat',
  試作のランは何も持ち帰りません: 'Uji coba tidak menyimpan apa pun',
  '最大連鎖 {n}': 'Rantai Maks {n}',
  '最大ダメージ {n}': 'Damage Maks {n}',
  '拾った装備 {n}': 'Perlengkapan Dipungut {n}',
  配置タイム: 'Waktu Atur',
  '手札から盤面へ。並べ替えもできる': 'Dari tangan ke papan. Bisa diatur ulang juga',
  'ゴミ箱（ここへ運ぶと捨てる）': 'Tempat Sampah (seret ke sini untuk buang)',
  そこには入らない: 'Tidak muat di sana',
};
