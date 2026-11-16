// Find every translatable string in src and every Japanese string that is not yet translatable.
//
// Rules (checked by tests/i18n.test.ts):
// - Game data files (DATA_FILES): every Japanese string literal is a key ('data' domain).
//   The display code passes those values through t() where they are drawn.
// - Everywhere else a Japanese string literal must be the first argument of t() or k()
//   (directly, or as a branch of a ?: inside it). Those are 'ui' keys.
// - A template literal with Japanese text and ${} is never allowed: use t('…{name}…', { name }).
// - console.* and new Error(…) messages are for developers and are skipped.
//
// CLI:
//   tsx tools/i18nScan.ts                 summary + violations
//   tsx tools/i18nScan.ts --missing de    keys the German dictionary lacks
//   tsx tools/i18nScan.ts --dump out.json every key with its domain and source locations
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export type Domain = 'ui' | 'data';

export interface KeyInfo {
  key: string;
  domain: Domain;
  /** "file:line" of each use */
  refs: string[];
  /** Property the string is assigned to in data files (name, description, ...), for translators */
  field?: string;
}

export interface Violation {
  file: string;
  line: number;
  text: string;
}

/** Japanese script, CJK punctuation and full-width forms */
export const JP = /[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Files whose strings are game data (translated where they are displayed) */
export function isDataFile(rel: string): boolean {
  return (
    rel.startsWith('src/data/') ||
    rel === 'src/core/affixes.ts' ||
    rel === 'src/config/balance.ts' ||
    rel === 'src/core/names.ts'
  );
}

function skipFile(rel: string): boolean {
  return rel.startsWith('src/i18n/') || rel.endsWith('.generated.ts') || !rel.endsWith('.ts');
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
}

/** The call a literal is the first argument of, looking through ( ) and ?: branches */
function keyCall(node: ts.Node): string | null {
  let cur: ts.Node = node;
  for (;;) {
    const p = cur.parent;
    if (!p) return null;
    if (ts.isParenthesizedExpression(p)) cur = p;
    else if (ts.isConditionalExpression(p) && (p.whenTrue === cur || p.whenFalse === cur)) cur = p;
    else if (ts.isCallExpression(p) && p.arguments[0] === cur && ts.isIdentifier(p.expression))
      return p.expression.text;
    else return null;
  }
}

/** Inside console.x(…) or new Error(…) */
function devMessage(node: ts.Node): boolean {
  for (let p = node.parent; p; p = p.parent) {
    if (
      ts.isCallExpression(p) &&
      ts.isPropertyAccessExpression(p.expression) &&
      ts.isIdentifier(p.expression.expression) &&
      p.expression.expression.text === 'console'
    )
      return true;
    if (ts.isNewExpression(p) && ts.isIdentifier(p.expression) && /Error$/.test(p.expression.text))
      return true;
    if (ts.isStatement(p)) return false;
  }
  return false;
}

function fieldOf(node: ts.Node): string | undefined {
  const p = node.parent;
  if (p && ts.isPropertyAssignment(p) && p.initializer === node) return p.name.getText();
  if (p && ts.isArrayLiteralExpression(p)) {
    const decl = p.parent?.parent;
    if (decl && ts.isVariableDeclaration(decl)) return `${decl.name.getText()}[]`;
    if (p.parent && ts.isVariableDeclaration(p.parent)) return `${p.parent.name.getText()}[]`;
  }
  return undefined;
}

function inType(node: ts.Node): boolean {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isTypeNode(p)) return true;
    if (ts.isStatement(p)) return false;
  }
  return false;
}

export interface ScanResult {
  keys: Map<string, KeyInfo>;
  violations: Violation[];
}

export function scan(root = ROOT): ScanResult {
  const files: string[] = [];
  walk(join(root, 'src'), files);
  const keys = new Map<string, KeyInfo>();
  const violations: Violation[] = [];

  const addKey = (key: string, domain: Domain, ref: string, field?: string) => {
    const k = keys.get(key);
    if (!k) keys.set(key, { key, domain, refs: [ref], ...(field ? { field } : {}) });
    else {
      k.refs.push(ref);
      // A string that is also game data belongs to the data dictionary
      if (domain === 'data') k.domain = 'data';
    }
  };

  for (const abs of files.sort()) {
    const rel = relative(root, abs).split('\\').join('/');
    if (skipFile(rel)) continue;
    const text = readFileSync(abs, 'utf8');
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true);
    const data = isDataFile(rel);
    const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

    const visit = (node: ts.Node) => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const call = keyCall(node);
        const ref = `${rel}:${lineOf(node)}`;
        // Keys without Japanese (e.g. '{season} {title}') count too
        if ((call === 't' || call === 'k') && node.text)
          addKey(node.text, data ? 'data' : 'ui', ref);
        else if (JP.test(node.text) && !inType(node)) {
          if (data) addKey(node.text, 'data', ref, fieldOf(node));
          else if (!devMessage(node))
            violations.push({ file: rel, line: lineOf(node), text: node.text });
        }
      } else if (ts.isTemplateExpression(node)) {
        const parts = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)];
        if (parts.some((p) => JP.test(p)) && !devMessage(node))
          violations.push({ file: rel, line: lineOf(node), text: node.getText(sf) });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { keys, violations };
}

// ---- CLI ----
if (process.argv[1] && /i18nScan\.ts$/.test(process.argv[1])) {
  const args = process.argv.slice(2);
  const { keys, violations } = scan();
  const missingLang = args[args.indexOf('--missing') + 1];
  const dumpPath = args[args.indexOf('--dump') + 1];
  if (args.includes('--missing') && missingLang) {
    void import('../src/i18n/dicts').then(({ DICT_PARTS }) => {
      const parts = DICT_PARTS[missingLang as keyof typeof DICT_PARTS];
      if (!parts) throw new Error(`unknown language ${missingLang}`);
      const missing = [...keys.values()].filter((k) => !(k.key in parts[k.domain]));
      for (const k of missing) console.log(`[${k.domain}] ${JSON.stringify(k.key)}  ${k.refs[0]}`);
      console.log(`${missing.length} missing of ${keys.size}`);
    });
  } else if (args.includes('--dump') && dumpPath) {
    writeFileSync(dumpPath, JSON.stringify([...keys.values()], null, 1));
    console.log(`${keys.size} keys → ${dumpPath}`);
  } else {
    const byFile = new Map<string, number>();
    for (const v of violations) byFile.set(v.file, (byFile.get(v.file) ?? 0) + 1);
    for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(`${n}\t${f}`);
    const ui = [...keys.values()].filter((k) => k.domain === 'ui').length;
    console.log(
      `violations: ${violations.length}, keys: ${keys.size} (ui ${ui}, data ${keys.size - ui})`,
    );
  }
}
