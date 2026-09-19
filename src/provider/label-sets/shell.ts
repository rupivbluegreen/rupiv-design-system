import type { LabelMap } from "../labels";

/** English defaults for the shell components. Keys are "<component>.<name>"; values are strings with {name} placeholders or functions. */
export const SHELL_LABELS = {
  // RailShell: the navigation landmark (rail and drawer), the skip link, the menu button of the top bar
  "railShell.nav": "Main navigation",
  "railShell.skip": "Skip to main content",
  "railShell.menuOpen": "Open menu",
  // NotificationsBell: its name with no unread items, and with a count (a function, so the plural is right)
  "railShell.notifications": "Notifications",
  "railShell.notificationsUnread": ({ count }) =>
    count === 1 ? "Notifications: 1 unread" : `Notifications: ${count} unread`,
  // CommandPalette: the default name of the input, the name of the list, the text when nothing matches, and the
  // count that a screen reader hears when the list changes
  "commandPalette.placeholder": "Search",
  "commandPalette.results": "Search results",
  "commandPalette.empty": "No results",
  "commandPalette.count": ({ count }) => (count === 1 ? "1 result" : `${count} results`),
} as const satisfies LabelMap;
