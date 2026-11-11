// Spanish: screens and messages. Key: Japanese source string → value: translation
// (keep {placeholders} and the meaning of any '|context' key)
import type { Dict } from '../types';

export const UI: Dict = {
  // src/core/challenge.ts
  'レアリティは{rarity}まで（起点は問わない）': 'Rareza máx.: {rarity} (Orígenes: cualquiera)',
  アーティファクトは使えない: 'Sin Artefactos',
  '起点は{n}つまで': 'Orígenes máx.: {n}',
  '攻撃装備は {elements} だけ': 'Equipo de ataque: solo {elements}',
  '・|sep': ', ',
  防具は使えない: 'Sin armadura',
  '強化と★は使わない（勇者は最初の強さ）':
    'Sin mejoras ni bonos de ★ (héroe con su fuerza inicial)',
  'アーティファクト（{item}）は使えない': 'Artefactos no permitidos ({item})',
  '{rarity}より上の装備（{item}）がある': 'Equipo por encima de {rarity} ({item})',
  '使えない属性の装備（{item}）がある': 'Equipo con un elemento no permitido ({item})',
  '使えない種類の装備（{item}）がある': 'Equipo de un tipo no permitido ({item})',
  '起点が{n}つある（{max}つまで）': 'Orígenes: {n} (máx. {max})',
  起点がない: 'Sin Origen',

  // src/core/cosmetics.ts
  蒼のマント: 'Capa Azul',
  白銀の鎧: 'Armadura Plateada',
  黄金の鎧: 'Armadura Dorada',
  ちびドラゴン: 'Dragoncito',
  銅のメダル: 'Medalla de Bronce',
  銀の王冠: 'Corona de Plata',
  金の王冠: 'Corona de Oro',

  // src/core/diagnose.ts
  '必殺技の並びがそろう！': '¡Completa la secuencia de un Golpe Especial!',
  '何か特別なことが起きそうな並び…': 'Con este orden podría pasar algo especial…',
  状態異常のコンボが増える: 'Más combos de estado',
  '連鎖が{n}段まで長くなる': 'La cadena crece hasta el eslabón {n}',
  'もっと強い装備（レアリティ・攻撃力）に替える': 'Cambia a equipo más fuerte (rareza, Ataque)',
  空いているマスも連鎖に使う: 'Aprovecha las casillas vacías en la cadena',
  '強い装備が後ろの段（倍率が高い）に来る':
    'Mueve el equipo fuerte a los últimos eslabones (más multiplicador)',
  '「{a}」と「{b}」を入れ替える': 'Intercambia "{a}" y "{b}"',
  '「{a}」を倉庫の「{b}」に置きかえる': 'Reemplaza "{a}" por "{b}" del Almacén',
  '空いているマスに「{item}」を置く': 'Coloca "{item}" en una casilla vacía',
  'どの起点からも届いていない装備が{n}個': 'Objetos sin conexión a ningún Origen: {n}',
  '起点から矢印をたどって、つながる向きに置き直そう（光っているマス）':
    'Sigue las flechas desde los Orígenes y recoloca estos objetos para que conecten (casillas brillantes)',
  '起点{n}の連鎖が{step}段で止まっている':
    'La cadena del Origen {n} se detiene en el eslabón {step}',
  '長くつなぐほど後ろの段の倍率が上がる。出口の向きを鍛冶屋で変えるのも手':
    'Cuanto más larga la cadena, mayor el multiplicador de los últimos eslabones. También puedes cambiar la dirección de las salidas en la Herrería.',

  // src/core/economy.ts
  見つかりません: 'No encontrado',
  消耗品は合成できません: 'Los consumibles no se pueden fusionar',
  これ以上のレアリティはありません: 'Ya tiene la rareza máxima',
  '装備中は合成に使えません（外してから）':
    'No puedes fusionar objetos equipados (quítalo primero)',
  ロック中は合成に使えません: 'No puedes fusionar objetos bloqueados',
  '同じ装備があと{n}つ必要': 'Necesitas {n} más del mismo objeto',
  '{cost}G 必要': 'Necesitas {cost}G',

  // src/core/presets.ts
  '編成{n}': 'Conjunto {n}',

  // src/core/ranking.ts
  '挑戦 第{n}回': 'Desafío #{n}',
  'エンドレス {month}': 'Infinito ({month})',
  '上位1%': 'Top 1%',
  '上位10%': 'Top 10%',
  '上位50%': 'Top 50%',
  参加: 'Participación',
  '{season} {title}': '{season}: {title}',

  // src/core/shareText.ts
  '挑戦「{name}」でスコア {score}！': '¡Puntuación de {score} en el Desafío "{name}"!',
  'エンドレスで{loop}周目に到達！': '¡Vuelta {loop} alcanzada en Infinito!',
  '{region}で{loop}周目に到達！': '¡Vuelta {loop} alcanzada en {region}!',
  '最大連鎖 {step}段・最大ダメージ {damage}': 'Cadena máx. {step} · Daño máx. {damage}',

  // src/platform/monetization.ts
  '広告（テスト表示）': 'Anuncio (prueba)',
  本番ではここに動画広告が流れます: 'Aquí se verá un anuncio en video en el juego real',

  // src/scenes/BaseScene.ts
  基本: 'Lo básico',
  '起点から出口（矢印）をたどって、隣の装備へ連鎖がつながります。勇者の足元のゲージ（攻撃間隔）がたまると起点が順に発火し、つながった装備が順番に攻撃します。':
    'Una cadena va desde un Origen, siguiendo sus salidas (flechas), hacia los objetos de al lado. Cuando se llena la barra bajo el héroe (Intervalo de ataque), los Orígenes se activan por turnos y los objetos conectados atacan uno tras otro.',
  '1回のランは30秒。走っている間は時間が止まり、敵と戦っている間だけ減ります。':
    'Una expedición dura 30 segundos. El tiempo se detiene mientras el héroe camina y solo corre durante los combates.',
  '時間は、群れを1回の連鎖でまとめて倒す（一網打尽）と+1.5秒、ボスを倒すと+8秒、時の砂で+5秒のびます。上限はないので、倒し続けるほど長く戦えます。':
    'Acabar con un grupo entero con una sola cadena (un KO total) suma 1.5 s, derrotar a un jefe suma 8 s y la Arena del Tiempo suma 5 s. No hay límite: cuantos más enemigos derrotes, más tiempo pelearás.',
  ダメージの決まり方: 'Cómo se calcula el daño',
  '攻撃力 × レアリティ × 連鎖倍率 × コンボ × 強化 × 追加効果 × 会心（±10%ゆれる）':
    'Ataque × Rareza × Multiplicador de cadena × Combo × Mejoras × Bonificaciones × Crítico (±10% de variación)',
  '・レアリティ：コモン×1、レア×1.5、エピック×2.5、レジェンダリー×4':
    '• Rareza: Común ×1, Raro ×1.5, Épico ×2.5, Legendario ×4',
  '・連鎖倍率：1段ごとに×1.2、6段目で上限×2.5（循環の環を通ると上限×4.0）':
    '• Multiplicador de cadena: ×1.2 por eslabón, hasta un máximo de ×2.5 en el eslabón 6 (máximo ×4.0 si pasa por el Anillo Uróboros)',
  '・コンボ：濡れ＋雷で感電×3、油＋炎で爆発×2（周りも巻き込む）、凍結＋打撃で粉砕×2.5。コンボでなくても、状態が付いた敵には×1.2':
    '• Combos: Mojado + Rayo = Descarga ×3, Aceite + Fuego = Explosión ×2 (también alcanza a los enemigos cercanos), Congelado + Contundente = Destrozo ×2.5. Aunque no haya combo, los enemigos con estado reciben ×1.2',
  '・強化：拠点の「攻撃倍率」': '• Mejoras: "Multiplicador de ataque" en la Base',
  '・会心：8%でダメージ×2（聖剣・会心の追加効果・幸運の硬貨で上がる）':
    '• Crítico: 8% de probabilidad de daño ×2 (aumenta con la Espada Sagrada, la bonificación Crítico y la Moneda de la Suerte)',
  ダメージを伸ばすコツ: 'Consejos para hacer más daño',
  '・配置画面の「約」の数字を見ながら並べ替える。ルートの番号を選ぶと、そのルート1本の推定ダメージが出ます。':
    '• Reorganiza mirando los números "~" de la pantalla "Equipar". Elige el número de una ruta para ver el daño estimado solo de esa ruta.',
  '・コンボを作る。状態を付ける装備（水筒・雨雲の杖・油瓶・氷の剣・氷の杖）の後ろに、組む属性（雷・炎・打撃）をつなぐ。状態は5秒で消えます。':
    '• Haz combos. Conecta el elemento que combina (Rayo, Fuego, Contundente) después de un objeto de estado (Cantimplora, Bastón de Lluvia, Frasco de Aceite, Espada de Hielo, Bastón de Hielo). Los estados desaparecen a los 5 segundos.',
  '・強い装備ほど後ろ（6段目以降）に置く。前の段は軽い装備や状態付与に。':
    '• Pon tu mejor equipo al final de la cadena (del eslabón 6 en adelante). Usa los primeros eslabones para equipo ligero y objetos de estado.',
  '・レアリティが一番効きます。奥の地域ほどレア以上が出やすい。':
    '• La rareza es lo que más importa. En las regiones más profundas cae más a menudo equipo Raro o mejor.',
  '・装備の左下の✦は追加効果。先駆け（3段目まで強い）は短い連鎖に、締め（6段目以降強い）は長い連鎖に向きます。':
    '• El ✦ en la esquina inferior izquierda de un objeto indica una bonificación. Vanguardia (fuerte hasta el eslabón 3) va bien en cadenas cortas; Remate (fuerte desde el eslabón 6), en cadenas largas.',
  必殺技: 'Golpes Especiales',
  '連鎖のルートで、決まった装備が順に3つつながって通ると、3つ目の一撃が必殺技になります（ダメージ×2.5、勇者が大きく踏み込む）。配置画面では、そのマスに「必殺」と出ます。':
    'Cuando una cadena pasa en orden por 3 objetos concretos, el 3.er golpe se convierte en un Golpe Especial (daño ×2.5 y el héroe se lanza al ataque). En la pantalla "Equipar", esa casilla muestra "Especial".',
  '・必殺技は全部で{n}つ。初めて出すと「発見」と出て、拠点の「図鑑」に発動条件が載ります。まだ見つけていない技は、図鑑でヒントだけ見られます。':
    '• Golpes Especiales en total: {n}. La primera vez que hagas uno, verás "¡Golpe Especial descubierto!" y su receta se añadirá al "Compendio" de la Base. De los que aún no descubres, el Compendio solo muestra una pista.',
  短い連鎖と長い連鎖: 'Cadenas cortas y largas',
  '・次の発火までの待ちは、直前の連鎖の段数に比例します。短い連鎖は回転が速く、長い連鎖は一撃が大きい。':
    '• La espera hasta la siguiente activación crece con la longitud de la última cadena. Las cadenas cortas van rápido; las largas pegan fuerte.',
  '・連鎖中は無防備（被ダメージ×1.5）。ただし3段目までは守りが残ります。':
    '• Durante una cadena eres vulnerable (recibes daño ×1.5), pero mantienes la guardia hasta el eslabón 3.',
  '・無防備中に大きく被弾すると「よろめき」、残りの段が途切れます。防御装備で耐えるか、不落の城門を置くと防げます。':
    '• Si recibes un golpe fuerte mientras eres vulnerable, sufres un "¡Tambaleo!" y se corta el resto de la cadena. Aguanta con equipo de defensa o coloca el Portón Invicto para evitarlo.',
  地域と敵: 'Regiones y enemigos',
  '・草原 → 洞窟 → 城壁の順に敵が一気に強くなり、そのぶんレアな装備が出やすくなります。3周目のボスを倒すと次の地域が開きます。':
    '• Los enemigos se vuelven mucho más duros de Pradera → Cueva → Muralla, pero también cae equipo más raro. Derrota al jefe de la vuelta 3 para desbloquear la siguiente región.',
  '・群れとボスは出撃ごとに変わります。精鋭（硬い・速い・金ぴか）が混ざることも。金ぴかは必ずレア以上を2個落とします。':
    '• Los grupos y los jefes cambian en cada expedición. Pueden aparecer enemigos de élite (Resistente, Veloz, Dorado). Los Dorados siempre sueltan 2 objetos Raros o mejores.',
  '・アーティファクトはごくまれに出る特別な装備です。':
    '• Los Artefactos son equipo especial que cae muy rara vez.',
  ご褒美とプレミアム: 'Recompensas y Premium',
  '・広告を見ると、ご褒美がもらえます：結果画面で「戦利品を2倍にする」（1日3回、同じ数だけ抽選し直してもう1セット）、鍛冶屋で「無料で再抽選」（1日3回）、力尽きたときに「再開」（1回のランで1回、HP全回復＋10秒）。':
    '• Mira un anuncio para obtener una recompensa: "Doble botín" en la pantalla de resultados (3 veces al día; sortea otro lote del mismo tamaño), "Tirada gratis" en la Herrería (3 veces al día) y "Revivir" cuando caes (una vez por expedición; HP completo + 10 s).',
  '・プレミアム（{price}、買い切り）なら、広告を見なくても同じご褒美を受け取れます。設定から買えます。':
    '• Con Premium ({price}, pago único) recibes las mismas recompensas sin ver anuncios. Cómpralo en "Ajustes".',
  '倉庫・鍛冶屋・合成': 'Almacén, Herrería y Fusión',
  '・消耗品枠は、入れた消耗品を覚えています。ランで使い切ったら、倉庫に同じものがあれば自動で入れ直します（ないときは枠にうすく「自動」と出て、手に入ったら入ります）。手で外すと覚えるのをやめます。':
    '• Los espacios de consumibles recuerdan lo que pusiste. Cuando gastas uno en una expedición, se rellena solo desde el Almacén si tienes otro igual (si no tienes, el espacio muestra un "Auto" tenue y se llena cuando consigas uno). Quítalo a mano para que deje de hacerlo.',
  '・どこを変えれば強くなるか迷ったら、配置画面の「診断」。入れ替え・置きかえ・空きマスを実際に試して、伸びる手を教えてくれます（並べ替えは自分で。「場所を見る」で関係するマスが光ります）。':
    '• ¿No sabes qué cambiar? Toca "Consejo" en la pantalla "Equipar". Prueba intercambios, reemplazos y casillas vacías, y te muestra lo que ayuda (tú reorganizas; "Ver dónde" ilumina las casillas).',
  '・配置画面の上の1〜5で編成を切り替えられます（凍結型・炎上型などを作り分け）。編成は並べ方の記録だけで、装備は倉庫に置いたまま。今の編成をもう一度押すと名前を変えられます。ほかの編成で使っている装備には「編成○」の印が付き、一括売却などでは売られません。':
    '• Cambia de Conjunto con 1-5 arriba en la pantalla "Equipar" (por ejemplo, uno de Congelado y otro de Fuego). Un Conjunto solo guarda la disposición; el equipo se queda en el Almacén. Toca otra vez el Conjunto actual para cambiarle el nombre. El equipo usado en otro Conjunto lleva la marca "Conjunto ○" y no se vende con "Venta masiva" ni similares.',
  '・倉庫の「自動売却」で、ラン後に戦利品から決まったレアリティ以下を自動で売れます（✦付きを残すかも選べます）。':
    '• Con "Venta automática" en el Almacén, el botín de la rareza elegida o menor se vende solo después de cada expedición (puedes elegir conservar los objetos con ✦).',
  '・倉庫があふれると出撃できません。「一括売却」「まとめて売る」で整理しましょう。大事な装備は詳細カードでロックすると売れなくなります。':
    '• No puedes salir de expedición si el Almacén está lleno. Haz espacio con "Venta masiva" o "Elegir y vender". Bloquea el equipo importante en su ficha de detalles para que no se pueda vender.',
  '・鍛冶屋では出口の向きを付け直せます（数は変わりません）。レアリティが高いほど料金も上がります。':
    '• En la Herrería puedes reforjar la dirección de las salidas (el número no cambia). Cuanto mayor la rareza, más cuesta.',
  '・同じ装備・同じレアリティを3つ集めると、鍛冶屋の「合成」（倉庫の詳細カードからも）で1つ上のレアリティを狙えます。成功率はコモン→レア80%（20G）、レア→エピック50%（100G）、エピック→レジェンダリー25%（500G）。失敗すると、材料と同じレアリティのランダムな装備が1つ手に入ります。追加効果と出口の向きは新しく決まります。':
    '• Junta 3 del mismo objeto con la misma rareza y usa "Fusionar" en la Herrería (o en su ficha de detalles del Almacén) para intentar subir de rareza. Probabilidad de éxito: Común→Raro 80% (20G), Raro→Épico 50% (100G), Épico→Legendario 25% (500G). Si falla, recibes 1 objeto aleatorio de la misma rareza. Las bonificaciones y la dirección de las salidas se sortean de nuevo.',
  設定: 'Ajustes',
  ヘルプ: 'Ayuda',
  ランキング: 'Clasificación',
  挑戦: 'Desafío',
  倉庫: 'Almacén',
  鍛冶屋: 'Herrería',
  図鑑: 'Compendio',
  出撃: '¡Vamos!',
  '倉庫があふれています。売却するまで出撃できません':
    'El Almacén está lleno. Vende objetos para poder salir.',
  冒険の記録: 'Diario de aventuras',
  '出撃|stat': 'Expediciones',
  '{n}回': '{n}',
  最大連鎖: 'Cadena máx.',
  '{n}段': '{n}',
  最大ダメージ: 'Daño máx.',
  開放した地域: 'Regiones abiertas',
  '{region} {n}周': '{region} vuelta {n}',
  '最高到達: {list}': 'Récord: {list}',
  '　|sep': '  ·  ',
  まだありません: 'Todavía nada',
  ロック中: 'Bloqueado',
  '売る {price}G': 'Vender {price}G',
  編成で使っている装備: 'Equipo usado en un Conjunto',
  '{presets}で使っています。\n売ると、その編成のマスは空きになります':
    'Se usa en {presets}.\nSi lo vendes, su casilla en ese Conjunto quedará vacía.',
  売る: 'Vender',
  アーティファクトを売る: 'Vender Artefacto',
  '{item}を{price}Gで売ります': '¿Vender {item} por {price}G?',
  ロック中の装備は売れません: 'El equipo bloqueado no se puede vender',
  'ほかの編成で使っている装備です（詳細から売れます）':
    'Se usa en otro Conjunto (puedes venderlo desde sus detalles)',
  '売るものをタップで選ぶ（もう一度で外す・長押しで詳細）':
    'Toca objetos para elegirlos (toca de nuevo para quitarlos, mantén presionado para ver detalles)',
  '自動売却：オフ': 'Venta automática: No',
  '自動売却：{rarity}（✦は残す）': 'Venta automática: {rarity} (conserva ✦)',
  '自動売却：{rarity}': 'Venta automática: {rarity}',
  '自動売却：{rarity}以下（✦は残す）': 'Venta automática: {rarity} o menor (conserva ✦)',
  '自動売却：{rarity}以下': 'Venta automática: {rarity} o menor',
  '{n}個を売ります（+{gold}G）': 'Objetos a vender: {n} (+{gold}G)',
  '{n}個を売る +{gold}G': 'Vender ×{n} +{gold}G',
  選んで売る: 'Elige objetos',
  やめる: 'Cancelar',
  まとめて売る: 'Elegir y vender',
  '{rarity}  {n}個 +{gold}G': '{rarity}  ×{n} +{gold}G',
  '{rarity}以下  {n}個 +{gold}G': '{rarity} o menor  ×{n} +{gold}G',
  '{rarity}を一括売却': 'Venta masiva: {rarity}',
  '{rarity}以下を一括売却': 'Venta masiva: {rarity} o menor',
  '消耗品  {n}個 +{gold}G': 'Consumibles  ×{n} +{gold}G',
  消耗品を一括売却: 'Venta masiva: consumibles',
  '✦付きは残す：オン': 'Conservar ✦: Sí',
  '✦付きは残す：オフ': 'Conservar ✦: No',
  一括売却: 'Venta masiva',
  '装備中・ロック中・編成で使用中・アーティファクトは売りません':
    'No se venden objetos equipados, bloqueados ni usados en un Conjunto, ni Artefactos',
  向きの付け直し: 'Reforjar',
  合成: 'Fusionar',
  この装備は向きを付け直せません: 'Este objeto no se puede reforjar',
  装備中: 'Equipado',
  付け直す装備を選んでください: 'Elige un objeto para reforjar',
  '出口の数は変わらず、方向だけが変わります': 'El número de salidas no cambia; solo su dirección',
  '付け直し {n}回（毎回 料金×1.5）': 'Reforjado ×{n} (precio ×1.5 cada vez)',
  '再抽選 {gold}G': 'Nueva tirada {gold}G',
  ゴールドが足りません: 'No tienes suficiente oro',
  '無料で再抽選（今日あと{n}回）': 'Tirada gratis (hoy: {n})',
  '▶ 広告を見て無料で再抽選（今日あと{n}回）': '▶ Ver anuncio: Tirada gratis (hoy: {n})',
  '指定: {n}方向を選ぶ': 'A medida: elige salidas ({n})',
  '指定 {gold}G': 'A medida {gold}G',
  '方向を{n}つ選んでください': 'Elige las direcciones de salida ({n})',
  強化: 'Mejorar',
  '最大HP {hp}（★{stars}で+{bonus}込み）': 'HP máximo {hp} (incl. +{bonus} por ★{stars})',
  '最大HP {hp}': 'HP máximo {hp}',
  '攻撃間隔 {sec}秒': 'Intervalo de ataque {sec} s',
  '攻撃倍率 ×{mult}（★{stars}で+{bonus}%込み）':
    'Multiplicador de ataque ×{mult} (incl. +{bonus}% por ★{stars})',
  '攻撃倍率 ×{mult}': 'Multiplicador de ataque ×{mult}',
  '出撃 {sec}秒（延長込みの上限 {max}秒）':
    'Tiempo de expedición {sec} s (máx. {max} s con extensiones)',
  '出撃 {sec}秒': 'Tiempo de expedición {sec} s',
  '{w}×{h}マス': '{w}×{h} casillas',
  '{n}枠': 'Espacios: {n}',
  '{n}個': 'Capacidad: {n}',
  最大: 'MÁX.',
  切替: 'Cambiar',
  音量: 'Volumen',
  ゲームスピード: 'Velocidad del juego',
  '検証用。×2 なら30秒のランが15秒で終わります':
    'Para pruebas. A ×2, una expedición de 30 segundos termina en 15.',
  'プレミアム（購入済み）': 'Premium (comprado)',
  'プレミアム {price}': 'Premium {price}',
  広告なしでご褒美を受け取れます: 'Recibes recompensas sin anuncios',
  'プレミアムになりました！': '¡Ya tienes Premium!',
  購入を復元: 'Restaurar compras',
  購入を復元しました: 'Compras restauradas',
  復元できる購入はありません: 'No hay compras para restaurar',
  '遊び方・強くなるコツ': 'Cómo jugar y consejos',
  案内をもう一度: 'Repetir tutorial',
  '各画面で、案内がもう一度出ます': 'El tutorial de cada pantalla se mostrará de nuevo',
  振動: 'Vibración',
  '画面揺れ・光': 'Sacudidas y destellos',
  言語: 'Idioma',
  '{auto}（{lang}）': '{auto} ({lang})',
  自動: 'Automático',
  端末の言語: 'idioma del dispositivo',
  'オフ（売らない）': 'No (no vender)',
  コモンを売る: 'Vender Común',
  レア以下を売る: 'Vender Raro o menor',
  エピック以下を売る: 'Vender Épico o menor',
  自動売却: 'Venta automática',
  'ラン後に戦利品から売ります。消耗品・アーティファクトは売りません':
    'Vende parte del botín después de cada expedición. Nunca vende consumibles ni Artefactos.',
  'ようこそ！\n勇者が自動で進んで、敵と戦うゲームだよ。\nまずは「出撃」を押してみよう！':
    '¡Te damos la bienvenida!\nTu héroe avanza y pelea contra los enemigos por su cuenta. Para empezar, toca "¡Vamos!".',
  '装備は「配置」でバックパックに並べるよ。\n拾った装備もここで置ける。\n「配置」を押してね':
    'En "Equipar" colocas el equipo en tu mochila. El equipo que recoges también va ahí. ¡Toca "Equipar"!',
  '鍛冶屋では、装備の出口の向きを変えたり、\n同じ装備を3つ集めて「合成」して\n上のレアリティを狙えるよ':
    'En la Herrería puedes cambiar la dirección de las salidas de un objeto, o usar "Fusionar" con 3 objetos iguales para intentar subir de rareza.',
  '合成 {gold}G': 'Fusionar {gold}G',
  '合成 {have}/3': 'Fusionar {have}/3',
  '{item}（{rarity}）を3つ使って、{target}の{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    'Usa 3 × {item} ({rarity}) y {gold}G para intentar conseguir {target} ({to}).\nProbabilidad de éxito: {rate}%. Si falla, recibes 1 objeto {rarity} aleatorio.',
  '{item}（{rarity}）を3つ使って、{to}を狙います（{gold}G）。\n成功率は{rate}%。失敗すると{rarity}のランダムな装備が1つ手に入ります':
    'Usa 3 × {item} ({rarity}) y {gold}G para intentar subir a {to}.\nProbabilidad de éxito: {rate}%. Si falla, recibes 1 objeto {rarity} aleatorio.',
  合成する: 'Fusionar',
  ロック: 'Bloqueado',
  '{n}つ': '×{n}',
  合成する装備を選んでください: 'Elige un objeto para fusionar',
  '同じ装備・同じレアリティを3つで、1つ上のレアリティに':
    '3 del mismo objeto y rareza → la rareza siguiente',
  '「○つ」の印は、3つ以上揃っている装備です':
    'La marca "×○" indica que tienes 3 o más de ese objeto',
  '{rarity} ×3 → {target}の{to} ×1': '{rarity} ×3 → {target} ({to}) ×1',
  '{rarity} ×3 → {to} ×1': '{rarity} ×3 → {to} ×1',
  '使える数: {n}つ（装備中・ロック中・ほかの編成で使用中は除く）':
    'Disponibles: ×{n} (sin contar equipados, bloqueados ni usados en otros Conjuntos)',
  '成功率 {rate}%': 'Éxito: {rate}%',
  '失敗すると{rarity}のランダムな装備が1つ（追加効果・向きは新しく）':
    'Si falla: 1 objeto {rarity} aleatorio (con nuevas bonificaciones y salidas)',
  '合成する {gold}G': 'Fusionar {gold}G',
  合成できません: 'No se puede fusionar',
  '合成中…': 'Fusionando…',
  タップで閉じる: 'Toca para cerrar',
  '合成成功！': '¡Éxito!',
  '失敗…': 'Falló…',
  実績: 'Logros',
  '2週替わりの挑戦': 'Desafío quincenal',
  'エンドレス（月ごと）': 'Infinito (mensual)',
  挑戦はまだ始まっていません: 'El Desafío aún no ha comenzado',
  '（初めて記録を送るときに決まります）': '(se asigna al enviar tu primera puntuación)',
  'あなたの名前: {name}': 'Tu nombre: {name}',
  変える: 'Cambiar',
  つながりませんでした: 'No se pudo conectar',
  'シーズンの終わりに: 上位1% {top1}G＋称号 / 上位10% {top10}G＋称号 / 上位50% {top50}G＋称号 / 参加 {joined}G':
    'Al final de la temporada: Top 1% {top1}G + título / Top 10% {top10}G + título / Top 50% {top50}G + título / Participación {joined}G',
  'ランキングは、サーバーの準備ができたら開きます':
    'La clasificación se abrirá cuando el servidor esté listo',
  '挑戦が始まったら、ここに順位が出ます': 'Cuando empiece el Desafío, aquí verás las posiciones',
  '読み込み中…': 'Cargando…',
  'あなた: {rank}位 / {total}人（上位{pct}%）': 'Tú: #{rank} de {total} (top {pct}%)',
  'まだ記録がありません（参加 {total}人）': 'Aún sin puntuación (jugadores: {total})',
  '{loop}周・{damage}': 'Vuelta {loop} · {damage}',
  まだ誰も記録していません: 'Aún no hay puntuaciones',
  '{season}: {rank}位 / {total}人（{band}）  +{gold}G':
    '{season}: #{rank} de {total} ({band})  +{gold}G',
  '新しい装飾品: {list}': 'Nuevos cosméticos: {list}',
  ランキングの報酬: 'Recompensas de clasificación',
  受け取る: 'Reclamar',
  装飾品: 'Cosméticos',
  戻る: 'Volver',
  '挑戦で上位に入るともらえる、見た目だけの装飾品':
    'Cosméticos para los mejores puestos del Desafío. Solo cambian tu aspecto.',
  冒険者: 'Aventurero',
  挑戦で上位に入るともらえます: 'Se consigue con un buen puesto en un Desafío',
  勇者の色: 'Colores del héroe',
  いつもの色: 'Original',
  ペット: 'Mascota',
  なし: 'Nada',
  '名前の飾り（ランキング）': 'Adorno del nombre (clasificación)',
  使用中: 'En uso',
  '{band}でもらえる': 'Premio: {band}',
  '舞台: {region}': 'Escenario: {region}',
  '・{rule}': '• {rule}',
  'リリースから2週間後に開放！': '¡Se abre 2 semanas después del lanzamiento!',
  '開放まで あと{n}日': 'Se abre en {n} d',
  '2週間ごとに、地域と制限が入れ替わります。': 'Cada 2 semanas cambian la región y las reglas.',
  '全員が同じ敵の並びに、自分の装備で挑み、合計ダメージを競います。':
    'Todos enfrentan a los mismos enemigos con su propio equipo y compiten por el daño total.',
  '強化と★は使わず、勇者は最初の強さ。並べ方の腕が勝負です。':
    'Sin mejoras ni bonos de ★: el héroe tiene su fuerza inicial. Todo depende de cómo organices tu mochila.',
  '装備とゴールドは出ません。': 'No caen equipo ni oro.',
  '残り {days}日{hours}時間': 'Quedan {days} d {hours} h',
  '自己ベスト {score}': 'Récord: {score}',
  まだ挑戦していません: 'Aún sin intentos',
  '装備 {n}個・起点 {origins}個': 'Equipo: {n} · Orígenes: {origins}',
  まだ組んでいません: 'Aún sin armar',
  挑戦用の編成: 'Conjunto del Desafío',
  この編成で挑戦できます: 'Este Conjunto está listo para el Desafío',
  'ふだんの編成から組みました。並べ方を詰めよう':
    'Armado a partir de tu mochila habitual. ¡Ahora afina la disposición!',
  ふだんの編成から組む: 'Copiar mi mochila',
  '今の挑戦用の編成を、ふだんの編成をもとに組み直します。\n制限に合わない装備は、同じ種類の使える装備に入れ替えます。':
    'Se rearmará tu Conjunto del Desafío a partir de tu mochila habitual.\nEl equipo que no cumpla las reglas se cambiará por equipo permitido del mismo tipo.',
  組み直す: 'Rearmar',
  '出撃できる形まで組むだけ。並べ方を詰めるのはあなた次第':
    'Solo arma algo con lo que puedas salir. Afinar la disposición depende de ti.',
  編成する: 'Editar Conjunto',
  挑戦する: '¡Empezar!',
  挑戦用の編成を組んでください: 'Primero arma tu Conjunto del Desafío',
  編成が制限に合っていません: 'Tu Conjunto no cumple las reglas',
  '達成 {done} / {total}': 'Completados {done} / {total}',
  達成: 'Logrado',
  '見つけた必殺技 {found} / {total}': 'Golpes Especiales descubiertos {found} / {total}',
  '発動：{hint}': 'Orden: {hint}',
  '3つ目の一撃がダメージ×2.5、勇者が大きく踏み込む':
    'El 3.er golpe hace daño ×2.5 y el héroe se lanza al ataque',
  '？？？': '???',
  'ヒント：{teaser}': 'Pista: {teaser}',
  'プレミアム：広告なしでご褒美を受け取れます': 'Premium: recibe recompensas sin anuncios',
  'プレミアム {price}｜広告なしでご褒美がもらえる': 'Premium {price} | Recompensas sin anuncios',
  '詳しく ›': 'Más ›',
  'プレミアム {price}（買い切り）': 'Premium {price} (pago único)',
  '広告を見なくても、ご褒美をすぐ受け取れます。\n・結果画面「戦利品を2倍にする」\n・鍛冶屋「無料で再抽選」\n・力尽きたときの「再開」\n（回数はそのまま。強さは変わりません）':
    'Recibe al instante las recompensas de los anuncios, sin verlos:\n• Resultados: "Doble botín"\n• Herrería: "Tirada gratis"\n• Al caer: "Revivir"\n(Mismos límites diarios. No te hace más fuerte.)',
  購入する: 'Comprar',

  // src/scenes/DummyScene.ts
  カカシで試し撃ち: 'Práctica con el Muñeco',
  '「発火」で次の起点を撃つ': 'Toca "¡Activar!" para disparar el siguiente Origen',
  発火: '¡Activar!',
  配置: 'Equipar',
  '起点{origin} 発火中…': 'Origen {origin} activándose…',
  '総ダメージ {n}': 'Daño total {n}',
  '持続（無防備） {sec}秒': 'Duración (vulnerable) {sec} s',
  '防御値 +{n}': 'Defensa +{n}',
  'コンボ {list}': 'Combos {list}',

  // src/scenes/LoadoutScene.ts
  '↶ 戻す': '↶ Deshacer',
  全部外す: 'Quitar todo',
  使えない: 'No permitido',
  挑戦へ: 'Al Desafío',
  '下は倉庫。装備を少し押さえてから、\nバックパックへドラッグして置こう':
    'Abajo está tu Almacén. Mantén presionado un objeto un momento y luego arrástralo a la mochila.',
  '起点（番号の石）から、矢印の向きに\nつながった装備が順番に攻撃するよ。\n後ろの段ほどダメージが大きい！':
    'Desde un Origen (la piedra con número), los objetos conectados atacan por turnos siguiendo las flechas. ¡Los últimos eslabones pegan más fuerte!',
  '「約」の数字が大きいほど強い並べ方。\nいろいろ試してみよう！':
    'Cuanto mayor el número "~", más fuerte la disposición. ¡Prueba distintas ideas!',
  '「約」の数字は敵1体に撃ったときの推定ダメージ（コンボ・会心込み）':
    'Los números "~" son el daño estimado contra un enemigo (con combos y críticos)',
  '起点が0個です。出撃できません': 'No hay ningún Origen. No puedes salir.',
  '倉庫があふれています（タップで売却）': 'El Almacén está lleno (toca para vender)',
  全部: 'Todo',
  線を消す: 'Ocultar líneas',
  線なし: 'Sin líneas',
  番号を選ぶと表示に戻す: 'Elige un número para volver a ver las líneas',
  起点を置いてください: 'Coloca un Origen',
  '合計 約{n}': 'Total ~{n}',
  '約{n}・{step}段・{tech}': '~{n} · Cadena {step} · {tech}',
  '必殺技|fallback': 'Golpe Especial',
  '約{n}・{step}段・コンボ{combo}': '~{n} · Cadena {step} · Combos {combo}',
  '約{n}・{step}段': '~{n} · Cadena {step}',
  診断: 'Consejo',
  配置の診断: 'Consejos para tu mochila',
  'いまの推定ダメージ 合計 約{n}': 'Estimación actual: ~{n} en total',
  'いまの装備では、これ以上の手は見つかりませんでした。\nいい並べ方です！':
    'No se encontraron mejores jugadas con tu equipo actual.\n¡Buena disposición!',
  '+約{n}': '+~{n}',
  '（+{pct}%）': '(+{pct}%)',
  場所を見る: 'Ver dónde',
  閉じる: 'Cerrar',
  '挑戦「{name}」用': 'Desafío: {name}',
  制限に合わせる: 'Ajustar a reglas',
  '{name} に切り替えました': 'Cambiaste a {name}',
  もう制限に合っています: 'Ya cumple las reglas',
  '制限に合わせました。並べ方を詰めよう': 'Ajustado a las reglas. ¡Ahora afina la disposición!',
  '合う装備が足りず、空いたマスがあります':
    'No hay suficiente equipo permitido, así que quedan casillas vacías',
  '編成の名前（8文字まで）': 'Nombre del Conjunto (hasta 8 caracteres)',
  '消耗品|slots': 'Consumibles',
  '自動|refill': 'Auto',
  ひとつ前の並べ方に戻しました: 'Se deshizo el último cambio',
  'バックパックと消耗品枠の {n}個をすべて倉庫に戻します。\n起点の発火順もリセットされます。':
    'Se devolverá al Almacén todo lo de la mochila y los espacios de consumibles (×{n}).\nEl orden de activación de los Orígenes también se reinicia.',
  置きたいマスをタップ: 'Toca una casilla para colocarlo',
  外す: 'Quitar',
  発火順を前へ: 'Activar antes',
  枠に入れる: 'Añadir',
  枠がいっぱい: 'Espacios llenos',
  置く: 'Colocar',
  あふれた分を売る: 'Vender exceso',
  '安いものから{n}個を売って倉庫に収めます\n（+{gold}G）':
    'Vende los objetos más baratos (×{n}) para que quepan en el Almacén.\n(+{gold}G)',

  // src/scenes/ResultScene.ts
  '体験おわり！': '¡Fin de la demo!',
  '力尽きた…': 'Sin fuerzas…',
  '撤退！': '¡Retirada!',
  ランキングに記録しました: 'Puntuación guardada en la clasificación',
  シェア: 'Compartir',
  '画像を保存しました（文はコピー済み）': 'Imagen guardada (texto copiado)',
  画像を作れませんでした: 'No se pudo crear la imagen',
  '挑戦「{name}」・{region}': 'Desafío "{name}" · {region}',
  'スコア {score}': 'Puntuación {score}',
  '到達 {loop}周目': 'Vuelta {loop} alcanzada',
  ボス撃破: 'Jefes derrotados',
  '発火|stat': 'Cadenas activadas',
  ゴールド: 'Oro',
  一網打尽: 'KO totales',
  '自己ベスト！': '¡Nuevo récord!',
  '★×{n}獲得！': '¡Obtienes ★×{n}!',
  '★獲得！': '¡Obtienes ★!',
  '★ボーナス: 攻撃+{atk}%・最大HP+{hp}': 'Bono de ★: Ataque +{atk}% · HP máximo +{hp}',
  '新しい地域「{region}」が開放された！': '¡Nueva región desbloqueada: {region}!',
  '戦利品 {n}': 'Botín: {n}',
  '自動売却 {n}個 +{gold}G': 'Venta automática ×{n} +{gold}G',
  '消耗品を{n}個 補充': 'Consumibles repuestos ×{n}',
  '借りた伝説の装備は、お返ししたよ\n（体験なので戦利品はなし）':
    'El equipo legendario prestado ya fue devuelto.\n(Era una demo, así que no hay botín.)',
  '挑戦「{name}」': 'Desafío "{name}"',
  'スコア（合計ダメージ） {score}': 'Puntuación (daño total) {score}',
  '自己ベスト {best}（更新！）': 'Récord {best} (¡nuevo!)',
  '自己ベスト {best}': 'Récord {best}',
  エンドレスは装備が出ません: 'En Infinito no cae equipo',
  '自己ベスト {loop}周目・ダメージ {damage}': 'Récord: vuelta {loop} · daño {damage}',
  戦利品なし: 'Sin botín',
  タップで能力を確認: 'Toca un objeto para ver sus estadísticas',
  タップで早送り: 'Toca para acelerar',
  '戦利品を2倍にする（今日あと{n}回）': 'Doble botín (hoy: {n})',
  '▶ 広告を見て戦利品を2倍にする（今日あと{n}回）': '▶ Ver anuncio: Doble botín (hoy: {n})',
  '戦利品 {n}（×2）': 'Botín: {n} (×2)',
  '広告のボーナス +{n}個（自動売却 {sold}個 +{gold}G）':
    'Bono del anuncio +{n} (venta automática ×{sold} +{gold}G)',
  '広告のボーナス +{n}個': 'Bono del anuncio +{n}',
  拠点へ: 'A la Base',
  配置へ: 'A Equipar',
  自分で出撃: '¡Tu turno!',
  もう一度: 'Otra vez',
  倉庫があふれています: 'El Almacén está lleno',
  起点がありません: 'No hay Origen',
  'これが伝説の装備の力！\n最大{step}段の連鎖、{damage}ダメージ！':
    '¡Ese es el poder del equipo legendario!\n¡Una cadena de {step} eslabones y {damage} de daño!',
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、\nいつかこの姿に！':
    'A partir de ahora, explora con tu propio equipo. Reúne y organiza equipo, ¡y algún día serás así de fuerte!',
  'ここからは自分の装備で冒険しよう。\n装備を集めて並べて、いつかこの姿に！\n「自分で出撃」を押してね':
    'A partir de ahora, explora con tu propio equipo. Reúne y organiza equipo, ¡y algún día serás así de fuerte! Toca "¡Tu turno!".',
  '宝箱から装備をゲット！\n開いたあとにタップすると、能力が見られるよ':
    '¡Conseguiste equipo de los cofres!\nToca un objeto cuando se abra para ver sus estadísticas.',
  '敵を倒すと、宝箱から装備が手に入るよ。\n開いたあとにタップすると、能力が見られる':
    'Derrota enemigos para conseguir equipo de los cofres. Toca un objeto cuando se abra para ver sus estadísticas.',
  '拾った装備は、拠点の「配置」で\nバックパックに置くと強くなるよ':
    'Pon el equipo que encontraste en tu mochila desde "Equipar" en la Base para hacerte más fuerte.',
  '装備を拾ったら、拠点の「配置」で\nバックパックに置くと強くなるよ':
    'Cuando encuentres equipo, ponlo en tu mochila desde "Equipar" en la Base para hacerte más fuerte.',

  // src/scenes/RunScene.ts
  '今回だけ、伝説の装備を借りてきたよ！\n装備を集めると、いつかこうなる！':
    '¡Solo por esta vez, tienes equipo legendario prestado! Reúne equipo y algún día serás así de fuerte.',
  'バックパックの装備は、起点（番号の石）から\n矢印の向きに順番に攻撃するよ。\nこれが「連鎖」！':
    'Los objetos de tu mochila atacan en orden desde un Origen (la piedra con número), siguiendo las flechas. ¡Eso es una "cadena"!',
  '起点（番号の石）から矢印の向きに、\n装備が順番に攻撃するよ。これが「連鎖」！\n長くつながるほど、ダメージが大きくなる':
    'Desde un Origen (la piedra con número), los objetos atacan en orden siguiendo las flechas. ¡Eso es una "cadena"! Cuanto más larga la cadena, mayor el daño.',
  '勇者の足元のゲージがたまるたびに、\n起点が①→②→①…の順に1つずつ発火するよ。\n次に動く起点は「次の連鎖」に出る':
    'Cada vez que se llena la barra bajo el héroe, se activa un Origen, de uno en uno: ①→②→①… El siguiente aparece en "Próxima cadena".',
  '勇者は自動で進んで戦うよ。\n群れをまとめて倒したり、ボスを倒すと\n時間がのびる！':
    'Tu héroe avanza y pelea solo. ¡Acaba con un grupo entero o derrota a un jefe para ganar más tiempo!',
  '残り時間。ふだんは0になるか、\nHPがなくなると終わり':
    'Tiempo restante. Normalmente, la expedición termina cuando llega a 0 o se acaba tu HP.',
  '残り時間。0になるか、HPがなくなると終わり。\n拾った装備は持ち帰れるよ':
    'Tiempo restante. La expedición termina cuando llega a 0 o se acaba tu HP. Te quedas con el equipo que recojas.',
  '止めたいときはここ。撤退もできるよ。\nさあ、伝説の力を見てみよう！':
    'Toca aquí para pausar. También puedes retirarte. ¡Ahora, mira el poder legendario en acción!',
  '止めたいときはここ。撤退もできるよ': 'Toca aquí para pausar. También puedes retirarte.',
  '{n}周目': 'Vuelta {n}',
  次の連鎖: 'Próxima cadena',
  一時停止中: 'En pausa',
  再開: 'Reanudar',
  撤退する: 'Retirarse',
  ここまでの戦利品を持ち帰ります: 'Te quedas con el botín conseguido hasta ahora',
  '{region}　{loop}周目　×{speed}': '{region}  Vuelta {loop}  ×{speed}',
  '{region}　{loop}周目': '{region}  Vuelta {loop}',
  '防御 {n}': 'Defensa {n}',
  '連鎖中！': '¡Encadenando!',
  '{step}段・{sec}秒': 'Cadena {step} · {sec} s',
  'FPS {fps}  敵 {enemies}  粒 {particles}  数字 {numbers}  seed {seed}':
    'FPS {fps}  enemigos {enemies}  partículas {particles}  números {numbers}  seed {seed}',
  '時間 +{sec}': 'Tiempo +{sec}',
  '時間 上限': 'Tiempo al máximo',
  '{loop}周目のボス　{name}': 'Jefe de la vuelta {loop}  {name}',
  'NEW RECORD! 最大連鎖': '¡NUEVO RÉCORD! Cadena máx.',
  'NEW RECORD! 最大ダメージ': '¡NUEVO RÉCORD! Daño máx.',
  無効: 'Anulado',
  '激昂！': '¡Furia!',
  'アーティファクト！ {name}': '¡Artefacto! {name}',
  'よろめき！': '¡Tambaleo!',
  '一網打尽！': '¡KO total!',
  'ボス撃破！': '¡Jefe derrotado!',
  '復活！': '¡Revivido!',
  '再開する（HP全回復・+{sec}秒）': 'Revivir (HP completo, +{sec} s)',
  '▶ 広告を見て再開（HP全回復・+{sec}秒）': '▶ Ver anuncio y revivir (HP completo, +{sec} s)',
  あきらめる: 'Rendirse',
  '1回のランで1回だけ再開できます': 'Puedes revivir una vez por expedición',

  // src/scenes/StageSelectScene.ts
  地域を選ぶ: 'Elige una región',
  '出撃！': '¡Vamos!',
  起点がバックパックにありません: 'No hay Origen en tu mochila',
  '出撃する地域を選ぶよ。最初は「草原」。\n奥の地域ほど敵は強いけど、\nいい装備が出やすいよ':
    'Elige a dónde ir. Empieza por "Pradera". En las regiones más profundas los enemigos son más duros, pero cae mejor equipo más a menudo.',
  '準備ができたら「出撃！」': 'Cuando quieras, toca "¡Vamos!"',
  '「出撃！」を押して、冒険に出よう！': 'Toca "¡Vamos!" para empezar tu aventura.',
  '敵HP×{hp}〜 攻撃×{atk}〜\n装備・ゴールドは出ない':
    'HP enemigo ×{hp}+  Atq. ×{atk}+\nSin equipo ni oro',
  '敵HP×{hp} 攻撃×{atk}\nレア以上 +{pct}%': 'HP enemigo ×{hp}  Atq. ×{atk}\nRaro o mejor +{pct}%',
  '最高{n}周': 'Récord: vuelta {n}',
  記録なし: 'Sin récord',
  '最高{n}周 {stars}': 'Récord: vuelta {n} {stars}',
  '未到達 {stars}': 'Sin récord {stars}',
  '雑魚: {trend}': 'Enemigos: {trend}',
  'ボス: 全地域から毎周ランダム\n最高ダメージ {damage}':
    'Jefes: al azar de todas las regiones en cada vuelta\nDaño récord: {damage}',
  '{n}周目〜': 'Vuelta {n}+',
  '装備とゴールドは出ない。到達周回と与えたダメージで自己ベストを目指す':
    'Sin equipo ni oro. Busca tu récord en vueltas alcanzadas y daño causado.',
  '{note}（ボスはアイコンをタップで特徴）': '{note} (toca el ícono de un jefe para ver sus rasgos)',
  'ボスは出撃ごとに候補から選ばれます（{n}種）。アイコンをタップで特徴':
    'Cada expedición elige sus jefes de esta lista ({n}). Toca un ícono para ver sus rasgos.',
  魔王城で魔王を倒すと開放: 'Se desbloquea al derrotar al Rey Demonio en el Castillo Demoníaco',
  前の地域の3周目のボスを倒すと開放:
    'Se desbloquea al derrotar al jefe de la vuelta 3 de la región anterior',

  // src/ui/achievementToast.ts
  '実績達成！': '¡Logro desbloqueado!',

  // src/ui/backpackView.ts
  '必殺 {step}段': 'Especial #{step}',
  '{step}段 ×{mult}': '#{step} ×{mult}',

  // src/ui/chestReveal.ts
  '売却|sold': 'Vendido',
  広告: 'Anuncio',

  // src/ui/discovery.ts
  図鑑に登録: 'Añadido al Compendio',
  'NEW  必殺技を発見！': 'NUEVO  ¡Golpe Especial descubierto!',
  '【{name}】': '«{name}»',

  // src/ui/itemInfo.ts
  上: 'Arriba',
  右: 'Derecha',
  下: 'Abajo',
  左: 'Izquierda',
  'アーティファクト（能力 ×{x}・出口の数は固定）': 'Artefacto (estadísticas ×{x}, salidas fijas)',
  消耗品: 'Consumible',
  '{rarity}（能力 ×{x}）': '{rarity} (estadísticas ×{x})',
  '出口: {dirs}': 'Salidas: {dirs}',
  'なし（末端）': 'Ninguna (fin de la cadena)',
  '攻撃力 {atk}（{element}・{area}）': 'Ataque {atk} ({element}, {area})',
  '次への伝達 {s}秒': 'Tiempo de relevo {s} s',
  '1段で{n}回攻撃': 'Golpes ×{n} por eslabón',
  '会心率 +{pct}%': 'Prob. de crítico +{pct}%',
  '付与: {status} → {element}で{combo}': 'Aplica {status} → {combo} con {element}',
  '付与: {status}': 'Aplica {status}',
  '{status}を消費して{combo}（×{x}、範囲に拡大）':
    'Consume el estado {status} → {combo} (×{x}, se extiende a un área)',
  '{status}を消費して{combo}（×{x}）': 'Consume el estado {status} → {combo} (×{x})',
  '防御値 +{n}（連鎖が通ると終了時に加算、段数に数えない）':
    'Defensa +{n} (se suma al terminar una cadena que pasa por aquí; no cuenta como eslabón)',
  '連鎖の始まり。攻撃せず、段数にも数えない': 'Inicia una cadena. No ataca ni cuenta como eslabón.',
  '付け直し {n}回': 'Reforjado ×{n}',
  '売却 {price}G': 'Se vende por {price}G',
  アーティファクト: 'Artefacto',
  起点: 'Origen',
  防御: 'Defensa',
  出口: 'Salidas',
  攻撃力: 'Ataque',
  '強化込み {n}': 'Con mejoras {n}',
  全体攻撃: 'Ataque a todos',
  '威力 ×{x}': 'Poder ×{x}',
  貫通: 'Perforación',
  '狙いの後ろ {n}体にも同じダメージ': 'Mismo daño a {n} detrás del objetivo',
  連撃: 'Multigolpe',
  会心率: 'Prob. de crítico',
  連鎖倍率の上限: 'Multiplicador máx.',
  この環を通る連鎖すべて: 'Toda cadena que pase por este anillo',
  吸血: 'Robo de vida',
  '与えたダメージの{pct}%を回復': 'Cura el {pct}% del daño causado',
  疾風: 'Vendaval',
  'このあとの装備は段数+{n}': 'Los siguientes cuentan como eslabón +{n}',
  '5秒間、一撃の30%を毎秒': '30% del golpe por segundo durante 5 s',
  付与: 'Aplica',
  '濡れ・油・凍結をまとめて': 'Mojado, Aceite y Congelado a la vez',
  次への伝達: 'Tiempo de relevo',
  '{s}秒': '{s} s',
  防御値: 'Defensa',
  連鎖終了時に加算: 'Se suma al terminar la cadena',
  守り: 'Guardia',
  連鎖中も無防備にならない: 'Nunca vulnerable en cadenas',
  バックパックにある限り: 'Mientras esté en tu mochila',
  '{n}方向': '{n}',
  出口の数は固定: 'Número de salidas fijo',
  レアリティで出口の数が決まる: 'La rareza fija el número de salidas',
  この配置: 'Esta disposición',
  どの起点からも届きません: 'Ningún Origen llega aquí',
  '起点{origin}の{step}段目 ×{mult}': 'Origen {origin}, eslabón {step} ×{mult}',
  '1ヒット 約{n}': '~{n} por golpe',
  '起点{origin}の連鎖': 'Cadena del Origen {origin}',
  段数に数えない: 'No cuenta como eslabón',
  '{status}を付ける → {element}の攻撃で{combo}（×{x}）':
    'Aplica {status} → con {element}: {combo} (×{x})',
  '{status}を付ける': 'Aplica {status}',
  '{status}の敵に当てると{combo}（×{x}・範囲に拡大）':
    'Enemigo en estado {status} → {combo} (×{x}, se extiende a un área)',
  '{status}の敵に当てると{combo}（×{x}）': 'Enemigo en estado {status} → {combo} (×{x})',
  ロックする: 'Bloquear',

  // src/ui/itemList.ts
  攻撃: 'Ataque',
  倉庫は空です: 'El Almacén está vacío',
  '★全部': '★Todo',
  '★{rarity}': '★{rarity}',

  // src/ui/kit/chrome.ts
  '出撃 {n}回': 'Expediciones: {n}',
  拠点: 'Base',

  // src/ui/pools.ts
  '会心 {n}': 'Crítico {n}',

  // src/ui/shareCard.ts
  '{loop}周目に到達': 'Vuelta {loop} alcanzada',
  '最大連鎖 {step}段': 'Cadena máx. {step}',
  '最大ダメージ {damage}': 'Daño máx. {damage}',

  // src/ui/tutorial.ts
  '光っているところをタップ（{n}/{total}）': 'Toca lo que brilla ({n}/{total})',
  'タップで次へ（{n}/{total}）': 'Toca para seguir ({n}/{total})',
  'スキップ ›': 'Saltar ›',
};
