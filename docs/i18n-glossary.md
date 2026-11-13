# Translation glossary and style guide

Chainpack Rush is a cute, casual portrait mobile game. The hero walks and fights by itself; the player
arranges gear in a backpack so that items "chain" from an Origin Stone along arrow exits, and each later
link in the chain hits harder. Runs last about 30 seconds.

Source language: Japanese (the dictionary keys). Target files: `src/i18n/dicts/<lang>/ui.ts` and `data.ts`.

## Rules for every language

1. **Placeholders**: keep every `{name}` exactly (same names, no new ones). You may move them.
2. **Context keys**: a key like `出撃|stat` means "the Japanese 出撃, used as a stat label". Translate the
   meaning given by the context; the `|…` part is never shown.
3. **Whole sentences**: every key is a complete phrase. Don't rely on another key being next to it.
4. **Numbers and plurals**: write counts in label form so they work for any number:
   `Runs: {n}`, `×{n}`, `{n} G`. Avoid "{n} item(s)" forms that need plural agreement. If a noun after a
   number is unavoidable, pick wording that reads fine for 0, 1 and many.
5. **Quoted UI labels**: when Japanese quotes a button or screen name in 「…」 (e.g. 「出撃」を押してね),
   the quoted word must be *exactly* the translation used for that button/label elsewhere. Use your
   language's quote marks (see table).
6. **Line breaks (`\n`)**: zh-Hant and ko: keep breaks where the Japanese has them (the text is about as
   wide). Latin-script languages: text boxes wrap automatically — keep a `\n` only where a new line or
   paragraph is meaningful (lists, "title\nbody"); otherwise drop or move it.
7. **Length**: tabs, buttons and badges are small. Keep them short (a button ≈ 1–2 words). Labels shrink
   to fit if needed, but very long words look tiny. Messages may be longer than Japanese; they wrap.
8. **Keep as is**: `★`, `✦`, `×`, `→`, `%`, `+`, `G` (gold), `HP`, `#ChainpackRush`, emoji, ①②③.
9. **Tone**: friendly and light, second person, short sentences. Tutorials speak directly to the player.
10. **Item, enemy, technique and region names**: translate creatively but keep them short and evocative,
    in Title Case where the language uses it (English). Technique names are flashy (e.g. "Crimson Burst").
11. **Ranking name words** (`NAME_FIRST` + `NAME_SECOND`, joined by the key `{first}{second}|name`):
    every first word must read naturally with every second word. In languages with gender/number
    agreement, make the first word invariant (a prepositional phrase like "de luz", "der Morgenröte",
    "de l'aube", or an invariable adjective). Set the order and spacing in `{first}{second}|name`
    (en `{first} {second}`, fr/es/pt/id usually `{second} {first}`).

## Register and punctuation

| lang | register | quotes for UI labels | notes |
|---|---|---|---|
| en | casual "you" | "Go!" (straight double quotes) | US spelling |
| zh-Hant | friendly, Taiwan usage | 「出擊」 | full-width punctuation ，。！？：（） |
| ko | 해요체 in messages, nouns for labels | ‘출격’ | half-width punctuation |
| pt-BR | você, informal | "Partir!" | Brazilian usage |
| es | tú (no vosotros), neutral Latin American | "¡Vamos!" | ¡ ¿ where needed |
| de | du, informal | „Los!“ | capitalized nouns; prefer short words |
| fr | tu, informal | « Partir ! » | space before ! ? : ; » and after « |
| id | kamu, casual | "Berangkat!" | |

## Glossary

| ja | en | zh-Hant | ko | pt-BR | es | de | fr | id |
|---|---|---|---|---|---|---|---|---|
| 起点石 (item) | Origin Stone | 起點石 | 기점석 | Pedra de Origem | Piedra de Origen | Ursprungsstein | Pierre d'origine | Batu Asal |
| 起点 (where a chain starts) | Origin | 起點 | 기점 | Origem | Origen | Ursprung | Origine | Asal |
| 連鎖 | chain | 連鎖 | 연쇄 | corrente | cadena | Kette | chaîne | rantai |
| 段 (one link of a chain; 6段目 = 6th link) | link | 段 | 단 | elo | eslabón | Glied | maillon | mata rantai |
| 出口 (an item's arrow exits) | exit | 出口 | 출구 | saída | salida | Ausgang | sortie | jalur |
| 装備 (gear; one piece = item) | gear / item | 裝備 | 장비 | equipamento / item | equipo / objeto | Ausrüstung / Gegenstand | équipement / objet | perlengkapan / item |
| バックパック | backpack | 背包 | 배낭 | mochila | mochila | Rucksack | sac à dos | ransel |
| 倉庫 (tab) | Storage | 倉庫 | 창고 | Armazém | Almacén | Lager | Réserve | Gudang |
| 鍛冶屋 (tab) | Smith | 鐵匠鋪 | 대장간 | Ferreiro | Herrería | Schmiede | Forge | Pandai Besi |
| 強化 (tab: hero upgrades) | Upgrade | 強化 | 강화 | Melhorar | Mejorar | Training | Améliorer | Tingkatkan |
| 配置 (tab: arrange the backpack) | Loadout | 配置 | 배치 | Equipar | Equipar | Packen | Équiper | Susun |
| 拠点 (tab: home) | Base | 據點 | 거점 | Base | Base | Basis | Base | Markas |
| 編成 (saved backpack layout, 編成1…5) | Set | 編組 | 편성 | Conjunto | Conjunto | Set | Set | Set |
| 出撃 (button: start a run) | Go! | 出擊 | 출격 | Partir! | ¡Vamos! | Los! | Partir ! | Berangkat! |
| ラン / 出撃 (noun: one play session) | run | 出擊 | 출격 | expedição | expedición | Expedition | expédition | ekspedisi |
| 周 / 周目 (laps of a region) | loop | 輪 | 회차 | volta | vuelta | Runde | tour | putaran |
| 地域 | region | 地區 | 지역 | região | región | Gebiet | région | wilayah |
| 挑戦 (biweekly challenge) | Challenge | 挑戰 | 도전 | Desafio | Desafío | Prüfung | Défi | Tantangan |
| エンドレス | Endless | 無盡 | 엔드리스 | Infinito | Infinito | Endlos | Infini | Tanpa Batas |
| 必殺技 | Special Move | 必殺技 | 필살기 | Golpe Especial | Golpe Especial | Spezialangriff | Coup spécial | Jurus Spesial |
| コンボ | combo | 連攜 | 콤보 | combo | combo | Kombo | combo | kombo |
| 状態 / 状態異常 | status | 異常狀態 | 상태 이상 | efeito | estado | Status | altération | efek status |
| 濡れ | Wet | 潮濕 | 젖음 | Molhado | Mojado | Nass | Mouillé | Basah |
| 油 (status/element) | Oil | 油 | 기름 | Óleo | Aceite | Öl | Huile | Minyak |
| 凍結 | Frozen | 凍結 | 빙결 | Congelado | Congelado | Gefroren | Gelé | Beku |
| 毒 | Poison | 中毒 | 독 | Veneno | Veneno | Gift | Poison | Racun |
| 感電 | Shock | 感電 | 감전 | Choque | Descarga | Schock | Électrochoc | Setrum |
| 爆発 | Explosion | 爆炸 | 폭발 | Explosão | Explosión | Explosion | Explosion | Ledakan |
| 粉砕 | Shatter | 粉碎 | 분쇄 | Estilhaço | Destrozo | Zertrümmern | Fracas | Hancur |
| 合流 (lines of linked origins meeting) | Merge | 合流 | 합류 | Junção | Unión | Vereinigung | Jonction | Gabung |
| 灼光 / 呪縛 (statuses) | Radiance / Binding | 灼光 / 咒縛 | 광채 / 속박 | Radiante / Amaldiçoado | Radiante / Hechizado | Strahlend / Gebannt | Ébloui / Envoûté | Silau / Terikat |
| 浄化 / 封印 / 毒爆 (combos) | Purify / Seal / Venom Burst | 淨化 / 封印 / 毒爆 | 정화 / 봉인 / 독폭발 | Purificação / Selo / Estouro Tóxico | Purificación / Sello / Estallido tóxico | Reinigen / Versiegeln / Giftausbruch | Purification / Scellé / Venin explosif | Penyucian / Segel / Ledakan Racun |
| 風 / 光 / 闇 | Wind / Light / Dark | 風 / 光 / 暗 | 바람 / 빛 / 어둠 | Vento / Luz / Sombra | Viento / Luz / Oscuridad | Wind / Licht / Schatten | Vent / Lumière / Ténèbres | Angin / Cahaya / Kegelapan |
| 物理 / 打撃 | Physical / Blunt | 物理 / 打擊 | 물리 / 타격 | Físico / Impacto | Físico / Contundente | Physisch / Wucht | Physique / Contondant | Fisik / Hantam |
| 炎 / 雷 / 氷 / 水 | Fire / Thunder / Ice / Water | 火 / 雷 / 冰 / 水 | 불 / 번개 / 얼음 / 물 | Fogo / Raio / Gelo / Água | Fuego / Rayo / Hielo / Agua | Feuer / Blitz / Eis / Wasser | Feu / Foudre / Glace / Eau | Api / Petir / Es / Air |
| 単体 / 薙ぎ払い / 範囲 / 全体 | Single / Sweep / Area / All | 單體 / 橫掃 / 範圍 / 全體 | 단일 / 휩쓸기 / 범위 / 전체 | Único / Varredura / Área / Todos | Único / Barrido / Área / Todos | Einzel / Schwung / Fläche / Alle | Unique / Balayage / Zone / Tous | Tunggal / Sapuan / Area / Semua |
| 会心 | critical | 會心一擊 | 치명타 | crítico | crítico | Kritisch | critique | kritikal |
| コモン / レア / エピック / レジェンド | Common / Rare / Epic / Legendary | 普通 / 稀有 / 史詩 / 傳說 | 커먼 / 레어 / 에픽 / 레전드 | Comum / Raro / Épico / Lendário | Común / Raro / Épico / Legendario | Gewöhnlich / Selten / Episch / Legendär | Commun / Rare / Épique / Légendaire | Biasa / Langka / Epik / Legendaris |
| アーティファクト | Artifact | 神器 | 아티팩트 | Artefato | Artefacto | Artefakt | Artefact | Artefak |
| 追加効果 (✦ affix) | bonus | 附加效果 | 추가 효과 | bônus | bonificación | Bonus | bonus | bonus |
| 付け直し | Reforge | 重鑄 | 재련 | Reforjar | Reforjar | Umschmieden | Reforger | Tempa Ulang |
| 合成 | Fuse | 合成 | 합성 | Fundir | Fusionar | Verschmelzen | Fusionner | Fusi |
| 消耗品 | consumable | 消耗品 | 소모품 | consumível | consumible | Verbrauchsitem | consommable | item sekali pakai |
| 勇者 | hero | 勇者 | 용사 | herói | héroe | Held | héros | pahlawan |
| 戦利品 | loot | 戰利品 | 전리품 | espólio | botín | Beute | butin | jarahan |
| 宝箱 | chest | 寶箱 | 보물 상자 | baú | cofre | Truhe | coffre | peti |
| ゴールド (G) | gold (G) | 金幣 (G) | 골드 (G) | ouro (G) | oro (G) | Gold (G) | or (G) | emas (G) |
| ★ | star | 星 | 별 | estrela | estrella | Stern | étoile | bintang |
| 図鑑 (tab) | Codex | 圖鑑 | 도감 | Compêndio | Compendio | Kompendium | Codex | Ensiklopedia |
| 実績 | achievement | 成就 | 업적 | conquista | logro | Erfolg | succès | pencapaian |
| 撤退 | Retreat | 撤退 | 후퇴 | Recuar | Retirarse | Rückzug | Retraite | Mundur |
| 復活 | Revive | 復活 | 부활 | Reviver | Revivir | Wiederbeleben | Ressusciter | Bangkit |
| 倍率 | multiplier | 倍率 | 배율 | multiplicador | multiplicador | Multiplikator | multiplicateur | pengganda |
| 攻撃力 | Attack | 攻擊力 | 공격력 | Ataque | Ataque | Angriff | Attaque | Serangan |
| 防具 / 防御値 | armor / Defense | 防具 / 防禦值 | 방어구 / 방어력 | armadura / Defesa | armadura / Defensa | Rüstung / Verteidigung | armure / Défense | pelindung / Pertahanan |
| ランキング | Ranking | 排行榜 | 랭킹 | Ranking | Clasificación | Rangliste | Classement | Peringkat |
| シーズン | season | 賽季 | 시즌 | temporada | temporada | Saison | saison | musim |
| 称号 | title | 稱號 | 칭호 | título | título | Titel | titre | gelar |
| カカシ (training dummy) | Dummy | 稻草人 | 허수아비 | Boneco | Muñeco | Übungspuppe | Mannequin | Orang-orangan |
| ボス | boss | 頭目 | 보스 | chefe | jefe | Boss | boss | bos |
| プレミアム | Premium | 高級版 | 프리미엄 | Premium | Premium | Premium | Premium | Premium |
