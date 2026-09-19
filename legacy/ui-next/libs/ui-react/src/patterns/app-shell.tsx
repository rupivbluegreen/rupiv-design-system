'use client';

import {
  useEffect,
  useId,
  useState,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ElementType,
  type ReactNode,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Bell, Menu, X } from 'lucide-react';
import { IconButton } from '../foundations/button';
import './app-shell.css';

export interface SidebarItemData {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
  active?: boolean;
}

export interface SidebarNavGroup {
  key: string;
  label: string;
  items: SidebarItemData[];
}

/** Props the shell passes to every link it renders: a plain `<a>` by default, or your router's Link. */
export type ShellLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};
export type ShellLinkComponent = ComponentType<ShellLinkProps>;

/** Every string the shell renders itself. All are plain strings so they can cross the server/client boundary. */
export interface AppShellLabels {
  /** aria-label of the `navItems` nav. */
  mainNavigation: string;
  /** aria-label of the `footerNav` nav. */
  settings: string;
  searchPlaceholder: string;
  /** aria-label of the default search input. */
  searchLabel: string;
  /**
   * aria-label of the bell. To announce a count in a plural-aware language,
   * build the whole string on your side ("5 unread notifications") and pass it here.
   */
  notifications: string;
  /** aria-label of the menu button that opens the navigation below 1024px. */
  openNavigation: string;
  /** aria-label of the drawer's close button. */
  closeNavigation: string;
  /** Accessible name of the navigation drawer (the dialog). */
  navigationDrawer: string;
}

const DEFAULT_LABELS: AppShellLabels = {
  mainNavigation: 'Main navigation',
  settings: 'Settings',
  searchPlaceholder: 'Search…',
  searchLabel: 'Global search',
  notifications: 'Notifications',
  openNavigation: 'Open navigation',
  closeNavigation: 'Close navigation',
  navigationDrawer: 'Navigation',
};

/** Below this the sidebar is a drawer. Keep in sync with the media queries in app-shell.css (1023.98px so exactly 1024px stays desktop). */
const DRAWER_QUERY = '(max-width: 1023.98px)';

function resolveLabels(overrides?: Partial<AppShellLabels>): AppShellLabels {
  const labels = { ...DEFAULT_LABELS };
  for (const key of Object.keys(DEFAULT_LABELS) as Array<keyof AppShellLabels>) {
    const value = overrides?.[key];
    if (value !== undefined) labels[key] = value;
  }
  return labels;
}

export interface AppShellProps {
  logo: ReactNode;
  navItems?: SidebarItemData[];
  navGroups?: SidebarNavGroup[];
  footerNav?: SidebarItemData[];
  user: { name: string; role: string; initials: string };
  tagline?: string;
  /** Replaces the topbar's search box. Omit for the static placeholder. */
  search?: ReactNode;
  /** Rendered in the topbar before the bell/user block — the company selector, for instance. */
  headerExtra?: ReactNode;
  /** Overrides for the shell's built-in text. Anything you leave out keeps its English default. */
  labels?: Partial<AppShellLabels>;
  /** Unread notifications. 0 or undefined shows no badge; above 99 the badge reads "99+". */
  unreadCount?: number;
  /** Called when the bell is pressed. */
  onNotificationsClick?: () => void;
  /** Makes the bell a link. Rendered through `linkComponent`. */
  notificationsHref?: string;
  /** Renders every link the shell draws (nav items, bell link), for example Next's `Link`. Defaults to `<a>`. */
  linkComponent?: ShellLinkComponent;
  children: ReactNode;
}

/**
 * The app shell: a sticky sidebar and a topbar (search, notifications, user) around scrollable content.
 * Below 1024px the sidebar becomes a drawer opened from a menu button in the topbar.
 */
export function AppShell({
  logo,
  navItems,
  navGroups,
  footerNav,
  user,
  tagline,
  search,
  headerExtra,
  labels,
  unreadCount,
  onNotificationsClick,
  notificationsHref,
  linkComponent,
  children,
}: AppShellProps) {
  const text = resolveLabels(labels);
  const Link: ElementType<ShellLinkProps> = linkComponent ?? 'a';
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The drawer is portalled into the shell (not <body>) so it inherits a `dir`/`lang` set on an ancestor of the shell.
  const [shellElement, setShellElement] = useState<HTMLDivElement | null>(null);

  // A drawer left open across a resize to desktop would keep its focus trap and scroll lock with nothing visible.
  useEffect(() => {
    if (!drawerOpen || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DRAWER_QUERY);
    const closeWhenWide = (event: MediaQueryListEvent) => {
      if (!event.matches) setDrawerOpen(false);
    };
    query.addEventListener('change', closeWhenWide);
    return () => query.removeEventListener('change', closeWhenWide);
  }, [drawerOpen]);

  const sidebar = { logo, navItems, navGroups, footerNav, tagline, text, Link };

  return (
    <div className="omni-shell" ref={setShellElement}>
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <aside className="omni-shell-sidebar">
          <SidebarBody {...sidebar} />
        </aside>

        <div className="omni-shell-main">
          <header className="omni-shell-topbar">
            <Dialog.Trigger asChild>
              <IconButton
                className="omni-shell-menu-button"
                label={text.openNavigation}
                icon={<Menu aria-hidden="true" />}
              />
            </Dialog.Trigger>
            {search ?? (
              <div className="omni-shell-search">
                <input type="text" placeholder={text.searchPlaceholder} aria-label={text.searchLabel} disabled />
              </div>
            )}
            <div className="omni-shell-topbar-actions">
              {headerExtra ? <div className="omni-shell-header-extra">{headerExtra}</div> : null}
              <NotificationsBell
                label={text.notifications}
                unreadCount={unreadCount}
                onClick={onNotificationsClick}
                href={notificationsHref}
                Link={Link}
              />
              <div className="omni-shell-user">
                <span className="omni-shell-avatar" aria-hidden="true">
                  {user.initials}
                </span>
                <span className="omni-shell-user-meta">
                  <span className="omni-shell-user-name">{user.name}</span>
                  <span className="omni-shell-user-role">{user.role}</span>
                </span>
              </div>
            </div>
          </header>
          <main className="omni-shell-content">{children}</main>
        </div>

        <Dialog.Portal container={shellElement}>
          <Dialog.Overlay className="omni-shell-scrim" />
          <Dialog.Content className="omni-shell-drawer" aria-describedby={undefined}>
            <Dialog.Title className="omni-shell-visually-hidden">{text.navigationDrawer}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton
                className="omni-shell-drawer-close"
                size="sm"
                label={text.closeNavigation}
                icon={<X aria-hidden="true" />}
              />
            </Dialog.Close>
            <SidebarBody {...sidebar} onNavigate={() => setDrawerOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

interface SidebarBodyProps {
  logo: ReactNode;
  navItems: SidebarItemData[] | undefined;
  navGroups: SidebarNavGroup[] | undefined;
  footerNav: SidebarItemData[] | undefined;
  tagline: string | undefined;
  text: AppShellLabels;
  Link: ElementType<ShellLinkProps>;
  /** Called after any nav item is activated; the drawer uses it to close. */
  onNavigate?: () => void;
}

/** The sidebar's content, rendered once in the desktop sidebar and once inside the drawer. */
function SidebarBody({ logo, navItems, navGroups, footerNav, tagline, text, Link, onNavigate }: SidebarBodyProps) {
  return (
    <>
      <div className="omni-shell-logo">{logo}</div>
      <div className="omni-shell-scroll">
        {navItems && navItems.length > 0 ? (
          <nav className="omni-shell-nav" aria-label={text.mainNavigation}>
            {navItems.map((item) => (
              <SidebarItem key={item.key} item={item} Link={Link} onNavigate={onNavigate} />
            ))}
          </nav>
        ) : null}

        {navGroups?.map((group) => (
          <nav key={group.key} className="omni-shell-nav omni-shell-nav--group" aria-label={group.label}>
            <p className="omni-shell-group-label">{group.label}</p>
            {group.items.map((item) => (
              <SidebarItem key={item.key} item={item} Link={Link} onNavigate={onNavigate} />
            ))}
          </nav>
        ))}
      </div>
      {footerNav ? (
        <nav className="omni-shell-nav omni-shell-nav--footer" aria-label={text.settings}>
          {footerNav.map((item) => (
            <SidebarItem key={item.key} item={item} Link={Link} onNavigate={onNavigate} />
          ))}
        </nav>
      ) : null}
      {tagline ? <p className="omni-shell-tagline">{tagline}</p> : null}
    </>
  );
}

function SidebarItem({
  item,
  Link,
  onNavigate,
}: {
  item: SidebarItemData;
  Link: ElementType<ShellLinkProps>;
  onNavigate: (() => void) | undefined;
}) {
  return (
    <Link
      href={item.href}
      className="omni-shell-nav-item"
      data-active={item.active ? 'true' : 'false'}
      aria-current={item.active ? 'page' : undefined}
      onClick={onNavigate}
    >
      <span className="omni-shell-nav-icon">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

const MAX_BADGE_COUNT = 99;

function NotificationsBell({
  label,
  unreadCount,
  onClick,
  href,
  Link,
}: {
  label: string;
  unreadCount: number | undefined;
  onClick: (() => void) | undefined;
  href: string | undefined;
  Link: ElementType<ShellLinkProps>;
}) {
  const badgeId = useId();
  const count = unreadCount !== undefined && Number.isFinite(unreadCount) ? Math.floor(unreadCount) : 0;
  const hasBadge = count > 0;

  const content = (
    <>
      <Bell size={18} aria-hidden="true" />
      {hasBadge ? (
        // Decorative for the label, but referenced as the bell's description so the count is still announced.
        <span id={badgeId} className="omni-shell-bell-badge" aria-hidden="true">
          {count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : count}
        </span>
      ) : null}
    </>
  );
  const shared = {
    className: 'omni-shell-bell',
    'aria-label': label,
    'aria-describedby': hasBadge ? badgeId : undefined,
    onClick,
  };

  return href ? (
    <Link href={href} {...shared}>
      {content}
    </Link>
  ) : (
    <button type="button" {...shared}>
      {content}
    </button>
  );
}
