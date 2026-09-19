import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { AppShell, type AppShellProps, type ShellLinkProps } from './app-shell';

const user = { name: 'Sara', role: 'Planner', initials: 'S' };

const base: AppShellProps = {
  logo: 'ADPSS',
  user,
  navItems: [
    { key: 'home', label: 'Home', icon: <svg />, href: '#home', active: true },
    { key: 'rosters', label: 'Rosters', icon: <svg />, href: '#rosters' },
  ],
  footerNav: [{ key: 'cfg', label: 'Config', icon: <svg />, href: '#cfg' }],
  children: <p>Content</p>,
};

function bell(container: HTMLElement): HTMLElement {
  return container.querySelector('.omni-shell-bell') as HTMLElement;
}

function badge(container: HTMLElement): HTMLElement | null {
  return container.querySelector('.omni-shell-bell-badge');
}

describe('AppShell labels', () => {
  it('keeps the current English text when no labels are given', () => {
    render(<AppShell {...base} />);

    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByLabelText('Global search')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
  });

  it('leaves none of the English defaults in the DOM once every label is passed', () => {
    const { container } = render(
      <AppShell
        {...base}
        labels={{
          mainNavigation: 'التنقل الرئيسي',
          settings: 'الإعدادات',
          searchPlaceholder: 'بحث…',
          searchLabel: 'بحث عام',
          notifications: 'الإشعارات',
        }}
      />,
    );

    expect(screen.queryByLabelText('Main navigation')).toBeNull();
    expect(screen.queryByLabelText('Settings')).toBeNull();
    expect(screen.queryByLabelText('Global search')).toBeNull();
    expect(screen.queryByLabelText('Notifications')).toBeNull();
    expect(screen.queryByPlaceholderText('Search…')).toBeNull();
    expect(container.textContent).not.toMatch(
      /Main navigation|Settings|Global search|Notifications|Search…/,
    );
    expect(
      screen.getByRole('navigation', { name: 'التنقل الرئيسي' }),
    ).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'الإعدادات' })).toBeTruthy();
    expect(screen.getByLabelText('بحث عام')).toBeTruthy();
    expect(screen.getByPlaceholderText('بحث…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'الإشعارات' })).toBeTruthy();
  });

  it('overrides only the labels that are passed', () => {
    render(<AppShell {...base} labels={{ notifications: 'Inbox' }} />);

    expect(screen.getByRole('button', { name: 'Inbox' })).toBeTruthy();
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeTruthy();
  });

  it('ignores a label explicitly set to undefined', () => {
    render(<AppShell {...base} labels={{ notifications: undefined }} />);

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
  });
});

describe('AppShell unread count', () => {
  it.each([undefined, 0, -3, Number.NaN, 0.4])(
    'shows no badge and no dot for %s',
    (count) => {
      const { container } = render(<AppShell {...base} unreadCount={count} />);

      expect(badge(container)).toBeNull();
      expect(container.querySelector('.omni-shell-bell-dot')).toBeNull();
    },
  );

  it('shows the number when there are unread notifications', () => {
    const { container } = render(<AppShell {...base} unreadCount={5} />);

    expect(badge(container)?.textContent).toBe('5');
  });

  it('caps the badge at 99+', () => {
    const { container, rerender } = render(
      <AppShell {...base} unreadCount={99} />,
    );
    expect(badge(container)?.textContent).toBe('99');

    rerender(<AppShell {...base} unreadCount={100} />);
    expect(badge(container)?.textContent).toBe('99+');
  });

  it('announces the count as the bell description', () => {
    render(<AppShell {...base} unreadCount={5} />);

    const button = screen.getByRole('button', { name: 'Notifications' });
    const describedBy = button.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      '5',
    );
  });

  it('has no description when there is nothing unread', () => {
    render(<AppShell {...base} unreadCount={0} />);

    expect(
      screen
        .getByRole('button', { name: 'Notifications' })
        .getAttribute('aria-describedby'),
    ).toBeNull();
  });
});

describe('AppShell bell action', () => {
  it('calls onNotificationsClick', () => {
    const onClick = vi.fn();
    render(<AppShell {...base} onNotificationsClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a link when notificationsHref is given', () => {
    render(<AppShell {...base} notificationsHref="/notifications" />);

    const link = screen.getByRole('link', { name: 'Notifications' });
    expect(link.getAttribute('href')).toBe('/notifications');
    expect(screen.queryByRole('button', { name: 'Notifications' })).toBeNull();
  });

  it('renders a real button (not a form submit) by default', () => {
    const { container } = render(<AppShell {...base} />);

    expect(bell(container).tagName).toBe('BUTTON');
    expect(bell(container).getAttribute('type')).toBe('button');
  });
});

describe('AppShell navigation', () => {
  it('marks only the active item as the current page', () => {
    render(<AppShell {...base} />);

    expect(
      screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen
        .getByRole('link', { name: 'Rosters' })
        .getAttribute('aria-current'),
    ).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Config' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('renders plain anchors by default', () => {
    render(<AppShell {...base} />);

    expect(
      screen.getByRole('link', { name: 'Rosters' }).getAttribute('href'),
    ).toBe('#rosters');
  });

  it('renders nav items and the bell link through linkComponent', () => {
    const seen: string[] = [];
    function TestLink({ href, children, ...rest }: ShellLinkProps) {
      seen.push(href);
      return (
        <a href={href} data-via="router" {...rest}>
          {children}
        </a>
      );
    }
    render(
      <AppShell
        {...base}
        linkComponent={TestLink}
        notificationsHref="/inbox"
      />,
    );

    expect(seen).toEqual(
      expect.arrayContaining(['#home', '#rosters', '#cfg', '/inbox']),
    );
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    within(nav)
      .getAllByRole('link')
      .forEach((link) => expect(link.getAttribute('data-via')).toBe('router'));
    expect(
      screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current'),
    ).toBe('page');
  });

  it('shows group labels and names each group nav after its label', () => {
    render(
      <AppShell
        {...base}
        navItems={undefined}
        navGroups={[
          { key: 'plan', label: 'Planning', items: base.navItems ?? [] },
        ]}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Planning' })).toBeTruthy();
    expect(screen.getByText('Planning').className).toBe(
      'omni-shell-group-label',
    );
  });
});

describe('AppShell navigation drawer', () => {
  const openButton = () =>
    screen.getByRole('button', { name: 'Open navigation' });
  const dialog = () => screen.queryByRole('dialog');

  async function openDrawer() {
    fireEvent.click(openButton());
    return screen.findByRole('dialog');
  }

  // Radix registers its outside-pointer listener on the next tick.
  const settle = () =>
    act(() => new Promise((resolveTick) => setTimeout(resolveTick, 0)));

  it('starts closed: the menu button says so and there is no dialog', () => {
    render(<AppShell {...base} />);

    expect(openButton().getAttribute('aria-expanded')).toBe('false');
    expect(dialog()).toBeNull();
  });

  it('opens from the menu button and toggles aria-expanded', async () => {
    render(<AppShell {...base} />);

    const drawer = await openDrawer();

    expect(drawer.getAttribute('aria-modal')).toBeNull(); // Radix hides the rest with aria-hidden instead
    expect(
      within(drawer).getByRole('navigation', { name: 'Main navigation' }),
    ).toBeTruthy();
    expect(
      within(drawer)
        .getByRole('link', { name: 'Home' })
        .getAttribute('aria-current'),
    ).toBe('page');
    expect(
      within(drawer).getByRole('navigation', { name: 'Settings' }),
    ).toBeTruthy();
    expect(
      document
        .querySelector('.omni-shell-menu-button')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('names the dialog and its controls from labels, with English defaults', async () => {
    render(<AppShell {...base} />);

    const drawer = await openDrawer();

    expect(
      within(drawer).getByRole('button', { name: 'Close navigation' }),
    ).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBe(drawer);
  });

  it('leaves none of the drawer defaults once the labels are passed', async () => {
    render(
      <AppShell
        {...base}
        labels={{
          openNavigation: 'فتح القائمة',
          closeNavigation: 'إغلاق القائمة',
          navigationDrawer: 'القائمة',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'فتح القائمة' }));
    const drawer = await screen.findByRole('dialog', { name: 'القائمة' });

    expect(
      within(drawer).getByRole('button', { name: 'إغلاق القائمة' }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Open navigation')).toBeNull();
    expect(screen.queryByLabelText('Close navigation')).toBeNull();
    expect(screen.queryByText('Navigation')).toBeNull();
  });

  it('closes on Escape', async () => {
    render(<AppShell {...base} />);
    await openDrawer();

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });

    await waitFor(() => expect(dialog()).toBeNull());
    expect(openButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when the scrim is pressed', async () => {
    const { container } = render(<AppShell {...base} />);
    await openDrawer();
    await settle();

    // A real click is pointerdown then click; Radix finishes its outside-press logic on the click.
    const scrim = container.querySelector('.omni-shell-scrim') as HTMLElement;
    fireEvent.pointerDown(scrim);
    fireEvent.click(scrim);

    await waitFor(() => expect(dialog()).toBeNull());
  });

  it('closes from its close button', async () => {
    render(<AppShell {...base} />);
    const drawer = await openDrawer();

    fireEvent.click(
      within(drawer).getByRole('button', { name: 'Close navigation' }),
    );

    await waitFor(() => expect(dialog()).toBeNull());
  });

  it('closes when a nav item is clicked, and still lets the link through', async () => {
    render(<AppShell {...base} />);
    const drawer = await openDrawer();
    const onClick = vi.fn((event: MouseEvent) => event.preventDefault());
    document.addEventListener('click', onClick);

    fireEvent.click(within(drawer).getByRole('link', { name: 'Rosters' }));

    await waitFor(() => expect(dialog()).toBeNull());
    expect(onClick).toHaveBeenCalledTimes(1);
    document.removeEventListener('click', onClick);
  });

  it('returns focus to the menu button when it closes', async () => {
    render(<AppShell {...base} />);
    const drawer = await openDrawer();
    expect(drawer.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });

    await waitFor(() => expect(dialog()).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(openButton()));
  });

  it('locks page scroll while open and releases it on close', async () => {
    render(<AppShell {...base} />);
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);

    await openDrawer();
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(true);

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
  });

  it('closes if the viewport grows to desktop while it is open', async () => {
    let listener: ((event: { matches: boolean }) => void) | undefined;
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: (_: string, callback: typeof listener) =>
        (listener = callback),
      removeEventListener: () => (listener = undefined),
    })) as unknown as typeof window.matchMedia;
    try {
      render(<AppShell {...base} />);
      await openDrawer();
      expect(listener).toBeTypeOf('function');

      act(() => listener?.({ matches: false }));

      await waitFor(() => expect(dialog()).toBeNull());
    } finally {
      window.matchMedia = original;
    }
  });

  it('routes the drawer links through linkComponent too', async () => {
    function TestLink({ href, children, ...rest }: ShellLinkProps) {
      return (
        <a href={href} data-via="router" {...rest}>
          {children}
        </a>
      );
    }
    render(<AppShell {...base} linkComponent={TestLink} />);
    const drawer = await openDrawer();

    within(drawer)
      .getAllByRole('link')
      .forEach((link) => expect(link.getAttribute('data-via')).toBe('router'));
  });
});

describe('AppShell right-to-left', () => {
  it('renders inside a dir="rtl" container without throwing', () => {
    render(
      <div dir="rtl" lang="ar">
        <AppShell
          {...base}
          unreadCount={7}
          labels={{ notifications: 'الإشعارات', searchLabel: 'بحث' }}
        />
      </div>,
    );

    expect(screen.getByRole('button', { name: 'الإشعارات' })).toBeTruthy();
  });

  it('keeps the open drawer inside the dir="rtl" ancestor, so it is laid out right-to-left', async () => {
    render(
      <div dir="rtl" lang="ar">
        <AppShell {...base} labels={{ openNavigation: 'فتح القائمة' }} />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'فتح القائمة' }));
    const drawer = await screen.findByRole('dialog');

    expect(drawer.closest('[dir="rtl"]')).not.toBeNull();
    expect(drawer.closest('.omni-shell')).not.toBeNull();
  });
});

describe('app-shell.css', () => {
  // jsdom does not process CSS, so these rules are asserted on the source.
  const css = readFileSync(
    resolve(import.meta.dirname, 'app-shell.css'),
    'utf8',
  );

  it('drops the dead kbd rule and the 10px group label size', () => {
    expect(css).not.toMatch(/omni-shell-kbd/);
    expect(css).not.toMatch(/font-size:\s*1[01]px/);
    expect(css).toMatch(
      /\.omni-shell-group-label \{[^}]*font-size: var\(--tx-typography-size-caption\);/s,
    );
  });

  it('turns off letter-spacing and uppercase for Arabic group labels', () => {
    expect(css).toMatch(
      /\.omni-shell-group-label:lang\(ar\),\s*\[dir='rtl'\] \.omni-shell-group-label,\s*\.omni-shell-group-label\[dir='rtl'\] \{\s*letter-spacing: 0;\s*text-transform: none;/,
    );
  });

  it('has focus-visible styles for nav items and the bell, and a focus ring on the search box', () => {
    expect(css).toMatch(/\.omni-shell-nav-item:focus-visible \{[^}]*outline:/);
    expect(css).toMatch(/\.omni-shell-bell:focus-visible \{[^}]*outline:/);
    expect(css).toMatch(/\.omni-shell-search:focus-within \{[^}]*outline:/);
  });
  it('switches to the drawer below 1024px, so exactly 1024px stays desktop', () => {
    expect(css).toMatch(
      /@media \(max-width: 1023\.98px\) \{[^@]*\.omni-shell-sidebar \{ display: none; \}/,
    );
    expect(css).not.toMatch(/max-width:\s*1024px/);
  });

  it('keeps the desktop sidebar sticky and one viewport high', () => {
    expect(css).toMatch(
      /\.omni-shell-sidebar \{[^}]*position: sticky;[^}]*block-size: 100vh;/,
    );
  });

  it('draws the scrim from existing tokens with color-mix, not a raw colour', () => {
    expect(css).toContain(
      'background: color-mix(in srgb, var(--tx-color-text-primary) 40%, transparent);',
    );
    expect(css).not.toMatch(/rgba?\(|hsla?\(|#[0-9a-f]{3,8}\b/i);
  });

  it('slides the drawer on inset-inline-start, so RTL needs no transform override', () => {
    expect(css).toMatch(
      /@keyframes omni-shell-drawer-in \{ from \{ inset-inline-start: -18rem; \}/,
    );
    expect(css).not.toMatch(/(^|[\s;{])transform\s*:/);
  });

  it('turns the drawer and scrim animation off for reduced motion', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[^}]*\.omni-shell-scrim\[data-state\],\s*\.omni-shell-drawer\[data-state\] \{ animation: none; \}/,
    );
  });

  it('has narrow-phone topbar rules: shrinkable search, no user meta, header extra on its own row', () => {
    const phone = css.slice(css.indexOf('@media (max-width: 599.98px)'));
    expect(css).toMatch(/\.omni-shell-search \{[^}]*min-inline-size: 0;/);
    expect(phone).toMatch(/\.omni-shell-user-meta \{ display: none; \}/);
    expect(phone).toMatch(/\.omni-shell-header-extra \{[^}]*flex: 1 1 100%;/);
    expect(phone).toMatch(/\.omni-shell-topbar \{[^}]*flex-wrap: wrap;/);
  });

  it('lets the default search input shrink inside its box, so the topbar cannot overflow at 390px', () => {
    expect(css).toMatch(/\.omni-shell-search input \{[^}]*min-inline-size: 0;/);
  });

  it('gives the free sidebar height to the nav alone, with no competing flex spacer', () => {
    expect(css).not.toMatch(/omni-shell-sidebar-spacer/);
    const { container } = render(<AppShell {...base} />);
    expect(container.querySelector('.omni-shell-sidebar-spacer')).toBeNull();
  });
});
