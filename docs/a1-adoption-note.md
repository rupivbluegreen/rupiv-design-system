# Adoption note: from imported source to a package

This branch takes the source that was imported unchanged (components, tokens and charts written inside an application)
and makes it a package that a first consuming application can use in English and Arabic. This note says what changed,
what breaks for a consumer, what is not done, and what to check before merging.

Numbers come from the commit messages and from counting the files at the time of writing. The full test suite was not
re-run for this note, so no total below is a fresh result. Where a count differs from the plan the branch was built
from, the difference is stated.

## 1. Commits

| Commit | What |
|---|---|
| `ab57a3d` | tokens, fonts, Arabic type rules, token helper |
| `3177a55` | package, TypeScript, Vitest, Stylelint, test harness for English and Arabic |
| `a044bdc` | relative imports, strict types, provider for links, navigation, language and labels |
| `28556de` | label sets, one file per area |
| `34e25d3` | logical CSS by the Stylelint plugin's autofix |
| `9ea3266` | logical CSS by hand |
| `cd8d93f` | number, date, Hijri and duration formatter; `DateInput`; `StatusPill` takes a tone |
| `557590a` | overlays: direction-aware placement and keys, labels, Menu radio items, Tooltip on tap, Drawer side, Select auto width, toast lift |
| `005f46d` | data and form components: direction, labels, controlled `DataTable` sort and page |
| `8ae2a35` | the shell: `RailShell`, `NavDrawer`, `CommandPalette`, `NotificationsBell` |
| `cf3dc02` | display components: `Button` start and end icons, `EmptyState` tone, `Accordion`, `Tile`, `TaskList`, labels |
| `b777ad9` | a test fix (see Verify before merge) |
| not yet committed when this was written | the SVG charts, and this documentation |

Against the commit this branch started from, the committed changes touch 213 files (19,172 lines added, 1,398 removed),
not counting `legacy/`.

## 2. What changed

### Tooling and package

- Root `package.json`: `@rupiv/design-system`, `0.0.0`, `"private": true`, `"type": "module"`, `sideEffects` for CSS, and
  `exports` for the components, `./charts`, `./tokens.css`, `./styles.css`, `./format` and `./tokens`. `clsx` is the one
  dependency; `react`, `react-dom` and `lucide-react` are peers.
- `tsconfig.json` with the strict flags the first consuming application uses: `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`.
- Vitest with jsdom and `test/setup.ts` (polyfills for `ResizeObserver`, `IntersectionObserver`, `matchMedia`, scrolling).
  `test/harness.tsx` has `renderBoth`, which renders any element as English/ltr and Arabic/rtl.
- `stylelint.config.mjs` and `scripts/check-exports.mjs`. Scripts: `typecheck`, `lint:css`, `test`, `check:exports`.

### Imports and types

- 56 `@/` imports were made relative. The `@/` alias resolves inside the consuming application, so it either fails or
  silently picks that application's own file of the same name.
- `src/lib/types.ts` holds `Tone` and `CategoryColor`. The source imported them from a file that was not in the
  archive, so it did not type-check by itself.
- The type errors under the strict flags were fixed without casts or suppressions. The commit reports 67; the plan
  measured 69.
- `className` props accept `undefined` (`exactOptionalPropertyTypes`). `toast.tsx` no longer reads `process.env`.

### Provider

- `DesignSystemProvider` takes `locale`, `dir`, `labels`, `linkComponent`, `navigate` and `activePath`. Hooks:
  `useLocale`, `useDir`, `useLabels`, `useLink`, `useNavigate`, `useActivePath`. They work without a provider and return
  English, left to right, a plain `<a>`, page-load navigation and no active path.
- Read the provider: `Button`, `IconButton`, `Breadcrumbs`, `Menu`, `Stat`, `TabLinks`, `DataTable`, and `PageHeader`
  (through its back `IconButton`). The package no longer imports `next/link` or `next/navigation`, which also
  removes the errors a consumer's type check gave for them.
- The consequence is a client boundary rule, in [`client-boundary.md`](client-boundary.md).

### Tokens, fonts, Arabic type

- 30 tokens added (tile, heat, rail, fly-out, drawer, icon, font, direction sign) and 9 values changed.
- `--font-figtree`, which was used but never defined, is replaced by `--font-latin` and `--font-arabic`. `tokens.css`
  has no `@font-face` and no `@import`: the application bundles Figtree (Latin subset) and IBM Plex Sans Arabic with
  Fontsource, so nothing is fetched from the internet.
- `src/app/globals.css` became `src/styles/base.css` (exported as `styles.css`), without its `@import`.
- `<html lang="ar">` switches the font, taller leading, a 106.25% root size, and no letter spacing or uppercase, with
  targeted rules and no `!important`.
- `src/lib/tokens.ts` (`readToken`, `readTokens`) gives resolved token values to code that cannot use `var()`.
- Details: [`tokens.md`](tokens.md).

### Logical CSS

- Stylelint's autofix changed the 47 component CSS files: 1,084 lines, **653 warnings down to 27** (the plan measured
  557 on a scratch copy; the real run over the final rule set found more).
- The remaining 27 were fixed by hand, to **0 warnings and no disable comments**: 17 four-value `margin`/`padding` lines;
  checkbox and radio centring; drawer, switch and tooltip slides through `--rd-dir`; four inset shadows replaced by
  outlines or a pseudo-element (the `DataTable` row edge keeps working under hover and selection); the skeleton shimmer
  follows the direction; letter spacing off in Arabic for menu shortcuts and avatars; chevrons and the back arrow
  mirrored with `:dir(rtl)`; the `overflow` shorthand instead of `overflow-inline` and `overflow-block` (browser
  support); floating layers placed by script no longer carry a base inline start.
- The Stylelint config keeps these from coming back. See `test/stylelint-config.test.ts`.

### Direction in code

- `src/lib/placement.ts` places `Menu`, `Popover`, `Tooltip` and the `Combobox` list from the anchor's computed
  direction, with flip and clamp.
- `Tabs` and `SegmentedControl` swap the arrow keys in right-to-left; so does `RadioGroup` (by the provider's `dir`).
- `Modal` and `Drawer` keep the scrollbar width as `padding-inline-end` while they lock scrolling. (The plan proposed
  `scrollbar-gutter: stable`; the branch did not use it.)
- Sides are named by role: `startIcon`, `endIcon`, `Column.align` `start | end`, `Tooltip` `side` `start | end`.
- Charts keep the plot left to right and let the legend, row names and tooltip text follow the page.
- Details: section 6 of [`design-system.md`](design-system.md).

### Labels

- Every built-in string comes from a label, looked up by key with `useLabels()`: 87 keys in six files under
  `src/provider/label-sets/` (overlays 10, data and forms 36, display 7, charts 23, shell 9, dates 2). The plan counted
  58 hard-coded strings in 23 files; keys were also added for components that are new and for the chart summaries.
- A label is a string with `{name}` placeholders, or a function, so an application can write Arabic plurals. The package
  ships English only.
- Number and list formats follow the provider's language: sorting uses `Intl.Collator`, lists use `Intl.ListFormat`, and the
  four places that had a fixed regional locale (`format.ts`, the `DataTable` sort, `QuantityInput`, chart scales) no longer do.
- Tests check that no component keeps a default English string on screen when given Arabic labels. The Arabic in
  `test/*-labels.ts` is a stand-in draft, not reviewed text.

### Formatter and `DateInput`

- `@rupiv/design-system/format` follows the reference kit's `RD.fmt`: `num`, `int`, `pct`, `time`, `duration`, `date`,
  `dateBoth`, plus `formatNumber`, `formatPercent`, `formatDelta`, `formatDate`, `formatTime`, `formatDateTime`,
  `formatHijriDate`, `formatMinutesSeconds`, `initials`. Western digits in both languages, ASCII `%`, always
  `Asia/Riyadh`, Hijri as Umm al-Qura with the English form in day-month-year order, no Unicode direction marks in
  Arabic dates, `-` for a missing value. `useFormat()` binds the provider's language.
- `DateInput` is a native date input with an optional Hijri caption (`showHijri`) and range-aware invalid styling.
- `status.ts` keeps only generic tone helpers (`TONES`, `isTone`, `createToneResolver`). `StatusPill` takes a `tone`.

### New and changed components (as built)

| Component | What it does now |
|---|---|
| `Menu` | radio groups (`menuitemradio`, a check on the chosen one) and non-focusable headings, next to ordinary items and separators. `FilterChip` uses them |
| `Drawer` | `side="start"` slides in from the inline start (the right in Arabic) |
| `Tooltip` | on an `aria-disabled` control, a tap or click shows the tooltip at once for about 2.6 seconds and stops the click; `side` is `top`, `bottom`, `start`, `end` |
| `Select` | `width="auto"` sizes to the longest option |
| `ToastProvider` | lifts the region above the footer of an open modal or drawer |
| `RailShell` | rail with keyboard-reachable fly-outs, top bar, skip link, landmarks, and a drawer below 1024px. Knows no product, section or role: [`shell.md`](shell.md) |
| `NavDrawer` | the rail's groups in a start-side drawer |
| `CommandPalette` | an anchored combobox and listbox, with Arabic-aware matching (diacritics, tatweel, alef forms, Arabic-Indic digits) and Enter navigating through the provider |
| `NotificationsBell` | a link or button with an unread count in Western digits ("99+" above 99) |
| `Accordion` | single or multiple, controlled or not, keyboard operable |
| `Tile` | an icon on a pastel tint: `mint`, `rose`, `sky`, `sand`, `lilac`; `md` or `lg`; circle or square |
| `TaskList` | rows of tile, title with chip, meta and, for a link, a chevron at the inline end |
| `EmptyState` | `tone` `default | danger | warning`; `danger` is `role="alert"` and is the error state |
| `StatusPill` | `tone` is required |
| `DataTable` | controlled `sort`, `onSortChange`, `page`, `onPageChange`; locale-aware sort; the row-tone edge sits at the inline start |
| `LineChart` | `band` (low and high range, with a legend entry and a tooltip row) and `markers` (labelled vertical lines) |
| `HeatGrid` | `kind="signed"` (gap, surplus, balanced), sideways scroll with fixed row names, `compact`, keyboard navigation, `onCellSelect` |
| Charts | measured text width instead of a guessed one, `label` for the accessible name, `min` and `max` on the value axis |
| `Field`, `Input`, `QuantityInput`, `Pagination`, `FileDrop`, `FilterBar`, `SearchInput`, `Breadcrumbs`, `PageHeader` | direction-aware, labels from the provider, numbers through the formatter |

The Stepper's compact mode from the mockup kit is not built (no screen used it).

### Tests

- One test file per component, English and Arabic (the chart tests were being added when this was written), plus tests
  for the provider, labels, formatter, placement, tokens, the Stylelint config and the exports check. Commit messages give their own counts (113 tests in 13 files at the provider
  commit, 120 at the formatter, 375 at the overlays, 228 in 17 files at the data components, 207 at the shell, 246 at
  the display components). These are per-commit figures, not a running total.
- By count of files at the time of writing: 73 test files and 973 `it` and `test` calls (before `it.each` is
  expanded). Re-count before quoting a total.
- Contract tests read the sources and check that every CSS Module class a component uses exists, that no physical
  direction or undefined token is used, that no aria attribute holds an English literal, and that every label key a
  component asks for exists.
- jsdom has no layout, so none of this shows that a right-to-left screen looks right. That evidence is screenshots in
  the consuming application.

## 3. Breaking changes for a consumer

| Was | Now |
|---|---|
| `Button` `leftIcon`, `rightIcon`; `Input` `leftIcon` | `startIcon`, `endIcon` (`Input` has `startIcon` only) |
| `Column.align` `"left" \| "right" \| "center"` | `"start" \| "end" \| "center"` |
| `Tooltip` `side` `"top" \| "bottom" \| "left" \| "right"` | `"top" \| "bottom" \| "start" \| "end"` |
| `Menu`, `Popover` `align="start"` was the left edge | `start` is the anchor's inline start, so the right edge in Arabic |
| `StatusPill` `status` only (tone from a built-in status map) | `tone` is required; build the map with `createToneResolver` |
| `statusTone` and `gradeTone` | removed: the application maps its own statuses |
| `formatNumber(value, decimals)` | `formatNumber(value, locale?, options?)` |
| `formatPercent(value, decimals)` took a value already in percent (12.4 gave "12.4%") | `formatPercent(ratio, locale?, digits)` takes a ratio (0.91 gives "91%"); use `pct(value, digits)` for a percent value. Negatives use a hyphen-minus |
| `formatDelta(value, 0 \| 1)` | `formatDelta(value, 0 \| 1 \| 2, locale?)` |
| `formatDate(iso)`, `formatDateTime(iso)` in English, with no zone | `formatDate(value, locale?, style?)`, always `Asia/Riyadh`; the same call gives different text (the zone, the `Intl` month names), so a test that compares the old text will fail |
| the currency, unit-of-measure, quantity and rate helpers, the relative-date helpers, and the fixed "today" and financial-year constants | removed: they belonged to one product's domain |
| `next/link` used inside `Button`, `Breadcrumbs`, `Menu`, `Stat`, `TabLinks`, `PageHeader` | the provider's `linkComponent` (a plain `<a>` without one, which reloads the page). `DataTable` `rowHref` uses the provider's `navigate`; `TabLinks` uses the provider's `activePath` |
| `Button`, `Breadcrumbs`, `Stat` and others were Server Components | they read the provider, so they are Client Components; a Server Component cannot pass them functions ([`client-boundary.md`](client-boundary.md)) |
| the default chart number format, which used regional unit words for large numbers | compact `K` and `M`, with the unit words from the labels `chart.compactThousand` and `chart.compactMillion` |
| `src/app/globals.css`, with an `@import` | `@rupiv/design-system/styles.css` (no `@import`); import the fonts, then `tokens.css`, then `styles.css` |
| `HeatGrid` `values: number[][]` | `(number \| null \| undefined)[][]` (wider, not narrower) |
| the `@/` alias and `@/lib/types` | relative imports; `Tone` and `CategoryColor` are in `src/lib/types.ts` |

Every string the design system draws in English is now overridable through `labels`; a consumer that wants Arabic must
pass Arabic labels, or the English text stays.

## 4. Not done

- **`DataTable` sorts and pages in memory.** `sort` and `page` can be controlled, but the table cannot show a page it
  does not have all the rows of (server-side paging, with a `total`).
- **`FileDrop` has no `onReject`.** Files that do not match `accept` are dropped without a message.
- **No `FormFooter`** (a sticky footer bar for form pages). Put the actions in the page header.
- **Dark theme is frozen.** The two dark blocks in `tokens.css` are not maintained or tested, and do not remap the
  tile, heat, rail and fly-out tokens.
- **Contrast known issues**, computed from the token values on `--bg-surface` white and unchanged: placeholder text
  (`--text-placeholder`) 3.19:1 (4.5:1 wanted), the control border (`--border-control`, `#a6a6a6`) 2.43:1 (3:1 wanted),
  `--chart-4` 2.50:1 (3:1 wanted).
- **Keyboard access to chart points.** Only `HeatGrid` is keyboard operable. `LineChart`, `BarChart` and `DonutChart`
  show their tooltip on pointer hover; the generated summary in the accessible name is the alternative.
- **No reviewed Arabic.** The package ships English defaults; test label sets are stand-ins.
- **Category colour names** (`madder`, `neem`, `turmeric`, `lac`, `kattha`) come from the source system and are kept
  unchanged. Renaming them is a separate change.
- **A `LICENSE` file.** MIT is declared in `package.json`; the owner adds the file.
- **No visual proof.** Nothing was rendered in a browser for this branch's tests; the layout in Arabic is proven only by
  Stylelint and by the screenshots the consuming application takes.

## 5. Verify before merge

Two areas were still being finished by other work while this note was written. What could not be confirmed is listed here.

### Display components (committed in `cf3dc02`)

Read: the source of `EmptyState`, `Badge`, `Tag`, `Avatar`, `Alert`, `Stat`, `Card`, `Timeline`, `Skeleton`,
`DescriptionList`, `Kbd`, `Layout`, `Section`, `Progress`, `Stepper`, `Button`, `Accordion`, `Tile` and `TaskList`, and the
display label set. Not confirmed:

- The CSS Modules were not read line by line. That a chevron, a trend arrow or a task chevron mirrors in Arabic is
  established from a `:dir(rtl)` rule being present in the CSS, not from a render.
- The `Card` rule that a card with `CardHeader`, `CardBody` or `CardFooter` has no padding of its own relies on the CSS
  `:has()` selector; it was not checked in the browsers the consuming application supports.
- The 246 tests the commit reports were not re-run.

### Charts (uncommitted when this was written)

`docs/design-system.md` describes the charts from the working tree: `Sparkline` (`format`, `label`), `LineChart` (`band`,
`markers`, `min`, `max`, `label`, `measureText`), `BarChart` (`mirror`, `min`, `max`, `label`, `measureText`), `DonutChart`
(`label`), `HeatGrid` (`kind`, `minColWidth`, `compact`, `label`, `onCellSelect`), `ChartLegend` (`label`), and the 23 chart
label keys in `src/provider/label-sets/charts.ts`. Check before merging:

- The props and label keys above still match the source. If a prop was renamed or added after this was written, update
  the Charts section of `docs/design-system.md` and the key list in its Labels section.
- Read in full: `line-chart.tsx`, `heat-grid.tsx`, `sparkline.tsx`, `chart-legend.tsx`, `chart-tooltip.tsx`,
  `use-chart-dir.ts`, `use-chart-text.ts`, `use-measure.ts`, `scale.ts`. Read only in part: `bar-chart.tsx` (props and the
  first layout step), `donut-chart.tsx` (props and the ring), `text-measure.tsx` (its comment and estimate). The CSS
  Modules of the charts were not read.
- The chart test files were being added while this was written. Untracked files existed for the bar, donut, line and
  heat-grid charts, the sparkline, the legend, the tooltip, `scale`, `text-measure`, a chart contract test and a chart
  label test. They were not run and not read. Confirm each chart has a test in English and Arabic and that they pass.
- `text-measure.tsx` still holds an estimated width (6.2px a character) that is used only until a text is measured and where
  the browser cannot measure. The plan said the charts would stop guessing; the guess remains as a fallback.

### Other

- **Re-run the whole suite more than once.** `b777ad9` fixed `QuantityInput` tests that failed 3 runs in 6 (they typed
  before an animation frame). Run `pnpm test` several times, not once, and `pnpm typecheck`, `pnpm lint:css` and
  `pnpm check:exports`.
- **`Tone` and `CategoryColor` are not exported.** `Tone` is in the public props of `Badge`, `StatusPill`, `Alert`,
  `Progress`, `Timeline`, `Sparkline`, the toast options and `DataTable` `rowTone`, and `createToneResolver` returns it;
  `CategoryColor` is in `Tag` and `Avatar`. But `src/lib/types.ts` is not re-exported by any entry point, so a consumer
  cannot import the type names. Decide whether to export them. `design-system.md` lists the values.
- **Source comments that name the system this one grew out of.** The header comment on line 1 of
  `src/components/ui/index.ts` still names it and points to a section of the old docs. A comment at line 49 of
  `src/styles/tokens.css` and a test name at line 101 of `src/styles/tokens.test.ts` name a product and its logo. These
  files are not documentation, so they were not edited here; a public repository should not carry them.
- **`legacy/ui-next/` is in the checkout.** It has `package.json` files named `@omniappsuiux/*` and demo content from an
  earlier project, and one spec file names the consuming application. It is not a workspace member and not part of the
  package, so a consumer must not list it in its workspace and should keep any search for those package names out of
  the folder that holds this repository. Whether a public repository should keep that content is for the owner to decide.
- **Docs written against source that may still move.** `docs/tokens.md`, `docs/shell.md` and `docs/client-boundary.md` were
  written by other work and are linked, not edited here. They were read for consistency only.
