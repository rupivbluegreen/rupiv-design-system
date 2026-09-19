import {
  useId,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ElementType,
  type ReactNode,
} from 'react';
import { Bell } from 'lucide-react';
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
}

const DEFAULT_LABELS: AppShellLabels = {
  mainNavigation: 'Main navigation',
  settings: 'Settings',
  searchPlaceholder: 'Search…',
  searchLabel: 'Global search',
  notifications: 'Notifications',
};

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

/** The desktop shell: sidebar, top search/notifications/user bar, scrollable content. */
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

  return (
    <div className="omni-shell">
      <aside className="omni-shell-sidebar">
        <div className="omni-shell-logo">{logo}</div>
        <div className="omni-shell-scroll">
          {navItems && navItems.length > 0 ? (
            <nav className="omni-shell-nav" aria-label={text.mainNavigation}>
              {navItems.map((item) => (
                <SidebarItem key={item.key} item={item} Link={Link} />
              ))}
            </nav>
          ) : null}

          {navGroups?.map((group) => (
            <nav key={group.key} className="omni-shell-nav omni-shell-nav--group" aria-label={group.label}>
              <p className="omni-shell-group-label">{group.label}</p>
              {group.items.map((item) => (
                <SidebarItem key={item.key} item={item} Link={Link} />
              ))}
            </nav>
          ))}
        </div>
        <div className="omni-shell-sidebar-spacer" />
        {footerNav ? (
          <nav className="omni-shell-nav omni-shell-nav--footer" aria-label={text.settings}>
            {footerNav.map((item) => (
              <SidebarItem key={item.key} item={item} Link={Link} />
            ))}
          </nav>
        ) : null}
        {tagline ? <p className="omni-shell-tagline">{tagline}</p> : null}
      </aside>

      <div className="omni-shell-main">
        <header className="omni-shell-topbar">
          {search ?? (
            <div className="omni-shell-search">
              <input type="text" placeholder={text.searchPlaceholder} aria-label={text.searchLabel} disabled />
            </div>
          )}
          <div className="omni-shell-topbar-actions">
            {headerExtra}
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
    </div>
  );
}

function SidebarItem({ item, Link }: { item: SidebarItemData; Link: ElementType<ShellLinkProps> }) {
  return (
    <Link
      href={item.href}
      className="omni-shell-nav-item"
      data-active={item.active ? 'true' : 'false'}
      aria-current={item.active ? 'page' : undefined}
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
