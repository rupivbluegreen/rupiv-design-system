"use client";

import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { useActivePath, useLabels, useLink } from "../../provider";
import { Drawer } from "./drawer";
import styles from "./nav-drawer.module.css";

/* ------------------------------------------------------------------ */
/* The navigation model, shared by RailShell (the rail) and NavDrawer  */
/* ------------------------------------------------------------------ */

export interface NavItem {
  /** Stable id of the item (a key, and the `data-shell-item` hook). */
  id: string;
  label: string;
  href: string;
  /**
   * A small marker after the label, for example a "view only" icon. Decorative unless `iconLabel` is given.
   * Draw it with a 14px icon; the shell sizes an svg inside it.
   */
  icon?: ReactNode;
  /** The text of the marker for a screen reader ("View only"). Without it the marker is hidden from assistive technology. */
  iconLabel?: string;
  /** A count or short text after the label. */
  badge?: string | number;
  /**
   * The heading of the run of items this one belongs to, inside its group. Items with the same heading in a row form a
   * run; an item with no heading joins the run before it. The first run of a group may have no heading.
   */
  section?: string;
  /** Force the active state. Leave it out and the item is active when the provider's `activePath` matches its `href`. */
  active?: boolean;
}

export interface NavGroup {
  id: string;
  /** The name of the group: the accessible name of its rail button and the title of its fly-out. */
  label: string;
  /** The icon of the group in the rail (a 22px svg such as a lucide icon). Default in the rail: the first letter of the label. */
  icon?: ReactNode;
  items: readonly NavItem[];
}

export interface NavBrand {
  /** Where the brand links to (the home page). */
  href: string;
  /** The product name: the accessible name of the link on the rail mark. */
  label: string;
  /** The short mark on the rail: two letters or a logo. */
  mark: ReactNode;
  /** The wordmark in the top bar and the title of the navigation drawer. Default: `label`. */
  name?: ReactNode;
  /** Small text after the wordmark in the top bar (the current console or section). Hidden below 640px. */
  context?: ReactNode;
}

export interface ResolvedItem {
  item: NavItem;
  active: boolean;
}

export interface ResolvedGroup {
  group: NavGroup;
  items: ResolvedItem[];
  /** True when one of the items is active. */
  active: boolean;
}

function pathOf(href: string): string {
  return href.split(/[?#]/)[0] ?? href;
}

function withoutTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/** A path is on `href` when it is that page or below it. The root ("/") matches itself only, or every page would. */
function isOnPath(current: string, href: string): boolean {
  if (href === "") return false;
  if (href === "/") return current === "/";
  return current === href || current.startsWith(`${href}/`);
}

/**
 * Decides which items are active. An item with `active` set keeps it. The others are active when the current path is
 * their `href` or below it, and only the item with the longest such `href` counts, so `/ops` is not active while
 * `/ops/forecast` is.
 */
export function resolveActive(groups: readonly NavGroup[], activePath: string): ResolvedGroup[] {
  const current = withoutTrailingSlash(pathOf(activePath));
  let best: string | undefined;
  if (current !== "") {
    for (const group of groups) {
      for (const item of group.items) {
        if (item.active !== undefined) continue;
        const href = withoutTrailingSlash(pathOf(item.href));
        if (isOnPath(current, href) && (best === undefined || href.length > best.length)) best = href;
      }
    }
  }
  return groups.map((group) => {
    const items = group.items.map((item) => ({
      item,
      active: item.active ?? (best !== undefined && withoutTrailingSlash(pathOf(item.href)) === best),
    }));
    return { group, items, active: items.some((entry) => entry.active) };
  });
}

export interface NavSection {
  heading: string | undefined;
  items: ResolvedItem[];
}

/** Cuts the items of a group into runs under their headings. */
export function sectionsOf(items: readonly ResolvedItem[]): NavSection[] {
  const sections: NavSection[] = [];
  for (const entry of items) {
    const last = sections[sections.length - 1];
    const heading = entry.item.section;
    if (last && (heading === undefined || heading === last.heading)) last.items.push(entry);
    else sections.push({ heading, items: [entry] });
  }
  return sections;
}

interface NavItemTailProps {
  item: NavItem;
  markerClassName: string | undefined;
  badgeClassName: string | undefined;
}

/** What follows the label of an item: its marker icon and its badge. */
export function NavItemTail({ item, markerClassName, badgeClassName }: NavItemTailProps) {
  return (
    <>
      {item.icon ? (
        item.iconLabel !== undefined ? (
          <span role="img" aria-label={item.iconLabel} className={markerClassName}>
            {item.icon}
          </span>
        ) : (
          <span aria-hidden="true" className={markerClassName}>
            {item.icon}
          </span>
        )
      ) : null}
      {item.badge !== undefined ? <span className={badgeClassName}>{item.badge}</span> : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* NavDrawer                                                           */
/* ------------------------------------------------------------------ */

export interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  groups: readonly NavGroup[];
  /** The title of the drawer: the wordmark. */
  title: ReactNode;
  /** The name of the navigation landmark. Default: the "railShell.nav" label. */
  navLabel?: string;
  className?: string | undefined;
}

/**
 * The rail as a drawer, for screens narrower than 1024px. It slides in from the inline start (the right edge in
 * Arabic) and lists the same groups as the rail, each as a section that opens and closes. The group with the active
 * item starts open (the first group when none is active). Focus trap, Escape, the scrim and returning focus to the
 * menu button are the Drawer's own. Choosing a link closes it.
 */
export function NavDrawer({ open, onClose, groups, title, navLabel, className }: NavDrawerProps) {
  const label = useLabels();
  const Link = useLink();
  const activePath = useActivePath();
  const baseId = useId();
  const resolved = useMemo(() => resolveActive(groups, activePath), [groups, activePath]);
  const [toggled, setToggled] = useState<Readonly<Record<string, boolean>>>({});
  const anyActive = resolved.some((entry) => entry.active);

  return (
    <Drawer open={open} onClose={onClose} title={title} side="start" className={cn(styles.panel, className)}>
      <div className={styles.bleed}>
        <nav aria-label={navLabel ?? label("railShell.nav")} className={styles.nav} data-shell="drawer-nav">
          {resolved.map(({ group, items, active }, index) => {
            const expanded = toggled[group.id] ?? (active || (!anyActive && index === 0));
            const panelId = `${baseId}-group-${index}`;
            return (
              <div key={group.id} className={styles.group}>
                <button
                  type="button"
                  className={styles.groupButton}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setToggled((previous) => ({ ...previous, [group.id]: !expanded }))}
                >
                  {group.icon ? (
                    <span className={styles.groupIcon} aria-hidden="true">
                      {group.icon}
                    </span>
                  ) : null}
                  <span className={styles.groupLabel}>{group.label}</span>
                  <ChevronDown className={styles.chevron} aria-hidden="true" />
                </button>
                <div id={panelId} hidden={!expanded}>
                  {sectionsOf(items).map((section, sectionIndex) => {
                    const headingId = section.heading !== undefined ? `${panelId}-heading-${sectionIndex}` : undefined;
                    return (
                      <div key={`${sectionIndex}-${section.heading ?? ""}`}>
                        {section.heading !== undefined ? (
                          <div id={headingId} className={styles.heading}>
                            {section.heading}
                          </div>
                        ) : null}
                        <ul role="list" className={styles.list} aria-labelledby={headingId}>
                          {section.items.map(({ item, active: itemActive }) => (
                            <li key={item.id}>
                              <Link
                                href={item.href}
                                className={styles.link}
                                aria-current={itemActive ? "page" : undefined}
                                data-shell-item={item.id}
                                onClick={onClose}
                              >
                                <span className={styles.linkLabel}>{item.label}</span>
                                <NavItemTail item={item} markerClassName={styles.marker} badgeClassName={styles.badge} />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </Drawer>
  );
}
