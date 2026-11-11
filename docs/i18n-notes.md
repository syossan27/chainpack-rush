# Translator notes (keys that need context)

Read together with `docs/i18n-glossary.md`. Every key's source location is in
`npx tsx tools/i18nScan.ts --dump <file>` (`refs`); open the source when a key is unclear.

## Context keys (`|…`)

| key | meaning |
|---|---|
| `出撃` | the big button / tab that starts a run ("Go!") |
| `出撃\|stat` | record label: number of runs played (noun, "Runs") |
| `発火\|stat` | result-screen stat: how many times chains fired (noun) |
| `発火` | Dummy (training) screen button: fire the chain now (verb) |
| `消耗品` | item type tag "consumable" (one item) |
| `消耗品\|slots` | header of the consumable slots row in Loadout/Run ("Consumables") |
| `必殺技` | book tab "Special Moves" |
| `必殺技\|fallback` | generic name used when a move name is unknown ("Special Move") |
| `自動` | language setting option "Auto" |
| `自動\|refill` | tiny mark under an empty consumable slot: it is refilled automatically ("Auto") |
| `売却\|sold` | stamp on a looted item that was auto-sold ("Sold") |
| `・\|sep` | separator between list items. en/pt/es/de/fr/id: `, ` ; zh-Hant: `、` ; ko: `, ` |
| `　\|sep` (full-width space) | wide gap between two facts on one line: `  ·  ` in every language (a value of only spaces counts as empty) |
| `{first}{second}\|name` | ranking name = first word + second word. Set order/spacing (see glossary rule 11) |

## Other keys worth knowing

- `{auto}（{lang}）` → "Auto ({lang})" (the language picker row).
- `480円` (premium price, game data) → `¥480` in every language.
- `FPS {fps}  敵 {enemies}  粒 {particles}  数字 {numbers}  seed {seed}` is a developer overlay — translate
  the words briefly or keep them; keep all placeholders.
- `？？？` = name of a special move not found yet. `【{name}】` = brackets around a move name (use the
  language's natural emphasis, e.g. `“{name}”` or `«{name}»`, or keep 【】 in zh-Hant).
- Counts: `{n}回` (times), `{n}段` (chain links), `{n}個` (pieces), `{n}つ` (copies), `{n}枠` (slots),
  `{n}周` / `{n}周目` (loop / loop number), `{n}周目〜` (loop n and later). Use label forms ("×{n}",
  "Loop {n}", "Loop {n}+", "{n} links" only if your language has no plural agreement problem).
- Combo pop-up labels (`感電！` etc.) and the `一網打尽！` banner: keep the exclamation mark at the
  end (Spanish may start with `¡`). Code strips it to reuse the word inside sentences. English uses
  "Wipeout" for 一網打尽.
- Rarity names appear inside templates like `{rarity}以下` ("{rarity} or lower") — translate the
  template so it works for any rarity name.
- Upgrade value lines must reuse the upgrade names: `攻撃間隔 {sec}秒` → "Attack Interval {sec}s" etc.
- Tutorial texts quote buttons in 「…」: use exactly that button's translation inside your quotes.
- `ランキングの報酬` dialog lines, ranking rows and the challenge page use the season names built from
  `挑戦 第{n}回` ("Challenge #{n}") and `エンドレス {month}` (month is already localized, e.g.
  "December 2026").
- Cosmetics: `蒼のマント` (blue cape), `白銀の鎧` (white-silver armor), `黄金の鎧` (golden armor),
  `ちびドラゴン` (little dragon pet), `銅のメダル` / `銀の王冠` / `金の王冠` (name decorations).
