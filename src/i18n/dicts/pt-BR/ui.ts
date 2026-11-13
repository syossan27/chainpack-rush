// Brazilian Portuguese: screens and messages. Key: Japanese source string → value: translation
// (keep {placeholders} and the meaning of any '|context' key)
import type { Dict } from '../types';

export const UI: Dict = {
  // src/core/challenge.ts
  'レアリティは{rarity}まで（起点は問わない）': 'Raridade até {rarity} (Origens: qualquer uma)',
  アーティファクトは使えない: 'Sem Artefatos',
  '起点は{n}つまで': 'Máx. de Origens: {n}',
  '攻撃装備は {elements} だけ': 'Equipamento de ataque: só {elements}',
  '・|sep': ', ',
  防具は使えない: 'Sem armadura',
  '強化と★は使わない（勇者は最初の強さ）':
    'Sem melhorias nem bônus de ★ (herói com a força inicial)',
  'アーティファクト（{item}）は使えない': 'Artefato proibido ({item})',
  '{rarity}より上の装備（{item}）がある': 'Equipamento acima de {rarity} ({item})',
  '使えない属性の装備（{item}）がある': 'Equipamento de elemento proibido ({item})',
  '使えない種類の装備（{item}）がある': 'Equipamento de tipo proibido ({item})',
  '起点が{n}つある（{max}つまで）': 'Origens: {n} (máx. {max})',
  起点がない: 'Sem Origem',

  // src/core/cosmetics.ts
  蒼のマント: 'Capa Azul',
  白銀の鎧: 'Armadura Prateada',
  黄金の鎧: 'Armadura Dourada',
  ちびドラゴン: 'Dragãozinho',
  銅のメダル: 'Medalha de Bronze',
  銀の王冠: 'Coroa de Prata',
  金の王冠: 'Coroa de Ouro',

  // src/core/diagnose.ts
  '必殺技の並びがそろう！': 'Completa a sequência de um Golpe Especial!',
  '何か特別なことが起きそうな並び…': 'Algo especial pode acontecer com esta ordem…',
  状態異常のコンボが増える: 'Mais combos de efeito',
  '{n}連鎖までのびる': 'A corrente cresce até o elo {n}',
  'もっと強い装備（レアリティ・攻撃力）に替える':
    'Troca por equipamento mais forte (raridade, Ataque)',
  空いているマスも連鎖に使う: 'Usa as casas vazias na corrente',
  '強い装備が後ろ（倍率が高い）に来る':
    'Leva o equipamento forte para os últimos elos (multiplicador maior)',
  '「{a}」と「{b}」を入れ替える': 'Troque "{a}" e "{b}" de lugar',
  '「{a}」を倉庫の「{b}」に置きかえる': 'Substitua "{a}" por "{b}" do Armazém',
  '空いているマスに「{item}」を置く': 'Coloque "{item}" numa casa vazia',
  'どの起点からも届いていない装備が{n}個': 'Itens que nenhuma Origem alcança: {n}',
  '起点から矢印をたどって、つながる向きに置き直そう（光っているマス）':
    'Siga as setas a partir das Origens e reposicione esses itens para que se conectem (casas brilhando)',
  '起点{n}が{step}連鎖で止まっている': 'A corrente da Origem {n} termina no elo {step}',
  '長くつなぐほど後ろの装備の倍率が上がる。出口の向きを鍛冶屋で変えるのも手':
    'Correntes mais longas dão multiplicadores maiores aos últimos elos. Você também pode mudar a direção das saídas no Ferreiro.',

  // src/core/economy.ts
  見つかりません: 'Não encontrado',
  消耗品は合成できません: 'Consumíveis não podem ser fundidos',
  これ以上のレアリティはありません: 'Já está na raridade máxima',
  '装備中は合成に使えません（外してから）':
    'Itens equipados não podem ser fundidos (remova primeiro)',
  ロック中は合成に使えません: 'Itens travados não podem ser fundidos',
  '同じ装備があと{n}つ必要': 'Precisa de mais {n} do mesmo item',
  '{cost}G 必要': 'Precisa de {cost}G',

  // src/core/presets.ts
  '編成{n}': 'Conjunto {n}',

  // src/core/ranking.ts
  '挑戦 第{n}回': 'Desafio #{n}',
  'エンドレス {month}': 'Infinito ({month})',
  '上位1%': 'Top 1%',
  '上位10%': 'Top 10%',
  '上位50%': 'Top 50%',
  参加: 'Participação',
  '{season} {title}': '{season}: {title}',

  // src/core/shareText.ts
  '挑戦「{name}」でスコア {score}！': 'Fiz {score} pontos no Desafio "{name}"!',
  'エンドレスで{loop}周目に到達！': 'Cheguei à Volta {loop} no Infinito!',
  '{region}で{loop}周目に到達！': '{region}: cheguei à Volta {loop}!',
  '最大{step}連鎖・最大ダメージ {damage}': 'Corrente máx. {step} · Dano máx. {damage}',

  // src/platform/monetization.ts
  '広告（テスト表示）': 'Anúncio (teste)',
  本番ではここに動画広告が流れます: 'No jogo final, um anúncio em vídeo passa aqui',

  // src/scenes/BaseScene.ts
  基本: 'Básico',
  '起点から出口（矢印）をたどって、隣の装備へ連鎖がつながります。勇者の足元のゲージ（攻撃間隔）がたまると起点が順に発火し、つながった装備が順番に攻撃します。':
    'A corrente sai de uma Origem pelas saídas (setas) e passa para os itens vizinhos. Quando a barra aos pés do herói (Intervalo de Ataque) enche, as Origens disparam em sequência e os itens conectados atacam um após o outro.',
  '1回のランは30秒。走っている間は時間が止まり、敵と戦っている間だけ減ります。':
    'Uma expedição dura 30 segundos. O tempo fica parado enquanto o herói anda e só corre durante as lutas.',
  '時間は、群れを1回の連鎖でまとめて倒す（一網打尽）と+1.5秒、ボスを倒すと+8秒、時の砂で+5秒のびます。上限はないので、倒し続けるほど長く戦えます。':
    'Derrotar um grupo inteiro com uma só corrente (uma Faxina) dá +1.5s, derrotar um chefe dá +8s e as Areias do Tempo dão +5s. Não há limite: quanto mais você derrota, mais tempo luta.',
  ダメージの決まり方: 'Como o Dano Funciona',
  '攻撃力 × レアリティ × 連鎖倍率 × コンボ × 強化 × 追加効果 × 会心（±10%ゆれる）':
    'Ataque × Raridade × Multiplicador de corrente × Combo × Melhorias × Bônus × Crítico (variação de ±10%)',
  '・レアリティ：コモン×1、レア×1.5、エピック×2.5、レジェンダリー×4':
    '• Raridade: Comum ×1, Raro ×1.5, Épico ×2.5, Lendário ×4',
  '・連鎖倍率：1連鎖ごとに×1.2、6連鎖目で上限×2.5（循環の環を通ると上限×4.0）':
    '• Multiplicador de corrente: ×1.2 por elo, até o limite de ×2.5 no 6º elo (limite de ×4.0 passando pelo Anel Ouroboros)',
  '・コンボ：濡れ＋雷で感電×3、油＋炎で爆発×2（周りも巻き込む）、凍結＋打撃で粉砕×2.5。コンボでなくても、状態が付いた敵には×1.2':
    '• Combos: Molhado + Raio = Choque ×3, Óleo + Fogo = Explosão ×2 (atinge também os inimigos próximos), Congelado + Impacto = Estilhaço ×2.5. Mesmo sem combo, inimigos com efeito recebem ×1.2',
  '・強化：拠点の「攻撃倍率」': '• Melhorias: "Multiplicador de Ataque" na Base',
  '・会心：8%でダメージ×2（聖剣・会心の追加効果・幸運の硬貨で上がる）':
    '• Crítico: 8% de chance de dano ×2 (aumenta com a Espada Sagrada, o bônus Crítico e a Moeda da Sorte)',
  ダメージを伸ばすコツ: 'Dicas para Mais Dano',
  '・配置画面の「約」の数字を見ながら並べ替える。ルートの番号を選ぶと、そのルート1本の推定ダメージが出ます。':
    '• Reorganize de olho nos números "~" da tela "Equipar". Escolha o número de uma rota para ver só o dano estimado dela.',
  '・コンボを作る。状態を付ける装備（水竜の瓶・雨雲の杖・油瓶・氷の剣・氷の杖）の後ろに、組む属性（雷・炎・打撃）をつなぐ。状態は5秒で消えます。':
    '• Faça combos. Ligue o elemento certo (Raio, Fogo, Impacto) depois de um item de efeito (Frasco do Dragão de Água, Cajado da Chuva, Frasco de Óleo, Espada de Gelo, Cajado de Gelo). Os efeitos somem após 5 segundos.',
  '・光と闇を交互につなぐと、コンボが続く。浄化（勇者のHP回復）と封印（敵の攻撃が遅くなる）。風は毒の敵に毒を重ね、5重で毒爆。':
    '• Alterne Luz e Sombra para manter os combos: Purificação (cura o herói) e Selo (deixa os ataques inimigos mais lentos). O Vento acumula Veneno em inimigos envenenados; com 5 camadas, Estouro Tóxico.',
  '・2つの起点の線を同じ連鎖数でシンクロさせると、その先にボーナス。起点石の種類は、その起点から伸びる線にだけ効きます。':
    '• Sincronize as linhas de 2 Origens com o mesmo número de elos para ganhar um bônus dali em diante. O tipo de uma Pedra de Origem só vale para as linhas que saem dela.',
  '・強い装備ほど後ろ（6連鎖目以降）に置く。前のほうは軽い装備や状態付与に。':
    '• Coloque seus itens mais fortes no fim da corrente (do 6º elo em diante). Use os primeiros elos para itens leves e itens de efeito.',
  '・レアリティが一番効きます。奥の地域ほどレア以上が出やすい。':
    '• A raridade é o que mais importa. Regiões mais avançadas dão itens Raros ou melhores com mais frequência.',
  '・装備の左下の✦は追加効果。先駆け（3連鎖目まで強い）は短い連鎖に、締め（6連鎖目以降強い）は長い連鎖に向きます。':
    '• O ✦ no canto inferior esquerdo de um item indica um bônus. Vanguarda (forte até o 3º elo) combina com correntes curtas; Arremate (forte do 6º elo em diante), com correntes longas.',
  必殺技: 'Golpes Especiais',
  '連鎖のルートで、決まった装備が順に3つつながって通ると、3つ目の一撃が必殺技になります（ダメージ×2.5、勇者が大きく踏み込む）。配置画面では、そのマスに「必殺」と出ます。':
    'Quando uma corrente passa por 3 itens específicos em ordem, o 3º golpe vira um Golpe Especial (dano ×2.5, e o herói avança com tudo). Na tela "Equipar", essa casa mostra "Especial".',
  '・必殺技は全部で{n}つ。初めて出すと「発見」と出て、拠点の「図鑑」に発動条件が載ります。まだ見つけていない技は、図鑑でヒントだけ見られます。':
    '• Golpes Especiais para descobrir: {n}. Na primeira vez que você fizer um, aparece "Golpe Especial descoberto!" e a receita vai para o "Compêndio" na Base. Para os que você ainda não descobriu, o Compêndio mostra só uma dica.',
  短い連鎖と長い連鎖: 'Correntes Curtas e Longas',
  '・次の発火までの待ちは、直前の連鎖数に比例します。短い連鎖は回転が速く、長い連鎖は一撃が大きい。':
    '• A espera até o próximo disparo cresce com o tamanho da última corrente. Correntes curtas giram rápido; correntes longas batem forte.',
  '・連鎖中は無防備（被ダメージ×1.5）。ただし3連鎖目までは守りが残ります。':
    '• Durante uma corrente você fica desprotegido (dano recebido ×1.5), mas continua protegido até o 3º elo.',
  '・無防備中に大きく被弾すると「よろめき」、残りの連鎖が途切れます。防御装備で耐えるか、不落の城門を置くと防げます。':
    '• Um golpe forte enquanto você está desprotegido faz você cambalear ("Cambaleou!") e corta o resto da corrente. Aguente com itens de defesa ou coloque o Portão Inabalável para evitar isso.',
  地域と敵: 'Regiões e Inimigos',
  '・草原 → 洞窟 → 城壁の順に敵が一気に強くなり、そのぶんレアな装備が出やすくなります。3周目のボスを倒すと次の地域が開きます。':
    '• Os inimigos ficam bem mais fortes de Pradaria → Caverna → Muralhas, mas itens mais raros também caem com mais frequência. Derrote o chefe da volta 3 para desbloquear a próxima região.',
  '・群れとボスは出撃ごとに変わります。精鋭（硬い・速い・金ぴか）が混ざることも。金ぴかは必ずレア以上を2個落とします。':
    '• Os grupos e os chefes mudam a cada expedição. Às vezes aparecem inimigos de elite (Resistente, Veloz, Dourado). Os Dourados sempre deixam cair 2 itens Raros ou melhores.',
  '・アーティファクトはごくまれに出る特別な装備です。':
    '• Artefatos são itens especiais que caem muito raramente.',
  ご褒美とプレミアム: 'Recompensas e Premium',
  '・広告を見ると、ご褒美がもらえます：結果画面で「戦利品を2倍にする」（1日3回、同じ数だけ抽選し直してもう1セット）、鍛冶屋で「無料で再抽選」（1日3回）、力尽きたときに「再開」（1回のランで1回、HP全回復＋10秒）。':
    '• Veja um anúncio para ganhar uma recompensa: "Dobrar Espólio" na tela de resultados (3 vezes por dia; sorteia mais um lote do mesmo tamanho), "Sorteio Grátis" no Ferreiro (3 vezes por dia) e "Reviver" quando você cai (1 vez por expedição; HP cheio + 10s).',
  '・プレミアム（{price}、買い切り）なら、広告を見なくても同じご褒美を受け取れます。設定から買えます。':
    '• Com o Premium ({price}, compra única), você recebe as mesmas recompensas sem ver anúncios. Compre em "Ajustes".',
  '倉庫・鍛冶屋・合成': 'Armazém, Ferreiro e Fusão',
  '・消耗品枠は、入れた消耗品を覚えています。ランで使い切ったら、倉庫に同じものがあれば自動で入れ直します（ないときは枠にうすく「自動」と出て、手に入ったら入ります）。手で外すと覚えるのをやめます。':
    '• Os espaços de consumíveis lembram o que você colocou neles. Quando um item acaba numa expedição, o mesmo item é reposto do Armazém automaticamente (se não houver, o espaço mostra um "Auto" clarinho e é preenchido quando você conseguir um). Remova manualmente para parar.',
  '・どこを変えれば強くなるか迷ったら、配置画面の「診断」。入れ替え・置きかえ・空きマスを実際に試して、伸びる手を教えてくれます（並べ替えは自分で。「場所を見る」で関係するマスが光ります）。':
    '• Não sabe o que mudar? Toque em "Análise" na tela "Equipar". Ela testa trocas, substituições e casas vazias e mostra o que ajuda (a reorganização é com você; "Ver Local" acende as casas envolvidas).',
  '・配置画面の上の1〜5で編成を切り替えられます（凍結型・炎上型などを作り分け）。編成は並べ方の記録だけで、装備は倉庫に置いたまま。今の編成をもう一度押すと名前を変えられます。ほかの編成で使っている装備には「編成○」の印が付き、一括売却などでは売られません。':
    '• Troque de Conjunto com os botões 1 a 5 no topo da tela "Equipar" (por exemplo, um de Gelo e um de Fogo). O Conjunto só guarda a organização; os itens ficam no Armazém. Toque de novo no Conjunto atual para renomeá-lo. Itens usados em outro Conjunto ganham a marca "Conjunto ○" e não são vendidos pela "Venda em Lote" e afins.',
  '・倉庫の「自動売却」で、ラン後に戦利品から決まったレアリティ以下を自動で売れます（✦付きを残すかも選べます）。':
    '• Com a "Autovenda" do Armazém, o espólio da raridade escolhida ou inferior é vendido automaticamente após cada expedição (dá para escolher guardar os itens com ✦).',
  '・倉庫があふれると出撃できません。「一括売却」「まとめて売る」で整理しましょう。大事な装備は詳細カードでロックすると売れなくなります。':
    '• Com o Armazém lotado, você não pode partir. Libere espaço com "Venda em Lote" ou "Vender Vários". Trave os itens importantes no cartão de detalhes para que não sejam vendidos.',
  '・鍛冶屋では出口の向きを付け直せます（数は変わりません）。レアリティが高いほど料金も上がります。':
    '• No Ferreiro você pode reforjar a direção das saídas (a quantidade não muda). Raridades maiores custam mais.',
  '・同じ装備・同じレアリティを3つ集めると、鍛冶屋の「合成」（倉庫の詳細カードからも）で1つ上のレアリティを狙えます。成功率はコモン→レア80%（20G）、レア→エピック50%（100G）、エピック→レジェンダリー25%（500G）。失敗すると、材料と同じレアリティのランダムな装備が1つ手に入ります。追加効果と出口の向きは新しく決まります。':
    '• Junte 3 do mesmo item com a mesma raridade e use "Fundir" no Ferreiro (ou no cartão de detalhes no Armazém) para tentar a próxima raridade. Chances: Comum→Raro 80% (20G), Raro→Épico 50% (100G), Épico→Lendário 25% (500G). Se falhar, você ganha 1 item aleatório da mesma raridade. Os bônus e as direções das saídas são sorteados de novo.',
  設定: 'Ajustes',
  ヘルプ: 'Ajuda',
  ランキング: 'Ranking',
  挑戦: 'Desafio',
  倉庫: 'Armazém',
  鍛冶屋: 'Ferreiro',
  図鑑: 'Compêndio',
  出撃: 'Partir!',
  '倉庫があふれています。売却するまで出撃できません':
    'O Armazém está lotado. Venda alguns itens para poder partir.',
  冒険の記録: 'Diário de Aventura',
  '出撃|stat': 'Expedições',
  '{n}回': '{n}',
  最大連鎖: 'Corrente Máx.',
  '{n}連鎖': '{n}',
  最大ダメージ: 'Dano Máx.',
  開放した地域: 'Regiões Desbloqueadas',
  '{region} {n}周': '{region} (volta {n})',
  '最高到達: {list}': 'Recorde: {list}',
  '　|sep': '  ·  ',
  まだありません: 'Nada ainda',
  ロック中: 'Travado',
  '売る {price}G': 'Vender {price}G',
  編成で使っている装備: 'Item Usado em Conjunto',
  '{presets}で使っています。\n売ると、その編成のマスは空きになります':
    'Usado em {presets}.\nSe você vender, a casa dele nesse Conjunto fica vazia.',
  売る: 'Vender',
  アーティファクトを売る: 'Vender Artefato',
  '{item}を{price}Gで売ります': 'Vender {item} por {price}G?',
  ロック中の装備は売れません: 'Itens travados não podem ser vendidos',
  'ほかの編成で使っている装備です（詳細から売れます）':
    'Usado em outro Conjunto (dá para vender pelos detalhes)',
  '売るものをタップで選ぶ（もう一度で外す・長押しで詳細）':
    'Toque nos itens para escolher (toque de novo para desmarcar, segure para ver detalhes)',
  '自動売却：オフ': 'Autovenda: Desligada',
  '自動売却：{rarity}（✦は残す）': 'Autovenda: {rarity} (guarda ✦)',
  '自動売却：{rarity}': 'Autovenda: {rarity}',
  '自動売却：{rarity}以下（✦は残す）': 'Autovenda: {rarity} ou inferior (guarda ✦)',
  '自動売却：{rarity}以下': 'Autovenda: {rarity} ou inferior',
  '{n}個を売ります（+{gold}G）': 'Itens a vender: {n} (+{gold}G)',
  '{n}個を売る +{gold}G': 'Vender ×{n} +{gold}G',
  選んで売る: 'Escolher Itens',
  やめる: 'Cancelar',
  まとめて売る: 'Vender Vários',
  '{rarity}  {n}個 +{gold}G': '{rarity}  ×{n} +{gold}G',
  '{rarity}以下  {n}個 +{gold}G': '{rarity} ou inferior  ×{n} +{gold}G',
  '{rarity}を一括売却': 'Venda em Lote: {rarity}',
  '{rarity}以下を一括売却': 'Venda em Lote: {rarity} ou inferior',
  '消耗品  {n}個 +{gold}G': 'Consumíveis  ×{n} +{gold}G',
  消耗品を一括売却: 'Venda em Lote: Consumíveis',
  '✦付きは残す：オン': 'Guardar itens ✦: Sim',
  '✦付きは残す：オフ': 'Guardar itens ✦: Não',
  一括売却: 'Venda em Lote',
  '装備中・ロック中・編成で使用中・アーティファクトは売りません':
    'Itens equipados, travados ou em Conjuntos e Artefatos nunca são vendidos',
  向きの付け直し: 'Reforjar',
  合成: 'Fundir',
  この装備は向きを付け直せません: 'Este item não pode ser reforjado',
  装備中: 'Equipado',
  付け直す装備を選んでください: 'Escolha um item para reforjar',
  '出口の数は変わらず、方向だけが変わります': 'O número de saídas não muda; só as direções',
  '付け直し {n}回（毎回 料金×1.5）': 'Reforjado ×{n} (custo ×1.5 a cada vez)',
  '再抽選 {gold}G': 'Sortear {gold}G',
  ゴールドが足りません: 'Ouro insuficiente',
  '無料で再抽選（今日あと{n}回）': 'Sorteio Grátis (mais {n} hoje)',
  '▶ 広告を見て無料で再抽選（今日あと{n}回）': '▶ Ver Anúncio: Sorteio Grátis (mais {n} hoje)',
  '指定: {n}方向を選ぶ': 'Escolher direções ({n})',
  '指定 {gold}G': 'Escolher {gold}G',
  '方向を{n}つ選んでください': 'Escolha as direções das saídas ({n})',
  強化: 'Melhorar',
  '最大HP {hp}（★{stars}で+{bonus}込み）': 'HP Máximo {hp} (com +{bonus} de ★{stars})',
  '最大HP {hp}': 'HP Máximo {hp}',
  '攻撃間隔 {sec}秒': 'Intervalo de Ataque {sec}s',
  '攻撃倍率 ×{mult}（★{stars}で+{bonus}%込み）':
    'Multiplicador de Ataque ×{mult} (com +{bonus}% de ★{stars})',
  '攻撃倍率 ×{mult}': 'Multiplicador de Ataque ×{mult}',
  '出撃 {sec}秒（延長込みの上限 {max}秒）': 'Tempo de Expedição {sec}s (máx. {max}s com extensões)',
  '出撃 {sec}秒': 'Tempo de Expedição {sec}s',
  '{w}×{h}マス': 'Grade {w}×{h}',
  '{n}枠': 'Espaços: {n}',
  '{n}個': 'Capacidade: {n}',
  最大: 'MÁX',
  切替: 'Alternar',
  音量: 'Volume',
  ゲームスピード: 'Velocidade do Jogo',
  '検証用。×2 なら30秒のランが15秒で終わります':
    'Para testes. Em ×2, uma expedição de 30 segundos termina em 15.',
  'プレミアム（購入済み）': 'Premium (Comprado)',
  'プレミアム {price}': 'Premium {price}',
  広告なしでご褒美を受け取れます: 'Receba recompensas sem anúncios',
  'プレミアムになりました！': 'Agora você é Premium!',
  購入を復元: 'Restaurar Compras',
  購入を復元しました: 'Compras restauradas',
  復元できる購入はありません: 'Nenhuma compra para restaurar',
  '遊び方・強くなるコツ': 'Como Jogar e Dicas',
  案内をもう一度: 'Rever Tutorial',
  '各画面で、案内がもう一度出ます': 'O tutorial de cada tela vai aparecer de novo',
  振動: 'Vibração',
  '画面揺れ・光': 'Tremor e Flash da Tela',
  言語: 'Idioma',
  '{auto}（{lang}）': '{auto} ({lang})',
  自動: 'Automático',
  端末の言語: 'idioma do aparelho',
  'オフ（売らない）': 'Desligada (não vende)',
  コモンを売る: 'Vender Comum',
  レア以下を売る: 'Vender Raro ou inferior',
  エピック以下を売る: 'Vender Épico ou inferior',
  自動売却: 'Autovenda',
  'ラン後に戦利品から売ります。消耗品・アーティファクトは売りません':
    'Vende do seu espólio após cada expedição. Consumíveis e Artefatos nunca são vendidos.',
  'ようこそ！\n勇者が自動で進んで、敵と戦うゲームだよ。\nまずは「出撃」を押してみよう！':
    'Boas-vindas!\nSeu herói avança e enfrenta os inimigos sozinho. Para começar, toque em "Partir!"',
  '装備は「配置」でバックパックに並べるよ。\n拾った装備もここで置ける。\n「配置」を押してね':
    'Em "Equipar", você organiza os itens na mochila. Os itens que você pegar também vão para lá. Toque em "Equipar"!',
  '鍛冶屋では、装備の出口の向きを変えたり、\n同じ装備を3つ集めて「合成」して\n上のレアリティを狙えるよ':
    'No Ferreiro, você pode mudar a direção das saídas de um item ou "Fundir" 3 itens iguais para tentar uma raridade maior.',
  '合成 {gold}G': 'Fundir {gold}G',
  '合成 {have}/3': 'Fundir {have}/3',
  '{item}（{rarity}）を3つ使って、{target}の{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    'Use 3 × {item} ({rarity}) para tentar subir para {target} ({to}) por {gold}G.\nChance de sucesso: {rate}%. Se falhar, você ganha 1 item {rarity} aleatório.',
  '{item}（{rarity}）を3つ使って、{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    'Use 3 × {item} ({rarity}) para tentar subir para {to} por {gold}G.\nChance de sucesso: {rate}%. Se falhar, você ganha 1 item {rarity} aleatório.',
  合成する: 'Fundir',
  ロック: 'Travado',
  '{n}つ': '×{n}',
  合成する装備を選んでください: 'Escolha um item para fundir',
  '同じ装備・同じレアリティを3つで、1つ上のレアリティに':
    '3 do mesmo item e raridade → a próxima raridade',
  '「○つ」の印は、3つ以上揃っている装備です':
    'A marca "×○" indica que você tem 3 ou mais desse item',
  '{rarity} ×3 → {target}の{to} ×1': '{rarity} ×3 → {target} ({to}) ×1',
  '{rarity} ×3 → {to} ×1': '{rarity} ×3 → {to} ×1',
  '使える数: {n}つ（装備中・ロック中・ほかの編成で使用中は除く）':
    'Disponíveis: ×{n} (sem contar equipados, travados ou usados em outros Conjuntos)',
  '成功率 {rate}%': 'Chance de sucesso: {rate}%',
  '失敗すると{rarity}のランダムな装備が1つ（追加効果・向きは新しく）':
    'Se falhar: 1 item {rarity} aleatório (bônus e saídas novos)',
  '合成する {gold}G': 'Fundir {gold}G',
  合成できません: 'Indisponível',
  '合成中…': 'Fundindo…',
  タップで閉じる: 'Toque para fechar',
  '合成成功！': 'Sucesso!',
  '失敗…': 'Falhou…',
  実績: 'Conquistas',
  '2週替わりの挑戦': 'Desafio Quinzenal',
  'エンドレス（月ごと）': 'Infinito (Mensal)',
  挑戦はまだ始まっていません: 'O Desafio ainda não começou',
  '（初めて記録を送るときに決まります）': '(definido quando você enviar sua primeira pontuação)',
  'あなたの名前: {name}': 'Seu nome: {name}',
  変える: 'Mudar',
  つながりませんでした: 'Não foi possível conectar',
  'シーズンの終わりに: 上位1% {top1}G＋称号 / 上位10% {top10}G＋称号 / 上位50% {top50}G＋称号 / 参加 {joined}G':
    'No fim da temporada: Top 1% {top1}G + título / Top 10% {top10}G + título / Top 50% {top50}G + título / Participação {joined}G',
  'ランキングは、サーバーの準備ができたら開きます':
    'O ranking abre quando o servidor estiver pronto',
  '挑戦が始まったら、ここに順位が出ます': 'As posições aparecem aqui quando o Desafio começar',
  '読み込み中…': 'Carregando…',
  'あなた: {rank}位 / {total}人（上位{pct}%）': 'Você: #{rank} de {total} (top {pct}%)',
  'まだ記録がありません（参加 {total}人）': 'Ainda sem pontuação (jogadores: {total})',
  '{loop}周・{damage}': 'Volta {loop} · {damage}',
  まだ誰も記録していません: 'Ninguém pontuou ainda',
  '{season}: {rank}位 / {total}人（{band}）  +{gold}G':
    '{season}: #{rank} de {total} ({band})  +{gold}G',
  '新しい装飾品: {list}': 'Novos cosméticos: {list}',
  ランキングの報酬: 'Recompensas do Ranking',
  受け取る: 'Receber',
  装飾品: 'Cosméticos',
  戻る: 'Voltar',
  '挑戦で上位に入るともらえる、見た目だけの装飾品':
    'Cosméticos para quem fica no topo dos Desafios. Só mudam o visual.',
  冒険者: 'Aventureiro',
  挑戦で上位に入るともらえます: 'Ganhe ficando no topo de um Desafio',
  勇者の色: 'Cores do Herói',
  いつもの色: 'Padrão',
  ペット: 'Mascote',
  なし: 'Nenhum',
  '名前の飾り（ランキング）': 'Enfeite do Nome (Ranking)',
  使用中: 'Em Uso',
  '{band}でもらえる': 'Prêmio: {band}',
  '舞台: {region}': 'Região: {region}',
  '・{rule}': '• {rule}',
  'リリースから2週間後に開放！': 'Abre 2 semanas após o lançamento!',
  '開放まで あと{n}日': 'Abre em {n}d',
  '2週間ごとに、地域と制限が入れ替わります。': 'A cada 2 semanas, a região e as regras mudam.',
  '全員が同じ敵の並びに、自分の装備で挑み、合計ダメージを競います。':
    'Todos enfrentam os mesmos inimigos com o próprio equipamento e competem pelo dano total.',
  '強化と★は使わず、勇者は最初の強さ。並べ方の腕が勝負です。':
    'Sem melhorias nem bônus de ★: o herói tem a força inicial. Tudo depende de como você organiza.',
  '装備とゴールドは出ません。': 'Não cai equipamento nem ouro.',
  '残り {days}日{hours}時間': 'Termina em {days}d {hours}h',
  '自己ベスト {score}': 'Recorde: {score}',
  まだ挑戦していません: 'Ainda não tentou',
  '装備 {n}個・起点 {origins}個': 'Itens: {n} · Origens: {origins}',
  まだ組んでいません: 'Ainda não montado',
  挑戦用の編成: 'Conjunto do Desafio',
  この編成で挑戦できます: 'Este Conjunto está pronto para o Desafio',
  'ふだんの編成から組みました。並べ方を詰めよう':
    'Montado a partir da sua mochila de sempre. Agora refine a organização!',
  ふだんの編成から組む: 'Copiar Mochila',
  '今の挑戦用の編成を、ふだんの編成をもとに組み直します。\n制限に合わない装備は、同じ種類の使える装備に入れ替えます。':
    'Remonta o Conjunto do Desafio a partir da sua mochila de sempre.\nItens que quebram as regras são trocados por itens permitidos do mesmo tipo.',
  組み直す: 'Remontar',
  '出撃できる形まで組むだけ。並べ方を詰めるのはあなた次第':
    'Só monta algo pronto para partir. O ajuste fino é com você.',
  編成する: 'Editar Conjunto',
  挑戦する: 'Desafiar!',
  挑戦用の編成を組んでください: 'Monte primeiro o Conjunto do Desafio',
  編成が制限に合っていません: 'Seu Conjunto não segue as regras',
  '達成 {done} / {total}': 'Concluídas {done} / {total}',
  達成: 'Feito',
  '見つけた必殺技 {found} / {total}': 'Golpes Especiais descobertos {found} / {total}',
  '発動：{hint}': 'Ordem: {hint}',
  '3つ目の一撃がダメージ×2.5、勇者が大きく踏み込む':
    'O 3º golpe causa ×2.5 de dano e o herói avança com tudo',
  '？？？': '???',
  'ヒント：{teaser}': 'Dica: {teaser}',
  'プレミアム：広告なしでご褒美を受け取れます': 'Premium: receba recompensas sem anúncios',
  'プレミアム {price}｜広告なしでご褒美がもらえる': 'Premium {price} | Recompensas sem anúncios',
  '詳しく ›': 'Mais ›',
  'プレミアム {price}（買い切り）': 'Premium {price} (compra única)',
  '広告を見なくても、ご褒美をすぐ受け取れます。\n・結果画面「戦利品を2倍にする」\n・鍛冶屋「無料で再抽選」\n・力尽きたときの「再開」\n（回数はそのまま。強さは変わりません）':
    'Receba as recompensas na hora, sem ver anúncios:\n• Resultados: "Dobrar Espólio"\n• Ferreiro: "Sorteio Grátis"\n• Ao cair: "Reviver"\n(Os limites diários são os mesmos. Não deixa você mais forte.)',
  購入する: 'Comprar',

  // src/scenes/DummyScene.ts
  カカシで試し撃ち: 'Treino no Boneco',
  '「発火」で次の起点を撃つ': 'Toque em "Disparar!" para ativar a próxima Origem',
  発火: 'Disparar!',
  配置: 'Equipar',
  '起点{origin} 発火中…': 'Origem {origin} disparando…',
  '総ダメージ {n}': 'Dano total {n}',
  '持続（無防備） {sec}秒': 'Duração (desprotegido) {sec}s',
  '防御値 +{n}': 'Defesa +{n}',
  'コンボ {list}': 'Combos {list}',
  'シンクロボーナス +{n}%': 'Bônus de sincronia +{n}%',

  // src/scenes/LoadoutScene.ts
  '↶ 戻す': '↶ Desfazer',
  全部外す: 'Tirar Tudo',
  使えない: 'Proibido',
  挑戦へ: 'Desafio',
  '下は倉庫。装備を少し押さえてから、\nバックパックへドラッグして置こう':
    'Abaixo fica o Armazém. Segure um item por um instante e arraste para a mochila.',
  '起点（番号の石）から、矢印の向きに\nつながった装備が順番に攻撃するよ。\n後ろの装備ほどダメージが大きい！':
    'A partir de uma Origem (a pedra numerada), os itens conectados atacam em ordem seguindo as setas. Os últimos elos causam mais dano!',
  '「約」の数字が大きいほど強い並べ方。\nいろいろ試してみよう！':
    'Quanto maior o número "~", mais forte a organização. Teste várias ideias!',
  '「約」の数字は敵1体に撃ったときの推定ダメージ（コンボ・会心込み）':
    'Os números "~" são o dano estimado contra um inimigo (com combos e críticos)',
  '2本の線を、同じ連鎖数でシンクロさせよう！\n長いほどボーナスアップ':
    'Sincronize 2 linhas com o mesmo número de elos! Quanto mais longas, maior o bônus.',
  '起点は1つずつ、順番に発火するよ。\nシンクロしたマスには「4+4 +30%」のように\n連鎖数とボーナスが出る':
    'As Origens disparam uma de cada vez, em ordem. A casa da sincronia mostra os elos e o bônus, como "4+4 +30%".',
  '起点が0個です。出撃できません': 'Nenhuma Origem colocada. Não dá para partir.',
  '倉庫があふれています（タップで売却）': 'Armazém lotado (toque para vender)',
  全部: 'Tudo',
  線を消す: 'Ocultar Linhas',
  線なし: 'Sem Linhas',
  番号を選ぶと表示に戻す: 'Escolha um número para mostrar as linhas de novo',
  起点を置いてください: 'Coloque uma Origem',
  '合計 約{n}': 'Total ~{n}',
  '約{n}・{step}連鎖・{tech}': '~{n} · Corrente {step} · {tech}',
  '必殺技|fallback': 'Golpe Especial',
  '約{n}・{step}連鎖・コンボ{combo}': '~{n} · Corrente {step} · Combos {combo}',
  '約{n}・{step}連鎖・シンクロ+{bonus}%': '~{n} · Corrente {step} · Sincronia +{bonus}%',
  '約{n}・{step}連鎖': '~{n} · Corrente {step}',
  診断: 'Análise',
  配置の診断: 'Análise da Mochila',
  'いまの推定ダメージ 合計 約{n}': 'Estimativa atual: ~{n} no total',
  'いまの装備では、これ以上の手は見つかりませんでした。\nいい並べ方です！':
    'Nenhuma jogada melhor com o equipamento atual.\nÓtima organização!',
  '+約{n}': '+~{n}',
  '（+{pct}%）': '(+{pct}%)',
  場所を見る: 'Ver Local',
  閉じる: 'Fechar',
  '挑戦「{name}」用': 'Desafio: {name}',
  制限に合わせる: 'Seguir Regras',
  '{name} に切り替えました': 'Trocado para {name}',
  もう制限に合っています: 'Já segue as regras',
  '制限に合わせました。並べ方を詰めよう': 'Pronto, dentro das regras. Agora refine a organização!',
  '合う装備が足りず、空いたマスがあります':
    'Faltam itens permitidos, então algumas casas ficaram vazias',
  '編成の名前（8文字まで）': 'Nome do Conjunto (até 8 caracteres)',
  '消耗品|slots': 'Consumíveis',
  '自動|refill': 'Auto',
  ひとつ前の並べ方に戻しました: 'Última mudança desfeita',
  'バックパックと消耗品枠の {n}個をすべて倉庫に戻します。\n起点の発火順もリセットされます。':
    'Devolve tudo da mochila e dos espaços de consumíveis ao Armazém (×{n}).\nA ordem de disparo das Origens também é reiniciada.',
  置きたいマスをタップ: 'Toque numa casa para colocar',
  外す: 'Remover',
  発火順を前へ: 'Disparar Antes',
  枠に入れる: 'Pôr no Espaço',
  枠がいっぱい: 'Espaços Cheios',
  置く: 'Colocar',
  あふれた分を売る: 'Vender Excesso',
  '安いものから{n}個を売って倉庫に収めます\n（+{gold}G）':
    'Vende os itens mais baratos (×{n}) para caber no Armazém.\n(+{gold}G)',

  // src/scenes/ResultScene.ts
  '体験おわり！': 'Fim da Demo!',
  '力尽きた…': 'Você caiu…',
  '撤退！': 'Recuou!',
  ランキングに記録しました: 'Pontuação salva no Ranking',
  シェア: 'Compartilhar',
  '画像を保存しました（文はコピー済み）': 'Imagem salva (texto copiado)',
  画像を作れませんでした: 'Não foi possível criar a imagem',
  '挑戦「{name}」・{region}': 'Desafio "{name}" · {region}',
  'スコア {score}': 'Pontuação {score}',
  '到達 {loop}周目': 'Chegou à Volta {loop}',
  ボス撃破: 'Chefes Derrotados',
  '発火|stat': 'Correntes Disparadas',
  ゴールド: 'Ouro',
  一網打尽: 'Faxinas',
  '自己ベスト！': 'Novo Recorde!',
  '★×{n}獲得！': 'Ganhou ★×{n}!',
  '★獲得！': 'Ganhou ★!',
  '★ボーナス: 攻撃+{atk}%・最大HP+{hp}': 'Bônus de ★: Ataque +{atk}% · HP Máximo +{hp}',
  '新しい地域「{region}」が開放された！': 'Nova região desbloqueada: {region}!',
  '戦利品 {n}': 'Espólio: {n}',
  '自動売却 {n}個 +{gold}G': 'Autovenda ×{n} +{gold}G',
  '消耗品を{n}個 補充': 'Consumíveis repostos ×{n}',
  '借りた伝説の装備は、お返ししたよ\n（体験なので戦利品はなし）':
    'O equipamento lendário emprestado foi devolvido.\n(Era uma demo, então não há espólio.)',
  '挑戦「{name}」': 'Desafio "{name}"',
  'スコア（合計ダメージ） {score}': 'Pontuação (dano total) {score}',
  '自己ベスト {best}（更新！）': 'Recorde {best} (novo!)',
  '自己ベスト {best}': 'Recorde {best}',
  エンドレスは装備が出ません: 'No Infinito não cai equipamento',
  '自己ベスト {loop}周目・ダメージ {damage}': 'Recorde: Volta {loop} · Dano {damage}',
  戦利品なし: 'Sem espólio',
  タップで能力を確認: 'Toque num item para ver os atributos',
  タップで早送り: 'Toque para acelerar',
  '戦利品を2倍にする（今日あと{n}回）': 'Dobrar Espólio (mais {n} hoje)',
  '▶ 広告を見て戦利品を2倍にする（今日あと{n}回）': '▶ Ver Anúncio: Dobrar Espólio (mais {n} hoje)',
  '戦利品 {n}（×2）': 'Espólio: {n} (×2)',
  '広告のボーナス +{n}個（自動売却 {sold}個 +{gold}G）':
    'Bônus do anúncio +{n} (autovenda ×{sold} +{gold}G)',
  '広告のボーナス +{n}個': 'Bônus do anúncio +{n}',
  拠点へ: 'Ir à Base',
  配置へ: 'Equipar',
  自分で出撃: 'Sua Vez!',
  もう一度: 'Jogar de Novo',
  倉庫があふれています: 'Armazém lotado',
  起点がありません: 'Sem Origem',
  'これが伝説の装備の力！\n最大{step}連鎖、{damage}ダメージ！':
    'Esse é o poder do equipamento lendário!\nCorrente de até {step} elos e {damage} de dano!',
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、\nいつかこの姿に！':
    'Daqui em diante, aventure-se com seu próprio equipamento. Junte e organize itens, e um dia você vai ficar forte assim!',
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、いつかこの姿に！\n「自分で出撃」を押してね':
    'Daqui em diante, aventure-se com seu próprio equipamento. Junte e organize itens, e um dia você vai ficar forte assim! Toque em "Sua Vez!"',
  '宝箱から装備をゲット！\n開いたあとにタップすると、能力が見られるよ':
    'Você ganhou itens dos baús!\nToque num item depois que ele abrir para ver os atributos.',
  '敵を倒すと、宝箱から装備が手に入るよ。\n開いたあとにタップすると、能力が見られる':
    'Derrote inimigos para ganhar itens dos baús. Toque num item depois que ele abrir para ver os atributos.',
  '拾った装備は、拠点の「配置」で\nバックパックに置くと強くなるよ':
    'Coloque os itens que você encontrou na mochila em "Equipar", na Base, para ficar mais forte.',
  '装備を拾ったら、拠点の「配置」で\nバックパックに置くと強くなるよ':
    'Quando encontrar itens, coloque-os na mochila em "Equipar", na Base, para ficar mais forte.',

  // src/scenes/RunScene.ts
  '今回だけ、伝説の装備を借りてきたよ！\n装備を集めると、いつかこうなる！':
    'Só desta vez, você pegou equipamento lendário emprestado! Junte itens e um dia você vai ficar forte assim!',
  'バックパックの装備は、起点（番号の石）から\n矢印の向きに順番に攻撃するよ。\nこれが「連鎖」！':
    'Os itens da mochila atacam em ordem, começando por uma Origem (a pedra numerada) e seguindo as setas. Isso é uma "corrente"!',
  '起点（番号の石）から矢印の向きに、\n装備が順番に攻撃するよ。これが「連鎖」！\n長くつながるほど、ダメージが大きくなる':
    'A partir de uma Origem (a pedra numerada), os itens atacam em ordem seguindo as setas. Isso é uma "corrente"! Quanto mais longa a corrente, maior o dano.',
  '勇者の足元のゲージがたまるたびに、\n起点が①→②→①…の順に発火するよ。\n次に動く起点は「次の連鎖」に出る':
    'Cada vez que a barra aos pés do herói enche, as Origens disparam em ordem: ①→②→①… A próxima a disparar aparece em "Próxima Corrente".',
  '勇者は自動で進んで戦うよ。\n群れをまとめて倒したり、ボスを倒すと\n時間がのびる！':
    'Seu herói avança e luta sozinho. Derrote um grupo inteiro de uma vez ou um chefe para ganhar mais tempo!',
  '残り時間。ふだんは0になるか、\nHPがなくなると終わり':
    'Tempo restante. Normalmente, a expedição acaba quando ele chega a 0 ou quando seu HP acaba.',
  '残り時間。0になるか、HPがなくなると終わり。\n拾った装備は持ち帰れるよ':
    'Tempo restante. A expedição acaba quando ele chega a 0 ou quando seu HP acaba. Você fica com os itens que pegar.',
  '止めたいときはここ。撤退もできるよ。\nさあ、伝説の力を見てみよう！':
    'Toque aqui para pausar. Dá para recuar também. Agora, veja o poder lendário em ação!',
  '止めたいときはここ。撤退もできるよ': 'Toque aqui para pausar. Dá para recuar também.',
  '{n}周目': 'Volta {n}',
  次の連鎖: 'Próxima Corrente',
  一時停止中: 'Pausado',
  再開: 'Continuar',
  撤退する: 'Recuar',
  ここまでの戦利品を持ち帰ります: 'Você fica com o espólio obtido até agora',
  '{region}　{loop}周目　×{speed}': '{region}  Volta {loop}  ×{speed}',
  '{region}　{loop}周目': '{region}  Volta {loop}',
  '防御 {n}': 'Defesa {n}',
  '連鎖中！': 'Encadeando!',
  '{step}連鎖・{sec}秒': 'Corrente {step} · {sec}s',
  '{step}連鎖・{sec}秒・シンクロ+{bonus}%': 'Corrente {step} · {sec}s · Sincronia +{bonus}%',
  'FPS {fps}  敵 {enemies}  粒 {particles}  数字 {numbers}  seed {seed}':
    'FPS {fps}  inimigos {enemies}  partículas {particles}  números {numbers}  seed {seed}',
  '時間 +{sec}': 'Tempo +{sec}',
  '時間 上限': 'Tempo Máx.',
  '{loop}周目のボス　{name}': 'Chefe da Volta {loop}  {name}',
  'NEW RECORD! 最大連鎖': 'NOVO RECORDE! Corrente Máx.',
  'NEW RECORD! 最大ダメージ': 'NOVO RECORDE! Dano Máx.',
  無効: 'Bloqueado',
  '激昂！': 'Enfurecido!',
  'アーティファクト！ {name}': 'Artefato! {name}',
  'よろめき！': 'Cambaleou!',
  '一網打尽！': 'Faxina!',
  'ボス撃破！': 'Chefe Derrotado!',
  'ぴったりシンクロ！ +{bonus}%': 'Sincronia Perfeita! +{bonus}%',
  'シンクロ！ +{bonus}%': 'Sincronia! +{bonus}%',
  'シンクロ！': 'Sincronia!',
  '復活！': 'Reviveu!',
  '再開する（HP全回復・+{sec}秒）': 'Reviver (HP cheio, +{sec}s)',
  '▶ 広告を見て再開（HP全回復・+{sec}秒）': '▶ Ver Anúncio: Reviver (HP cheio, +{sec}s)',
  あきらめる: 'Desistir',
  '1回のランで1回だけ再開できます': 'Você só pode reviver uma vez por expedição',

  // src/scenes/StageSelectScene.ts
  地域を選ぶ: 'Escolha a Região',
  '出撃！': 'Partir!',
  起点がバックパックにありません: 'Não há Origem na mochila',
  '出撃する地域を選ぶよ。最初は「草原」。\n奥の地域ほど敵は強いけど、\nいい装備が出やすいよ':
    'Escolha para onde ir. Comece pela "Pradaria". Regiões mais avançadas têm inimigos mais fortes, mas dão itens melhores com mais frequência.',
  '準備ができたら「出撃！」': 'Tudo pronto? Toque em "Partir!"',
  '「出撃！」を押して、冒険に出よう！': 'Toque em "Partir!" para começar sua aventura!',
  '敵HP×{hp}〜 攻撃×{atk}〜\n装備・ゴールドは出ない':
    'HP inimigo ×{hp}+  Ataque ×{atk}+\nSem equipamento nem ouro',
  '敵HP×{hp} 攻撃×{atk}\nレア以上 +{pct}%':
    'HP inimigo ×{hp}  Ataque ×{atk}\nRaro ou melhor +{pct}%',
  '最高{n}周': 'Recorde: Volta {n}',
  記録なし: 'Sem recorde',
  '最高{n}周 {stars}': 'Recorde: Volta {n} {stars}',
  '未到達 {stars}': 'Sem recorde {stars}',
  '雑魚: {trend}': 'Inimigos: {trend}',
  'ボス: 全地域から毎周ランダム\n最高ダメージ {damage}':
    'Chefes: aleatórios de todas as regiões a cada volta\nRecorde de dano: {damage}',
  '{n}周目〜': 'Volta {n}+',
  '装備とゴールドは出ない。到達周回と与えたダメージで自己ベストを目指す':
    'Sem equipamento nem ouro. Busque seu recorde de voltas alcançadas e de dano causado.',
  '{note}（ボスはアイコンをタップで特徴）': '{note} (toque no ícone de um chefe para ver detalhes)',
  'ボスは出撃ごとに候補から選ばれます（{n}種）。アイコンをタップで特徴':
    'Os chefes de cada expedição saem desta lista ({n}). Toque num ícone para ver detalhes.',
  魔王城で魔王を倒すと開放: 'Desbloqueia ao derrotar o Rei Demônio no Castelo Demoníaco',
  前の地域の3周目のボスを倒すと開放:
    'Desbloqueia ao derrotar o chefe da volta 3 da região anterior',

  // src/ui/achievementToast.ts
  '実績達成！': 'Conquista Desbloqueada!',

  // src/ui/backpackView.ts
  '必殺 {step}連鎖': 'Especial #{step}',
  '{step}連鎖 ×{mult}': '#{step} ×{mult}',

  // src/ui/chestReveal.ts
  '売却|sold': 'Vendido',
  広告: 'Anúncio',

  // src/ui/discovery.ts
  図鑑に登録: 'Adicionado ao Compêndio',
  'NEW  必殺技を発見！': 'NOVO  Golpe Especial descoberto!',
  '【{name}】': '“{name}”',

  // src/ui/itemInfo.ts
  上: 'Cima',
  右: 'Direita',
  下: 'Baixo',
  左: 'Esquerda',
  'アーティファクト（能力 ×{x}・出口の数は固定）':
    'Artefato (atributos ×{x}, número de saídas fixo)',
  消耗品: 'Consumível',
  '{rarity}（能力 ×{x}）': '{rarity} (atributos ×{x})',
  '出口: {dirs}': 'Saídas: {dirs}',
  'なし（末端）': 'Nenhuma (fim da corrente)',
  '攻撃力 {atk}（{element}・{area}）': 'Ataque {atk} ({element}, {area})',
  '次への伝達 {s}秒': 'Tempo de repasse {s}s',
  '{n}回攻撃（連鎖数は1つ）': 'Golpes ×{n} por elo',
  '会心率 +{pct}%': 'Taxa crítica +{pct}%',
  '付与: {status} → {element}で{combo}': 'Aplica: {status} → {combo} com {element}',
  '付与: {status}': 'Aplica: {status}',
  '{status}を消費して{combo}（×{x}、範囲に拡大）':
    'Consome o efeito {status}: {combo} (×{x}, se espalha numa área)',
  '{status}を消費して{combo}（×{x}）': 'Consome o efeito {status}: {combo} (×{x})',
  '防御値 +{n}（連鎖が通ると終了時に加算、連鎖数に数えない）':
    'Defesa +{n} (somada quando termina uma corrente que passa por aqui; não conta como elo)',
  '連鎖の始まり。攻撃せず、連鎖数にも数えない':
    'Começa uma corrente. Não ataca e não conta como elo.',
  '付け直し {n}回': 'Reforjado ×{n}',
  '売却 {price}G': 'Vende por {price}G',
  アーティファクト: 'Artefato',
  起点: 'Origem',
  防御: 'Defesa',
  出口: 'Saídas',
  攻撃力: 'Ataque',
  '強化込み {n}': 'Com melhorias {n}',
  全体攻撃: 'Atinge Todos',
  '威力 ×{x}': 'Poder ×{x}',
  貫通: 'Perfuração',
  '狙いの後ろ {n}体にも同じダメージ': 'Mesmo dano a mais {n} atrás do alvo',
  連撃: 'Multigolpe',
  会心率: 'Taxa Crítica',
  連鎖倍率の上限: 'Mult. Máximo',
  この環を通る連鎖すべて: 'Toda corrente que passa por este anel',
  吸血: 'Roubo de Vida',
  '与えたダメージの{pct}%を回復': 'Cura {pct}% do dano causado',
  疾風: 'Vendaval',
  'このあとの装備は連鎖数+{n}': 'Itens seguintes contam como elo +{n}',
  '5秒間、一撃の30%を毎秒': '30% do golpe por segundo, durante 5s',
  付与: 'Aplica',
  '濡れ・油・凍結をまとめて': 'Molhado, Óleo e Congelado de uma vez',
  次への伝達: 'Repasse',
  '{s}秒': '{s}s',
  防御値: 'Defesa',
  連鎖終了時に加算: 'Somada no fim da corrente',
  守り: 'Guarda',
  連鎖中も無防備にならない: 'Nunca desprotegido nas correntes',
  バックパックにある限り: 'Enquanto estiver na mochila',
  この配置: 'Nesta Mochila',
  どの起点からも届きません: 'Nenhuma Origem alcança',
  '起点{origin}の{step}連鎖目 ×{mult}': 'Origem {origin}, elo {step} ×{mult}',
  '1ヒット 約{n}': '~{n} por golpe',
  '1ヒット 約{n}・シンクロ+{bonus}%': '~{n} por golpe · Sincronia +{bonus}%',
  '起点{origin}の連鎖': 'Corrente da Origem {origin}',
  連鎖数に数えない: 'Não conta como elo',
  '{status}を付ける → {element}の攻撃で{combo}（×{x}）':
    'Aplica {status} → ataques de {element} causam {combo} (×{x})',
  '{status}を付ける': 'Aplica {status}',
  '{status}の敵に当てると{combo}（×{x}・範囲に拡大）':
    'Contra alvos com efeito {status}: {combo} (×{x}, se espalha numa área)',
  '{status}の敵に当てると{combo}（×{x}）': 'Contra alvos com efeito {status}: {combo} (×{x})',
  ロックする: 'Travar',

  // src/ui/itemList.ts
  攻撃: 'Ataque',
  倉庫は空です: 'O Armazém está vazio',
  '★全部': '★Tudo',
  '★{rarity}': '★{rarity}',

  // src/ui/kit/chrome.ts
  '出撃 {n}回': 'Expedições: {n}',
  拠点: 'Base',

  // src/ui/pools.ts
  '会心 {n}': 'Crítico {n}',

  // src/ui/shareCard.ts
  '{loop}周目に到達': 'Chegou à Volta {loop}',
  '最大{step}連鎖': 'Corrente Máx. {step}',
  '最大ダメージ {damage}': 'Dano Máx. {damage}',

  // src/ui/tutorial.ts
  '光っているところをタップ（{n}/{total}）': 'Toque no ponto brilhante ({n}/{total})',
  'タップで次へ（{n}/{total}）': 'Toque para continuar ({n}/{total})',
  'スキップ ›': 'Pular ›',
  // src/scenes/BaseScene.ts (guides for the storage / smith / upgrade tabs)
  'ここは倉庫。バックパックに置いていない\n装備と消耗品が入っているよ':
    'Este é o Armazém. Os itens e consumíveis que não estão na mochila ficam aqui.',
  '使わない装備は「まとめて売る」や\n「一括売却」で、ゴールドにできるよ':
    'Transforme os itens que você não usa em ouro com "Vender Vários" ou "Venda em Lote".',
  '装備をタップすると、能力と\n「売る」などのボタンが出るよ。\n押してみよう':
    'Toque em um item para ver os atributos e botões como "Vender". Experimente!',
  '「{upgrade}」を強化してみよう！\n強化は、ずっと残るよ。\n押してみてね':
    'Experimente melhorar "{upgrade}"!\nAs melhorias são permanentes. Toque no botão!',
  '拾った装備は「倉庫」に入るよ。\n使わない装備は、売ってゴールドにできる。\n「倉庫」を押してね':
    'Os itens que você pega vão para o "Armazém". Você pode vender os que não usa para ganhar ouro. Toque em "Armazém"!',
  'ゴールドが貯まったね！\n「鍛冶屋」で、装備の出口の向きを\n変えられるよ。「鍛冶屋」を押してね':
    'Você juntou ouro!\nNo "Ferreiro", você pode mudar a direção das saídas de um item. Toque em "Ferreiro"!',
  'ゴールドが貯まったね！\n「強化」で、勇者をずっと強くできるよ。\n「強化」を押してね':
    'Você juntou ouro!\nEm "Melhorar", você deixa o herói mais forte para sempre. Toque em "Melhorar"!',
  '「再抽選」は、出口の向きがランダムに。\n「指定」は、好きな向きを選べるよ':
    '"Sortear" muda as saídas para direções aleatórias. Em "Escolher", você escolhe as direções.',
  'この装備をタップして、選んでみよう': 'Toque neste item para selecioná-lo.',
};
