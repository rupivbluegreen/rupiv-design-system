# Minimal redesign rules (Darwinbox teardown → Cachet)

> Note (19 Sep 2026): written for the Cachet / Tanabana ERP. The reference screen (`src/app/(app)/home`), the Cachet and textile domain
> components, the app shell and the domain brief are not part of this repository: they carry a client's names and data.
> Sections that describe them are kept for history and will be removed when the design system is packaged.

The client said the screens are **too busy, too much text, cluttered**. The approved reference is
`/home` → `src/app/(app)/home/page.tsx` + `home.module.css`. Every screen must feel like it.

## The eight principles (from the Darwinbox teardown)
1. **Charcoal does the work, teal only points.** Buttons/text charcoal. Teal only for the active tab, links, selection, one progress bar. Never teal backgrounds on big areas.
2. **Borders, not shadows.** White cards, 1px `#e9e9e9` border, 8px radius, on the `#f6f6f6` ground. No shadows at rest, no tinted/dashed boxes, no coloured side stripes.
3. **Three text sizes do the work.** 12 / 14 / 16px. Page title 20px bold. Hierarchy by weight (400/500/600/700), not size. No serif, no monospace (tokens already enforce this), no uppercase overlines except tiny table headers if needed.
4. **One rhythm.** Card padding 24px, gaps between cards 16px, inner gaps 8/12px. Row height ~52px.
5. **Colour = category or status only.** Pastel tiles (rose `#ffecf1`, sky `#e7f6fd`, sand `#fff8e6`, lilac `#f3effe`, mint `#eef6f6`) with charcoal outline icons. Status chips: soft background + dark text.
6. **Chrome recedes.** The shell (icon rail + white top bar) is done — don't add in-page navigation clutter.
7. **One icon language.** lucide outline, 20–24px, stroke 1.5–1.6, charcoal (or teal on mint).
8. **Empty states are designed.** Small line illustration + short positive title + one line.

## Hard rules for decluttering (apply to every screen)
- **Page header:** title + at most ONE short subtitle (≤ 8 words) or none. Breadcrumbs only on detail pages. Max 2 visible actions (one primary charcoal); everything else in a `Menu` ("More").
- **Delete explanatory prose.** No paragraphs explaining the feature, no "nothing retyped — …" banners, no "simulated in demo" sentences (a tiny muted tag is fine), no requirement/section references on screen.
  "Created from X" becomes a small muted meta line with a link, once.
- **Text budgets:** labels 1–3 words · chips 1–2 words · meta lines ≤ 6 words · card titles ≤ 4 words · no card subtitles unless essential (≤ 5 words).
- **Summary strip:** at most 4 stats; value + label only (drop hints, or ≤ 3 words).
- **Tables:** ≤ 6–7 columns by default; the rest go to the detail page or `hideBelow="lg"`. One line per cell where possible; second lines muted and short. Right-align numbers.
- **Detail pages:** header · (optional) the value-chain strip · a main column with 1–3 cards · an aside with ≤ 3 small cards. Everything else (history, evidence, activity, audit, long lists) goes into Tabs.
- **AI:** at most ONE `AiSuggestion` per page, short (title + ≤ 1 sentence). Elsewhere use `AiTag`. Evidence lives in its collapsed disclosure.
- **Value chain:** use only `<ValueChain steps={goldenChain} variant="compact" activeKey=… />` — it now renders a slim progress bar WITH previous/next links. **Remove any hand-made previous/next step links** and "Step N of 15" labels you added.
- **Filters:** search + ≤ 3 filter chips. Tabs ≤ 5.
- **Documents** (Sales Offer, PO, Proforma, Packing list): keep the document faithful, but surround it with at most a slim aside (status + 3 key facts + linked docs).
- **Numbers & facts stay.** Do not change data, routes, ids, behaviour or the golden-thread figures — you are removing noise, not content that the demo relies on.

## CSS
- Prefer the tokens (they now carry the Darwinbox values). Reuse the home patterns: `.card`, `.cardHead`, `.cardTitle`, `.viewAll`, task rows, chips, pastel tiles, apps grid, tabs, empty state.
- Remove decorative backgrounds, gradients, dashed borders, coloured left borders, heavy uppercase labels and extra dividers.
