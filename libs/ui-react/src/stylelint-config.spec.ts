// @vitest-environment node
import { resolve } from 'node:path';
import stylelint from 'stylelint';

// Proves the workspace's stylelint.config.mjs: each rule fails on a bad fixture
// and lets the token-based alternative through.
const root = resolve(import.meta.dirname, '../../..');
const configFile = resolve(root, 'stylelint.config.mjs');

async function lint(css: string) {
  const { results } = await stylelint.lint({
    code: css,
    codeFilename: resolve(root, 'libs/ui-react/src/fixture.css'),
    configFile,
  });
  return (results[0]?.warnings ?? []).map((warning) => warning.rule);
}

describe('stylelint.config.mjs rejects', () => {
  it.each([
    ['a hex colour', '.a { color: #fff; }', 'color-no-hex'],
    ['a long hex colour', '.a { background: #18231F; }', 'color-no-hex'],
    ['a named colour', '.a { color: red; }', 'color-named'],
    ['rgb()', '.a { color: rgb(0 0 0); }', 'function-disallowed-list'],
    ['rgba()', '.a { color: rgba(0, 0, 0, 0.5); }', 'function-disallowed-list'],
    ['hsl()', '.a { color: hsl(0 0% 0%); }', 'function-disallowed-list'],
    [
      'hsla()',
      '.a { color: hsla(0, 0%, 0%, 0.5); }',
      'function-disallowed-list',
    ],
    ['hwb()', '.a { color: hwb(0 0% 0%); }', 'function-disallowed-list'],
    ['lab()', '.a { color: lab(50% 0 0); }', 'function-disallowed-list'],
    ['lch()', '.a { color: lch(50% 0 0); }', 'function-disallowed-list'],
    ['oklab()', '.a { color: oklab(50% 0 0); }', 'function-disallowed-list'],
    ['oklch()', '.a { color: oklch(50% 0 0); }', 'function-disallowed-list'],
    ['color()', '.a { color: color(srgb 1 0 0); }', 'function-disallowed-list'],
    [
      'an upper-case colour function',
      '.a { color: RGB(0 0 0); }',
      'function-disallowed-list',
    ],
    [
      'a colour function inside a shadow',
      '.a { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); }',
      'function-disallowed-list',
    ],
    ['left', '.a { left: 0; }', 'property-disallowed-list'],
    ['right', '.a { right: 0; }', 'property-disallowed-list'],
    ['margin-left', '.a { margin-left: 1rem; }', 'property-disallowed-list'],
    ['margin-right', '.a { margin-right: 1rem; }', 'property-disallowed-list'],
    ['padding-left', '.a { padding-left: 1rem; }', 'property-disallowed-list'],
    [
      'padding-right',
      '.a { padding-right: 1rem; }',
      'property-disallowed-list',
    ],
    [
      'scroll-margin-left',
      '.a { scroll-margin-left: 1rem; }',
      'property-disallowed-list',
    ],
    [
      'scroll-padding-right',
      '.a { scroll-padding-right: 1rem; }',
      'property-disallowed-list',
    ],
    [
      'border-left',
      '.a { border-left: 1px solid; }',
      'property-disallowed-list',
    ],
    [
      'border-right-width',
      '.a { border-right-width: 1px; }',
      'property-disallowed-list',
    ],
    [
      'border-left-color',
      '.a { border-left-color: transparent; }',
      'property-disallowed-list',
    ],
    [
      'border-top-left-radius',
      '.a { border-top-left-radius: 4px; }',
      'property-disallowed-list',
    ],
    [
      'border-bottom-right-radius',
      '.a { border-bottom-right-radius: 4px; }',
      'property-disallowed-list',
    ],
    ['an upper-case left', '.a { LEFT: 0; }', 'property-disallowed-list'],
    [
      'an upper-case physical property',
      '.a { MARGIN-LEFT: 1rem; }',
      'property-disallowed-list',
    ],
    [
      'text-align: left',
      '.a { text-align: left; }',
      'declaration-property-value-disallowed-list',
    ],
    [
      'text-align: right',
      '.a { text-align: right; }',
      'declaration-property-value-disallowed-list',
    ],
    [
      'float: left',
      '.a { float: left; }',
      'declaration-property-value-disallowed-list',
    ],
    [
      'clear: right',
      '.a { clear: right; }',
      'declaration-property-value-disallowed-list',
    ],
    [
      'a px font size',
      '.a { font-size: 10px; }',
      'declaration-property-value-disallowed-list',
    ],
    [
      'a px font size in capitals',
      '.a { font-size: 12PX; }',
      'declaration-property-value-disallowed-list',
    ],
  ])('%s', async (_name, css, rule) => {
    expect(await lint(css)).toContain(rule);
  });
});

describe('stylelint.config.mjs accepts', () => {
  it.each([
    ['a token colour', '.a { color: var(--tx-color-text-primary); }'],
    [
      'transparent and currentColor',
      '.a { background: transparent; border-color: currentColor; }',
    ],
    [
      'a colour derived from a token',
      '.a { background: color-mix(in srgb, var(--tx-color-text-primary) 40%, transparent); }',
    ],
    ['a shadow token', '.a { box-shadow: var(--tx-shadow-card); }'],
    [
      'logical insets and margins',
      '.a { inset-inline-start: 0; inset-block: 0; margin-inline: auto; margin-inline-end: 1rem; }',
    ],
    [
      'logical padding and borders',
      '.a { padding-inline-start: 1rem; border-inline-end: 1px solid var(--tx-color-border-subtle); }',
    ],
    [
      'logical radii',
      '.a { border-start-start-radius: var(--tx-radius-xs); border-end-end-radius: var(--tx-radius-xs); }',
    ],
    [
      'text-align start, end and center',
      '.a { text-align: start; } .b { text-align: end; } .c { text-align: center; }',
    ],
    ['float inline-start', '.a { float: inline-start; }'],
    [
      'a font size token and a rem size',
      '.a { font-size: var(--tx-typography-size-body-md); } .b { font-size: 0.875rem; }',
    ],
    [
      'vertical and size properties',
      '.a { top: 0; bottom: 0; width: 100%; height: 40px; }',
    ],
    [
      'a px value outside font-size',
      '.a { border-radius: 4px; outline-offset: 2px; }',
    ],
    ['a translateX transform', '.a { transform: translateX(14px); }'],
  ])('%s', async (_name, css) => {
    expect(await lint(css)).toEqual([]);
  });
});

describe('stylelint.config.mjs scope', () => {
  it('ignores generated token files, which hold the raw colours by definition', async () => {
    const { results } = await stylelint.lint({
      files: [resolve(root, 'libs/design-tokens/src/generated/tokens.css')],
      configFile,
    });

    expect(results[0]?.ignored).toBe(true);
    expect(results[0]?.warnings).toEqual([]);
  });

  it('passes on every stylesheet the libraries ship', async () => {
    const { results } = await stylelint.lint({
      files: [resolve(root, 'libs/**/*.css')],
      configFile,
    });

    const offences = results.flatMap((result) =>
      result.warnings.map(
        (warning) => `${result.source}:${warning.line} ${warning.rule}`,
      ),
    );
    expect(offences).toEqual([]);
    expect(results.filter((result) => !result.ignored).length).toBeGreaterThan(
      10,
    );
  });
});
