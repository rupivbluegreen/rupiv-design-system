# Tokens, fonts and Arabic type

Files: `src/styles/tokens.css` (custom properties only), `src/styles/base.css` (reset, type utilities, Arabic rules),
`src/lib/tokens.ts` (resolved values for canvas code). Exports: `@rupiv/design-system/tokens.css`, `.../styles.css`,
`.../tokens`. Where this page and `tokens.css` disagree, `tokens.css` wins.

## Token groups

| Group | Names | Note |
|---|---|---|
| Layer 1 primitives | `--p-neutral-*`, `--p-teal-*`, `--p-green/amber/red/blue-*`, `--p-indigo-*`, category hues | Never read by components (base.css reads two for print only) |
| Backgrounds, text, borders, icons | `--bg-*`, `--text-*` (colours), `--border-*`, `--icon-*` | Layer 2: the only colours screens and components read |
| Tones | `--{neutral,accent,success,warning,danger,info}-{bg,border,text,solid}` | Status. Text on its own background passes 4.5:1 |
| Category | `--cat-*-{bg,fg}`, `--tile-{rose,sky,sand,lilac,mint}` | Category, never status |
| Data | `--chart-1..6`, `--chart-grid/axis/label`, `--heat-1..5` | `--heat-*` are `color-mix()` steps of the warning tone |
| Shell | `--rail-*`, `--flyout-*`, `--rail-w`, `--topbar-h`, `--topbar-bg`, `--sidebar-*` | `--sidebar-*` is the older wide sidebar |
| Type | `--font-latin`, `--font-arabic`, `--font-ui`, `--font-display`, `--font-mono`, `--text-11..60` (rem), `--weight-*`, `--leading-*` | `--font-mono` is the UI face: no monospace |
| Space, shape, layers, motion | `--space-*` (px), `--radius-*`, `--shadow-*`, `--z-*`, `--ease-*`, `--dur-*` | Shadows on floating layers only |
| Sizing | `--control-sm/md/lg`, `--icon-sm/md/lg/xl`, `--page-max`, `--page-pad`, `--table-row-h*`, `--drawer-w` | |
| Direction | `--rd-dir` (1, or -1 under `<html dir="rtl">`) | For a transform that cannot be logical, e.g. `translate(calc(-50% * var(--rd-dir)), -50%)` |

Some names come from the source system this one grew out of (`--cat-madder-*`, `--cat-neem-*`, ...). They are kept
unchanged for now.

## Loading the fonts

`tokens.css` has no `@font-face` and no `@import`. It only names the families. The app bundles them with Fontsource, so
nothing is fetched from the internet and an install can run offline. Two families, four weights (400, 500, 600, 700):

```ts
import "@fontsource/ibm-plex-sans-arabic/400.css";   // the combined files, not arabic-400.css
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource/figtree/latin-400.css";          // Latin subset only
import "@fontsource/figtree/latin-500.css";
import "@fontsource/figtree/latin-600.css";
import "@fontsource/figtree/latin-700.css";
import "@rupiv/design-system/tokens.css";
import "@rupiv/design-system/styles.css";
```

Order matters: fonts, then `tokens.css`, then `base.css` (exported as `styles.css`), each imported once in the root
layout. `base.css` has no `@import`.

The combined Plex Arabic files carry `unicode-range` blocks for arabic, cyrillic-ext, latin-ext and latin. Import them,
not `arabic-400.css`: the Arabic subset has none of the ten Western digits and none of `- . , : ; / ( ) %`, which would
fall back to another face. Latin digits and words on an Arabic page then render in Plex Arabic's own Latin glyphs;
Figtree is the fallback.

## Light theme only

The app sets `data-theme="light"` on `<html>`. The two dark blocks at the end of `tokens.css` (`@media
(prefers-color-scheme: dark)` on `:root:not([data-theme="light"])`, and `:root[data-theme="dark"]`) are frozen: not
maintained, not tested, and they do not remap the tile, heat, rail and fly-out tokens. Without `data-theme="light"` a
dark OS setting turns the app dark.

## Arabic type

`<html lang="ar">` (set by the server, never by CSS) switches `base.css` to Arabic:

- `--font-ui` and `--font-display` become `--font-arabic` (IBM Plex Sans Arabic, then Figtree, then system fonts).
- The root size is 106.25%. Text sizes are rem and spacing is px, so only text grows (14px becomes 14.875px).
- Leading tokens are taller: tight 1.3, snug 1.5, ui 1.65, read 1.9 (Latin: 1.15, 1.3, 1.45, 1.6).
- No letter spacing: joined letters break apart. No uppercase. The rules are targeted and carry no `!important`:
  `.t-display-*:lang(ar)` and `.t-overline:lang(ar)`. The display roles also take `--leading-tight`.
- A component that sets its own `letter-spacing` overrides it in its own CSS Module with `:lang(ar)`.

`.icon-flip` mirrors an icon with `:dir(rtl)`. Time axes, charts and maps stay left to right.

## Reading tokens from code

Canvas and map code cannot use `var()`. `readToken(name, root?)` and `readTokens(names?, root?)` from
`@rupiv/design-system/tokens` return the resolved values with `getComputedStyle`; `TOKEN_NAMES` lists the colour
tokens. Call them in an effect, not while rendering: without a DOM they throw. `var()` chains are resolved
(`--bg-surface` gives `#ffffff`); `rgb()` and `color-mix()` values come back as written.
