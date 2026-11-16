// English: screens and messages. Key: Japanese source string → value: translation
// (keep {placeholders} and the meaning of any '|context' key)
import type { Dict } from '../types';

export const UI: Dict = {
  // src/core/challenge.ts
  'レアリティは{rarity}まで（起点は問わない）': 'Rarity up to {rarity} (Origins: any)',
  アーティファクトは使えない: 'No Artifacts',
  '起点は{n}つまで': 'Max Origins: {n}',
  '攻撃装備は {elements} だけ': 'Attack gear: {elements} only',
  '・|sep': ', ',
  防具は使えない: 'No armor',
  '強化と★は使わない（勇者は最初の強さ）': 'No upgrades or ★ bonuses (hero at base strength)',
  'アーティファクト（{item}）は使えない': 'Artifacts not allowed ({item})',
  '{rarity}より上の装備（{item}）がある': 'Gear above {rarity} ({item})',
  '使えない属性の装備（{item}）がある': 'Gear with a banned element ({item})',
  '使えない種類の装備（{item}）がある': 'Gear of a banned type ({item})',
  '起点が{n}つある（{max}つまで）': 'Origins: {n} (max {max})',
  起点がない: 'No Origin',

  // src/core/cosmetics.ts
  蒼のマント: 'Blue Cape',
  白銀の鎧: 'Silver Armor',
  黄金の鎧: 'Golden Armor',
  ちびドラゴン: 'Baby Dragon',
  銅のメダル: 'Bronze Medal',
  銀の王冠: 'Silver Crown',
  金の王冠: 'Gold Crown',

  // src/core/diagnose.ts
  '必殺技の並びがそろう！': 'Completes a Special Move sequence!',
  '何か特別なことが起きそうな並び…': 'Something special might happen with this order…',
  状態異常のコンボが増える: 'More status combos',
  '{n}連鎖までのびる': 'Chain grows to {n} links',
  'もっと強い装備（レアリティ・攻撃力）に替える': 'Swaps in stronger gear (rarity, Attack)',
  空いているマスも連鎖に使う: 'Puts empty cells to use in the chain',
  '強い装備が後ろ（倍率が高い）に来る': 'Moves strong gear to later links (higher multiplier)',
  '「{a}」と「{b}」を入れ替える': 'Swap "{a}" and "{b}"',
  '「{a}」を倉庫の「{b}」に置きかえる': 'Replace "{a}" with "{b}" from Storage',
  '空いているマスに「{item}」を置く': 'Place "{item}" in an empty cell',
  'どの起点からも届いていない装備が{n}個': 'Items no Origin reaches: {n}',
  '起点から矢印をたどって、つながる向きに置き直そう（光っているマス）':
    'Follow the arrows from the Origins and move these so they connect (glowing cells)',
  '起点{n}が{step}連鎖で止まっている': "Origin {n}'s chain stops at link {step}",
  '長くつなぐほど後ろの装備の倍率が上がる。出口の向きを鍛冶屋で変えるのも手':
    'Longer chains give later links bigger multipliers. You can also change exit directions at the Smith.',

  // src/core/economy.ts
  見つかりません: 'Not found',
  消耗品は合成できません: "Consumables can't be fused",
  これ以上のレアリティはありません: 'Already at the highest rarity',
  '装備中は合成に使えません（外してから）': "Equipped items can't be fused (remove it first)",
  ロック中は合成に使えません: "Locked items can't be fused",
  '同じ装備があと{n}つ必要': 'Need {n} more of the same item',
  '{cost}G 必要': 'Need {cost}G',

  // src/core/presets.ts
  '編成{n}': 'Set {n}',

  // src/core/ranking.ts
  '挑戦 第{n}回': 'Challenge #{n}',
  'エンドレス {month}': 'Endless {month}',
  '上位1%': 'Top 1%',
  '上位10%': 'Top 10%',
  '上位50%': 'Top 50%',
  参加: 'Joined',
  '{season} {title}': '{season} {title}',

  // src/core/shareText.ts
  '挑戦「{name}」でスコア {score}！': 'Scored {score} in the "{name}" Challenge!',
  'エンドレスで{loop}周目に到達！': 'Reached Loop {loop} in Endless!',
  '{region}で{loop}周目に到達！': 'Reached Loop {loop} in {region}!',
  '最大{step}連鎖・最大ダメージ {damage}': 'Max chain {step} · Max damage {damage}',

  // src/platform/monetization.ts
  '広告（テスト表示）': 'Ad (test)',
  本番ではここに動画広告が流れます: 'A video ad plays here in the real game',

  // src/scenes/BaseScene.ts
  基本: 'Basics',
  '起点から出口（矢印）をたどって、隣の装備へ連鎖がつながります。勇者の足元のゲージ（攻撃間隔）がたまると起点が順に発火し、つながった装備が順番に攻撃します。':
    'A chain runs from an Origin along its exits (arrows) into the next items. When the gauge under the hero (Attack Interval) fills, the Origins fire in turn and the linked items attack one after another.',
  '1回のランは30秒。走っている間は時間が止まり、敵と戦っている間だけ減ります。':
    'A run lasts 30 seconds. The timer stops while the hero walks and only runs down during fights.',
  '時間は、群れを1回の連鎖でまとめて倒す（一網打尽）と+1.5秒、ボスを倒すと+8秒、時の砂で+5秒のびます。上限はないので、倒し続けるほど長く戦えます。':
    "Wiping out a whole pack with one chain (a Wipeout) adds 1.5s, defeating a boss adds 8s, and Sands of Time adds 5s. There's no cap, so the more you defeat, the longer you fight.",
  ダメージの決まり方: 'How Damage Works',
  '攻撃力 × レアリティ × 連鎖倍率 × コンボ × 強化 × 追加効果 × 会心（±10%ゆれる）':
    'Attack × Rarity × Chain multiplier × Combo × Upgrades × Bonuses × Critical (±10% variance)',
  '・レアリティ：コモン×1、レア×1.5、エピック×2.5、レジェンド×4':
    '• Rarity: Common ×1, Rare ×1.5, Epic ×2.5, Legendary ×4',
  '・連鎖倍率：1連鎖ごとに×1.2、6連鎖目で上限×2.5（循環の環を通ると上限×4.0）':
    '• Chain multiplier: ×1.2 per link, capped at ×2.5 by link 6 (cap ×4.0 through the Ouroboros Ring)',
  '・コンボ：濡れ＋雷で感電×3、油＋炎で爆発×2（周りも巻き込む）、凍結＋打撃で粉砕×2.5。コンボでなくても、状態が付いた敵には×1.2':
    '• Combos: Wet + Thunder = Shock ×3, Oil + Fire = Explosion ×2 (hits nearby enemies too), Frozen + Blunt = Shatter ×2.5. Even without a combo, enemies with a status take ×1.2',
  '・強化：拠点の「攻撃倍率」': '• Upgrades: "Attack Multiplier" at Base',
  '・会心：8%でダメージ×2（聖剣・会心の追加効果・幸運の硬貨で上がる）':
    '• Critical: 8% chance of ×2 damage (raised by the Holy Sword, the Critical bonus and the Lucky Coin)',
  ダメージを伸ばすコツ: 'Tips for More Damage',
  '・配置画面の「約」の数字を見ながら並べ替える。ルートの番号を選ぶと、そのルート1本の推定ダメージが出ます。':
    '• Rearrange while watching the "~" numbers on the Loadout screen. Pick a route number to see that route\'s estimated damage alone.',
  '・コンボを作る。状態を付ける装備（水竜の瓶・雨雲の杖・油瓶・氷の剣・氷の杖）の後ろに、組む属性（雷・炎・打撃）をつなぐ。状態は5秒で消えます。':
    '• Make combos. Link the matching element (Thunder, Fire, Blunt) after a status item (Water Dragon Flask, Raincloud Staff, Oil Flask, Ice Sword, Frost Staff). Statuses wear off after 5 seconds.',
  '・光と闇を交互につなぐと、コンボが続く。浄化（勇者のHP回復）と封印（敵の攻撃が遅くなる）。風は毒の敵に毒を重ね、5重で毒爆。':
    '• Link Light and Dark in turn to keep the combos going: Purify (heals the hero) and Seal (slows enemy attacks). Wind stacks Poison on Poisoned enemies; at 5 layers, Venom Burst.',
  '・2つの起点の線を同じ連鎖数でシンクロさせると、その先にボーナス。起点石の種類は、その起点から伸びる線にだけ効きます。':
    "• Sync the lines from 2 Origins at the same link count to get a bonus from there on. An Origin Stone's type only affects the lines that start from it.",
  '・強い装備ほど後ろ（6連鎖目以降）に置く。前のほうは軽い装備や状態付与に。':
    '• Put your strongest gear late in the chain (link 6 and beyond). Use early links for light gear and status items.',
  '・レアリティが一番効きます。奥の地域ほどレア以上が出やすい。':
    '• Rarity matters most. Deeper regions drop Rare or better more often.',
  '・装備の左下の✦は追加効果。先駆け（3連鎖目まで強い）は短い連鎖に、締め（6連鎖目以降強い）は長い連鎖に向きます。':
    "• The ✦ at an item's bottom left marks a bonus. Vanguard (strong up to link 3) suits short chains; Finisher (strong from link 6) suits long chains.",
  必殺技: 'Special Moves',
  '連鎖のルートで、決まった装備が順に3つつながって通ると、3つ目の一撃が必殺技になります（ダメージ×2.5、勇者が大きく踏み込む）。配置画面では、そのマスに「必殺」と出ます。':
    'When a chain passes through 3 specific items in order, the 3rd hit becomes a Special Move (×2.5 damage, and the hero lunges in). On the Loadout screen, that cell shows "Special".',
  '・必殺技は全部で{n}つ。初めて出すと「発見」と出て、拠点の「図鑑」に発動条件が載ります。まだ見つけていない技は、図鑑でヒントだけ見られます。':
    '• Special Moves to find: {n}. The first time you pull one off, you\'ll see "Special Move found!" and its recipe goes into the "Codex" at Base. For moves you haven\'t found yet, the Codex shows only a hint.',
  短い連鎖と長い連鎖: 'Short vs. Long Chains',
  '・次の発火までの待ちは、直前の連鎖で動いた装備の数に比例します（防具も数えます）。短い連鎖は回転が速く、長い連鎖は一撃が大きい。':
    '• The wait before the next firing grows with how many items went off in the last chain (armor counts too). Short chains cycle fast; long chains hit big.',
  '・連鎖中は無防備（被ダメージ×1.5）。ただし起点のあと、装備が3つ動くまでは守りが残ります（防具も数えます）。':
    "• You're unguarded during a chain (×1.5 damage taken), but you stay guarded until 3 items after the origin have gone off (armor counts too).",
  '・無防備中に大きく被弾すると「よろめき」、残りの連鎖が途切れます。防御装備で耐えるか、不落の城門を置くと防げます。':
    '• A big hit while unguarded leaves you "Staggered!" and cuts off the rest of the chain. Hold out with defense gear, or place the Aegis Gate to prevent it.',
  地域と敵: 'Regions & Enemies',
  '・草原 → 洞窟 → 城壁の順に敵が一気に強くなり、そのぶんレアな装備が出やすくなります。3周目のボスを倒すと次の地域が開きます。':
    '• Enemies get much tougher from Grassland → Cave → Ramparts, but rarer gear drops more often too. Defeat the loop 3 boss to unlock the next region.',
  '・群れとボスは出撃ごとに変わります。精鋭（硬い・速い・金ぴか）が混ざることも。金ぴかは必ずレア以上を2個落とします。':
    '• Packs and bosses change every run. Elites (Tough, Swift, Golden) may show up. Golden elites always drop 2 items of Rare or better.',
  '・アーティファクトはごくまれに出る特別な装備です。':
    '• Artifacts are special gear that drops very rarely.',
  ご褒美とプレミアム: 'Rewards & Premium',
  '・広告を見ると、ご褒美がもらえます：結果画面で「戦利品を2倍にする」（1日3回、同じ数だけ抽選し直してもう1セット）、鍛冶屋で「無料で再抽選」（1日3回）、力尽きたときに「再開」（1回のランで1回、HP全回復＋10秒）。':
    '• Watch an ad to get a reward: "Double Loot" on the results screen (3 times a day; rolls one more set of the same size), "Free Reroll" at the Smith (3 times a day), and "Revive" when you fall (once per run; full HP + 10s).',
  '・プレミアム（{price}、買い切り）なら、広告を見なくても同じご褒美を受け取れます。設定から買えます。':
    '• With Premium ({price}, one-time purchase), you get the same rewards without watching ads. Buy it in Settings.',
  '倉庫・鍛冶屋・合成': 'Storage, Smith & Fusing',
  '・消耗品枠は、入れた消耗品を覚えています。ランで使い切ったら、倉庫に同じものがあれば自動で入れ直します（ないときは枠にうすく「自動」と出て、手に入ったら入ります）。手で外すと覚えるのをやめます。':
    '• Consumable slots remember what you put in them. When you use one up in a run, the same item is refilled from Storage automatically (if you have none, the slot shows a faint "Auto" and fills once you get one). Remove it by hand to stop this.',
  '・どこを変えれば強くなるか迷ったら、配置画面の「診断」。入れ替え・置きかえ・空きマスを実際に試して、伸びる手を教えてくれます（並べ替えは自分で。「場所を見る」で関係するマスが光ります）。':
    '• Not sure what to change? Tap "Advice" on the Loadout screen. It tries swaps, replacements and empty cells, and shows what helps (you rearrange yourself; "Show Where" lights up the cells).',
  '・配置画面の上の1〜5で編成を切り替えられます（凍結型・炎上型などを作り分け）。編成は並べ方の記録だけで、装備は倉庫に置いたまま。今の編成をもう一度押すと名前を変えられます。ほかの編成で使っている装備には「編成○」の印が付き、一括売却などでは売られません。':
    '• Switch Sets with 1-5 at the top of the Loadout screen (e.g. a Frozen build and a Fire build). A Set only saves the layout; the gear stays in Storage. Tap the current Set again to rename it. Gear used in another Set is marked "Set ○" and won\'t be sold by Bulk Sell and the like.',
  '・倉庫の「自動売却」で、ラン後に戦利品から決まったレアリティ以下を自動で売れます（✦付きを残すかも選べます）。':
    '• With "Auto-Sell" in Storage, loot at or below a chosen rarity is sold automatically after each run (you can choose to keep ✦ items).',
  '・倉庫があふれると出撃できません。「一括売却」「まとめて売る」で整理しましょう。大事な装備は詳細カードでロックすると売れなくなります。':
    '• You can\'t start a run while Storage is overflowing. Clear space with "Bulk Sell" or "Select & Sell". Lock important gear on its details card so it can\'t be sold.',
  '・鍛冶屋では出口の向きを付け直せます（数は変わりません）。レアリティが高いほど料金も上がります。':
    '• At the Smith you can reforge exit directions (the number of exits stays the same). Higher rarities cost more.',
  '・同じ装備・同じレアリティを3つ集めると、鍛冶屋の「合成」（倉庫の詳細カードからも）で1つ上のレアリティを狙えます。成功率はコモン→レア80%（20G）、レア→エピック50%（100G）、エピック→レジェンド25%（500G）。失敗すると、材料と同じレアリティのランダムな装備が1つ手に入ります。追加効果と出口の向きは新しく決まります。':
    '• Collect 3 of the same item at the same rarity and use "Fuse" at the Smith (or on a details card in Storage) to aim for the next rarity. Success rates: Common→Rare 80% (20G), Rare→Epic 50% (100G), Epic→Legendary 25% (500G). If it fails, you get 1 random item of the same rarity. Bonuses and exit directions are rolled anew.',
  設定: 'Settings',
  ヘルプ: 'Help',
  ランキング: 'Ranking',
  挑戦: 'Challenge',
  倉庫: 'Storage',
  鍛冶屋: 'Smith',
  図鑑: 'Codex',
  出撃: 'Go!',
  '倉庫があふれています。売却するまで出撃できません':
    'Storage is full. Sell some items to start a run.',
  冒険の記録: 'Adventure Log',
  '出撃|stat': 'Runs',
  '{n}回': '{n}',
  最大連鎖: 'Max Chain',
  '{n}連鎖': '{n}',
  最大ダメージ: 'Max Damage',
  開放した地域: 'Regions Unlocked',
  '{region} {n}周': '{region} Loop {n}',
  '最高到達: {list}': 'Best: {list}',
  '　|sep': '  ·  ',
  まだありません: 'None yet',
  ロック中: 'Locked',
  '売る {price}G': 'Sell {price}G',
  編成で使っている装備: 'Gear Used in a Set',
  '{presets}で使っています。\n売ると、その編成のマスは空きになります':
    'Used in {presets}.\nIf you sell it, its cell in that Set becomes empty.',
  売る: 'Sell',
  アーティファクトを売る: 'Sell Artifact',
  '{item}を{price}Gで売ります': 'Sell {item} for {price}G?',
  ロック中の装備は売れません: "Locked gear can't be sold",
  'ほかの編成で使っている装備です（詳細から売れます）':
    'Used in another Set (you can sell it from its details)',
  '売るものをタップで選ぶ（もう一度で外す・長押しで詳細）':
    'Tap items to select them (tap again to unselect, hold for details)',
  '自動売却：オフ': 'Auto-Sell: Off',
  '自動売却：{rarity}（✦は残す）': 'Auto-Sell: {rarity} (keep ✦)',
  '自動売却：{rarity}': 'Auto-Sell: {rarity}',
  '自動売却：{rarity}以下（✦は残す）': 'Auto-Sell: {rarity} or lower (keep ✦)',
  '自動売却：{rarity}以下': 'Auto-Sell: {rarity} or lower',
  '{n}個を売ります（+{gold}G）': 'Items to sell: {n} (+{gold}G)',
  '{n}個を売る +{gold}G': 'Sell ×{n} +{gold}G',
  選んで売る: 'Select Items',
  やめる: 'Cancel',
  まとめて売る: 'Select & Sell',
  '{rarity}  {n}個 +{gold}G': '{rarity}  ×{n} +{gold}G',
  '{rarity}以下  {n}個 +{gold}G': '{rarity} or lower  ×{n} +{gold}G',
  '{rarity}を一括売却': 'Bulk Sell: {rarity}',
  '{rarity}以下を一括売却': 'Bulk Sell: {rarity} or lower',
  '消耗品  {n}個 +{gold}G': 'Consumables  ×{n} +{gold}G',
  消耗品を一括売却: 'Bulk Sell: Consumables',
  '✦付きは残す：オン': 'Keep ✦ Gear: On',
  '✦付きは残す：オフ': 'Keep ✦ Gear: Off',
  一括売却: 'Bulk Sell',
  '装備中・ロック中・編成で使用中・アーティファクトは売りません':
    'Equipped, locked and Set gear and Artifacts are never sold',
  向きの付け直し: 'Reforge',
  合成: 'Fuse',
  この装備は向きを付け直せません: "This item can't be reforged",
  装備中: 'Equipped',
  付け直す装備を選んでください: 'Choose an item to reforge',
  '出口の数は変わらず、方向だけが変わります':
    'The number of exits stays the same; only their directions change',
  '付け直し {n}回（毎回 料金×1.5）': 'Reforged ×{n} (cost ×1.5 each time)',
  '再抽選 {gold}G': 'Reroll {gold}G',
  ゴールドが足りません: 'Not enough gold',
  '無料で再抽選（今日あと{n}回）': 'Free Reroll ({n} left today)',
  '▶ 広告を見て無料で再抽選（今日あと{n}回）': '▶ Watch Ad: Free Reroll ({n} left today)',
  '指定: {n}方向を選ぶ': 'Custom: pick exits ({n})',
  '指定 {gold}G': 'Custom {gold}G',
  '方向を{n}つ選んでください': 'Pick the exit directions ({n})',
  強化: 'Upgrade',
  '最大HP {hp}（★{stars}で+{bonus}込み）': 'Max HP {hp} (incl. +{bonus} from ★{stars})',
  '最大HP {hp}': 'Max HP {hp}',
  '攻撃間隔 {sec}秒': 'Attack Interval {sec}s',
  '攻撃倍率 ×{mult}（★{stars}で+{bonus}%込み）':
    'Attack Multiplier ×{mult} (incl. +{bonus}% from ★{stars})',
  '攻撃倍率 ×{mult}': 'Attack Multiplier ×{mult}',
  '出撃 {sec}秒（延長込みの上限 {max}秒）': 'Run Time {sec}s (max {max}s with extensions)',
  '出撃 {sec}秒': 'Run Time {sec}s',
  '{w}×{h}マス': '{w}×{h} grid',
  '{n}枠': '{n} slots',
  '{n}個': 'Capacity {n}',
  最大: 'MAX',
  切替: 'Toggle',
  音量: 'Volume',
  ゲームスピード: 'Game Speed',
  '検証用。×2 なら30秒のランが15秒で終わります':
    'For testing. At ×2, a 30-second run ends in 15 seconds.',
  'プレミアム（購入済み）': 'Premium (Owned)',
  'プレミアム {price}': 'Premium {price}',
  広告なしでご褒美を受け取れます: 'You get rewards without ads',
  'プレミアムになりました！': "You're now Premium!",
  購入を復元: 'Restore Purchases',
  購入を復元しました: 'Purchases restored',
  復元できる購入はありません: 'No purchases to restore',
  '遊び方・強くなるコツ': 'How to Play & Tips',
  案内をもう一度: 'Replay Tutorial',
  '各画面で、案内がもう一度出ます': "Each screen's tutorial will show again",
  振動: 'Vibration',
  '画面揺れ・光': 'Screen Shake & Flash',
  言語: 'Language',
  '{auto}（{lang}）': '{auto} ({lang})',
  自動: 'Auto',
  端末の言語: 'device language',
  'オフ（売らない）': "Off (don't sell)",
  コモンを売る: 'Sell Common',
  レア以下を売る: 'Sell Rare or lower',
  エピック以下を売る: 'Sell Epic or lower',
  自動売却: 'Auto-Sell',
  'ラン後に戦利品から売ります。消耗品・アーティファクトは売りません':
    'Sells from your loot after each run. Consumables and Artifacts are never sold.',
  'ようこそ！\n勇者が自動で進んで、敵と戦うゲームだよ。\nまずは「出撃」を押してみよう！':
    'Welcome!\nYour hero marches on and fights enemies all on their own. First, try tapping "Go!"',
  '装備は「配置」でバックパックに並べるよ。\n拾った装備もここで置ける。\n「配置」を押してね':
    'You arrange gear in your backpack under "Loadout". Gear you pick up goes there too. Tap "Loadout"!',
  '鍛冶屋では、装備の出口の向きを変えたり、\n同じ装備を3つ集めて「合成」して\n上のレアリティを狙えるよ':
    'At the Smith, you can change the directions of an item\'s exits, or "Fuse" 3 of the same item to aim for a higher rarity.',
  '合成 {gold}G': 'Fuse {gold}G',
  '合成 {have}/3': 'Fuse {have}/3',
  '{item}（{rarity}）を3つ使って、{target}の{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    'Use 3 × {item} ({rarity}) to aim for {to} {target} ({gold}G).\nSuccess rate: {rate}%. If it fails, you get 1 random {rarity} item.',
  '{item}（{rarity}）を3つ使って、{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    'Use 3 × {item} ({rarity}) to aim for {to} ({gold}G).\nSuccess rate: {rate}%. If it fails, you get 1 random {rarity} item.',
  合成する: 'Fuse',
  ロック: 'Locked',
  '{n}つ': '×{n}',
  合成する装備を選んでください: 'Choose an item to fuse',
  '同じ装備・同じレアリティを3つで、1つ上のレアリティに':
    '3 of the same item and rarity → the next rarity up',
  '「○つ」の印は、3つ以上揃っている装備です': 'A "×○" mark means you have 3 or more of that item',
  '{rarity} ×3 → {target}の{to} ×1': '{rarity} ×3 → {to} {target} ×1',
  '{rarity} ×3 → {to} ×1': '{rarity} ×3 → {to} ×1',
  '使える数: {n}つ（装備中・ロック中・ほかの編成で使用中は除く）':
    'Usable: ×{n} (not counting equipped, locked, or used in other Sets)',
  '成功率 {rate}%': 'Success rate {rate}%',
  '失敗すると{rarity}のランダムな装備が1つ（追加効果・向きは新しく）':
    'If it fails: 1 random {rarity} item (new bonuses and exits)',
  '合成する {gold}G': 'Fuse {gold}G',
  合成できません: "Can't Fuse",
  '合成中…': 'Fusing…',
  タップで閉じる: 'Tap to close',
  '合成成功！': 'Success!',
  '失敗…': 'Failed…',
  実績: 'Achievements',
  '2週替わりの挑戦': 'Biweekly Challenge',
  'エンドレス（月ごと）': 'Endless (Monthly)',
  挑戦はまだ始まっていません: "The Challenge hasn't started yet",
  '（初めて記録を送るときに決まります）': '(set when you first submit a score)',
  'あなたの名前: {name}': 'Your name: {name}',
  変える: 'Change',
  つながりませんでした: "Couldn't connect",
  'シーズンの終わりに: 上位1% {top1}G＋称号 / 上位10% {top10}G＋称号 / 上位50% {top50}G＋称号 / 参加 {joined}G':
    'At season end: Top 1% {top1}G + title / Top 10% {top10}G + title / Top 50% {top50}G + title / Joined {joined}G',
  'ランキングは、サーバーの準備ができたら開きます': 'Rankings open once the server is ready',
  '挑戦が始まったら、ここに順位が出ます': 'Ranks will appear here once the Challenge starts',
  '読み込み中…': 'Loading…',
  'あなた: {rank}位 / {total}人（上位{pct}%）': 'You: #{rank} of {total} (top {pct}%)',
  'まだ記録がありません（参加 {total}人）': 'No score yet (players: {total})',
  '{loop}周・{damage}': 'Loop {loop} · {damage}',
  まだ誰も記録していません: 'No scores yet',
  '{season}: {rank}位 / {total}人（{band}）  +{gold}G':
    '{season}: #{rank} of {total} ({band})  +{gold}G',
  '新しい装飾品: {list}': 'New cosmetics: {list}',
  ランキングの報酬: 'Ranking Rewards',
  受け取る: 'Claim',
  装飾品: 'Cosmetics',
  戻る: 'Back',
  '挑戦で上位に入るともらえる、見た目だけの装飾品':
    'Cosmetics for top Challenge ranks. They only change your look.',
  冒険者: 'Adventurer',
  挑戦で上位に入るともらえます: 'Earned by ranking high in a Challenge',
  勇者の色: 'Hero Colors',
  いつもの色: 'Default',
  ペット: 'Pet',
  なし: 'None',
  '名前の飾り（ランキング）': 'Name Badge (Ranking)',
  使用中: 'In Use',
  '{band}でもらえる': '{band} reward',
  '舞台: {region}': 'Stage: {region}',
  '・{rule}': '• {rule}',
  'リリースから2週間後に開放！': 'Opens 2 weeks after launch!',
  '開放まで あと{n}日': 'Opens in {n}d',
  '2週間ごとに、地域と制限が入れ替わります。': 'Every 2 weeks, the region and rules change.',
  '全員が同じ敵の並びに、自分の装備で挑み、合計ダメージを競います。':
    'Everyone faces the same enemies with their own gear and competes for total damage.',
  '強化と★は使わず、勇者は最初の強さ。並べ方の腕が勝負です。':
    "No upgrades or ★ bonuses: the hero is at base strength. It's all about how you arrange.",
  '装備とゴールドは出ません。': 'No gear or gold drops.',
  '残り {days}日{hours}時間': '{days}d {hours}h left',
  '自己ベスト {score}': 'Best: {score}',
  まだ挑戦していません: 'Not tried yet',
  '装備 {n}個・起点 {origins}個': 'Gear: {n} · Origins: {origins}',
  まだ組んでいません: 'Not built yet',
  挑戦用の編成: 'Challenge Set',
  この編成で挑戦できます: 'This Set is ready for the Challenge',
  'ふだんの編成から組みました。並べ方を詰めよう':
    'Built from your Loadout. Now fine-tune the layout!',
  ふだんの編成から組む: 'Build from Loadout',
  '今の挑戦用の編成を、ふだんの編成をもとに組み直します。\n制限に合わない装備は、同じ種類の使える装備に入れ替えます。':
    'Rebuild your Challenge Set from your Loadout.\nGear that breaks the rules is swapped for allowed gear of the same kind.',
  組み直す: 'Rebuild',
  '出撃できる形まで組むだけ。並べ方を詰めるのはあなた次第':
    'It only builds a setup you can run. Fine-tuning is up to you.',
  編成する: 'Edit Set',
  挑戦する: 'Start!',
  挑戦用の編成を組んでください: 'Build your Challenge Set first',
  編成が制限に合っていません: "Your Set doesn't meet the rules",
  '達成 {done} / {total}': 'Completed {done} / {total}',
  達成: 'Done',
  '見つけた必殺技 {found} / {total}': 'Special Moves found {found} / {total}',
  '発動：{hint}': 'Order: {hint}',
  '3つ目の一撃がダメージ×2.5、勇者が大きく踏み込む':
    'The 3rd hit deals ×2.5 damage as the hero lunges in',
  '？？？': '???',
  'ヒント：{teaser}': 'Hint: {teaser}',
  'プレミアム：広告なしでご褒美を受け取れます': 'Premium: you get rewards without ads',
  'プレミアム {price}｜広告なしでご褒美がもらえる': 'Premium {price} | Rewards without ads',
  '詳しく ›': 'More ›',
  'プレミアム {price}（買い切り）': 'Premium {price} (one-time purchase)',
  '広告を見なくても、ご褒美をすぐ受け取れます。\n・結果画面「戦利品を2倍にする」\n・鍛冶屋「無料で再抽選」\n・力尽きたときの「再開」\n（回数はそのまま。強さは変わりません）':
    'Get ad rewards right away, no ads needed:\n• Results: "Double Loot"\n• Smith: "Free Reroll"\n• When you fall: "Revive"\n(Same daily limits. It doesn\'t make you stronger.)',
  購入する: 'Buy',

  // src/scenes/DummyScene.ts
  カカシで試し撃ち: 'Dummy Practice',
  '「発火」で次の起点を撃つ': 'Tap "Fire!" to fire the next Origin',
  発火: 'Fire!',
  配置: 'Loadout',
  '起点{origin} 発火中…': 'Origin {origin} firing…',
  '総ダメージ {n}': 'Total damage {n}',
  '持続（無防備） {sec}秒': 'Duration (unguarded) {sec}s',
  '防御値 +{n}': 'Defense +{n}',
  'コンボ {list}': 'Combos {list}',
  'シンクロボーナス +{n}%': 'Sync bonus +{n}%',

  // src/scenes/LoadoutScene.ts
  '↶ 戻す': '↶ Undo',
  全部外す: 'Clear All',
  おまかせ: 'Auto',
  '持ち物から、おまかせで並べます。': 'Lay out your gear automatically.',
  使えない: 'Not allowed',
  挑戦へ: 'Challenge',
  '下は倉庫。装備を少し押さえてから、\nバックパックへドラッグして置こう':
    'Your Storage is below. Press and hold an item for a moment, then drag it into the backpack.',
  '起点（番号の石）から、矢印の向きに\nつながった装備が順番に攻撃するよ。\n後ろの装備ほどダメージが大きい！':
    'Starting from an Origin (the numbered stone), linked items attack in turn along the arrows. Later links hit harder!',
  '「約」の数字が大きいほど強い並べ方。\nいろいろ試してみよう！':
    'The bigger the "~" number, the stronger the layout. Try out different ideas!',
  '「約」の数字は敵1体に撃ったときの推定ダメージ（コンボ・会心込み）':
    '"~" numbers are estimated damage against one enemy (combos and crits included)',
  '2本の線を、同じ連鎖数でシンクロさせよう！\n長いほどボーナスアップ':
    'Sync 2 lines at the same link count! The longer they are, the bigger the bonus.',
  '起点は1つずつ、順番に発火するよ。\nシンクロしたマスには「4+4 +30%」のように\n連鎖数とボーナスが出る':
    'Origins fire one at a time, in turn. A sync cell shows the links and the bonus, like "4+4 +30%".',
  '起点が0個です。出撃できません': "No Origin placed. You can't start a run.",
  '倉庫があふれています（タップで売却）': 'Storage is full (tap to sell)',
  全部: 'All',
  線を消す: 'Hide Lines',
  線なし: 'No Lines',
  番号を選ぶと表示に戻す: 'Pick a number to show the lines again',
  起点を置いてください: 'Place an Origin',
  '合計 約{n}': 'Total ~{n}',
  '約{n}・{step}連鎖・{tech}': '~{n} · Chain {step} · {tech}',
  '必殺技|fallback': 'Special Move',
  '約{n}・{step}連鎖・コンボ{combo}': '~{n} · Chain {step} · Combos {combo}',
  '約{n}・{step}連鎖・シンクロ+{bonus}%': '~{n} · Chain {step} · Sync +{bonus}%',
  '約{n}・{step}連鎖': '~{n} · Chain {step}',
  診断: 'Advice',
  配置の診断: 'Loadout Advice',
  'いまの推定ダメージ 合計 約{n}': 'Current estimate: ~{n} total',
  'いまの装備では、これ以上の手は見つかりませんでした。\nいい並べ方です！':
    'No better moves found with your current gear.\nNice layout!',
  '+約{n}': '+~{n}',
  '（+{pct}%）': '(+{pct}%)',
  場所を見る: 'Show Where',
  閉じる: 'Close',
  '挑戦「{name}」用': 'Challenge: {name}',
  制限に合わせる: 'Fit to Rules',
  '{name} に切り替えました': 'Switched to {name}',
  もう制限に合っています: 'Already meets the rules',
  '制限に合わせました。並べ方を詰めよう': 'Adjusted to the rules. Now fine-tune the layout!',
  '合う装備が足りず、空いたマスがあります': 'Not enough allowed gear, so some cells are empty',
  '編成の名前（8文字まで）': 'Set name (up to 8 characters)',
  '消耗品|slots': 'Consumables',
  '自動|refill': 'Auto',
  ひとつ前の並べ方に戻しました: 'Undid the last change',
  'バックパックと消耗品枠の {n}個をすべて倉庫に戻します。\n起点の発火順もリセットされます。':
    'Return everything in the backpack and consumable slots to Storage (×{n}).\nThe Origin firing order resets too.',
  置きたいマスをタップ: 'Tap a cell to place it',
  外す: 'Remove',
  発火順を前へ: 'Fire Earlier',
  枠に入れる: 'Add to Slot',
  枠がいっぱい: 'Slots Full',
  置く: 'Place',
  あふれた分を売る: 'Sell Overflow',
  '安いものから{n}個を売って倉庫に収めます\n（+{gold}G）':
    'Sell the cheapest items (×{n}) to fit your Storage.\n(+{gold}G)',

  // src/scenes/ResultScene.ts
  '体験おわり！': 'Demo Complete!',
  '力尽きた…': 'Defeated…',
  '撤退！': 'Retreated!',
  '時間切れ！': "Time's up!",
  ランキングに記録しました: 'Score saved to the Ranking',
  シェア: 'Share',
  '画像を保存しました（文はコピー済み）': 'Image saved (text copied)',
  画像を作れませんでした: "Couldn't create the image",
  '挑戦「{name}」・{region}': 'Challenge "{name}" · {region}',
  'スコア {score}': 'Score {score}',
  '到達 {loop}周目': 'Reached Loop {loop}',
  ボス撃破: 'Bosses Beaten',
  '発火|stat': 'Chains Fired',
  ゴールド: 'Gold',
  一網打尽: 'Wipeouts',
  '自己ベスト！': 'New Best!',
  '★×{n}獲得！': '★×{n} earned!',
  '★獲得！': '★ earned!',
  '★ボーナス: 攻撃+{atk}%・最大HP+{hp}': '★ Bonus: Attack +{atk}% · Max HP +{hp}',
  '新しい地域「{region}」が開放された！': 'New region unlocked: {region}!',
  '戦利品 {n}': 'Loot: {n}',
  '自動売却 {n}個 +{gold}G': 'Auto-sold ×{n} +{gold}G',
  '消耗品を{n}個 補充': 'Consumables refilled ×{n}',
  '借りた伝説の装備は、お返ししたよ\n（体験なので戦利品はなし）':
    'The borrowed legendary gear has been returned.\n(It was a demo, so no loot.)',
  '挑戦「{name}」': 'Challenge "{name}"',
  'スコア（合計ダメージ） {score}': 'Score (total damage) {score}',
  '自己ベスト {best}（更新！）': 'Best {best} (new!)',
  '自己ベスト {best}': 'Best {best}',
  エンドレスは装備が出ません: 'Endless drops no gear',
  '自己ベスト {loop}周目・ダメージ {damage}': 'Best: Loop {loop} · Damage {damage}',
  戦利品なし: 'No loot',
  タップで能力を確認: 'Tap an item to see its stats',
  タップで早送り: 'Tap to speed up',
  '戦利品を2倍にする（今日あと{n}回）': 'Double Loot ({n} left today)',
  '▶ 広告を見て戦利品を2倍にする（今日あと{n}回）': '▶ Watch Ad: Double Loot ({n} left today)',
  '戦利品 {n}（×2）': 'Loot: {n} (×2)',
  '広告のボーナス +{n}個（自動売却 {sold}個 +{gold}G）':
    'Ad bonus +{n} (auto-sold ×{sold} +{gold}G)',
  '広告のボーナス +{n}個': 'Ad bonus +{n}',
  拠点へ: 'To Base',
  配置へ: 'To Loadout',
  自分で出撃: 'Your Turn!',
  もう一度: 'Play Again',
  倉庫があふれています: 'Storage is full',
  起点がありません: 'No Origin',
  'これが伝説の装備の力！\n最大{step}連鎖、{damage}ダメージ！':
    "That's the power of legendary gear!\nA {step}-link chain and {damage} damage!",
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、\nいつかこの姿に！':
    "From here on, adventure with your own gear. Collect and arrange gear, and someday you'll be this strong!",
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、いつかこの姿に！\n「自分で出撃」を押してね':
    'From here on, adventure with your own gear. Collect and arrange gear, and someday you\'ll be this strong! Tap "Your Turn!"',
  '宝箱から装備をゲット！\n開いたあとにタップすると、能力が見られるよ':
    'You got gear from chests!\nTap an item after it opens to see its stats.',
  '敵を倒すと、宝箱から装備が手に入るよ。\n開いたあとにタップすると、能力が見られる':
    'Defeat enemies to get gear from chests. Tap an item after it opens to see its stats.',
  '拾った装備は、拠点の「配置」で\nバックパックに置くと強くなるよ':
    'Put the gear you found in your backpack under "Loadout" at Base to get stronger.',
  '装備を拾ったら、拠点の「配置」で\nバックパックに置くと強くなるよ':
    'When you find gear, put it in your backpack under "Loadout" at Base to get stronger.',

  // src/scenes/RunScene.ts
  '今回だけ、伝説の装備を借りてきたよ！\n装備を集めると、いつかこうなる！':
    "Just this once, you've borrowed legendary gear! Collect gear and someday you'll be this strong!",
  'バックパックの装備は、起点（番号の石）から\n矢印の向きに順番に攻撃するよ。\nこれが「連鎖」！':
    'Items in your backpack attack in order, starting from an Origin (the numbered stone) and following the arrows. That\'s a "chain"!',
  '起点（番号の石）から矢印の向きに、\n装備が順番に攻撃するよ。これが「連鎖」！\n長くつながるほど、ダメージが大きくなる':
    'Starting from an Origin (the numbered stone), items attack in order along the arrows. That\'s a "chain"! The longer the chain, the bigger the damage.',
  '勇者の足元のゲージがたまるたびに、\n起点が①→②→①…の順に発火するよ。\n次に動く起点は「次の連鎖」に出る':
    'Each time the gauge under the hero fills, the Origins fire in order: ①→②→①… The next one to fire is shown under "Next Chain".',
  '勇者は自動で進んで戦うよ。\n群れをまとめて倒したり、ボスを倒すと\n時間がのびる！':
    'Your hero moves and fights automatically. Wipe out a whole pack or defeat a boss to get more time!',
  '残り時間。ふだんは0になるか、\nHPがなくなると終わり':
    'Time left. Normally, the run ends when it hits 0 or your HP runs out.',
  '残り時間。0になるか、HPがなくなると終わり。\n拾った装備は持ち帰れるよ':
    'Time left. The run ends when it hits 0 or your HP runs out. You keep any gear you pick up.',
  '止めたいときはここ。撤退もできるよ。\nさあ、伝説の力を見てみよう！':
    "Tap here to pause. You can also retreat. Now, let's see legendary power in action!",
  '止めたいときはここ。撤退もできるよ': 'Tap here to pause. You can also retreat.',
  '{n}周目': 'Loop {n}',
  次の連鎖: 'Next Chain',
  一時停止中: 'Paused',
  再開: 'Resume',
  撤退する: 'Retreat',
  ここまでの戦利品を持ち帰ります: 'You keep the loot you have so far',
  '{region}　{loop}周目　×{speed}': '{region}  Loop {loop}  ×{speed}',
  '{region}　{loop}周目': '{region}  Loop {loop}',
  '防御 {n}': 'Defense {n}',
  '連鎖中！': 'Chaining!',
  '{step}連鎖・{sec}秒': 'Chain {step} · {sec}s',
  '{step}連鎖・{sec}秒・シンクロ+{bonus}%': 'Chain {step} · {sec}s · Sync +{bonus}%',
  'FPS {fps}  敵 {enemies}  粒 {particles}  数字 {numbers}  seed {seed}':
    'FPS {fps}  enemies {enemies}  particles {particles}  numbers {numbers}  seed {seed}',
  '時間 +{sec}': 'Time +{sec}',
  '時間 上限': 'Time Maxed',
  '{loop}周目のボス　{name}': 'Loop {loop} Boss  {name}',
  'NEW RECORD! 最大連鎖': 'NEW RECORD! Max Chain',
  'NEW RECORD! 最大ダメージ': 'NEW RECORD! Max Damage',
  無効: 'Blocked',
  '激昂！': 'Enraged!',
  'アーティファクト！ {name}': 'Artifact! {name}',
  'よろめき！': 'Staggered!',
  '一網打尽！': 'Wipeout!',
  'ボス撃破！': 'Boss Down!',
  'ぴったりシンクロ！ +{bonus}%': 'Perfect Sync! +{bonus}%',
  'シンクロ！ +{bonus}%': 'Sync! +{bonus}%',
  'シンクロ！': 'Sync!',
  '復活！': 'Revived!',
  '再開する（HP全回復・+{sec}秒）': 'Revive (full HP, +{sec}s)',
  '▶ 広告を見て再開（HP全回復・+{sec}秒）': '▶ Watch Ad to Revive (full HP, +{sec}s)',
  あきらめる: 'Give Up',
  '1回のランで1回だけ再開できます': 'You can revive once per run',

  // src/scenes/StageSelectScene.ts
  地域を選ぶ: 'Choose a Region',
  '出撃！': 'Go!',
  起点がバックパックにありません: 'No Origin in your backpack',
  '出撃する地域を選ぶよ。最初は「草原」。\n奥の地域ほど敵は強いけど、\nいい装備が出やすいよ':
    'Choose where to go. Start with "Grassland". Deeper regions have tougher enemies, but better gear drops more often.',
  '準備ができたら「出撃！」': 'When you\'re ready, tap "Go!"',
  '「出撃！」を押して、冒険に出よう！': 'Tap "Go!" to set out on your adventure!',
  '敵HP×{hp}〜 攻撃×{atk}〜\n装備・ゴールドは出ない':
    'Enemy HP ×{hp}+  Atk ×{atk}+\nNo gear or gold',
  '敵HP×{hp} 攻撃×{atk}\nレア以上 +{pct}%': 'Enemy HP ×{hp}  Atk ×{atk}\nRare or better +{pct}%',
  '最高{n}周': 'Best: Loop {n}',
  記録なし: 'No record',
  '最高{n}周 {stars}': 'Best: Loop {n} {stars}',
  '未到達 {stars}': 'No record {stars}',
  '雑魚: {trend}': 'Enemies: {trend}',
  'ボス: 全地域から毎周ランダム\n最高ダメージ {damage}':
    'Bosses: random from every region each loop\nBest damage: {damage}',
  '{n}周目〜': 'Loop {n}+',
  '装備とゴールドは出ない。到達周回と与えたダメージで自己ベストを目指す':
    'No gear or gold. Aim for a personal best in loops reached and damage dealt.',
  '{note}（ボスはアイコンをタップで特徴）': '{note} (tap a boss icon to see its traits)',
  'ボスは出撃ごとに候補から選ばれます（{n}種）。アイコンをタップで特徴':
    'Each run picks its bosses from this list ({n}). Tap an icon to see its traits.',
  魔王城で魔王を倒すと開放: 'Unlocks when you defeat the Demon Lord in the Demon Castle',
  前の地域の3周目のボスを倒すと開放:
    'Unlocks when you defeat the loop 3 boss of the previous region',

  // src/ui/achievementToast.ts
  '実績達成！': 'Achievement Unlocked!',

  // src/ui/backpackView.ts
  '必殺 {step}連鎖': 'Special #{step}',
  '{step}連鎖 ×{mult}': '#{step} ×{mult}',

  // src/ui/chestReveal.ts
  '売却|sold': 'Sold',
  広告: 'Ad',

  // src/ui/discovery.ts
  図鑑に登録: 'Added to Codex',
  'NEW  必殺技を発見！': 'NEW  Special Move found!',
  '【{name}】': '“{name}”',

  // src/ui/itemInfo.ts
  上: 'Up',
  右: 'Right',
  下: 'Down',
  左: 'Left',
  'アーティファクト（能力 ×{x}・出口の数は固定）': 'Artifact (stats ×{x}, fixed number of exits)',
  消耗品: 'Consumable',
  '{rarity}（能力 ×{x}）': '{rarity} (stats ×{x})',
  '出口: {dirs}': 'Exits: {dirs}',
  'なし（末端）': 'None (end of chain)',
  '攻撃力 {atk}（{element}・{area}）': 'Attack {atk} ({element}, {area})',
  '次への伝達 {s}秒': 'Relay time {s}s',
  '{n}回攻撃（連鎖数は1つ）': 'Hits ×{n} per link',
  '会心率 +{pct}%': 'Critical rate +{pct}%',
  '付与: {status} → {element}で{combo}': 'Applies: {status} → {combo} with {element}',
  '付与: {status}': 'Applies: {status}',
  '{status}を消費して{combo}（×{x}、範囲に拡大）':
    'Uses up {status} for {combo} (×{x}, spreads to an area)',
  '{status}を消費して{combo}（×{x}）': 'Uses up {status} for {combo} (×{x})',
  '防御値 +{n}（連鎖が通ると終了時に加算、連鎖数に数えない）':
    "Defense +{n} (added when a chain through it ends; doesn't count as a link)",
  '連鎖の始まり。攻撃せず、連鎖数にも数えない':
    "Starts a chain. Doesn't attack and doesn't count as a link.",
  '付け直し {n}回': 'Reforged ×{n}',
  '売却 {price}G': 'Sells for {price}G',
  アーティファクト: 'Artifact',
  起点: 'Origin',
  防御: 'Defense',
  出口: 'Exits',
  攻撃力: 'Attack',
  '強化込み {n}': 'With upgrades {n}',
  全体攻撃: 'Hits All',
  '威力 ×{x}': 'Power ×{x}',
  貫通: 'Pierce',
  '狙いの後ろ {n}体にも同じダメージ': 'Same damage to {n} behind the target',
  連撃: 'Multi-hit',
  会心率: 'Critical Rate',
  連鎖倍率の上限: 'Chain Multiplier Cap',
  この環を通る連鎖すべて: 'Every chain through this ring',
  吸血: 'Lifesteal',
  '与えたダメージの{pct}%を回復': 'Heals {pct}% of damage dealt',
  疾風: 'Gale',
  'このあとの装備は連鎖数+{n}': 'Later items count as link +{n}',
  '5秒間、一撃の30%を毎秒': '30% of the hit per second for 5s',
  付与: 'Applies',
  '濡れ・油・凍結をまとめて': 'Wet, Oil and Frozen at once',
  次への伝達: 'Relay Time',
  '{s}秒': '{s}s',
  防御値: 'Defense',
  連鎖終了時に加算: 'Added when the chain ends',
  守り: 'Guard',
  連鎖中も無防備にならない: 'Never unguarded in chains',
  バックパックにある限り: 'While in your backpack',
  この配置: 'This Layout',
  どの起点からも届きません: 'No Origin reaches it',
  '起点{origin}の{step}連鎖目 ×{mult}': 'Origin {origin}, link {step} ×{mult}',
  '1ヒット 約{n}': '~{n} per hit',
  '1ヒット 約{n}・シンクロ+{bonus}%': '~{n} per hit · Sync +{bonus}%',
  '起点{origin}の連鎖': "Origin {origin}'s chain",
  連鎖数に数えない: "Doesn't count as a link",
  '{status}を付ける → {element}の攻撃で{combo}（×{x}）':
    'Applies {status} → {element} attacks trigger {combo} (×{x})',
  '{status}を付ける': 'Applies {status}',
  '{status}の敵に当てると{combo}（×{x}・範囲に拡大）':
    'Hits on {status} enemies trigger {combo} (×{x}, spreads to an area)',
  '{status}の敵に当てると{combo}（×{x}）': 'Hits on {status} enemies trigger {combo} (×{x})',
  ロックする: 'Lock',

  // src/ui/itemList.ts
  攻撃: 'Attack',
  倉庫は空です: 'Storage is empty',
  '★全部': '★All',
  '★{rarity}': '★{rarity}',

  // src/ui/kit/chrome.ts
  '出撃 {n}回': 'Runs: {n}',
  拠点: 'Base',

  // src/ui/pools.ts
  '会心 {n}': 'Crit {n}',

  // src/ui/shareCard.ts
  '{loop}周目に到達': 'Reached Loop {loop}',
  '最大{step}連鎖': 'Max Chain {step}',
  '最大ダメージ {damage}': 'Max Damage {damage}',

  // src/ui/tutorial.ts
  '光っているところをタップ（{n}/{total}）': 'Tap the glowing spot ({n}/{total})',
  'タップで次へ（{n}/{total}）': 'Tap to continue ({n}/{total})',
  'スキップ ›': 'Skip ›',
  // src/scenes/BaseScene.ts (guides for the storage / smith / upgrade tabs)
  'ここは倉庫。バックパックに置いていない\n装備と消耗品が入っているよ':
    "This is your Storage. Gear and consumables that aren't in your backpack are kept here.",
  '使わない装備は「まとめて売る」や\n「一括売却」で、ゴールドにできるよ':
    'Turn unused gear into gold with "Select & Sell" or "Bulk Sell".',
  '装備をタップすると、能力と\n「売る」などのボタンが出るよ。\n押してみよう':
    'Tap an item to see its stats and buttons like "Sell". Give it a try!',
  '「{upgrade}」を強化してみよう！\n強化は、ずっと残るよ。\n押してみてね':
    'Try upgrading "{upgrade}"!\nUpgrades last forever. Tap it!',
  '拾った装備は「倉庫」に入るよ。\n使わない装備は、売ってゴールドにできる。\n「倉庫」を押してね':
    'Gear you pick up goes into "Storage". You can sell unused gear for gold. Tap "Storage"!',
  'ゴールドが貯まったね！\n「鍛冶屋」で、装備の出口の向きを\n変えられるよ。「鍛冶屋」を押してね':
    'You\'ve saved up some gold!\nAt the "Smith", you can change the directions of an item\'s exits. Tap "Smith"!',
  'ゴールドが貯まったね！\n「強化」で、勇者をずっと強くできるよ。\n「強化」を押してね':
    'You\'ve saved up some gold!\nUse "Upgrade" to make your hero stronger for good. Tap "Upgrade"!',
  '「再抽選」は、出口の向きがランダムに。\n「指定」は、好きな向きを選べるよ':
    '"Reroll" turns the exits in random directions. "Custom" lets you pick the directions.',
  'この装備をタップして、選んでみよう': 'Tap this item to select it.',
};
