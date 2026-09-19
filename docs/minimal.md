# Minimal screens: page and content rules

Screens built with this design system are calm, dense and scannable. Users scan tables and forms all day, so a screen
carries what the task needs and nothing else. These rules apply to every screen. The tokens and components in
`docs/design-system.md` make them easy to follow; this page says what to leave out.

## The eight principles

1. **Charcoal does the work, teal points.** Buttons and text are charcoal (`--bg-primary`, `--text-title`,
   `--text-body`). Teal (`--bg-accent`, `--text-accent`) is for the active tab, links, selection, focus and one
   progress bar. Never a teal background over a large area.
2. **Borders, not shadows.** A card is `--bg-surface` with a 1px `--border-default` and `--radius-lg`, on the
   `--bg-app` ground. `--shadow-*` is only for floating layers: menus, popovers, drawers, modals, toasts. No tinted or
   dashed boxes, no coloured side stripes.
3. **Hierarchy by weight, not size.** Three text sizes do the work: `--text-12`, `--text-14`, `--text-16`. The page title
   is `t-heading-l` (`--text-20`, bold). Weights are 400, 500, 600 and 700. No serif and no monospace (the tokens
   enforce it). No uppercase overlines: only the shell's small group headings are uppercase, and not in Arabic.
4. **One rhythm.** Card padding is `--space-16` (`Card` `padding="md"`, the default) or `--space-24` (`padding="lg"`),
   gaps between cards are `--space-16`, inner gaps `--space-8` or `--space-12`. A table row is `--table-row-h` (44px), or
   `--table-row-h-dense` (36px).
5. **Colour is status or category, never decoration.** Status uses the tone tokens (`neutral`, `accent`, `success`,
   `warning`, `danger`, `info`) through `Badge` and `StatusPill`. Category uses the category tokens and the pastel
   `Tile` colours. A status chip is a soft background with dark text.
6. **Chrome recedes.** The shell (icon rail and a white top bar) is done. Do not add navigation inside the page.
7. **One icon language.** `lucide-react` outline icons only, in the icon colours (`--icon-*`). The components set the
   size: 16px in controls (`--icon-md`), 20px in empty states and tiles (`--icon-lg`). Pass a bare icon element.
8. **Every state is designed.** Empty, loading (skeleton), error, filled, disabled. An empty state is a small icon, a
   short positive title and one line at most.

## Page rules

- **Page header.** A title and at most one short subtitle (8 words or fewer), or none. Breadcrumbs only on detail
  pages. **At most 2 visible actions**, one of them the primary (charcoal); everything else goes into a `Menu`
  labelled "More".
- **No explanatory paragraphs on screens.** No text that explains what the feature does, no banners that restate what
  the user just did, no "this is simulated" sentences (a tiny muted tag is fine), no requirement or section references.
  "Created from X" is one small muted meta line with a link.
- **Summary strip.** **At most 4 summary figures**, each a value and a label. Drop hints, or keep them to 3 words.
- **Tables.** **At most 7 columns by default.** The rest go to the detail page or get `hideBelow="lg"`. One line per
  cell where possible; a second line is muted and short. Numbers sit at the end of the cell (`align: "end"`), tabular.
- **Filters.** A search box and at most 3 filter chips. Tabs: at most 5.
- **Detail pages.** Header, then a main column of 1 to 3 cards, then an aside of at most 3 small cards. History,
  evidence, activity, audit and long lists go into Tabs.
- **Forms.** Group fields in `FormSection`s. Put the actions in the page header, or in one footer bar; not in both.

## Text budgets

| Element | Budget |
|---|---|
| Label | 1 to 3 words |
| Chip | 1 to 2 words |
| Meta line | 6 words or fewer |
| Card title | 4 words or fewer |
| Card subtitle | none, unless essential (5 words or fewer) |
| Page subtitle | 8 words or fewer |

Budgets are for English. Arabic is often shorter in words and taller in line height: check both, and never cut text
to make English fit.

## CSS

- Read tokens (`--bg-*`, `--text-*`, `--border-*`, tone and category tokens). No raw hex, no pixel font sizes, no
  ad-hoc shadows. Stylelint enforces this.
- Write logical properties only, so the same CSS works in both directions.
- Reuse the patterns the components already give: card, card header, tabs, chips, tiles, empty state.
- Remove decorative backgrounds, gradients, dashed borders, coloured left borders, heavy uppercase labels and extra
  dividers.
