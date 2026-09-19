# rupiv-design-system

The main project of this repository. A calm, dense, scannable design system for data-heavy web applications:
semantic tokens (colour, type, space, radius, elevation, motion), CSS Modules components (React 19, Next.js 16),
SVG charts, and the page and content rules that keep screens minimal. It is the design system of the ADPSS
project from milestone A1.

Status: **imported source, not yet a package.** It came from the Cachet ERP handoff and is being adapted for ADPSS
(logical CSS for right-to-left, Arabic type roles, a package with `exports`, tests, no framework imports). Nothing
here has been published to npm.

## Layout

| Path | What |
|---|---|
| `src/styles/tokens.css` | all design tokens (layer 1 primitives, layer 2 semantic tokens, light and dark) |
| `src/app/globals.css` | reset and type utilities |
| `src/components/ui/` | the components (Button, Input, Field, Select, Combobox, Checkbox, Radio, Switch, SegmentedControl, DateInput, Badge, StatusPill, Tag, Avatar, Card, Stat, DataTable, Tabs, Modal, Drawer, Menu, Popover, Tooltip, Alert, Toast, Progress, Stepper, Timeline, DescriptionList, EmptyState, Skeleton, PageHeader, FilterBar, Pagination, Breadcrumbs, FileDrop, ...) |
| `src/components/charts/` | SVG charts: sparkline, line, bar, donut, heat grid, legend, tooltip |
| `src/lib/` | `cn`, `format`, `status` helpers |
| `docs/minimal.md` | the eight principles and the rules every screen follows |
| `docs/design-system.md` | tokens, component props, page patterns, authoring rules |
| `legacy/ui-next/` | the previous main project of this repository (OmniApps ui-next), moved here with its history |

## Known gaps (measured, static analysis)

- About 100 physical-direction CSS declarations (`left`, `right`, `margin-left`, `padding-right`, `text-align: left`) in
  36 of 47 CSS files of `ui` and `charts`: not right-to-left safe yet.
- About 65 hard-coded English strings (labels, placeholders, aria-labels).
- Components import `next/link` and the `@/` alias; `@/lib/types` (`Tone`, `CategoryColor`) is missing, so the source does
  not type-check on its own. No `package.json`, no tests.
- Figtree is named in the tokens but never loaded; no Arabic font is defined. The dark theme follows the OS setting.
- `format.ts` and `status.ts` carry helpers from the source ERP (Indian rupee grouping, GST statuses).

## What is not here, and why

The reference screen, the Cachet and textile domain components, the app shell and the domain brief were left out: they
contain a client's and its suppliers' names and data.

## ui-next

The previous main project is in `legacy/ui-next/` (design tokens and React components of OmniApps ui-next, with its
nx workspace and CI, which no longer run from the repository root). The commit `f34a303`, tagged `ui-next-final`, is the
one ADPSS milestone A0 pins.

## Licence

MIT, as declared by the previous README and `package.json` of this repository. The owner should add a `LICENSE` file
with the copyright holder.
