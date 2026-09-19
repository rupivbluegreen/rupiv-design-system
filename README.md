# rupiv-design system

A calm, dense, scannable design system for data-heavy web applications, in English and Arabic (left to right and
right to left). It has three parts:

- **Tokens.** Colour, type, space, radius, elevation and motion as CSS custom properties, in two layers (primitives
  and semantic tokens). Components and screens read the semantic layer only.
- **Components.** React 19 components written in TypeScript, styled with CSS Modules: forms, navigation, data
  display, overlays, and an application shell. No framework import and no CSS-in-JS.
- **Charts.** Sparkline, line, bar, donut and heat grid, drawn as plain SVG with no chart library.

It also carries the page and content rules that keep screens minimal (`docs/minimal.md`).

The package is `@rupiv/design-system`, version `0.0.0`, `"private": true`. It ships TypeScript source and CSS Modules
(no build step) and is used as a workspace package. Nothing is published to npm.

## Install and use

The package is source, so the application compiles it. Put the repository in the application's workspace (a git
submodule or a plain folder), list it in the workspace file, and depend on it:

```yaml
# pnpm-workspace.yaml
packages:
  - "vendor/rupiv-ds"
```

```json
{ "dependencies": { "@rupiv/design-system": "workspace:*" } }
```

Peer dependencies: `react` and `react-dom` 19, `lucide-react` ^1.47.0. `clsx` is a dependency. The design system does
not depend on a font package: the application installs `@fontsource/ibm-plex-sans-arabic` and `@fontsource/figtree`.

In Next.js, list the package in `transpilePackages` so its TypeScript and CSS Modules are compiled:

```ts
// next.config.ts
export default { transpilePackages: ["@rupiv/design-system"] };
```

### Root layout

Import the fonts first, then `tokens.css`, then `styles.css` (this is `src/styles/base.css`: reset, type utilities,
Arabic type). Each is imported once. Set `lang`, `dir` and `data-theme` on `<html>` from the server. Nothing in the
package sets them.

```tsx
// app/layout.tsx (a Server Component)
import "@fontsource/ibm-plex-sans-arabic/400.css"; // also 500, 600, 700: see docs/tokens.md for the full list
import "@fontsource/figtree/latin-400.css";
import "@rupiv/design-system/tokens.css";
import "@rupiv/design-system/styles.css";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = "ar"; // from your own routing
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <html lang={locale} dir={dir} data-theme="light">
      <body>
        <Providers locale={locale} dir={dir}>{children}</Providers>
      </body>
    </html>
  );
}
```

### Provider

`DesignSystemProvider` takes the language, direction, text, link component, navigation function and active path.
Three of those are functions, and a Server Component cannot pass a function to a Client Component, so create the
provider inside a client file and pass plain strings from the layout:

```tsx
// providers.tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DesignSystemProvider } from "@rupiv/design-system";

export function Providers({ locale, dir, children }: { locale: string; dir: "ltr" | "rtl"; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <DesignSystemProvider
      locale={locale}
      dir={dir}
      linkComponent={Link}
      navigate={(href) => router.push(href)}
      activePath={pathname}
      // labels={...}  the application's text for the built-in strings, see docs/design-system.md
    >
      {children}
    </DesignSystemProvider>
  );
}
```

Every hook works without a provider and returns the defaults: English, left to right, a plain `<a>`, navigation by page
load, no active path. See `docs/client-boundary.md` for the rule that decides which components a Server Component
may render.

## Entry points

| Import | What |
|---|---|
| `@rupiv/design-system` | components, the provider and its hooks, `useFormat`, `useToast`, tone helpers |
| `@rupiv/design-system/charts` | `Sparkline`, `LineChart`, `BarChart`, `DonutChart`, `HeatGrid`, `ChartLegend` |
| `@rupiv/design-system/format` | number, percent, date, Hijri, time and duration functions. No React: safe in a Server Component |
| `@rupiv/design-system/tokens` | `readToken` and `readTokens`, resolved token values for canvas code |
| `@rupiv/design-system/tokens.css` | the tokens |
| `@rupiv/design-system/styles.css` | reset, type utilities and Arabic type |

Import from the package, never by a file path inside it.

## Scripts

| Script | What it does |
|---|---|
| `pnpm typecheck` | `tsc -p tsconfig.json --noEmit`, with strict flags including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` |
| `pnpm lint:css` | Stylelint over `src/**/*.css`: no raw colours, no pixel font sizes, no ad-hoc shadows, no physical direction |
| `pnpm test` | `vitest run`: component tests rendered in English and Arabic (labels, keys, focus), plus tests of the provider, formatter, tokens and Stylelint config |
| `pnpm check:exports` | checks that every target in `package.json` `exports` is a file that exists |

Node 22.13 or newer, pnpm 10.12.1.

## Layout

| Path | What |
|---|---|
| `src/styles/tokens.css` | all tokens: primitives, semantic tokens, light theme, frozen dark theme |
| `src/styles/base.css` | reset, type utilities, Arabic rules (exported as `styles.css`) |
| `src/provider/` | `DesignSystemProvider`, hooks, label sets (one file per area in `label-sets/`) |
| `src/lib/` | formatter (`format.ts`, `date.ts`, `locale.ts`), `use-format.ts`, `placement.ts`, `tokens.ts`, `status.ts`, `types.ts` |
| `src/components/ui/` | the components, one file and one CSS Module each, with its test |
| `src/components/charts/` | the SVG charts |
| `test/` | test harness (`renderBoth`), jsdom polyfills, stand-in Arabic label sets |
| `scripts/check-exports.mjs` | the `exports` check |
| `docs/` | see below |
| `legacy/ui-next/` | the previous main project of this repository, kept for its history. Not part of the package, not tested, not a workspace member. It holds `package.json` files named `@omniappsuiux/*`, so a search for those names across a checkout of this repository finds them: keep such searches out of the folder that holds this repository |

## Docs

| File | What |
|---|---|
| `docs/design-system.md` | reference: provider and labels, formatter, direction rules, every component and its props, page patterns, testing |
| `docs/minimal.md` | page and content rules every screen follows |
| `docs/tokens.md` | tokens, fonts, Arabic type, reading tokens from code |
| `docs/shell.md` | the application shell: `RailShell`, `NavDrawer`, `CommandPalette`, `NotificationsBell` |
| `docs/client-boundary.md` | which components a Server Component may render, and how to build the provider |
| `docs/a1-adoption-note.md` | what changed when the source was packaged, what breaks for a consumer, what is not done |

## Rules in one paragraph

Read semantic tokens only: no raw colours, no pixel font sizes, no shadow outside `--shadow-*` on floating layers.
Write logical CSS only (`inline-size`, `margin-inline-start`, `text-align: start`), never `left`, `right` or
`margin-left`, so the same CSS is right in both directions. Give hierarchy by weight, not size. Use colour for status or
category only. Every built-in string comes from the provider's labels, and every number and date from the formatter
(Western digits in both languages). The first consuming application uses the light theme: it sets
`data-theme="light"`, and the dark theme in `tokens.css` is frozen, untested and does not cover the newer tokens.

## Status

The source is packaged, typed, right-to-left safe, localisable and tested for the parts listed in
`docs/a1-adoption-note.md`. That note also lists what is not done (server-side paging in `DataTable`, a reject
callback in `FileDrop`, a sticky form footer, the dark theme, three known contrast failures) and what to check
before merging. jsdom cannot show that right-to-left layout looks right: that evidence is screenshots in the
application that uses the package.

## Licence

MIT is declared in `package.json`. There is no `LICENSE` file yet: the owner adds it, with the copyright holder.
