# rupiv-design system: reference

The contract every component and screen built on this package follows. If you are building a screen, read
**Provider and labels**, **Formatter**, **Direction**, **Components** and **Page patterns**. If you are adding a
component, read **Authoring rules** as well.

Where this page and the source disagree, the source wins: the types in the `.tsx` files are the truth for props, and
`src/styles/tokens.css` is the truth for tokens. The package is TypeScript source: import from
`@rupiv/design-system`, never by a file path inside it.

Related pages: [`minimal.md`](minimal.md) (page and content rules), [`tokens.md`](tokens.md) (tokens, fonts, Arabic
type), [`shell.md`](shell.md) (the application shell), [`client-boundary.md`](client-boundary.md) (what a Server
Component may render), [`a1-adoption-note.md`](a1-adoption-note.md) (what changed, what is not done).

---

## 1. Principles

The full rules are in [`minimal.md`](minimal.md). In short:

1. **Charcoal does the work, teal points.** Primary buttons are charcoal (`--bg-primary`). Teal (`--bg-accent`,
   `--text-accent`) is for selection, links, focus and the active tab.
2. **Borders at rest, shadows when floating.** Cards and tables get a 1px `--border-default`. `--shadow-*` is only for
   menus, popovers, drawers, modals and toasts.
3. **Hierarchy by weight, not size.** Text sizes are `--text-12`, `--text-14`, `--text-16`; page titles are
   `t-heading-l`. Do not invent sizes.
4. **Colour is status or category, never decoration.** Status uses a tone; category uses a category colour.
5. **Numbers are aligned to the end and tabular.** `align: "end"` on the column, `t-num` on the text, and every number
   through the formatter.
6. **Every state is designed.** Empty, loading, error, filled, disabled.
7. **Both directions from the start.** English (left to right) and Arabic (right to left) use the same components and
   the same CSS.

## 2. Entry points

| Import | What |
|---|---|
| `@rupiv/design-system` | every component in `src/components/ui`, the provider and hooks, `useFormat`, `useToast`, `TONES`, `isTone`, `createToneResolver` |
| `@rupiv/design-system/charts` | `Sparkline`, `LineChart`, `BarChart`, `DonutChart`, `HeatGrid`, `ChartLegend` and their prop types |
| `@rupiv/design-system/format` | the formatter: no React, no framework import, safe in a Server Component |
| `@rupiv/design-system/tokens` | `readToken`, `readTokens`, `TOKEN_NAMES` for canvas code |
| `@rupiv/design-system/tokens.css` | tokens |
| `@rupiv/design-system/styles.css` | `src/styles/base.css`: reset, type utilities, Arabic type |

Package files:

```
src/
  styles/tokens.css  base.css      tokens; reset, type utilities and Arabic rules
  provider/                         DesignSystemProvider, hooks, labels, label-sets/ (one file per area)
  lib/                              format.ts date.ts locale.ts use-format.ts placement.ts tokens.ts status.ts types.ts intl.ts cn.ts
  components/ui/                    <name>.tsx + <name>.module.css + <name>.test.tsx, index.ts
  components/charts/                the SVG charts
test/                               harness, polyfills, stand-in Arabic label sets
```

## 3. Tokens

Never write a raw hex value, a pixel font size or an ad-hoc shadow in component or screen CSS: Stylelint rejects them.
Read the semantic tokens (`--bg-*`, `--text-*`, `--border-*`, `--icon-*`, the tone and category tokens, `--chart-*`).
The primitives (`--p-*`) are not for components.

The groups, the fonts, the Arabic type rules and how to read a token from code are in [`tokens.md`](tokens.md). The
short version:

| Group | Names |
|---|---|
| Tones | `--{neutral,accent,success,warning,danger,info}-{bg,border,text,solid}` |
| Category | `--cat-{indigo,madder,turmeric,neem,lac,kattha,slate}-{bg,fg}`, `--tile-{rose,sky,sand,lilac,mint}` |
| Charts | `--chart-1` to `--chart-6`, `--chart-grid`, `--chart-axis`, `--chart-label`, `--heat-1` to `--heat-5` |
| Type | `--font-latin`, `--font-arabic`, `--font-ui`, `--font-display`, `--text-11` to `--text-60` (rem), `--weight-*`, `--leading-*` |
| Space, shape | `--space-*` (px), `--radius-xs` to `--radius-xl`, `--radius-full`, `--shadow-xs` to `--shadow-lg` |
| Size | `--control-sm` 28, `--control-md` 34, `--control-lg` 40, `--icon-sm` to `--icon-xl`, `--page-max`, `--page-pad`, `--table-row-h`, `--drawer-w` |
| Layers, motion | `--z-*`, `--ease-*`, `--dur-fast`, `--dur-base`, `--dur-slow` |
| Focus | `--focus-ring`, `--focus-ring-danger` |
| Direction | `--rd-dir`: 1, or -1 under `<html dir="rtl">` |

The type utilities in `base.css`: `t-display-xl`, `t-display-l`, `t-display-m` (landing pages only), `t-heading-xl`,
`t-heading-l` (page titles), `t-heading-m`, `t-heading-s`, `t-heading-xs` (card and section titles), `t-body-l`,
`t-body-m`, `t-body-s`, `t-caption`, `t-overline`, `t-mono` and `t-num` (both are tabular figures, there is no
monospace face). Colour helpers: `text-title`, `text-body`, `text-label`, `text-muted`, `text-accent`, `text-success`,
`text-warning`, `text-danger`. Others: `sr-only`, `truncate`, `icon-flip` (mirrors an icon in right-to-left).

**Themes.** Light is the maintained theme. Set `data-theme="light"` on `<html>`. The dark theme in `tokens.css` is
frozen: not maintained, not tested, and it does not cover the tile, heat, rail and fly-out tokens.

## 4. Provider and labels

```tsx
<DesignSystemProvider
  locale="ar"            // BCP 47 tag; default "en"
  dir="rtl"              // default: derived from locale ("ar", "he", "fa", "ur" are rtl)
  labels={labels}        // the application's text for built-in strings; missing keys fall back to English
  linkComponent={Link}   // the router's Link; default a plain <a>
  navigate={(href) => router.push(href)}   // default: window.location.assign
  activePath={pathname}  // a string, not a hook; default "" (nothing active)
>
```

`linkComponent`, `navigate` and any function in `labels` must be created in a client file (see
[`client-boundary.md`](client-boundary.md)). A nested provider changes only what it is given. The package never imports
`next/*`.

Hooks (all work without a provider and return the defaults):

| Hook | Returns |
|---|---|
| `useLocale()` | the language tag, for sorting and number formats |
| `useDir()` | `"ltr"` or `"rtl"`, for keyboard handling that has no DOM to read |
| `useLabels()` | `label(key, params?)`, resolves a key to text |
| `useLink()` | the link component |
| `useNavigate()` | the navigation function |
| `useActivePath()` | the current path |

`directionOf(locale)` returns the direction for a tag. The provider `dir` and `<html dir>` must agree: layout follows
`<html dir>`, and the arrow-key code of `RadioGroup` and the shell follows the provider's `dir` (see Direction).

### Labels

Every string the design system draws itself (a button name, a placeholder, an empty text, a chart summary) is a
**label**, looked up by key. The package ships **English only**. The Arabic text, and the text of any other language, comes
from the application.

A label is a string with `{name}` placeholders, or a function for text that needs plural rules or its own word order:

```ts
type LabelValue = string | ((params: Readonly<Record<string, string | number>>) => string);
type LabelMap = Readonly<Record<string, LabelValue>>;
```

The application passes a map; keys it leaves out fall back to the English default, and a key that exists nowhere
resolves to the key itself so the gap is visible on screen. Pass the map to the provider, and give it a stable
identity (build it once, or memoise it): a new map on every render rebuilds the resolver.

```tsx
const labels: LabelMap = {
  "pagination.previous": "الصفحة السابقة",
  "pagination.next": "الصفحة التالية",
  // plural: Arabic has six forms. Build the function on your i18n library (ICU plural messages), or on Intl.PluralRules:
  "dataTable.selectedCount": ({ n }) => t("dataTable.selectedCount", { n }),
};
```

Counts arrive as numbers (`{n}`), so the function decides the form. Numbers that are already text (page numbers,
totals, file sizes) arrive formatted for the language. `interpolate`, `resolveLabel`, `createLabelFn` and
`DEFAULT_LABELS` are exported for tests and for tools that check a translation for missing keys.

Keys are `"<component>.<name>"`. The parameters each label receives:

| Area | Keys |
|---|---|
| Overlays | `combobox.placeholder`, `combobox.empty`, `combobox.show`, `combobox.hide`, `drawer.close`, `modal.close`, `tabs.sections`, `toast.region`, `toast.dismiss`, `toast.dismissTitle` |
| Data and forms | `dataTable.{bulkActions, selectAllRows, deselectAllRows, selectedCount {n}, clearSelection, selectRow {id}, emptyTitle, emptyDescription}`, `pagination.{label, range {from,to,total}, pageOf {page,pages}, compact {page,pages}, pageSize, previous, next, goToPage {page}}`, `filterBar.{filteredBy, removeFilter {label}, clearAll, clearFilter}`, `fileDrop.{dropToUpload, promptOne, promptMany, browse, selectedFiles, remove {name}, sizeBytes {size}, sizeKb {size}, sizeMb {size}}`, `quantityInput.{decrease, increase}`, `searchInput.{placeholder, clear}`, `field.optional`, `breadcrumbs.label`, `pageHeader.back` |
| Display | `alert.dismiss`, `avatar.more {n}`, `tag.remove {name}`, `tag.removeGeneric`, `stepper.completed`, `skeleton.loading`, `descriptionList.empty` |
| Charts | `chart.{noData, titled {title,summary}, listSeparator, compactThousand {n}, compactMillion {n}}`, `chartLegend.label`, `lineChart.{summary, markers {markers}, band, bandValue {low,high}}`, `barChart.{summary, total}`, `donutChart.{summary {total,items}, item {label,value,percent}, empty}`, `sparkline.summary`, `heatGrid.{summary, cell {row,column,value}, cellKind {row,column,value,kind}, cellNoValue {row,column}, kindGap, kindSurplus, kindOk}` |
| Shell | `railShell.{nav, skip, menuOpen, notifications, notificationsUnread {count}}`, `commandPalette.{placeholder, results, empty, count {count}}` |
| Dates | `duration.minuteShort`, `dateInput.hijriCaption {date}` |

The exact parameters of the chart summaries (series names, counts, minimum and maximum) are listed in the comments of
`src/provider/label-sets/charts.ts`. The English text of every key is in `src/provider/label-sets/`.

Components that show only the text they are given, or numbers written by the formatter (Badge, Card, Kbd, Layout,
Progress, Section, Stat, Timeline, Accordion, Tile, TaskList, Menu, Popover, Tooltip, Select), have no label of their
own; where they need a name, it is a prop (`label`, `aria-label`).

## 5. Formatter

`@rupiv/design-system/format` holds the number and date functions. It has no React and no framework import. In React,
`useFormat()` returns the same functions with the provider's language already applied.

Rules, in both languages:

- **Digits are Western (0 to 9)**, and grouping is `1,234.5` (en-US style) in English and in Arabic. Arabic-Indic digits and
  the Arabic percent sign never appear. The percent sign is ASCII `%`.
- **A missing value is `-`** (`NO_VALUE`): `null`, `undefined`, `NaN`, `Infinity` and an invalid date give it, never
  `"NaN"`, `"Invalid Date"` or a thrown error.
- **Time zone is `Asia/Riyadh` by default** (UTC+3, no daylight saving time), whatever the zone of the browser or the
  server. `date`, `dateBoth`, `time` and their `useFormat()` versions take an optional `timeZone` (an IANA name such as
  `"Europe/London"`) for an application that shows another zone; an unknown name gives `-`, not an error. The `format*`
  helpers below keep Riyadh. Nothing reads the current time.
- **Hijri is Umm al-Qura** (`islamic-umalqura` through `Intl`). The Hijri day changes at midnight in Riyadh.
- Arabic dates carry no Unicode direction marks. A negative number uses a hyphen-minus; wrap a number that must stay
  left to right in `<bdi>` where it sits in right-to-left text. A value that rounds to zero has no sign (`0`, never `-0`).
- **Input** to date functions is a `Date` or an ISO 8601 string. `"2026-09-06"` is a calendar day (read as noon in the
  zone in use, so it is the same day when written back in that zone). A date and time with no offset
  (`"2026-09-06T12:00"`) is a wall-clock time in that zone: Riyadh unless `timeZone` says otherwise. A string with an
  offset, and a `Date`, name one instant. Any other text, and impossible dates such as 30 February, are missing.
- **Language** is a tag: `"ar"`, `"ar-SA"` and `"AR_sa"` are Arabic, everything else is English.

| Function | Result |
|---|---|
| `num(value, digits?, locale?)` | `num(1234.5)` is `"1,234.5"`; at most one decimal without `digits`, exactly `digits` with it (`num(1234.5, 2)` is `"1,234.50"`). Rounds half away from zero |
| `int(value, locale?)` | `int(1234.5)` is `"1,235"` |
| `pct(value, digits = 0, locale?)` | a value already in percent: `pct(91)` is `"91%"`, `pct(12.34, 1)` is `"12.3%"` |
| `formatPercent(ratio, locale?, digits = 0)` | a ratio: `formatPercent(0.91)` is `"91%"` |
| `formatNumber(value, locale?, options?)` | `Intl.NumberFormat` options; at most 3 decimals by default |
| `formatDelta(value, decimals = 1, locale?)` | `"+12.4%"` or `"−3.1%"`, with a true minus sign (U+2212) |
| `time(value, { timeZone }?)` | a number is minutes since midnight (`time(755)` is `"12:35"`, `time(1500)` is `"01:00"`); a date or ISO string is its clock time in `timeZone`, Riyadh by default (`time("2026-09-06T09:00:00Z")` is `"12:00"`; with `{ timeZone: "Europe/London" }` it is `"10:00"`). 24 hour, both languages |
| `date(value, { locale, calendar, month, timeZone })` | `date("2026-09-06")` is `"6 Sept 2026"`; Arabic `"6 سبتمبر 2026"`; `calendar: "hijri"` gives `"24 Rab. I 1448 AH"` and `"24 ربيع الأول 1448 هـ"`; `month: "long"` for the long month name. The day is the day in `timeZone` (default Riyadh): `date("2026-09-06T21:30:00Z")` is `"7 Sept 2026"`, and with `{ timeZone: "Europe/London" }` it is `"6 Sept 2026"` |
| `dateBoth(value, { locale, month, timeZone })` | Gregorian, then Hijri: `"6 Sept 2026 · 24 Rab. I 1448 AH"` |
| `duration(seconds, mode = "min", minuteLabel = "min")` | `"6 min"` (mode `"min"`, rounded to whole minutes) or `"2:24"` (mode `"clock"`, minutes can pass 59). **The default unit is the English `"min"`:** the plain function knows no language, so on an Arabic page pass the label (`"د"`), or use `useFormat().duration`, which reads it from the provider |
| `initials(name)` | `"Jane Doe"` gives `"JD"` (first letter of the first two words) |

Also exported for code that started on the earlier temporary helper: `formatDate(value, locale?, style?)`,
`formatTime(value)`, `formatDateTime` and `formatHijriDate` (`formatDate`, `formatDateTime` and `formatHijriDate` take
an `Intl` style `"short" | "medium" | "long"`, default `"medium"`, always in Riyadh time), `formatMinutesSeconds(seconds)` (`"2:24"`; a negative length is `"0:00"`), `toInstant(value, timeZone?)`,
`TIME_ZONE`, `NO_VALUE`, `stripBidiMarks(text)` and `resolveFormatLocale(tag)`.

`useFormat()` returns `{ locale, num, int, pct, ratio, formatNumber, delta, time, date, dateBoth, duration }`. Its
`date`, `dateBoth` and `time` take the same `timeZone` option as the plain functions. Its `duration` takes the minute
unit from the label `duration.minuteShort` (in Arabic, `د`), so it is the one to use in a component. The object is
stable while the language and that label do not change, so it is safe in a dependency array.

Text comparison (sorting) is separate: `DataTable` sorts with an `Intl.Collator` for the provider's language, numeric
aware (`"item 2"` before `"item 10"`), case and accent insensitive.

## 6. Direction (right to left)

The components are written once and work in both directions. What that means in practice:

- **Logical CSS only.** `inline-size`, `margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`,
  `border-start-start-radius`. Never `left`, `right`, `margin-left`, `float: left`. Stylelint
  (`stylelint-plugin-logical-css`, plus the value rules in `stylelint.config.mjs`) fails `pnpm lint:css` and `pnpm test`
  on a physical property or value: four-value `margin`, `padding`, `inset`, `scroll-margin`, `scroll-padding`,
  `border-width`, `border-style` and `border-color`; a `border-radius` that differs left to right; a literal horizontal
  offset in `translate`, `translate()`, `translateX()` and `translate3d()`; `left` and `right` in `background-position`,
  `object-position`, `transform-origin`, gradients and the vendor forms of `text-align`. A horizontal slide that cannot
  be logical uses the direction sign: `translate: calc(16px * var(--rd-dir)) 0`, and a centring `-50%` is
  `calc(-50% * var(--rd-dir))`. The rules cannot see an SVG `x` attribute, `clip-path: inset()`, `matrix()` or a value
  built inside a custom property.
- **Direction comes from `<html dir>`**, set by the server. Layout follows it through CSS.
- **Floating layers are placed from the anchor's computed direction.** `Menu`, `Popover`, `Tooltip` and `Combobox`
  read `getComputedStyle(anchor).direction` when they open, so `"start"` and `"end"` mean the inline edges of the
  anchor, and a right-to-left island in a left-to-right page is placed correctly. `Menu`, `Popover` and `Tooltip` flip to
  the other side when they do not fit and clamp to the viewport (8px margin); the `Combobox` list is as wide as its
  field and opens above it when there is no room below.
- **Arrow keys follow the reading direction.** `Tabs` and `SegmentedControl` read the computed direction of the
  element; `RadioGroup` and the shell read the provider's `dir`. In right-to-left, Right goes to the previous item and
  Left to the next. Up and Down never change. `Menu` is vertical with no submenus, so Left and Right do nothing in
  either direction.
- **Icons that point somewhere mirror.** Chevrons, the back arrow, pagination arrows, the stat trend arrows and the
  task chevron flip with CSS `:dir(rtl)`. For your own icon, add `class="icon-flip"`.
- **Sides are named by role.** `Button` and `Input` take `startIcon` and `endIcon`. `Column.align` is `start`, `end` or
  `center`. `Drawer` `side` and `Menu` and `Popover` `align` are `start` or `end`. `Tooltip` `side` is `top`, `bottom`,
  `start` or `end`.
- **Scroll lock** (Modal, Drawer) keeps the width of the page scrollbar as `padding-inline-end` on `<body>`.
- **Charts.** The plot area (axes, lines, bars, heat-grid columns) always runs left to right, like every time axis,
  in both languages; it sits in an element with `dir="ltr"`. The parts around it follow the page: the legend, row
  names, names in a tooltip. `BarChart` with `horizontal` in a right-to-left page puts the category names at the right and
  grows the bars from there (`mirror`, on by default); vertical charts never mirror. `HeatGrid` puts row names at
  the inline start, outside the scrolling box. `ChartTooltip` is placed from the left edge of the chart.
- **Text.** Arabic type (font, size, leading, no letter spacing, no uppercase) switches on with `<html lang="ar">`, see
  [`tokens.md`](tokens.md). A component that sets its own `letter-spacing` or `text-transform` overrides it with
  `:lang(ar)`.
- **Numbers and dates** use Western digits in both languages, so a screen never mixes digit systems.

jsdom has no layout, so the tests cannot prove that a right-to-left screen looks right. See Testing.

## 7. Client boundary

`DataTable` takes functions (`cell`, `getRowId`, `rowHref`, `bulkActions`, `sortValue`), and every component that
reads the provider is a Client Component. A page that is a Server Component cannot pass a function to one. Build the
columns in a small client file that receives plain data. Full rule and examples: [`client-boundary.md`](client-boundary.md).

Server-safe (no `"use client"`): `Stack`, `Inline`, `Grid`, `Divider`, `Input`, `Textarea`, `Select`, `Card`,
`CardHeader`, `CardBody`, `CardFooter`, `StatusPill`, `Timeline`, `EmptyState`, `Kbd`, `Section`, `FormSection`,
`FormGrid`, `Tile`. All other components, and the charts, are Client Components. `@rupiv/design-system/format` and
`@rupiv/design-system/tokens` (importing, not calling) are safe anywhere.

## 8. Components

All are exported from `@rupiv/design-system` unless noted. `size` is `"sm" | "md" | "lg"` (default `"md"`) unless a
component says otherwise. `Tone` is `"neutral" | "accent" | "success" | "warning" | "danger" | "info"`. Category
colours (`CategoryColor`) are `"indigo" | "madder" | "turmeric" | "neem" | "lac" | "kattha" | "slate"`. Most components
take `className`. Props are shown in short form; the `.tsx` file has the full type.

### Layout

- `Stack` `{ gap?: 0|2|4|6|8|12|16|20|24|32|40|48 /* 12 */; align?: "start"|"center"|"end"|"stretch" /* stretch */; as? }`. Vertical flex.
- `Inline` `{ gap? /* 8 */; align?: "start"|"center"|"end"|"baseline"|"stretch" /* center */; justify?: "start"|"center"|"end"|"between"; wrap?: boolean; as? }`. Horizontal flex.
- `Grid` `{ columns?: 1..6 /* 2 */; minItemWidth?: string /* "240px": auto-fill */; gap? /* 16 */ }`. Collapses to 1 column below 640px, and to 2 columns below 1024px when `columns` is 3 or more.
- `Divider` `{ label?: string; vertical?: boolean; spacing?: 0|8|12|16|24 }`.

`Stack`, `Inline` and `Grid` forward other HTML attributes to their root.

### Actions

- `Button` `{ variant?: "primary"|"secondary"|"ghost"|"accent"|"danger"|"link" /* secondary */; size?; startIcon?; endIcon?; loading?; fullWidth?; href? } & ButtonHTMLAttributes`. `type` defaults to `"button"`. With `href` it renders the provider's link component, styled the same; a disabled or loading button with `href` renders a real `<button disabled>` instead of a link. `loading` shows a spinner in place of `startIcon`, hides `endIcon`, disables the button and sets `aria-busy`. Icons are decorative (hidden from assistive technology).
- `IconButton` `{ icon; label: string; variant?: "ghost"|"secondary"|"primary" /* ghost */; size?; href? }`. `label` is the `aria-label` and the `title`.
- `ButtonGroup` `{ attached?: boolean }`. `role="group"`; `attached` joins the buttons.

### Forms

- `Field` `{ label: string; htmlFor?; hint?; error?: string; required?; optional?; labelAction? } & HTMLAttributes<div>`. Label, control, hint and error. With a single child element it wires `id`, `aria-describedby` (hint and error), `aria-invalid` (on error) and `aria-required` (with `required`). For a child that a `<label htmlFor>` cannot name (`SegmentedControl`, `RadioGroup`, a `<div role=...>`) it also sets `aria-labelledby` to its label, unless the child names itself. `optional` shows the label `field.optional` (ignored when `required`); `required` shows `*` (hidden from assistive technology).
- `Input` `{ size?; prefix?; suffix?; startIcon?; invalid? } & InputHTMLAttributes`. `prefix` and `suffix` are text at the inline start and end (`"$"`, `"m"`, `"%"`). `className` styles the outer box; the other props go to the `<input>`. `Textarea` `{ invalid?; rows? /* 3 */ }`.
- `SearchInput` `{ value?; defaultValue?; onChange?: (value: string) => void; placeholder?; shortcut?: string; size?; disabled?; id?; name?; "aria-label"? }`. Escape clears the text, or blurs when it is empty. `shortcut` (one key, such as `"/"`) focuses the box from anywhere outside a text field and shows a `Kbd` hint while empty. Placeholder and clear button come from labels.
- `Select` `{ options: { value; label; disabled? }[]; placeholder?; size?; width?: "full"|"auto"; invalid? } & SelectHTMLAttributes`. A native `<select>`. `placeholder` adds an empty first option (not selectable when `required`). `width="auto"` is as wide as the longest option, for a select in a row of controls.
- `Combobox` `{ options: { value; label; description?; meta? }[]; value?; onChange?: (value: string) => void; placeholder?; emptyText?; size?; invalid?; disabled?; id?; aria-* }`. Searchable single select. The list is portalled to `<body>`, opens above the field when there is no room below, and lines up with the field's inline start. Not multi-select; no per-option `disabled`.
- `Checkbox` `{ label?; description?; indeterminate? } & InputHTMLAttributes`. A native checkbox with a custom box. Without `label`, pass `aria-label`.
- `RadioGroup` `{ name; options: { value; label; description?; disabled? }[]; value?; defaultValue?; onChange?; orientation?: "vertical"|"horizontal"; disabled?; id?; aria-* }`. With an `id` and no `aria-label`, it is named by `${id}-label` (the label `Field` renders).
- `Switch` `{ checked?; defaultChecked?; onCheckedChange?: (v: boolean) => void; label?; description?; disabled?; id?; "aria-label"? }`. `role="switch"`. `aria-label` is required when there is no visible `label`.
- `SegmentedControl` `{ options: { value; label; icon? }[]; value?; defaultValue?; onChange?; size?: "sm"|"md"; ariaLabel?; aria-label?; aria-labelledby? }`. A `radiogroup` of `radio` buttons. Name it, or put it in a `Field`.
- `DateInput` `{ size?; invalid?; showHijri? } & InputHTMLAttributes` (without `type`). A native `<input type="date">`. The value is always Gregorian `YYYY-MM-DD`; the browser draws the picker. `showHijri` shows the Umm al-Qura date of the chosen day under the field (`dateInput.hijriCaption`), on a line that is always present so the layout does not move. A value outside `min` and `max` is marked invalid.
- `QuantityInput` `{ value?: number; defaultValue?; onChange?: (n: number) => void; step? /* 1 */; min?; max?; uom?: string; size?; id?; name?; disabled?; invalid?; aria-* }`. A `spinbutton` with minus and plus buttons. Values are rounded to 3 decimals and clamped to `min` and `max`. It accepts Arabic-Indic and Persian digits, the Arabic decimal separator, and drops thousands separators when typed. Shows the number through the formatter.
- `FileDrop` `{ accept?: string; maxSize?: number /* bytes */; hint?: string; multiple?; onFiles?: (files: File[]) => void; onReject?: (rejected: FileRejection[]) => void; id? }`. Drag and drop or browse. `onFiles` receives the whole current list after an add or a remove, and never a file that was rejected. A file is **rejected** when its type does not match `accept` (`reason: "type"`, same syntax as the native attribute: `.pdf`, `image/*`), or when its size is above `maxSize` (`reason: "size"`; 1 KB is 1024 bytes, and a file of exactly `maxSize` is taken). A file that fails both is reported as `"type"`. The check is the same for a drop and for the file picker (a person can switch the picker's own filter off), and the files of a batch that pass still go through. `FileRejection` is `{ file: File; reason: FileRejectReason }` and `FileRejectReason` is `"type" | "size"`, both exported.
  - With `onReject`, the component calls it with the rejected files of that drop (in the order offered) and shows nothing: the application decides what to say. Without it, the component shows its own message under the drop area, one line per rejected file, in a `role="alert"` region, with a Dismiss button. The message is inserted again on every rejection (so the same file dropped twice is announced twice), goes away with the next drop that has no rejected file, or with Dismiss (which puts focus back on the file input), and is named in the input's `aria-describedby` while it shows. It is a sibling of the drop area, not inside its label, so it does not change the input's name.
  - Labels: `fileDrop.rejectType` (`{name}`), `fileDrop.rejectSize` (`{name}`, `{max}`) and `fileDrop.dismiss`. `{max}` is `maxSize` written through the formatter as B, KB or MB with the labels `fileDrop.sizeBytes`, `fileDrop.sizeKb` and `fileDrop.sizeMb`, Western digits, at most one decimal and rounded down (a limit of 1.55 MB reads "1.5 MB", so "larger than 1.5 MB" is never untrue). English defaults ship; give Arabic in the provider's `labels`.
  - **Behaviour change.** A file of the wrong type used to be dropped without any message; it is now rejected out loud (the message above, or `onReject`). Nothing else changes when neither `maxSize` nor `onReject` is given: no size limit, and the list and `onFiles` behave as before.
  ```
  <FileDrop accept=".csv" maxSize={20 * 1024 * 1024} hint="CSV, up to 20 MB" onFiles={setFiles} />            // its own message
  <FileDrop accept=".csv,text/csv" maxSize={10 * 1024 * 1024} onReject={(rejected) => report(rejected)} />   // your message
  ```
- `FormSection` `{ title: string; description?; actions? }`: a label column (one third) and a content column (two thirds); stacks below 768px. `FormGrid` `{ columns?: 1..4 /* 2 */ }`: a grid of `Field`s; 3 or 4 columns become 2 below 1024px and 1 below 640px; a direct child with `data-span="full"` spans all columns.
- `FormFooter` `{ status?: ReactNode; dirty?: boolean /* false */; label?: string; className? }` with the actions as children. A sticky action bar for a form: `position: sticky` at the block end of its scroll container (`inset-block-end: 0`, `z-index: var(--z-sticky)`), a bordered, rounded row on `--bg-surface` that wraps on a narrow screen. The status is at the inline start and the children (the actions) at the inline end; write them in reading order, the primary action last, and it is at the inline end in both directions (the markup is not reversed for Arabic). It is a `<div role="group">` named by `label`, or by the label `formFooter.label` ("Form actions"): a `<footer>` inside a form has no role, so a group is what a screen reader can name.
  - `dirty` shows "Unsaved changes" (`formFooter.unsaved`, a small info icon and muted text: the kit's "reason" line) at the start. A status region (`role="status"`, `aria-live="polite"`, `aria-atomic`) is always in the page; while the form is clean it holds "No unsaved changes" (`formFooter.clean`) for screen readers only, so when `dirty` flips either way the text in that region changes and is announced. `status` is shown next to it (both show when both are given) and is not live: wrap it in `role="status"` yourself if it should be announced.
  - Put it as the last child of the form, or of the scroll container the person scrolls. It does not stick inside an ancestor that clips its overflow (`overflow: hidden`).
  ```
  <form onSubmit={save}>
    <FormSection title="Session">...</FormSection>
    <FormFooter dirty={dirty} status={dirty ? undefined : "No changes to save"}>
      <Button onClick={discard} disabled={!dirty}>Discard</Button>
      <Button variant="primary" type="submit" disabled={!dirty}>Save</Button>
    </FormFooter>
  </form>
  ```

### Navigation

- `Tabs` `{ items: { value; label; count?; icon? }[]; value?; defaultValue?; onChange?; variant?: "line"|"pill"; ariaLabel?; aria-label?; aria-labelledby?; id? }`. The tab list only: render the active panel yourself from `value`. Tabs get the id `${id}-tab-${value}` so a panel can use `aria-labelledby`.
- `TabLinks` `{ items: { href; label; count? }[]; ariaLabel? }`. Route-backed tabs (line style). The active tab comes from the provider's `activePath`: the exact match, or the longest path prefix. Sets `aria-current="page"`.
- `Breadcrumbs` `{ items: { label: string; href? }[] }`. The last item is the current page. The separator mirrors in right-to-left.
- `Pagination` `{ page: number /* 1-based */; pageCount; onPageChange; total?; pageSize?; pageSizeOptions?: number[]; onPageSizeChange? }`. With `total` and `pageSize` the summary reads "1 to 10 of 96"; otherwise "Page 2 of 9". Shows every page number up to 7 pages, and an ellipsis after that. Numbers go through the formatter.
- `PageHeader` `{ title; description?; breadcrumbs?; meta?; actions?; tabs?; backHref? }`. `title` is the page's `<h1>`. `meta` sits after the title (a `StatusPill`, a badge). `actions` sit at the inline end. `tabs` renders under the header with a border (pass `Tabs` or `TabLinks`). `backHref` adds a back arrow that points to the inline start.

### Data display

- `Card` `{ padding?: "none"|"sm"|"md"|"lg" /* md */; interactive?; tone?: "default"|"subtle"; as?; href? }`. `md` is `--space-16`, `lg` is `--space-24`. A card that holds `CardHeader`, `CardBody` or `CardFooter` gets no padding of its own; the sections own it. With `as` set to a link component, `href` is passed through. `CardHeader` `{ title; subtitle?; icon?; actions?; bordered? }`, `CardBody`, `CardFooter` `{ align?: "start"|"end"|"between" /* end */ }`.
- `Badge` `{ tone?: Tone /* neutral */; variant?: "soft"|"solid"|"outline"; size?: "sm"|"md"; dot?; icon? }`. `CountBadge` `{ count; tone?; max? /* 99 */ }`: a number in a pill, `"99+"` above `max`, through the formatter.
- `StatusPill` `{ status: string; tone: Tone; size?: "sm"|"md" }`. A soft badge with a dot. **`tone` is required:** the design system knows no status names. Build the map in the application and pass the result (see Tone helpers below).
- `Tag` `{ color?: CategoryColor /* slate */; onRemove?; icon? }`. With `onRemove` it shows a remove button named by `tag.remove` (or `tag.removeGeneric` when the content is not text).
- `Avatar` `{ name: string; size?: "xs"|"sm"|"md"|"lg"; color?: CategoryColor }`. Initials of the name; without `color` it is picked from a hash of the name, so it is the same on the server and the client. `AvatarGroup` `{ names: string[]; max? /* 4 */; size?: "xs"|"sm"|"md" }`, with a `+N` bubble; the names are joined with `Intl.ListFormat` for the language.
- `Stat` `{ label: string; value: ReactNode; unit?; delta?: { value: number /* percent */; goodWhen?: "up"|"down"; label? }; icon?; hint?; href?; footer? }`. With `href` the stat is a link (provider link component). The delta arrow and its colour follow `goodWhen`.
- `DescriptionList` `{ items: { label: string; value: ReactNode; span?: 1..4 }[]; columns?: 1..4 /* 2 */; dense? }`. A missing or empty value shows `descriptionList.empty`. `KeyValue` `{ label; value; emphasis? }`: one row, label at the start and value at the end (totals).
- `DataTable<T>`, see below.
- `Progress` `{ value; max? /* 100 */; tone? /* accent */; size?: "sm"|"md"; label?; showValue?; valueLabel? }`. `role="progressbar"`. `SegmentBar` `{ segments: { value; tone?; color?; label }[]; height? /* 8, px */; showLegend? }`: parts of a whole, the first segment at the inline start.
- `Timeline` `{ items: { id?; title; time?: string; description?; tone?; icon?; actor? }[]; dense? }`. An ordered list.
- `Stepper` `{ steps: { label; description? }[]; current: number /* index */; orientation?: "horizontal"|"vertical" }`. A list that shows where the person is; it is not a control. Steps before `current` are completed (the check mark and a hidden `stepper.completed`).
- `EmptyState` `{ icon?; title: string; headingLevel?: 1|2|3|4|5|6; description?; action?; compact?; tone?: "default"|"danger"|"warning" }`. `default` is an inbox icon. `danger` and `warning` show a warning triangle in the tone colour, and `danger` has `role="alert"`: use it for an error state. The title is a paragraph unless `headingLevel` is set, so an empty state inside a page adds no heading; set `headingLevel={1}` when the state is the whole page (a no-access or not-found page has no other heading).
- `Skeleton` `{ width?; height? /* 12 */; radius?: "sm"|"md"|"lg"|"full"; announce? }`, `SkeletonText` `{ lines? /* 3 */; announce? }`. The shape is hidden from assistive technology. Set `announce` on one skeleton per loading area (it adds the text `skeleton.loading` for screen readers) and put `aria-busy="true"` on the area.
- `Kbd` `{ children }`. A key hint.
- `Section` `{ title; description?; actions? }`. An in-page heading block (`<h2>`).
- `Accordion` `{ items: { id; title; content; disabled? }[]; type?: "single"|"multiple" /* single */; defaultValue?: string[]; value?: string[]; onValueChange?: (ids: string[]) => void }`. Each title is a button with `aria-expanded`; closed panels stay in the DOM, hidden. In `single` mode opening one closes the others; an open item can always be closed.
- `Tile` `{ icon; color?: "mint"|"rose"|"sky"|"sand"|"lilac" /* mint */; size?: "md"|"lg"; shape?: "circle"|"square"; label? }`. An icon on a pastel tint, for a category, never a status. Without `label` it is decorative.
- `TaskList` `{ items: { id; title; badge?; meta?; icon?; color?; href?; disabled? }[] }`. Rows of tile, title with chip, meta line and, for a link, a chevron at the inline end. A disabled row with `href` stops being a link and is announced as a disabled link.

**Tone helpers** (exported): `TONES` (all six), `isTone(value)`, and `createToneResolver(map, fallback = "neutral")`, which returns a function from a status string to a tone. Choose a tone for what the person must do, not for the module the record came from: `neutral` nothing to do yet or archived, `info` moving in someone else's hands, `accent` confirmed, `warning` needs attention soon, `success` done, `danger` blocked, failed or overdue.

#### DataTable

```ts
interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;   // makes the column sortable
  align?: "start" | "end" | "center";        // "end" for numbers
  width?: number | string;
  hideBelow?: "md" | "lg";                   // hide under 768px or 1024px
  sticky?: boolean;                          // first column stays on horizontal scroll
}
interface DataTableSort { key: string; direction: "asc" | "desc" }
interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  rowHref?: (row: T) => string;              // whole row navigates, through the provider's navigate
  selectable?: boolean;
  bulkActions?: (selectedIds: string[], clear: () => void) => ReactNode;
  pageSize?: number;                         // default 10; 0 = no pagination
  dense?: boolean;
  defaultSort?: DataTableSort;
  sort?: DataTableSort | null;               // controlled sort (null = not sorted)
  onSortChange?: (sort: DataTableSort) => void;
  page?: number;                             // controlled page, 1-based
  onPageChange?: (page: number) => void;
  emptyState?: ReactNode;
  footer?: ReactNode;                        // totals, rendered in <tfoot>
  caption?: string;                          // screen-reader caption
  stickyHeader?: boolean;
  rowTone?: (row: T) => Tone | undefined;    // subtle tint and an edge at the inline start
  className?: string;
}
```

- **Sorting and paging are in memory.** The table sorts and pages the `rows` it is given. `sort`/`onSortChange` and
  `page`/`onPageChange` let the application keep those in the address bar or a store; they do not make the table fetch a page.
  A server-side page (a total the table does not have) is not supported yet.
- **Sorting** compares text with an `Intl.Collator` for the provider's language (numeric aware) and numbers as numbers.
  Pressing a header sorts ascending; pressing it again toggles between descending and ascending. Either way the table goes back to page 1.
  Sortable headers are buttons and carry `aria-sort`.
- **Selection** is kept by row id and survives sorting and paging. The header checkbox selects the rows on the current
  page (indeterminate when some are selected). When any row is selected a bulk bar shows the count, your `bulkActions`, and Clear.
- **Row navigation.** With `rowHref` a row is focusable, and Enter (when the row itself has focus) or a click navigates through the
  provider. A click on a link, button, input, select, label, menu item or `[data-row-click="ignore"]` inside the row does not.
  Ctrl, Cmd or Shift with a click, and a middle click, open a new tab.
- **Empty.** With no rows, `emptyState`, or the default `EmptyState` (`dataTable.emptyTitle`, `dataTable.emptyDescription`).
  There is no built-in loading state: render a `Skeleton` in its place while data loads.
- **Footer.** Pass `<td>` cells in a fragment (wrapped in a row, offset for the selection column), or full `<tr>` rows.
  Footer cells inherit the `hideBelow` of the columns they sit under (aware of `colSpan`); `data-hide-below="md"|"lg"` on a cell overrides it, and
  `data-align="end"|"center"` aligns it. The footer is not shown when there are no rows.
- **Row tone.** Tints the row with the tone's background and draws a 2px edge at the inline start of the row; hover and selected still win.
- Pagination shows when there are more rows than the initial `pageSize`, so the page-size control (10, 25, 50, 100 and
  the initial size) stays available after a larger size is chosen.

### Feedback and overlays

Overlays are rendered into `<body>` and appear after mount.

- `Alert` `{ tone?: Tone /* info */; title?; children?; icon?; action?; onDismiss? }`. `danger` and `warning` are `role="alert"`, the other tones `role="status"`. `onDismiss` adds a close button (`alert.dismiss`).
- `ToastProvider` and `useToast()`. Mount `ToastProvider` once, inside `DesignSystemProvider`. `const toast = useToast(); toast({ title, description?, tone?, action?, duration? })` returns the toast id; `const { toast, dismiss } = useToast()` also works. `duration` is in ms (default 4500; 0 or less never closes). At most 5 toasts show. A toast pauses while it is hovered or focused; `danger` toasts are `role="alert"`, the others `role="status"`. The region lifts above the footer of an open modal or drawer. Outside a provider, `toast()` logs a warning and does nothing.
- `Modal` `{ open; onClose; title; description?; size?: "sm"|"md"|"lg"|"xl" /* md */; footer? }` and `Drawer` `{ open; onClose; title; subtitle?; width?: number /* --drawer-w, 480 */; side?: "start"|"end" /* end */; initialFocus?: "content"|"close" /* content */; footer? }`. `role="dialog"` with `aria-modal`, named by the title. Focus moves in on open (to `[data-autofocus]`, else the first control that is not the close button, else the panel; with `initialFocus="close"`, to the close button, the first control in the document, so the rest follow it in order), Tab is trapped, Escape and a press on the scrim close, focus returns to what had it, and the page does not scroll behind. `side="start"` slides in from the inline start (the right in Arabic), for a navigation drawer.
- `Menu` `{ trigger: ReactElement; items: MenuEntry[]; align?: "start"|"end" /* start */; label? }`. Entries: an item `{ label; icon?; onSelect?; href?; danger?; shortcut?; disabled? }`, `"separator"`, a heading `{ type: "heading"; label }`, or a radio group `{ type: "radio-group"; options: { value; label; icon?; disabled? }[]; value; onValueChange; heading?; label? }`. Radio options are `menuitemradio` with a check on the chosen one, inside a named `group`; choosing one closes the menu and calls `onValueChange` when the value changed. An item with `href` is a link through the provider. Items are reached with the arrow keys, not Tab; disabled items are skipped by the arrow keys and carry `aria-disabled`.
- `Popover` `{ trigger: ReactElement; children; align?: "start"|"end"; width?: number; label?; open?; onOpenChange? }`. `role="dialog"`, opens under the trigger, closes on Escape (focus returns to the trigger) and on a press outside. Controlled with `open`, otherwise it keeps its own state.
- `Tooltip` `{ content; children: ReactElement; side?: "top"|"bottom"|"start"|"end" /* top */ }`. Shows on hover and keyboard focus after 300ms, hides on Escape, scroll and resize, and is linked to the trigger with `aria-describedby`. **An `aria-disabled="true"` control keeps its focus and its tooltip and never acts:** a tap or click on it shows the tooltip at once (a touch screen has no hover) for about 2.6 seconds and stops the click. That is how a screen says why an action is unavailable. A native `disabled` control gets no pointer events at all, so use `aria-disabled` for a control that explains itself. Empty `content` renders the child alone.
- `FilterBar` `{ search?: { value?; onChange?; placeholder? }; filters?; actions?; activeFilters?: { label: string; onRemove }[]; onClearAll? }` and `FilterChip` `{ label; value?; options: { value; label }[]; onChange: (v: string | undefined) => void }`. A `FilterChip` is a `Menu` of radio items with a Clear item once a value is set.

### Shell

`RailShell`, `NavDrawer`, `CommandPalette` (with `normalizeSearchText`) and `NotificationsBell` are the application
frame. They know no product, section or role: the application passes those in. Props, keyboard behaviour and what the
tests do not prove are in [`shell.md`](shell.md).

### Charts

`@rupiv/design-system/charts`. Plain SVG that reads the `--chart-*` tokens, no chart library. They are Client
Components. `LineChart` and `BarChart` measure their container (`ResizeObserver`), so they fill its width and never make
the page scroll sideways; `Sparkline` and `DonutChart` have the fixed size you give them. Series colours default to
`--chart-1` to `--chart-6` in order. `format` is a `(n: number) => string` for axis and tooltip values; the default is
compact (`950`, `8.4K`, `12.6M`; the `K` and `M` come from the labels `chart.compactThousand` and
`chart.compactMillion`, so an application can change them for a language), and `num` for `HeatGrid`. Every chart except `HeatGrid` is `role="img"`, with an accessible name
built from a generated summary (a label function per chart, so it can be worded and pluralised for the language); the
`HeatGrid` is a `grid`. Pass `label` to put your own title in front of the summary. With no data a chart shows
`chart.noData` (`donutChart.empty` for the donut).

Text on an axis is fitted to the room it has with a measured width, not a guess: a label that does not fit is cut with an
ellipsis, and one that would touch its neighbour is left out. Where the browser cannot measure (server render, jsdom) an
estimate is used until it can, and `LineChart` and `BarChart` accept `measureText` to replace the measurement.

- `Sparkline` `{ data: number[]; width? /* 120 */; height? /* 32 */; tone?: Tone | "chart-1".."chart-6"; area?; showEnd?; format?; label? }`.
- `LineChart` `{ labels: string[]; series: { name; data: number[]; color?; area?; dashed? }[]; height? /* 240 */; format?; band?: { low: number[]; high: number[]; name?; color? }; markers?: { index: number; label? }[]; min?; max?; label?; measureText? }`. `band` shades a range (for example a likely range around a forecast) and is a legend entry and a tooltip row. `markers` draw labelled vertical lines at a position on the x axis (`index` 2.5 is half way between the third and fourth point); a marker label that would touch another, or has no room, is left out. `labels` may hold `""` for points that should have no axis label. The value axis always includes 0 unless `min` and `max` force the ends. Missing values (`NaN`, `null`) break the line.
- `BarChart` `{ data: { label; values: number[] }[]; series: { name; color? }[]; height? /* 240 */; format?; stacked?; horizontal?; mirror? /* true */; min?; max?; label?; measureText? }`. Long category labels are cut with an ellipsis to the room they have, and labels that would touch are skipped.
- `DonutChart` `{ data: { label; value; color? }[]; size? /* 160 */; thickness? /* 18 */; centerLabel?; centerValue?; format?; showLegend?; label? }`. Drawn the same in both languages (from the top, clockwise); the centre text and legend follow the page.
- `HeatGrid` `{ rows: string[]; columns: string[]; values: (number | null | undefined)[][]; format?; kind?: "scale"|"signed"|"gap"|"surplus" /* scale */; tone?: "accent"|"warning"|"danger"; minColWidth? /* 44 */; compact?; label?; onCellSelect?: (cell: { row; column; value; kind }) => void }`. `scale` is one tone, darker as the value grows. `signed` colours a value below 0 as a gap (red), above 0 as a surplus (blue), and 0 as balanced (grey), with intensity by size. The grid scrolls sideways when the columns do not fit at `minColWidth`, with row names fixed outside the scroll. `compact` draws cells without text (the value stays in the accessible name and the tooltip). `onCellSelect` makes cells with a value act as buttons.
- `ChartLegend` `{ items: { label; color; value? }[]; label? }`. A swatch and label per item at the inline start; when any item has a `value` it becomes a stacked list with the values at the inline end.

Keyboard and pointer: **only `HeatGrid` is keyboard operable**: one tab stop, arrow keys move between cells, Home and End go to the
first and last column, Ctrl+Home and Ctrl+End to the first and last cell, Enter and Space select when `onCellSelect` is set. `LineChart`, `BarChart` and
`DonutChart` show their tooltip on pointer hover only; for a keyboard or screen-reader user the summary in the accessible
name is the alternative, so put the numbers that matter in a table beside the chart.

## 9. Keyboard summary

| Component | Keys |
|---|---|
| `Tabs` | Right and Left move to the next and previous tab (swapped in right-to-left) and select it; Home, End. One tab stop (roving `tabindex`) |
| `SegmentedControl` | as `Tabs`, and Down and Up also move |
| `RadioGroup` | Up and Down previous and next; Right and Left as in `Tabs`; wraps; selection follows focus. Tab enters at the checked radio |
| `Menu` | trigger: Down or Up opens with focus on the first item; in the menu: Up, Down, Home, End, Escape (closes, focus returns), Tab (closes) |
| `Combobox` | type to filter; Down and Up open and move (no wrap); Enter chooses; Escape closes; Tab closes |
| `Accordion` | Enter or Space toggles; Up, Down, Home, End move between titles (wrapping) |
| `Modal`, `Drawer` | Tab trapped; Escape closes; focus returns |
| `Popover` | Escape closes and focuses the trigger |
| `Tooltip` | focus shows; Escape hides |
| `SearchInput` | Escape clears, or blurs when empty; optional single-key `shortcut` |
| `QuantityInput` | Up and Down step; Enter commits; Escape reverts the typed text |
| `DataTable` | sort headers are buttons; a row with `rowHref` is focusable and Enter navigates |
| `HeatGrid` | arrows, Home, End, Ctrl+Home, Ctrl+End, Enter, Space |
| `RailShell`, `CommandPalette` | see [`shell.md`](shell.md) |

## 10. States

Every screen has empty, loading, error, filled and (where an action can be unavailable) disabled states. The
components give you:

| State | How |
|---|---|
| Empty | `EmptyState` (`compact` inside a card); `DataTable` shows one by default; charts show `chart.noData` |
| Loading | `Skeleton` and `SkeletonText` with `announce` on one of them and `aria-busy` on the area; `Button` `loading` |
| Error | `EmptyState tone="danger"` for a failed page or panel, `Alert tone="danger"` or a `toast` for a failed action, `Field` `error` for a field |
| Disabled | native `disabled` on controls; `aria-disabled` plus `Tooltip` (and, in the application, a visible reason) where the person needs to know why |
| Invalid, read-only | `invalid` (or `aria-invalid`) on `Input`, `Textarea`, `Select`, `Combobox`, `QuantityInput`, `DateInput`; `readOnly` styles `Input` |

## 11. Page patterns

Page content sits in the application's `<main>`, which applies the maximum width (`--page-max`) and padding
(`--page-pad`). Stack sections with `<Stack gap={24}>`.

**List page**
```
<PageHeader title breadcrumbs? actions={<Button>...</Button>} />
<Grid columns={4}> <Stat/> x4 </Grid>            optional summary strip, at most 4
<Card padding="none">
  <FilterBar search filters actions activeFilters onClearAll />
  <DataTable columns rows getRowId rowHref selectable bulkActions />   in a client file
</Card>
```

**Detail page**
```
<PageHeader title breadcrumbs meta={<StatusPill/>} actions tabs? backHref? />
main column (about two thirds): Cards with DescriptionList, a line-item DataTable, Timeline
aside (about one third): a summary Card, related Cards, activity Timeline (at most 3 small cards)
```

**Form page**
```
<PageHeader title actions={cancel, save} />
<FormSection title description> <FormGrid columns={2}> <Field><Input/></Field> ... </FormGrid> </FormSection>
```
Put the actions in the page header, or in a sticky `FormFooter` at the end of a long form (not in both): the footer
also shows "Unsaved changes" and is the place for Discard and Save.

The content limits (at most 4 summary figures, 7 table columns, 2 visible header actions, no explanatory text) are in
[`minimal.md`](minimal.md).

## 12. Testing

`pnpm test` runs Vitest in jsdom.

- **`renderBoth(ui, options?)`** (`test/harness.tsx`) renders the same element twice, as English/ltr and as Arabic/rtl,
  each inside `DesignSystemProvider`, in the same document. It returns `{ en, ar }`, each a Testing Library result with
  `locale` and `dir`; the container carries `lang` and `dir` like `<html>`. `renderIn(locale, ui, options?)` renders one;
  `LOCALE_CASES` is for `describe.each`; `CustomLink` stands in for a router's `Link`. Queries are scoped to the container:
  use `screen` for portals (Modal, Drawer, Popover, Tooltip, Toast, Menu).
- **Arabic is a stand-in.** `test/*-labels.ts` hold draft Arabic label sets that prove the mechanism (no default English
  string is left on screen, in text or in an attribute a screen reader announces). They are not reviewed Arabic: the
  application supplies the real text, and a native reader checks it.
- **Keyboard and focus** are tested with `@testing-library/user-event`: Tabs, SegmentedControl, RadioGroup, Menu,
  Combobox, Accordion, Modal and Drawer focus trap and return, and the shell.
- **Placement** is tested with mocked rectangles and a stand-in for direction inheritance (`test/overlay-dom.ts`), so the
  arithmetic is checked in both directions.
- **Contract tests** read the sources: every class a component asks of its CSS Module exists in the CSS (a CSS Module
  under Vitest answers to any name), there is no physical direction, no undefined token, no English literal in an
  aria attribute, and every label key a component asks for exists in the label set. `test/stylelint-config.test.ts`
  proves the Stylelint config rejects raw colours (in any case), pixel and point font sizes, ad-hoc shadows and physical
  direction (properties, four-value shorthands, translations, positions, origins), and accepts tokens and logical
  properties. `test/lint-css.test.ts` runs Stylelint over `src/**/*.css` inside `pnpm test`, so physical CSS or a raw
  colour fails the test run and not only `pnpm lint:css`.
- **CSS text tests** read the style sheets and never render them: `test/focus-css.test.ts` (no `:focus-visible` rule
  removes the outline without another indicator, and the controls that show only the soft ring are listed) and
  `test/print-css.test.ts` (the rail, top bar, skip link and an open drawer are hidden when printing). They cannot show
  that an indicator is visible enough (3:1 needs computed colours), that an ancestor does not clip it, or what a printed
  page looks like.
- **What jsdom cannot prove.** It has no layout and no style sheets, so no test shows that a right-to-left screen looks
  right: that the rail and drawer sit on the correct edge, that a menu lines up with its trigger, that nothing overflows on a phone. That evidence
  is screenshots in the consuming application, next to the mockups. Say so wherever a test is described.

## 13. Authoring rules for components

- One component per file, kebab-case: `button.tsx`, `button.module.css`, `button.test.tsx`. Named exports and exported
  prop types (`export interface ButtonProps`). No default export.
- **Relative imports only.** The `@/` alias resolves inside the consuming application and can silently hit its files.
- **No `next/*` and no other framework import.** Anything the application supplies (links, navigation, active path,
  text, language) comes from the provider.
- **CSS Modules only**, reading tokens; logical properties only; no inline `style` except for data-driven values (a bar
  width, a grid template from props). Stylelint must pass with no disable comments.
- Start a file with `"use client"` when it uses state, effects, refs, event handlers, browser APIs or the provider. A
  purely presentational component stays server-safe.
- **Strings are labels.** No English in `aria-label`, `title`, `placeholder` or visible text: add a key to the right
  file in `src/provider/label-sets/` and read it with `useLabels()`. Numbers and dates go through `useFormat()`.
- **Props under `exactOptionalPropertyTypes`:** a prop the caller may pass as `undefined` is typed `?: T | undefined`
  (`className?: string | undefined`).
- Focus: `base.css` gives every `:focus-visible` element a 2px solid `--border-focus` outline (5:1 on white). A
  component that replaces it must keep a visible indicator: a solid outline, or a focus border plus `--focus-ring`. The
  soft ring alone (`outline: none; box-shadow: var(--focus-ring)`) is about 1.5:1 against white, below the 3:1 WCAG asks
  for; `test/focus-css.test.ts` lists the controls that still do this. Hit target at least `--control-sm` (28px); the
  default control height is `--control-md` (34px).
- Disabled uses `--text-disabled`, `--bg-subtle` and `cursor: not-allowed`, not opacity alone.
- Overlays: portal to `document.body`, close on Escape and outside press, trap focus in Modal and Drawer, restore focus on
  close, animate with opacity and a small translate over `--dur-base` (through `--rd-dir` for a horizontal one). Place floating layers with
  `src/lib/placement.ts`.
- Accessibility: correct roles (`tablist`/`tab`, `menu`/`menuitem`, `dialog` with `aria-modal`), a name for every
  icon-only button, `aria-sort` on sortable headers, `aria-invalid` and `aria-describedby` on fields.
- Icons: `lucide-react` (peer dependency). **Verify every icon name exists** before using it:
  `grep -c "declare const IconName:" node_modules/lucide-react/dist/lucide-react.d.ts`. Version 1 has no aliases such as
  `BarChart3`, `Building2` or `KanbanSquare`; use `ChartColumn`, `Building` and `SquareKanban`.
- Every component has a test that renders it through `renderBoth` and covers labels, keys, focus and the states above.
