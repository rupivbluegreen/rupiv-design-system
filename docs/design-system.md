# Tanabana Design System (TDS)

> Note (19 Sep 2026): written for the Cachet / Tanabana ERP. The reference screen (`src/app/(app)/home`), the Cachet and textile domain
> components, the app shell and the domain brief are not part of this repository: they carry a client's names and data.
> Sections that describe them are kept for history and will be removed when the design system is packaged.

The contract every component and screen in this repo follows. If you're adding a screen, read
**Principles**, **Page patterns** and the **Component API** list. If you're adding a component,
also read **Authoring rules**.

Tanabana is an ERP for yarn & fabric **traders / wholesalers** who also outsource processing
(dyeing, printing, finishing) as **job work**. Users are back-office staff who scan dense tables
all day, so the system is tuned for calm, dense, and scannable screens.

---

## 1. Principles

1. **Ink does the work, indigo points.** Primary buttons are ink (`--bg-primary`). Indigo
   (`--bg-accent`, `--text-accent`) is for selection, links, focus and the active nav item only.
2. **Borders at rest, shadows when floating.** Cards, tables and panels get a 1px
   `--border-default` on `--bg-app`. `--shadow-*` is only for menus, popovers, drawers, modals, toasts.
3. **Hierarchy by weight, not size.** App screens mostly use 12 / 13 / 14 / 16px. Page titles are
   `t-heading-l` (24px display face). Don't invent sizes.
4. **Color is status or category, never decoration.** Status → `statusTone()` in `src/lib/status.ts`.
   Fabric families/tiles → category colors (`indigo, madder, turmeric, neem, lac, kattha, slate`).
5. **Numbers are right-aligned and tabular.** Every quantity/currency column: `align: "right"` +
   `t-num`. Always format through `src/lib/format.ts` (₹ en-IN grouping, metres, kg, dates).
6. **Every state is designed.** Empty, loading (skeleton), error, disabled, read-only.
7. **Speak the trade.** Lots, rolls (thans), bales, shades, dye lots, GSM, width in inches,
   4-point inspection, job work, e-way bill, LR no., broker (dalal) commission, GST (CGST/SGST/IGST).

## 2. Tokens (`src/styles/tokens.css`)

Never write raw hex, px font sizes or ad-hoc shadows in component or screen CSS. Use tokens.

| Group | Tokens |
|---|---|
| Background | `--bg-app` `--bg-surface` `--bg-surface-raised` `--bg-subtle` `--bg-muted` `--bg-hover` `--bg-pressed` `--bg-selected` `--bg-selected-strong` `--bg-inverse` `--bg-overlay` `--bg-table-header` `--bg-primary(-hover/-pressed)` `--bg-accent(-hover/-subtle)` |
| Text | `--text-title` `--text-body` `--text-label` `--text-muted` `--text-placeholder` `--text-disabled` `--text-on-primary` `--text-on-accent` `--text-inverse` `--text-accent` `--text-link(-hover)` |
| Border | `--border-subtle` `--border-default` `--border-control(-hover)` `--border-strong` `--border-focus` `--border-selected` |
| Icon | `--icon-default` `--icon-strong` `--icon-muted` `--icon-accent` |
| Tones | `--{neutral,accent,success,warning,danger,info}-{bg,border,text,solid}` |
| Category | `--cat-{indigo,madder,turmeric,neem,lac,kattha,slate}-{bg,fg}` |
| Charts | `--chart-1` … `--chart-6`, `--chart-grid` `--chart-axis` `--chart-label` |
| Type | `--font-ui` `--font-display` `--font-mono`; `--text-11/12/13/14/16/18/20/24/30/36/48/60`; `--weight-regular/medium/semibold/bold`; `--leading-tight/snug/ui/read` |
| Space | `--space-0/2/4/6/8/12/16/20/24/32/40/48/64/80` |
| Radius | `--radius-xs`(3) chips · `--radius-sm`(4) badges · `--radius-md`(6) controls · `--radius-lg`(8) cards/tables · `--radius-xl`(12) overlays · `--radius-full` |
| Shadow | `--shadow-xs/sm/md/lg` (floating layers only) |
| Size | `--control-sm`(28) `--control-md`(34) `--control-lg`(40) · `--icon-sm/md/lg` · `--sidebar-w` `--topbar-h` `--page-max` `--page-pad` `--table-row-h(-dense)` |
| Layers | `--z-sticky/sidebar/dropdown/drawer/modal/toast/tooltip` |
| Motion | `--ease-out` `--ease-in-out` `--dur-fast/base/slow` |
| Focus | `--focus-ring` `--focus-ring-danger` |

Dark theme is automatic: semantic tokens are remapped under `prefers-color-scheme` and
`[data-theme="dark"]`. If you only use semantic tokens, your UI works in both themes for free.

### Typography utility classes (`globals.css`)

`t-display-xl` `t-display-l` `t-display-m` (landing only) · `t-heading-xl` `t-heading-l` (page titles)
`t-heading-m` `t-heading-s` `t-heading-xs` (card/section titles) · `t-body-l` `t-body-m` `t-body-s`
· `t-caption` · `t-overline` · `t-mono` (document numbers, lot/roll numbers, GSTIN, HSN) · `t-num`
Color helpers: `text-title` `text-body` `text-label` `text-muted` `text-accent` `text-success`
`text-warning` `text-danger`. Misc: `sr-only`, `truncate`.

## 3. File conventions

```
src/
  styles/tokens.css              tokens (do not edit without reason)
  app/globals.css                reset + type utilities
  app/page.tsx                   marketing landing (/)
  app/login/                     sign-in
  app/(app)/layout.tsx           AppShell (sidebar + topbar) for all ERP routes
  app/(app)/<module>/...         screens
  components/ui/                 generic primitives  → import from "@/components/ui"
  components/charts/             SVG charts          → import from "@/components/charts"
  components/textile/            domain components   → import from "@/components/textile"
  components/shell/              AppShell, Sidebar, Topbar, CommandMenu
  lib/format.ts  lib/status.ts  lib/types.ts  lib/nav.ts  lib/cn.ts
  lib/data/                      mock data           → import from "@/lib/data"
  lib/data/calc.ts               pure helpers (no mock data) → import from "@/lib/data/calc"
```

- **Client components import pure helpers from `"@/lib/data/calc"`**, not the `"@/lib/data"` barrel —
  the barrel pulls every mock dataset into the client bundle. Server pages resolve data and pass it down.

- One component per file, kebab-case: `button.tsx` + `button.module.css`.
- Styles: **CSS Modules only**, reading tokens. No inline `style` except for data-driven values
  (widths of bars, swatch hex, grid template from props).
- Components that use state, effects, refs, event handlers or browser APIs start with `"use client"`.
  Pure presentational ones stay server-compatible (no directive).
- Pages (`page.tsx`) are **server components**. Put interactivity in a sibling `*-client.tsx`
  ("use client") that receives already-resolved data as props.
- Next.js 16: `params` / `searchParams` are Promises → `const { id } = await params`.
  Use the global `PageProps<"/sales/orders/[id]">` type helper, or type it directly as
  `{ params: Promise<{ id: string }> }`. Call `notFound()` for unknown ids.
- Every page exports `metadata` (`export const metadata = { title: "Sales orders" }`).
- Icons: `lucide-react` v1. **Verify every icon name exists** before using it:
  `grep -c "declare const IconName:" node_modules/lucide-react/dist/lucide-react.d.ts`.
  (v1 removed aliases like `BarChart3`, `Building2`, `KanbanSquare` — use `ChartColumn`,
  `Building`, `SquareKanban`.) Icon size 16 in controls/tables, 14 (`--icon-sm`) in md badges and tags,
  12 in sm badges, 20 in empty states.
- Mock data is deterministic (no `Math.random()`/`Date.now()` at render) to avoid hydration errors.
  Use `TODAY` from `@/lib/format` as "now".

## 4. Page patterns

**List page**
```
<PageHeader title breadcrumbs? description? actions={<Button>…</Button>} />
<Grid columns={4}> <Stat/> ×4 </Grid>            ← optional summary strip
<Card padding="none">
  <FilterBar search filters actions activeFilters />
  <DataTable columns rows rowHref selectable bulkActions />
</Card>
```

**Detail page**
```
<PageHeader title="SO/26-27/0412" breadcrumbs meta={<StatusPill/>} actions tabs? />
<div class="detailGrid">  main (2/3): Cards with DescriptionList, line-item DataTable, Timeline
                          aside (1/3): summary Card (totals), party Card, activity Timeline
```

**Form page**
```
<PageHeader title="New sales order" actions={Cancel / Save draft / Confirm} />
<FormSection title description> <FormGrid columns={2}> <Field><Input/></Field> … </FormGrid> </FormSection>
sticky footer bar with totals + actions
```

Page content is rendered inside `AppShell`'s `<main>` which already applies max width and page padding.
Stack sections with `<Stack gap={24}>`.

## 5. Component API

All exported from `@/components/ui` unless noted. `size` is `"sm" | "md" | "lg"` (default `"md"`).
`Tone` = `"neutral" | "accent" | "success" | "warning" | "danger" | "info"`.

### Layout — `layout.tsx`
All layout primitives forward remaining HTML attributes to their root.
- `Stack` `{ gap?: 0|2|4|6|8|12|16|20|24|32|40|48 /* default 12 */; align?: "start"|"center"|"end"|"stretch" /* default "stretch" */; as?: ElementType; className?; children }` — vertical flex.
- `Inline` `{ gap? /* default 8 */; align?: "start"|"center"|"end"|"baseline"|"stretch" /* default "center" */; justify?: "start"|"center"|"end"|"between" /* default "start" */; wrap?: boolean; as?; className?; children }` — horizontal flex.
- `Grid` `{ columns?: 1|2|3|4|5|6 /* default 2 */; minItemWidth?: string /* e.g. "240px" → auto-fill */; gap? /* default 16 */; className?; children }` — collapses to 1 column < 640px, 2 columns < 1024px when columns ≥ 3.
- `Divider` `{ label?: string; vertical?: boolean; spacing?: 0|8|12|16|24 /* default 0 */ }`

### Actions — `button.tsx`
- `Button` `{ variant?: "primary"|"secondary"|"ghost"|"accent"|"danger"|"link" /* default "secondary" */; size?; leftIcon?: ReactNode; rightIcon?: ReactNode; loading?: boolean; fullWidth?: boolean; href?: string /* renders next/link */ } & ButtonHTMLAttributes` (`type` defaults to `"button"`)
- `IconButton` `{ icon: ReactNode; label: string /* aria-label + title */; variant?: "ghost"|"secondary"|"primary" /* default "ghost" */; size?; href? } & ButtonHTMLAttributes`
- `ButtonGroup` `{ attached?: boolean; children }`

### Forms
- `Field` (`field.tsx`) `{ label: string; htmlFor?: string; hint?: ReactNode; error?: string; required?: boolean; optional?: boolean; labelAction?: ReactNode; className?; children } & HTMLAttributes<HTMLDivElement>` — remaining attributes (`id`, `style`, `data-span`, …) go to the root `<div>`. With a single child element, Field injects `id` (unless set), `aria-describedby` (hint/error) and `aria-invalid` (on error). Its `<label>` gets id `${controlId}-label`; children that aren't native form controls (component children such as `SegmentedControl`/`RadioGroup`, or DOM elements with a `role`) also receive `aria-labelledby` pointing at it, unless they already set `aria-label`/`aria-labelledby`.
- `Input` (`input.tsx`) `{ size?; prefix?: ReactNode /* "₹" */; suffix?: ReactNode /* "m", "%" */; leftIcon?: ReactNode; invalid?: boolean } & InputHTMLAttributes` (without native `size`/`prefix`)
- `Textarea` (`input.tsx`) `{ invalid? } & TextareaHTMLAttributes`
- `SearchInput` (`search-input.tsx`, client) `{ value?; defaultValue?; onChange?: (value: string) => void; placeholder? /* default "Search" */; shortcut?: string /* "/" */; size?; disabled?: boolean; id?; name?; "aria-label"?; ref?; className? }` — disabled hides the clear button and ignores the shortcut.
- `Select` (`select.tsx`) native styled `{ options: { value: string; label: string; disabled?: boolean }[]; placeholder?: string; size?; invalid? } & SelectHTMLAttributes`
- `Combobox` (`combobox.tsx`, client) `{ options: { value: string; label: string; description?: string; meta?: string }[]; value?: string; onChange?: (value: string) => void; placeholder?; emptyText?; size?; invalid?; disabled?: boolean; id?; className?; "aria-label"?; "aria-labelledby"?; "aria-describedby"?; "aria-invalid"? }` — searchable, keyboard navigable. (Options have no per-option `disabled`.)
- `Checkbox` (`checkbox.tsx`, client) `{ label?: ReactNode; description?: ReactNode; indeterminate?: boolean } & InputHTMLAttributes`
- `RadioGroup` (`radio.tsx`, client) `{ name: string; options: { value: string; label: ReactNode; description?: ReactNode; disabled?: boolean }[]; value?; defaultValue?; onChange?: (v: string) => void; orientation?: "vertical"|"horizontal" /* default "vertical" */; disabled?: boolean; id?; className?; "aria-label"?; "aria-labelledby"?; "aria-describedby"? }` — with an `id` and no `aria-label`, it is labelled by `${id}-label` (Field's label).
- `Switch` (`switch.tsx`, client) `{ checked?; defaultChecked?; onCheckedChange?: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?; id? }`
- `SegmentedControl` (`segmented-control.tsx`, client) `{ options: { value: string; label: ReactNode; icon?: ReactNode }[]; value?; defaultValue?; onChange?: (v: string) => void; size?: "sm"|"md"; ariaLabel?: string; "aria-label"?: string /* wins over ariaLabel */; "aria-labelledby"?: string; "aria-describedby"?: string; id?: string /* on the radiogroup */; className? }` — give it a name via `ariaLabel`/`aria-label`, or put it in a `Field`.
- `DateInput` (`date-input.tsx`) native date styled `{ size?; invalid? } & InputHTMLAttributes`
- `QuantityInput` (`quantity-input.tsx`, client) `{ value?: number; defaultValue?: number; onChange?: (n: number) => void; step?: number /* default 1 */; min?; max?; uom?: string; size?; id?; name?: string; disabled?: boolean; invalid?: boolean /* same as aria-invalid */; className?; "aria-label"?; "aria-describedby"?; "aria-invalid"? }`
- `FileDrop` (`file-drop.tsx`, client) `{ accept?: string; hint?: string; multiple?: boolean; onFiles?: (files: File[]) => void; id?: string; className? }`
- `FormSection` (`form-section.tsx`) `{ title: string; description?: ReactNode; actions?: ReactNode; children }` — label column left (1/3) + content right (2/3), stacks on mobile.
- `FormGrid` (`form-section.tsx`) `{ columns?: 1|2|3|4; children }`

### Navigation
- `Tabs` (`tabs.tsx`, client) `{ items: { value: string; label: ReactNode; count?: number; icon?: ReactNode }[]; value?; defaultValue?; onChange?: (v: string) => void; variant?: "line"|"pill" /* default "line" */; ariaLabel?: string; "aria-label"?: string /* wins over ariaLabel */; "aria-labelledby"?: string; id?: string /* tabs get id `${id}-tab-${value}` */; className? }`
- `TabLinks` (`tabs.tsx`, client) `{ items: { href: string; label: ReactNode; count?: number }[]; ariaLabel?: string /* default "Sections" */; "aria-label"?: string /* wins */; className? }` — active via `usePathname` (exact or longest prefix match).
- `Breadcrumbs` (`breadcrumbs.tsx`) `{ items: { label: string; href?: string }[] }`
- `Pagination` (`pagination.tsx`, client) `{ page: number; pageCount: number; onPageChange: (p: number) => void; total?: number; pageSize?: number; pageSizeOptions?: number[]; onPageSizeChange?: (n: number) => void }`
- `PageHeader` (`page-header.tsx`) `{ title: ReactNode; description?: ReactNode; breadcrumbs?: { label: string; href?: string }[]; meta?: ReactNode; actions?: ReactNode; tabs?: ReactNode; backHref?: string }`

### Data display
- `Card` (`card.tsx`) `{ padding?: "none"|"sm"|"md"|"lg" /* default "md" */; interactive?: boolean; tone?: "default"|"subtle"; as?: ElementType /* default "div" */; href?: string /* passed through when `as` is a link, e.g. as={Link} */; className?; children } & HTMLAttributes`
- `CardHeader` `{ title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode; bordered?: boolean }`
- `CardBody` `{ className?; children }` · `CardFooter` `{ className?; children; align?: "start"|"end"|"between" }`
- `Badge` (`badge.tsx`) `{ tone?: Tone; variant?: "soft"|"solid"|"outline"; size?: "sm"|"md"; dot?: boolean; icon?: ReactNode; children }`
- `CountBadge` (`badge.tsx`) `{ count: number; tone?: Tone; max?: number }`
- `StatusPill` (`status-pill.tsx`) `{ status: string; size?: "sm"|"md" }` — tone from `statusTone()`, soft badge with dot.
- `Tag` (`tag.tsx`) `{ color?: CategoryColor; onRemove?: () => void; icon?: ReactNode; children }`
- `Avatar` (`avatar.tsx`) `{ name: string; size?: "xs"|"sm"|"md"|"lg"; color?: CategoryColor /* default: hashed from name */ }`
- `AvatarGroup` `{ names: string[]; max?: number; size?: "xs"|"sm"|"md" }`
- `Stat` (`stat.tsx`) `{ label: string; value: ReactNode; unit?: string; delta?: { value: number /* percent */; goodWhen?: "up"|"down"; label?: string }; icon?: ReactNode; hint?: ReactNode; href?: string; footer?: ReactNode; className? }`
- `DescriptionList` (`description-list.tsx`) `{ items: { label: string; value: ReactNode; span?: 1|2|3|4 }[]; columns?: 1|2|3|4; dense?: boolean }`
- `DataTable<T>` (`data-table.tsx`, client) — see below.
- `KeyValue` (`description-list.tsx`) `{ label: ReactNode; value: ReactNode; emphasis?: boolean }` — single row, label left / value right (totals blocks).
- `Progress` (`progress.tsx`) `{ value: number; max?: number; tone?: Tone; size?: "sm"|"md"; label?: ReactNode; showValue?: boolean; valueLabel?: string }`
- `SegmentBar` (`progress.tsx`) `{ segments: { value: number; tone?: Tone; color?: string; label: string }[]; height?: number; showLegend?: boolean }`
- `Timeline` (`timeline.tsx`) `{ items: { id?: string; title: ReactNode; time?: string; description?: ReactNode; tone?: Tone; icon?: ReactNode; actor?: string }[]; dense?: boolean }`
- `Stepper` (`stepper.tsx`) `{ steps: { label: string; description?: string }[]; current: number /* index of active */; orientation?: "horizontal"|"vertical" }`
- `EmptyState` (`empty-state.tsx`) `{ icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; compact?: boolean }`
- `Skeleton` (`skeleton.tsx`) `{ width?: number|string; height?: number|string; radius?: "sm"|"md"|"lg"|"full"; className? }` · `SkeletonText` `{ lines?: number }`
- `Kbd` (`kbd.tsx`) `{ children }`
- `Section` (`section.tsx`) `{ title: ReactNode; description?: ReactNode; actions?: ReactNode; children }` — in-page heading block.

#### DataTable
```ts
interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;   // makes the column sortable
  align?: "left" | "right" | "center";
  width?: number | string;
  hideBelow?: "md" | "lg";                    // hide on narrow screens
  sticky?: boolean;                           // first column sticky on horizontal scroll
}
interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  rowHref?: (row: T) => string;               // whole row navigates (Link)
  selectable?: boolean;
  bulkActions?: (selectedIds: string[], clear: () => void) => ReactNode;
  pageSize?: number;                          // default 10; 0 = no pagination
  dense?: boolean;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  emptyState?: ReactNode;
  footer?: ReactNode;                         // totals row content, rendered in <tfoot>
  caption?: string;                           // sr-only
  stickyHeader?: boolean;
  rowTone?: (row: T) => Tone | undefined;     // subtle row tint + 2px left edge
  className?: string;
}
```
Header row `--bg-table-header`, 12px semibold `--text-label`; rows `--table-row-h`, 1px `--border-subtle`
dividers, hover `--bg-hover`, selected `--bg-selected`. Numbers right-aligned tabular.

- **Footer**: pass `<td>` cells in a fragment (wrapped in a row, offset for the selection column) or full
  `<tr>` rows. Footer cells automatically inherit the `hideBelow` of the column(s) they sit under
  (`colSpan` aware; a spanning cell hides only if every spanned column hides). Override per cell with
  `data-hide-below="md" | "lg"`; `data-align="right" | "center"` aligns.
- **rowTone**: tints the row with `--{tone}-bg` at 55% over the surface and draws a 2px inset
  `--{tone}-solid` edge on the first cell. Hover and selected backgrounds still take precedence.

### Feedback & overlays (client)
- `Alert` (`alert.tsx`) `{ tone?: Tone /* default "info" */; title?: ReactNode; children?; icon?: ReactNode; action?: ReactNode; onDismiss?: () => void; className? }`
- `ToastProvider` + `useToast()` (`toast.tsx`) → `{ toast, dismiss }`. `toast({ title, description?, tone?, action?, duration?: number /* ms */ })` returns the toast id; `dismiss(id)` closes it. `ToastProvider` is mounted in AppShell.
- `Modal` (`modal.tsx`) `{ open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; size?: "sm"|"md"|"lg"|"xl" /* default "md" */; footer?: ReactNode; className?; children }`
- `Drawer` (`drawer.tsx`) `{ open; onClose; title: ReactNode; subtitle?: ReactNode; width?: number /* default 480 */; footer?: ReactNode; className?; children }`
- `Menu` (`menu.tsx`) `{ trigger: ReactElement; items: (MenuItem | "separator")[]; align?: "start"|"end" /* default "start" */; label?: string; className? }`, `MenuItem = { label: ReactNode; icon?: ReactNode; onSelect?: () => void; href?: string; danger?: boolean; shortcut?: string; disabled?: boolean }`
- `Popover` (`popover.tsx`) `{ trigger: ReactElement; children; align?: "start"|"end" /* default "start" */; width?: number; open?; onOpenChange?; className? }`
- `Tooltip` (`tooltip.tsx`) `{ content: ReactNode; children: ReactElement; side?: "top"|"bottom"|"left"|"right" }`
- `FilterBar` (`filter-bar.tsx`) `{ search?: { value?: string; onChange?: (v: string) => void; placeholder?: string }; filters?: ReactNode; actions?: ReactNode; activeFilters?: { label: string; onRemove: () => void }[]; onClearAll?: () => void }`
- `FilterChip` (`filter-bar.tsx`) `{ label: string; value?: string; options: { value: string; label: string }[]; onChange: (v: string | undefined) => void }` — dropdown filter button.

### Charts — `@/components/charts` (SVG, no library)
- `Sparkline` `{ data: number[]; width?: number /* default 120 */; height?: number /* default 32 */; tone?: Tone | "chart-1"… /* default "chart-1" */; area?: boolean; showEnd?: boolean /* default true */ }`
- `BarChart` `{ data: { label: string; values: number[] }[]; series: { name: string; color?: string }[]; height?: number /* default 240 */; format?: (n: number) => string /* default compact */; stacked?: boolean; horizontal?: boolean }` — vertical bars truncate category labels to the band width; labels are only skipped when bands are narrower than ~28px.
- `LineChart` `{ labels: string[]; series: { name: string; data: number[]; color?: string; area?: boolean; dashed?: boolean }[]; height?: number /* default 240 */; format?: (n: number) => string }`
- `DonutChart` `{ data: { label: string; value: number; color?: string }[]; size?: number /* default 160 */; thickness?: number /* default 18 */; centerLabel?: ReactNode; centerValue?: ReactNode; format?: (n: number) => string; showLegend?: boolean }`
- `HeatGrid` `{ rows: string[]; columns: string[]; values: number[][]; format?: (n: number) => string; tone?: "accent"|"warning"|"danger" /* default "accent" */ }` — tint is capped per tone so cell text (`--text-body`, `--text-title` on strong cells) keeps ≥ 4.5:1 in both themes.
- `ChartLegend` `{ items: { label: string; color: string; value?: string }[] }`
Charts read `--chart-*` tokens; labels/grid use `--chart-label`/`--chart-grid`. Client components with hover tooltip.
`BarChart`/`LineChart` fill their container's width (measured with ResizeObserver, shrinking and growing);
the SVG never drives layout, so charts don't cause horizontal overflow.

### Textile domain — `@/components/textile`
- `ShadeSwatch` `{ shade: Shade; size?: "sm"|"md"|"lg"; showLabel?: boolean }`
- `GradeBadge` `{ grade: Grade }`
- `FabricSpec` `{ item: Item; compact?: boolean }` → "110 GSM · 58″ · 60s × 60s / 90 × 88 · 100% Cotton"
- `ItemCell` `{ item: Item; shade?: Shade; compact?: boolean }` — table cell: category-colored mark, name, code (mono) + spec line. `compact`: single line — mark, truncating name, code (and shade swatch), no spec line.
- `PartyCell` `{ party: Party; showGstin?: boolean }` — avatar + name + city
- `DocLink` `{ href: string; children }` — mono document number link
- `LotCard` `{ lot: Lot; item: Item; warehouse?: Warehouse }` — location line: warehouse name truncates, rack code never wraps.
- `RollStrip` `{ rolls: Roll[] }` — compact visual of roll lengths coloured by grade
- `PointsGauge` `{ value: number; limit?: number /* default 40 */; size?: "sm"|"md"|"lg" /* default "md" */; className? }` — 4-point score meter. `sm`: inline ~80px meter with the number only (12px), no caption — for table cells. `lg`: `t-heading-l` value and a thicker bar.
- `QtyFulfilment` `{ ordered: number; fulfilled: number; uom: string }` — progress + "3,200 / 5,000 m"
- `GstBreakup` `{ taxable: number; cgst: number; sgst: number; igst: number; roundOff?: number; total: number }`
- `CategoryMark` `{ color: CategoryColor; label?: string }`

## 6. Authoring rules for components

- Focus: `:focus-visible { box-shadow: var(--focus-ring); outline: none; }` on interactive elements.
- Hit target ≥ 28px (`--control-sm`). Default control height `--control-md` (34px).
- Transitions: `background-color, border-color, color, box-shadow` over `var(--dur-fast) var(--ease-out)`.
- Disabled: `opacity: .5` is not enough — use `--text-disabled`, `--bg-subtle`, `cursor: not-allowed`.
- Overlays: portal to `document.body`, close on Escape and outside click, trap focus in Modal/Drawer,
  restore focus on close, animate with opacity + 4px translate over `--dur-base`.
- Accessibility: correct roles (`tablist/tab`, `menu/menuitem`, `dialog` + `aria-modal`), labels for
  icon-only buttons, `aria-sort` on sortable headers, `aria-invalid` + `aria-describedby` on fields.
- Export named components and their prop types (`export interface ButtonProps`).
