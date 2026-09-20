# Adoption note: from imported source to a package

This branch takes the source that was imported unchanged (components, tokens and charts written inside an application)
and makes it a package that a first consuming application can use in English and Arabic. This note says what changed,
what breaks for a consumer, what is not done, and what to check before merging.

It describes the branch as it is after an independent review of the first adoption. Numbers are measured, and each says
what it was measured on. The commit that follows the 16 listed below holds the review's fixes (section 2, "Review
fixes"); at the time of writing it is not committed yet, so the counts for it are counts of the working tree.

## 1. Commits

The branch starts at `bc0e3a7` and has 16 commits (`git log --oneline bc0e3a7..01a9332`), oldest first:

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
| `b777ad9` | a test fix: the `QuantityInput` tests typed before an animation frame and failed 3 runs in 6 |
| `2d63df4` | README, reference, page rules and this note |
| `0d0d9b9` | product names removed from comments and test titles; the `Tone` and `CategoryColor` types exported |
| `93b1283` | the SVG charts: plot always left to right, measured label fitting, provider labels, `LineChart` band and markers, signed and keyboard-operable `HeatGrid` |
| `01a9332` | `linkComponent` accepts a router's `Link` under `exactOptionalPropertyTypes`; the `Stat` delta is isolated left to right |

Against `bc0e3a7`, the 16 commits change 235 files (23,598 lines added, 1,984 removed), not counting `legacy/`
(`git diff --shortstat bc0e3a7..01a9332 -- . ':!legacy'`).

The independent review ran the exit commands on `01a9332` (install with a frozen lockfile, type check, Stylelint,
the exports check, and the test suite twice under heavy machine load): all passed, 76 test files and 1,480 tests both
times, with no flaky test. Its findings are what the "Review fixes" below answer.

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
  archive, so it did not type-check by itself. Both types are exported from the package entry
  (`src/components/ui/index.ts`), so a consumer can import the names.
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
- The Stylelint config keeps these from coming back, and since the review it covers more (see "Review fixes").

### Direction in code

- `src/lib/placement.ts` places `Menu`, `Popover`, `Tooltip` and the `Combobox` list from the anchor's computed
  direction, with flip and clamp.
- `Tabs` and `SegmentedControl` swap the arrow keys in right-to-left; so does `RadioGroup` (by the provider's `dir`).
  `Tabs` and `SegmentedControl` read the computed direction of the element, `RadioGroup` and `RailShell` read the
  provider's `dir`: the two differ only inside an element that sets its own `dir`.
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
  ships English only. A key with no label resolves to the key itself.
- Number and list formats follow the provider's language: sorting uses `Intl.Collator`, lists use `Intl.ListFormat`, and the
  four places that had a fixed regional locale (`format.ts`, the `DataTable` sort, `QuantityInput`, chart scales) no longer do.
- Tests check that no component keeps a default English string on screen when given Arabic labels. The Arabic in
  `test/*-labels.ts` is a stand-in draft, not reviewed text.

### Formatter and `DateInput`

- `@rupiv/design-system/format` follows the reference kit's `RD.fmt`: `num`, `int`, `pct`, `time`, `duration`, `date`,
  `dateBoth`, plus `formatNumber`, `formatPercent`, `formatDelta`, `formatDate`, `formatTime`, `formatDateTime`,
  `formatHijriDate`, `formatMinutesSeconds`, `initials`. Western digits in both languages, ASCII `%`, `Asia/Riyadh` by
  default, Hijri as Umm al-Qura with the English form in day-month-year order, no Unicode direction marks in Arabic
  dates, `-` for a missing value. `useFormat()` binds the provider's language.
- `DateInput` is a native date input with an optional Hijri caption (`showHijri`) and range-aware invalid styling.
- `status.ts` keeps only generic tone helpers (`TONES`, `isTone`, `createToneResolver`). `StatusPill` takes a `tone`.

### New and changed components (as built)

| Component | What it does now |
|---|---|
| `Menu` | radio groups (`menuitemradio`, a check on the chosen one) and non-focusable headings, next to ordinary items and separators. `FilterChip` uses them |
| `Drawer` | `side="start"` slides in from the inline start (the right in Arabic); `initialFocus` chooses where focus starts |
| `Tooltip` | on an `aria-disabled` control, a tap or click shows the tooltip at once for about 2.6 seconds and stops the click; `side` is `top`, `bottom`, `start`, `end` |
| `Select` | `width="auto"` sizes to the longest option |
| `ToastProvider` | lifts the region above the footer of an open modal or drawer |
| `RailShell` | rail with keyboard-reachable fly-outs, top bar, skip link, landmarks, and a drawer below 1024px. Knows no product, section or role: [`shell.md`](shell.md) |
| `NavDrawer` | the rail's groups in a start-side drawer |
| `CommandPalette` | an anchored combobox and listbox, with Arabic-aware matching (diacritics, tatweel, alef forms, Arabic-Indic digits) and Enter navigating through the provider |
| `NotificationsBell` | a link, a button, or with neither a plain element that only shows the count, with an unread count in Western digits ("99+" above 99) |
| `Accordion` | single or multiple, controlled or not, keyboard operable |
| `Tile` | an icon on a pastel tint: `mint`, `rose`, `sky`, `sand`, `lilac`; `md` or `lg`; circle or square |
| `TaskList` | rows of tile, title with chip, meta and, for a link, a chevron at the inline end |
| `EmptyState` | `tone` `default | danger | warning`; `danger` is `role="alert"` and is the error state; `headingLevel` makes the title a heading |
| `StatusPill` | `tone` is required |
| `DataTable` | controlled `sort`, `onSortChange`, `page`, `onPageChange`; locale-aware sort; the row-tone edge sits at the inline start |
| `LineChart` | `band` (low and high range, with a legend entry and a tooltip row) and `markers` (labelled vertical lines) |
| `HeatGrid` | `kind="signed"` (gap, surplus, balanced), sideways scroll with fixed row names, `compact`, keyboard navigation, `onCellSelect` |
| Charts | measured text width instead of a guessed one, `label` for the accessible name, `min` and `max` on the value axis |
| `Field`, `Input`, `QuantityInput`, `Pagination`, `FileDrop`, `FilterBar`, `SearchInput`, `Breadcrumbs`, `PageHeader` | direction-aware, labels from the provider, numbers through the formatter |

The Stepper's compact mode from the mockup kit is not built (no screen used it).

### Charts (`93b1283`)

`Sparkline` (`format`, `label`), `LineChart` (`band`, `markers`, `min`, `max`, `label`, `measureText`), `BarChart`
(`mirror`, `min`, `max`, `label`, `measureText`), `DonutChart` (`label`), `HeatGrid` (`kind`, `minColWidth`, `compact`,
`label`, `onCellSelect`) and `ChartLegend` (`label`) are plain SVG with no chart library, and the 23 chart label keys are
in `src/provider/label-sets/charts.ts`. Each chart has a test in English and Arabic, and `charts.contract.test.ts` checks
the CSS Modules and the labels (`text-measure` has a plain unit test). The plot is always left to right; the legend, the row names and the tooltip text follow
the page. Text is measured in the browser, with an estimate of 6.2px a character (`ESTIMATED_CHAR_WIDTH`) used only
until a text is measured and where the browser cannot measure (server render, jsdom, a hidden chart). The plan said the
charts would stop guessing; the guess remains as that fallback.

### Tests

- One test file per component, English and Arabic, plus tests for the provider, labels, formatter, placement, tokens,
  the Stylelint config, the CSS text (focus and print), and the exports check.
- Counts, all measured by running the suite:
  - `01a9332`, by the independent review: 76 test files, 1,480 tests, on two runs.
  - `01a9332`, files tracked in git whose name contains `.test.`: 76 (`git ls-files | grep -c '\.test\.'`).
  - With the review fixes, working tree: 79 test files, 1,648 tests, on two `pnpm test` runs (231 s and 328 s, under
    heavy machine load), no failure and no flaky test. That is 168 more tests than the review counted: 13 in three new
    files (`lint-css`, `focus-css`, `print-css`) and the rest in the files the fixes touch (Stylelint config, bell,
    empty state, drawers, dates).
  - The review fixes touch about 23 files: 20 changed, 3 new (`git diff --shortstat 01a9332 -- . ':!legacy'` gives
    +961 and -170 for the changed ones, before this note's last edit).
- Contract tests read the sources and check that every CSS Module class a component uses exists, that no physical
  direction or undefined token is used, that no aria attribute holds an English literal, and that every label key a
  component asks for exists. The English check reads five aria attributes and a list of phrases, and ignores fragments
  under four letters: it is a net with holes, not proof that no English is left.
- jsdom has no layout, so none of this shows that a right-to-left screen looks right. That evidence is screenshots in
  the consuming application. Mutation checks made by the review (ten deliberate breakages: arrow keys in
  right-to-left, placement, the percent sign, sort state, Arabic search normalisation, a menu's checked state, Escape
  in a modal and a drawer) each made a test fail.

### Review fixes (the commit after `01a9332`)

The independent review found no defect in the shipped behaviour, and these gaps in the gates and edges:

- **Stylelint** (`stylelint.config.mjs`, `test/stylelint-config.test.ts`) also rejects: a literal horizontal offset in
  `translate`, `translate()`, `translateX()` and `translate3d()` (zero, `var()` and `calc()` with a `var()` in it pass;
  `-50%` does not, because with logical insets it centres wrongly in right-to-left: use `calc(-50% * var(--rd-dir))`);
  `left` and `right` in `background-position`, `object-position`, `transform-origin`, `perspective-origin`, masks and
  gradients; the vendor forms of `text-align: left | right`; four-value `border-width`, `border-style`, `border-color`,
  `scroll-margin` and `scroll-padding`; a `border-radius` that differs left to right (`4px 0 0 4px`; `4px 4px 0 0` is
  fine); a pixel or point size in the `font` shorthand and `pt` in `font-size`; `drop-shadow()` and the vendor
  `box-shadow` with anything but a shadow token; upper-case colour functions (`RGB()`). The existing CSS needed no change.
- **`pnpm test` guards CSS** (`test/lint-css.test.ts`): it runs Stylelint over `src/**/*.css` and fails with the list of
  warnings. A scratch `margin-left`, hex colour and `translate: 10px 0` in `button.module.css` made it fail; the file
  was restored.
- **Focus outline.** The top bar's brand link, menu button and bell have the 2px solid outline of the rail items, no
  longer the soft ring alone (about 1.5:1). Eighteen other controls still show only the soft ring, as the reference kit
  does; `test/focus-css.test.ts` lists them, and fails if a new one is added or a rule removes the outline with nothing in
  its place. Fixing them is a design decision (it changes every button's focus look).
- **`NotificationsBell` with neither `href` nor `onClick`** is no longer a focusable button that does nothing: it is a
  `role="img"` element with the same name and count, and Tab skips it. The props stay compatible.
- **`EmptyState` `headingLevel`** (1 to 6) makes the title a heading, so a page that is only an empty state (no access,
  not found) can have its `h1`. Without it the title stays a paragraph.
- **Navigation drawer.** The close button was already first in the document, but focus started on the first group, so a
  person who pressed Tab from there reached the close button after every group (the 13th stop in one application).
  `Drawer` has `initialFocus: "content" | "close"` (default `"content"`, as before); `NavDrawer` uses `"close"`, so the
  close button is the first stop and the groups follow in order. This changes where focus starts in `NavDrawer`.
- **Print.** `@media print` rules hide the rail, the top bar, the skip link and an open drawer with its scrim, and let
  the page use the whole sheet. Checked as CSS text only: nobody has looked at a printed page.
- **`date`, `dateBoth` and `time` take an optional `timeZone`** (an IANA name). The default stays `Asia/Riyadh`. An
  unknown name gives `-`. A string with no offset is read as a wall-clock time in that zone, and a plain calendar day
  is the same day in every zone. `useFormat()` passes the option through. `duration()` keeps the English `min` as its
  default unit, now documented: pass the label, or use `useFormat().duration`. `initials` is unchanged.
- **Docs.** This note, the README (scripts, browser support) and `docs/design-system.md` and `docs/shell.md` describe the
  above.

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
| `formatDate(iso)`, `formatDateTime(iso)` in English, with no zone | `formatDate(value, locale?, style?)`, `Asia/Riyadh`; the same call gives different text (the zone, the `Intl` month names), so a test that compares the old text will fail |
| the currency, unit-of-measure, quantity and rate helpers, the relative-date helpers, and the fixed "today" and financial-year constants | removed: they belonged to one product's domain |
| `next/link` used inside `Button`, `Breadcrumbs`, `Menu`, `Stat`, `TabLinks`, `PageHeader` | the provider's `linkComponent` (a plain `<a>` without one, which reloads the page). `DataTable` `rowHref` uses the provider's `navigate`; `TabLinks` uses the provider's `activePath` |
| `Button`, `Breadcrumbs`, `Stat` and others were Server Components | they read the provider, so they are Client Components; a Server Component cannot pass them functions ([`client-boundary.md`](client-boundary.md)) |
| the default chart number format, which used regional unit words for large numbers | compact `K` and `M`, with the unit words from the labels `chart.compactThousand` and `chart.compactMillion` |
| `src/app/globals.css`, with an `@import` | `@rupiv/design-system/styles.css` (no `@import`); import the fonts, then `tokens.css`, then `styles.css` |
| `HeatGrid` `values: number[][]` | `(number \| null \| undefined)[][]` (wider, not narrower) |
| the `@/` alias and `@/lib/types` | relative imports; `Tone` and `CategoryColor` are in `src/lib/types.ts` and exported from the package |

Every string the design system draws in English is now overridable through `labels`; a consumer that wants Arabic must
pass Arabic labels, or the English text stays.

Changed by the review fixes, for a consumer of `01a9332`: `NavDrawer` starts focus on its close button, not on the first
group; `NotificationsBell` with no `href` and no `onClick` is now a non-focusable element; a Stylelint config copied from
this repository rejects more CSS than before. Everything else there is additive (`headingLevel`, `initialFocus`,
`timeZone`).

## 4. Not done

- **`DataTable` sorts and pages in memory.** `sort` and `page` can be controlled, but the table cannot show a page it
  does not have all the rows of (server-side paging, with a `total`).
- **`FileDrop` has no `onReject`.** Files that do not match `accept` are dropped without a message.
- **No `FormFooter`** (a sticky footer bar for form pages). Put the actions in the page header.
- **Dark theme is frozen.** The two dark blocks in `tokens.css` are not maintained or tested, and do not remap the
  tile, heat, rail and fly-out tokens.
- **Contrast known issues**, computed from the token values on `--bg-surface` white and unchanged: placeholder text
  (`--text-placeholder`) 3.19:1 (4.5:1 wanted), the control border (`--border-control`, `#a6a6a6`) 2.43:1 (3:1 wanted),
  `--chart-4` 2.50:1 (3:1 wanted), and the soft focus ring (`--focus-ring`, 28% teal) about 1.5:1 (3:1 wanted) on the
  eighteen controls listed in `test/focus-css.test.ts`.
- **Keyboard access to chart points.** Only `HeatGrid` is keyboard operable. `LineChart`, `BarChart` and `DonutChart`
  show their tooltip on pointer hover; the generated summary in the accessible name is the alternative.
- **No reviewed Arabic.** The package ships English defaults; test label sets are stand-ins.
- **Category colour names** (`madder`, `neem`, `turmeric`, `lac`, `kattha`) come from the source system and are kept
  unchanged. Renaming them is a separate change.
- **Licence.** The repository is private (decided 20 Sep 2026): `package.json` says `UNLICENSED`; no `LICENSE` file is needed.
- **No automated accessibility audit** (axe) in this repository, and no continuous integration or commit hook: the four
  commands under "Verify before merge" run only when someone runs them.
- **Small edges left as they are:** `LinkComponentInput` accepts any component type, `--rd-dir` follows only
  `<html dir>`, `initials("محمد علي")` gives two letters that may not be the two a reader expects (an application can
  pass its own), and `formatDelta` writes a true minus (U+2212) where `formatPercent` and `pct` write a hyphen-minus.
- **Little visual proof.** The components were rendered in Chromium by the consuming application and by the review, in
  English and Arabic, and no error or overflow was seen; there is no committed visual test in this repository, and the
  layout in Arabic is proven here only by Stylelint and by the tests' structure checks.

## 5. Browser support

The CSS sets a floor: **Chrome and Edge 120, Safari 16.4, Firefox 121**. The features behind it, from published
compatibility tables and not from a run here:

| Feature | Chrome / Edge | Safari | Firefox |
|---|---|---|---|
| `:dir()` pseudo-class (mirrored arrows and chevrons) | 120 | 16.4 | 49 |
| `:has()` (paddings that depend on a child) | 105 | 15.4 | 121 |
| `translate` property (direction-aware slides, the switch knob) | 104 | 14.1 | 72 |
| `vi`, `vb`, `dvb` units | 108 | 15.4 | 101 |
| `color-mix()` (heat colours, tag and alert backgrounds) | 111 | 16.2 | 113 |
| `outline` following `border-radius` | 94 | 16.4 | 88 |
| `Intl.ListFormat` (chart and avatar summaries) | 72 | 14.1 | 78 |

Umm al-Qura Hijri dates go through the browser's ICU data (`islamic-umalqura`); the formatter's tests run against Node's
ICU only. Without `:dir()` an arrow is not mirrored in Arabic; without `:has()` some paddings are missing; without
`color-mix()` the heat cells and tag backgrounds have no fill.

**Tested: Chromium only**, by the consuming application's browser tests and by the independent review. Nothing was run
in Firefox or Safari, and no axe run exists. The rest is jsdom, which has no layout.

## 6. Verify before merge

- **Push and merge.** The 16 commits and the review fixes exist only in this clone. The consuming application's pointer
  moves to a pushed and merged commit, so the owner pushes first.
- **Decisions for the owner before the push** (the repository was to be public; since 20 Sep 2026 it is private, so these are no longer blocking):
  - `legacy/ui-next/` (166 tracked files, about 1.2 MB) is the previous main project, kept for its history. It is not a
    workspace member and not part of the package. It carries the earlier project's package names, demo content and agent
    configuration, and one spec file names the consuming application. The same content is already in the public `main`
    (the earlier `main`), so the push adds no new disclosure; removing the folder changes the tip only, not the history.
  - Licence: private and `UNLICENSED`; no `LICENSE` file is needed.
- **Re-run, more than once:** `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint:css`, `pnpm check:exports`,
  `pnpm test`. The `QuantityInput` fix in `b777ad9` removed a timing flake (3 failures in 6 runs); a test that fails once
  in a few runs is a finding, not noise.
- **Read again before trusting:** the CSS Modules of the display components and the charts were not read line by line.
  The review rendered them in a scratch page in Chromium at 1200px wide, in English and Arabic; other widths were not
  checked, and `Card` and `Badge` depend on `:has()`.
- **Not verified:** Firefox and Safari, screen readers (only accessibility-tree snapshots were read), a native reader's
  review of the Arabic strings, the printed output, the dark theme, and a fresh `git clone --recurse-submodules` of the
  consuming application (impossible until the push).
