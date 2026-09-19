# OmniApps — AI-Native Enterprise UI

An original design system and frontend prototype for a modern, AI-native ERP —
not a reskin of Carbon, Fluent or Material. Open source (MIT). Built to
eventually replace [`@omniapps/ui`](https://github.com/rupivbluegreen/omniApps)
in production, so it's designed against that product's real constraints
(i18n, density, browser parity) from the start, not as a throwaway mockup.

The demo domain is a Turkish textile/garment/fabric ERP — real module names,
realistic customer and demo data, real Turkish business concepts (RFQ,
production runs, shipment tracking) — because a design system proven on
dense, specific, real content is trustworthy in a way one proven on
placeholder text isn't. English is the base UI language throughout, structured
so a translation layer (next-intl, matching the OmniApps app) can sit on top
later rather than being baked in as hardcoded Turkish.

## Status

**Phase 1 of the plan, plus one real screen.** The workspace, the token
pipeline, a first slice of the component library, and a live, working Home
dashboard are built and verified — not wireframed. Everything past that
(Orders, Production, Inventory, Finance, CRM screens; the Angular mirror;
Storybook; e2e coverage) is not started yet.

## What it looks like

Calm, editorial, "modern classic" — warm off-white surfaces, large rounded
cards, soft low-contrast shadows, generous whitespace. A muted multi-color
palette carries meaning rather than decoration: sage green as the one brand
accent, dusty blue for informational state, soft apricot for warnings, a
restrained lilac reserved only for AI — the interface stays AI-native without
being AI-dominated. `DM Serif Display` for headings paired with `Inter` for
UI text; tabular figures everywhere a number needs to line up with another.

## Architecture

```
@omniappsuiux/design-tokens        one canonical tokens.json
        │                          → generated CSS custom properties (theme-aware, for inline styles)
        │                          → generated TS `tokens` (var() references) and `rawTokens` (literal
        │                            values — canvas/chart fills silently ignore an unresolved var())
        ↓
@omniappsuiux/ui-react              Card/Stack/Inline, Button, StatusBadge/MetricDelta,
                                     KPICard, AIInsightCard, AppShell — Radix underneath
                                     where interaction correctness matters, nothing here today needs it yet
        ↓
apps/react-erp                      the ERP shell and screens, built from the above
```

Two packages, an Nx workspace (pnpm), matching the `apps/*` + `libs/*` shape
the OmniApps monorepo already uses — the point is that dropping this in later
is close to a directory copy, not a rewrite.

- **React**: Vite, React 19, React Router, TanStack (Table/Query) once a data
  screen needs them, ECharts for charts (wrapped, never used raw in a screen),
  Lucide for icons.
- **Angular**: not started yet. Will mirror the React app screen-for-screen
  against the same `design-tokens` package once it begins.
- No UI framework underneath (no Material, no Ant, no Bootstrap, no Tailwind)
  — this system owns its own visual language, the same discipline
  `@omniapps/ui` already holds in the main product (`no-raw-color` /
  `no-physical-css`: every color and spacing value comes from a token).

## Running it

```bash
pnpm install
npx nx run react-erp:dev        # dashboard on http://localhost:4200 (or next free port)
npx nx run react-erp:test       # unit tests
npx nx run-many -t typecheck --all
```

To change a token: edit `libs/design-tokens/src/tokens.json`, then
`pnpm --filter @omniappsuiux/design-tokens generate` to regenerate the CSS
and TS output every consumer reads.

## Two real bugs worth knowing about if you touch charts

- **Use `rawTokens`, not `tokens`, for anything that isn't an inline React
  style** — a `<canvas>` fill color silently ignores an unresolved
  `var(--...)` string rather than erroring, which is exactly what
  `tokens` (correctly) contains for CSS use.
- **`echarts-for-react@3` doesn't survive React 19 StrictMode's
  double-invoke** — it disposes the real chart on the second mount, leaving a
  correctly-sized but blank canvas. StrictMode is off in `apps/react-erp` for
  now; noted inline in `main.tsx`.

## License

MIT.
