# Shell

`RailShell` is the application frame: a 72px dark icon rail on the inline start with a fly-out per group, a 56px top
bar, the page in `<main>`, and below 1024px a navigation drawer opened from a menu button. `NavDrawer`,
`CommandPalette` and `NotificationsBell` are its parts and can be used alone.

The shell knows no application. It has no product name, no section names, no roles, no language switch. All of that
is passed in.

## What the application supplies

| Prop of `RailShell` | Type | Notes |
|---|---|---|
| `groups` | `NavGroup[]` | One rail button per group; its fly-out lists the items. The same groups fill the drawer. |
| `brand` | `NavBrand` | `href`, `label` (name of the rail mark link), `mark` (two letters or a logo), optional `name` (wordmark, default `label`), optional `context` (small text after the wordmark, hidden below 640px). |
| `search` | `ReactNode` | The top-bar search box, usually `<CommandPalette>`. Not shown below 1024px. |
| `end` | `ReactNode` | The end of the top bar: the application's own controls (bell, language switch, user). The application decides the order. |
| `children` | `ReactNode` | The page. |
| `mainId` | `string` | Id of `<main>`, target of the skip link. Default `main-content`. |
| `expanded` | `boolean` | Labelled rail instead of icon-only, when the application owns the state. Pair with `onExpandedChange`. |
| `defaultExpanded` | `boolean` | Whether the rail starts labelled, when it keeps its own state. Default `false`. |
| `onExpandedChange` | `(expanded: boolean) => void` | Called after the rail-width toggle is pressed, controlled or not. The shell holds no storage of its own; persisting the choice, if any, is the application's. |

```ts
interface NavGroup { id: string; label: string; icon?: ReactNode; items: NavItem[] }
interface NavItem {
  id: string; label: string; href: string;
  icon?: ReactNode;      // small marker after the label (14px), e.g. "view only"
  iconLabel?: string;    // its text for a screen reader; without it the marker is hidden from assistive technology
  badge?: string | number;
  section?: string;      // heading of the run of items this one starts (see below)
  active?: boolean;      // force the state; left out, it comes from the provider's activePath
}
```

- **Sections.** Items with the same `section` in a row form a run under that heading; an item with no `section` joins
  the run before it. Label the first item of each run, or every item.
- **Active item.** From `DesignSystemProvider activePath`: an item is active when the path is its `href` or below it,
  and only the longest matching `href` counts. `"/"` matches only the root. Query, hash and trailing slash are
  ignored. An item's own `active` wins and takes no part in the competition.
- **Group icon.** A 22px svg. A group with no icon shows the first letter of its label.
- **Text.** Keys `railShell.*` and `commandPalette.*` in the provider labels (English defaults in
  `src/provider/label-sets/shell.ts`). `railShell.notificationsUnread` and `commandPalette.count` take `{count}`
  and may be functions (plurals). The close button of the drawer uses `drawer.close`.
- **Links** go through the provider's `linkComponent`; a click on a link closes the fly-out or the drawer.
- **Direction** comes from `<html dir>` for layout (CSS logical properties only) and from the provider `dir` for the
  arrow keys.

## Behaviour

**Rail.** Hover opens a fly-out and leaving closes it. A click or the keyboard pins it open until it is toggled,
dismissed (Escape, a press outside, focus leaving) or a link is chosen. Touch: a tap is a click. One fly-out at a
time. The rail buttons are disclosure buttons (`aria-expanded`, `aria-controls`); the fly-out is a labelled group
of links, in the accessibility tree only while open. Every link stays in the DOM, with `data-shell-item="<id>"`,
inside `data-shell="rail"`, for the application's own checks.

**Keyboard on a rail button.** Enter or Space opens the fly-out and moves the focus to its first item. The arrow
toward the fly-out (right in English, left in Arabic) does the same. Up, Down, Home, End move between rail buttons
(wrapping).

**Keyboard in a fly-out.** Up, Down, Home, End move between items (wrapping). Escape, or the arrow back toward the
rail, closes it and returns the focus to its rail button. Tab out of the group closes it.

**Rail width.** A toggle at the foot of the rail switches it between icon-only (72px, the default)
and labelled (224px, `railShell.railExpand` / `railShell.railCollapse`). Labelled, each rail button
shows its group's name and a chevron, and a click opens its items as an inline panel below the
button — the same disclosure button and `role="group"` fly-out as icon-only mode, laid out in the
rail column instead of floating, so the keyboard behaviour below is unchanged either way. Expanding
opens the active group's panel with no extra click. Below 1024px the rail is hidden regardless
(**Drawer**, next), so the toggle only matters at desktop widths.

**Drawer.** Below 1024px the rail is hidden and the menu button opens `NavDrawer` (a `Drawer` with `side="start"`:
focus trap, Escape, scrim press, focus returns to the menu button). Focus starts on the close button, the first
control in the panel, so Tab then walks the groups in order (with focus on the first group instead, the close button
would be the last of about a dozen stops). Each group is a section that opens and closes; the group with the active
item starts open, else the first. Growing the window past 1024px closes it.

**Skip link.** First in the tab order; moves the focus to `<main>`.

**Landmarks.** `banner` (top bar), `navigation` named by `railShell.nav`, `main`; the search box is a `search`
landmark.

## CommandPalette

A search box with results hanging under it (an anchored listbox, not a modal). `items` are
`{ id, label, meta?, href, keywords? }`; `meta` shows as secondary text after the label; `keywords` are matched but not
shown (for example the title in the other language). Props: `placeholder`, `aria-label`, `shortcut` (a key such as `/`
that focuses the box from anywhere, shown as a hint while empty), `maxResults` (default 8).

- The input is a `combobox` (`aria-expanded`, `aria-controls`, `aria-activedescendant`); results are `option`s that
  are links. Focus stays in the input.
- Arrow keys move (wrapping). Enter goes to the highlighted result through the provider's `navigate` and clears the
  box; a click on a result is a normal link. Escape closes the list, then clears the text.
- Results keep the order of `items`. A result matches when the query is a substring of its label, meta or keywords.
- Nothing typed: no list. Nothing found: the `commandPalette.empty` text. A status region announces the count.
- The list hangs from the inline-start edge of the box, so it lines up with the box in both directions.

**Matching is done on normalised text** (`normalizeSearchText`, also exported): Unicode NFKC, bidirectional marks
removed, lower case, white space collapsed; Arabic short vowels and tatweel removed; alef with hamza, madda or wasla
becomes a plain alef, alef maqsura becomes yeh, teh marbuta becomes heh (as the Lucene Arabic normaliser); Arabic-Indic
and Persian digits become 0 to 9. Not done: stemming, hamza on waw and yeh, transliteration between scripts.

## NotificationsBell

`<NotificationsBell unreadCount={n} href="/notifications" />` (a link through the provider) or `onClick` (a button).
With neither it is not interactive: a plain element (`role="img"`) with the same name and count, no hover state, and
Tab skips it, so a person never lands on a control that does nothing. Put it in `end`. The badge is hidden from screen
readers and always in Western digits ("99+" above 99); the accessible name carries the exact count
(`railShell.notificationsUnread`). Zero shows no badge.

## Print

The rail, the top bar and the skip link are hidden when printing, and the page uses the whole sheet. An open
navigation drawer and its scrim are hidden too. These are `@media print` rules in `rail-shell.module.css` and
`drawer.module.css`, checked as CSS text in `test/print-css.test.ts`; nobody has looked at a printed page.

## Client boundary

The shell reads the provider (labels, link component, direction, active path) and `end` and `search` may hold
functions and handlers, so `RailShell`, `NavDrawer`, `CommandPalette` and `NotificationsBell` are Client Components
and cannot be rendered from a Server Component with function props. Render the shell from a client file (in
Next.js, the layout renders a small client `AppShell` that builds `groups` from plain data and renders `RailShell`).
See `client-boundary.md`.

## Not proved by the tests

The tests run in jsdom, which has no layout and no style sheets. They prove roles, labels, keys, focus and state in
English/ltr and Arabic/rtl. They do not prove that the rail and the fly-out sit on the right edge in Arabic, that the
drawer slides in from the right, that the results list lines up with the box, that the fly-out stays inside the
window, or that nothing overflows sideways on a phone. That evidence is screenshots in the application.
