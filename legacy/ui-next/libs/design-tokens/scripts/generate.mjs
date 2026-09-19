// Generates CSS custom properties and TypeScript constants from tokens.json — the one canonical source. Run: node scripts/generate.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(root, '../src/tokens.json'), 'utf8'));

/** Walks the nested token tree, calling `visit` at every leaf `{ value }` node with its dash-joined path. */
function walk(node, path, visit) {
  if (node && typeof node === 'object' && 'value' in node) {
    visit(path, node.value);
    return;
  }
  for (const [key, child] of Object.entries(node)) walk(child, [...path, key], visit);
}

function setAtPath(tree, path, value) {
  let cursor = tree;
  for (const segment of path.slice(0, -1)) {
    cursor[segment] ??= {};
    cursor = cursor[segment];
  }
  cursor[path.at(-1)] = value;
}

const cssLines = [];
// `css` is a var() reference for inline styles; `raw` is the literal value for canvas/computation, which var() silently fails in.
const tsConstCss = {};
const tsConstRaw = {};

walk(tokens, [], (path, value) => {
  const cssVarName = `--tx-${path.join('-')}`; // not --omni-: collides with the production app's own tokens at different values
  cssLines.push(`  ${cssVarName}: ${value};`);
  setAtPath(tsConstCss, path, `var(${cssVarName})`);
  setAtPath(tsConstRaw, path, value);
});

const css = `/* Generated from tokens.json — do not edit by hand. Run \`node scripts/generate.mjs\`. */\n:root {\n${cssLines.join('\n')}\n}\n`;

const ts =
  `// Generated from tokens.json — do not edit by hand. Run \`node scripts/generate.mjs\`.\n` +
  `// \`tokens\`: var() references, for inline styles — theme-aware. \`rawTokens\`: literal values, for canvas/computation.\n` +
  `export const tokens = ${JSON.stringify(tsConstCss, null, 2)} as const;\n` +
  `export const rawTokens = ${JSON.stringify(tsConstRaw, null, 2)} as const;\n`;

mkdirSync(join(root, '../src/generated'), { recursive: true });
writeFileSync(join(root, '../src/generated/tokens.css'), css);
writeFileSync(join(root, '../src/generated/tokens.ts'), ts);

console.warn(`Generated ${cssLines.length} tokens -> src/generated/tokens.css, src/generated/tokens.ts`);
