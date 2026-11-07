// 画面で使う文字（ソース中の非ASCII文字）を集めて src/ui/kit/glyphs.generated.ts に書き出す。
// フォントはサブセット分割されているので、起動時にこの文字列で必要な分だけ先読みする。
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('glyphs.generated.ts')) out.push(p);
  }
}

const files: string[] = [];
walk('src', files);
const chars = new Set<string>();
for (const f of files) {
  for (const ch of readFileSync(f, 'utf8')) if (ch.codePointAt(0)! > 0x7f) chars.add(ch);
}
// 数字・英字・よく使う記号も含める
for (const ch of "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-×%/.:'!?()[]")
  chars.add(ch);
const text = [...chars].sort().join('');
writeFileSync(
  'src/ui/kit/glyphs.generated.ts',
  `// 自動生成（tools/genGlyphs.ts）。編集しない\nexport const GLYPHS = ${JSON.stringify(text)};\n`,
);
console.log(`glyphs: ${chars.size}`);
