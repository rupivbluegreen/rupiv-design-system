"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { Bell, ChevronDown, ChevronsLeft, ChevronsRight, Menu } from "lucide-react";
import { cn } from "../../lib/cn";
import { useActivePath, useDir, useLabels, useLink } from "../../provider";
import { NavDrawer, NavItemTail, resolveActive, sectionsOf, type NavBrand, type NavGroup } from "./nav-drawer";
import styles from "./rail-shell.module.css";

/**
 * The application shell: a dark icon rail with fly-outs on the inline start, a top bar, the page in <main>, and below
 * 1024px a navigation drawer opened from a menu button in the top bar.
 *
 * It knows no application. The groups, the brand, the search box and the controls at the end of the top bar all come
 * from the application. It reads the provider (labels, link component, direction, active path) and takes an
 * `end` node that may hold functions, so a Server Component cannot render it: render it from a client file.
 * See docs/shell.md.
 */

export interface RailShellProps {
  /** One rail button per group; each opens a fly-out with the items of the group. The same groups fill the drawer. */
  groups: readonly NavGroup[];
  brand: NavBrand;
  /** The search box of the top bar, for example a <CommandPalette>. Not shown below 1024px. */
  search?: ReactNode;
  /** The end of the top bar (inline end): the application's own controls, for example a <NotificationsBell>. */
  end?: ReactNode;
  /** The page. */
  children?: ReactNode;
  /** The id of <main>, the target of the skip link. Default "main-content". */
  mainId?: string;
  /**
   * Whether the rail is labelled (icon + text, an inline accordion instead of a fly-out) rather than icon-only,
   * when the application owns the state. Pair it with `onExpandedChange`. Persisting the choice, if any, is the
   * application's: the shell holds no storage of its own.
   */
  expanded?: boolean | undefined;
  /** Whether the rail starts labelled, when it keeps its own state. Default false (icon-only). */
  defaultExpanded?: boolean | undefined;
  /** Called with the new value after the rail-width toggle is pressed, controlled or not. */
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
  className?: string | undefined;
}

/** Below this width the rail is hidden and the menu button opens the drawer (also in the CSS). */
const DESKTOP_QUERY = "(min-width: 1024px)";
/** Space kept between a fly-out and the bottom of the window, in px. */
const VIEWPORT_MARGIN = 8;

interface OpenFlyout {
  id: string;
  /** Opened by a click or the keyboard: stays until dismissed. Opened by the pointer alone: closes when it leaves. */
  pinned: boolean;
}

function groupElement(nav: HTMLElement | null, id: string): HTMLElement | undefined {
  if (!nav) return undefined;
  return Array.from(nav.querySelectorAll<HTMLElement>("[data-shell-group]")).find((el) => el.dataset["shellGroup"] === id);
}

/** Where a vertical arrow key, Home or End moves the focus in a list of `length` items. */
function stepIndex(current: number, length: number, key: string): number {
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  if (key === "ArrowDown") return (current + 1) % length;
  return (current - 1 + length) % length;
}

const STEP_KEYS: ReadonlySet<string> = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

export function RailShell({
  groups,
  brand,
  search,
  end,
  children,
  mainId = "main-content",
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  className,
}: RailShellProps) {
  const label = useLabels();
  const Link = useLink();
  const dir = useDir();
  const activePath = useActivePath();
  const baseId = useId();
  const navRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  /** True between an Enter or Space keydown on a rail button and the click it causes. */
  const keyboardActivation = useRef(false);
  /** The group whose first item gets the focus as soon as its fly-out is showing. */
  const focusFirstOf = useRef<string | null>(null);
  const [open, setOpen] = useState<OpenFlyout | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [innerExpanded, setInnerExpanded] = useState(defaultExpanded);
  const expanded = expandedProp ?? innerExpanded;
  const resolved = useMemo(() => resolveActive(groups, activePath), [groups, activePath]);
  const wordmark = brand.name ?? brand.label;
  const openId = open?.id;

  function setExpanded(next: boolean) {
    if (expandedProp === undefined) setInnerExpanded(next);
    onExpandedChange?.(next);
  }

  // Labelling the rail opens the active section's panel, so its siblings show without an extra click.
  useEffect(() => {
    if (!expanded) return;
    const activeId = resolved.find((entry) => entry.active)?.group.id;
    if (activeId === undefined) return;
    setOpen((current) => current ?? { id: activeId, pinned: true });
    // Deliberately only [expanded]: not every time resolved changes underneath it.
  }, [expanded]);

  // The fly-out lines up with its rail button and stays inside the window. Expanded: it is laid out
  // inline instead, so there is nothing to position.
  useLayoutEffect(() => {
    if (openId === undefined || expanded) return;
    const wrap = groupElement(navRef.current, openId);
    const flyout = wrap?.querySelector<HTMLElement>("[data-shell-flyout]");
    if (!wrap || !flyout) return;
    const top = wrap.getBoundingClientRect().top;
    const lowest = window.innerHeight - flyout.offsetHeight - VIEWPORT_MARGIN;
    flyout.style.setProperty("--flyout-top", `${top > lowest ? Math.max(VIEWPORT_MARGIN, lowest) : top}px`);
  }, [openId]);

  // Opened from the keyboard: the focus goes to the first item once the fly-out is showing.
  useEffect(() => {
    const id = focusFirstOf.current;
    if (id === null || openId !== id) return;
    focusFirstOf.current = null;
    groupElement(navRef.current, id)?.querySelector<HTMLElement>("[data-shell-item]")?.focus();
  }, [open, openId]);

  // A fly-out can always be dismissed: Escape (the focus goes back to its button) or a press outside the rail.
  useEffect(() => {
    if (openId === undefined) return;
    const id = openId;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const wrap = groupElement(navRef.current, id);
      if (wrap?.contains(document.activeElement)) wrap.querySelector<HTMLElement>("[data-shell-trigger]")?.focus();
      setOpen(null);
    }
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && navRef.current?.contains(event.target)) return;
      setOpen(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openId]);

  // The drawer belongs to narrow windows: widening the window closes it.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (query.matches) setDrawerOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function enterGroup(event: ReactPointerEvent<HTMLElement>, id: string) {
    if (event.pointerType === "touch") return;
    setOpen((previous) => (previous?.id === id && previous.pinned ? previous : { id, pinned: false }));
  }

  function leaveGroup(event: ReactPointerEvent<HTMLElement>, id: string) {
    if (event.pointerType === "touch") return;
    setOpen((previous) => (previous?.id === id && !previous.pinned ? null : previous));
  }

  // Focus left the button and the fly-out of a group that a click or a key had opened.
  function blurGroup(event: ReactFocusEvent<HTMLElement>, id: string) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setOpen((previous) => (previous?.id === id && previous.pinned ? null : previous));
  }

  function toggleGroup(id: string) {
    const fromKeyboard = keyboardActivation.current;
    keyboardActivation.current = false;
    if (open?.id === id && open.pinned) {
      setOpen(null);
      return;
    }
    focusFirstOf.current = fromKeyboard ? id : null;
    setOpen({ id, pinned: true });
  }

  function onNavKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const nav = navRef.current;
    const target = event.target;
    if (!nav || !(target instanceof HTMLElement)) return;
    // The fly-out is on the inline end of the rail: the right in English, the left in Arabic.
    const towardFlyout = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const towardRail = dir === "rtl" ? "ArrowRight" : "ArrowLeft";

    const trigger = target.closest<HTMLElement>("[data-shell-trigger]");
    if (trigger) {
      if (event.key === "Enter" || event.key === " ") {
        keyboardActivation.current = true;
      } else if (STEP_KEYS.has(event.key)) {
        const triggers = Array.from(nav.querySelectorAll<HTMLElement>("[data-shell-trigger]"));
        triggers[stepIndex(triggers.indexOf(trigger), triggers.length, event.key)]?.focus();
        event.preventDefault();
      } else if (event.key === towardFlyout) {
        const id = trigger.dataset["shellTrigger"];
        if (id !== undefined) {
          focusFirstOf.current = id;
          setOpen({ id, pinned: true });
        }
        event.preventDefault();
      }
      return;
    }

    const flyout = target.closest<HTMLElement>("[data-shell-flyout]");
    if (flyout && target.closest("[data-shell-item]")) {
      if (STEP_KEYS.has(event.key)) {
        const items = Array.from(flyout.querySelectorAll<HTMLElement>("[data-shell-item]"));
        items[stepIndex(items.indexOf(target), items.length, event.key)]?.focus();
        event.preventDefault();
      } else if (event.key === towardRail) {
        const id = flyout.dataset["shellFlyout"];
        if (id !== undefined) groupElement(nav, id)?.querySelector<HTMLElement>("[data-shell-trigger]")?.focus();
        setOpen(null);
        event.preventDefault();
      }
    }
  }

  function skipToMain(event: ReactMouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    mainRef.current?.focus();
  }

  return (
    <div className={cn(styles.shell, expanded && styles.shellExpanded, className)} data-shell="root">
      <a className={styles.skip} href={`#${mainId}`} onClick={skipToMain}>
        {label("railShell.skip")}
      </a>

      <div className={styles.rail} data-shell="rail">
        <Link href={brand.href} className={styles.railBrand} aria-label={brand.label} data-shell="brand">
          <span className={styles.railMark} translate="no">
            {brand.mark}
          </span>
        </Link>
        <nav ref={navRef} className={styles.railNav} aria-label={label("railShell.nav")} onKeyDown={onNavKeyDown}>
          <ul role="list" className={styles.railList}>
            {resolved.map(({ group, items, active }, index) => {
              const isOpen = openId === group.id;
              const flyoutId = `${baseId}-flyout-${index}`;
              const titleId = `${flyoutId}-title`;
              return (
                <li
                  key={group.id}
                  className={styles.itemWrap}
                  data-shell-group={group.id}
                  data-open={isOpen ? "true" : "false"}
                  onPointerEnter={(event) => enterGroup(event, group.id)}
                  onPointerLeave={(event) => leaveGroup(event, group.id)}
                  onBlur={(event) => blurGroup(event, group.id)}
                >
                  <button
                    type="button"
                    className={cn(styles.railItem, expanded && styles.railItemExpanded)}
                    data-shell-trigger={group.id}
                    data-active={active ? "true" : "false"}
                    aria-label={expanded ? undefined : group.label}
                    aria-expanded={isOpen}
                    aria-controls={flyoutId}
                    onPointerDown={() => {
                      keyboardActivation.current = false;
                    }}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span className={styles.railIcon} aria-hidden="true">
                      {group.icon ?? <span className={styles.initial}>{Array.from(group.label)[0] ?? ""}</span>}
                    </span>
                    {expanded ? (
                      <>
                        <span className={styles.railLabel}>{group.label}</span>
                        <ChevronDown
                          className={cn(styles.chevron, isOpen && styles.chevronOpen)}
                          aria-hidden="true"
                        />
                      </>
                    ) : null}
                  </button>
                  <div
                    id={flyoutId}
                    className={cn(styles.flyout, expanded && styles.flyoutInline)}
                    role="group"
                    aria-labelledby={titleId}
                    hidden={!isOpen}
                    data-shell-flyout={group.id}
                  >
                    <div id={titleId} className={cn(styles.flyoutTitle, expanded && styles.flyoutTitleHidden)}>
                      {group.label}
                    </div>
                    {sectionsOf(items).map((section, sectionIndex) => {
                      const headingId = section.heading !== undefined ? `${flyoutId}-heading-${sectionIndex}` : undefined;
                      return (
                        <div key={`${sectionIndex}-${section.heading ?? ""}`}>
                          {section.heading !== undefined ? (
                            <div id={headingId} className={cn(styles.flyoutHeading, expanded && styles.flyoutHeadingInline)}>
                              {section.heading}
                            </div>
                          ) : null}
                          <ul role="list" className={styles.flyoutList} aria-labelledby={headingId}>
                            {section.items.map(({ item, active: itemActive }) => (
                              <li key={item.id}>
                                <Link
                                  href={item.href}
                                  className={cn(styles.flyoutItem, expanded && styles.flyoutItemInline)}
                                  aria-current={itemActive ? "page" : undefined}
                                  data-shell-item={item.id}
                                  onClick={() => setOpen(null)}
                                >
                                  <span className={styles.itemLabel}>{item.label}</span>
                                  <NavItemTail item={item} markerClassName={styles.marker} badgeClassName={styles.badge} />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={styles.railFoot}>
          <button
            type="button"
            className={cn(styles.railItem, expanded && styles.railItemExpanded)}
            aria-label={expanded ? undefined : label("railShell.railExpand")}
            aria-pressed={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            <span className={styles.railIcon} aria-hidden="true">
              {expanded ? <ChevronsLeft /> : <ChevronsRight />}
            </span>
            {expanded ? <span className={styles.railLabel}>{label("railShell.railCollapse")}</span> : null}
          </button>
        </div>
      </div>

      <div className={styles.column}>
        <header className={styles.topbar} data-shell="topbar">
          <button
            type="button"
            className={cn(styles.iconButton, styles.menuButton)}
            aria-label={label("railShell.menuOpen")}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>
          <Link href={brand.href} className={styles.brand}>
            <span className={styles.wordmark} translate="no">
              {wordmark}
            </span>
            {brand.context ? <span className={styles.context}>{brand.context}</span> : null}
          </Link>
          {search ? <div className={styles.search}>{search}</div> : null}
          <div className={styles.end}>{end}</div>
        </header>
        <main id={mainId} ref={mainRef} tabIndex={-1} className={styles.main} data-shell="main">
          {children}
        </main>
      </div>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} groups={groups} title={wordmark} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NotificationsBell                                                   */
/* ------------------------------------------------------------------ */

export type NotificationsBellProps = {
  /** Unread notifications. Zero shows no badge; above 99 the badge reads "99+". The badge always uses Western digits. */
  unreadCount: number;
  className?: string | undefined;
} & (
  | { href: string; onClick?: undefined }
  | { href?: undefined; onClick: () => void }
  // Neither: the bell only shows the count. It is a plain, non-focusable element, not a button that does nothing.
  | { href?: undefined; onClick?: undefined }
);

/**
 * The bell of the top bar, with a count of unread items. Give it `href` to make it a link (through the provider's link
 * component) or `onClick` to make it a button. With neither it is not interactive: a plain element with the same
 * accessible name, which Tab skips, so a person never lands on a control that does nothing. Its accessible name carries
 * the count ("Notifications: 3 unread"); the number on the badge is hidden from screen readers so it is not read twice.
 * Put it in the `end` slot of the RailShell.
 */
export function NotificationsBell({ unreadCount, href, onClick, className }: NotificationsBellProps) {
  const label = useLabels();
  const Link = useLink();
  const unread = Number.isFinite(unreadCount) ? Math.max(0, Math.trunc(unreadCount)) : 0;
  const name =
    unread > 0 ? label("railShell.notificationsUnread", { count: unread }) : label("railShell.notifications");
  const content = (
    <>
      <Bell aria-hidden="true" />
      {unread > 0 ? (
        <span className={styles.count} aria-hidden="true" data-shell="bell-count">
          {unread > 99 ? "99+" : String(unread)}
        </span>
      ) : null}
    </>
  );
  const classes = cn(styles.iconButton, className);
  if (href !== undefined) {
    return (
      <Link href={href} className={classes} aria-label={name} data-shell="bell">
        {content}
      </Link>
    );
  }
  if (onClick !== undefined) {
    return (
      <button type="button" className={classes} aria-label={name} onClick={onClick} data-shell="bell">
        {content}
      </button>
    );
  }
  return (
    <span role="img" className={cn(classes, styles.inert)} aria-label={name} data-shell="bell">
      {content}
    </span>
  );
}
