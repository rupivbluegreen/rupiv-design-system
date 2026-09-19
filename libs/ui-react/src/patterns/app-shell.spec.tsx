import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { AppShell, type AppShellProps, type ShellLinkProps } from './app-shell';

const user = { name: 'Sara', role: 'Planner', initials: 'S' };

const base: AppShellProps = {
  logo: 'ADPSS',
  user,
  navItems: [
    { key: 'home', label: 'Home', icon: <svg />, href: '/home', active: true },
    { key: 'rosters', label: 'Rosters', icon: <svg />, href: '/rosters' },
  ],
  footerNav: [{ key: 'cfg', label: 'Config', icon: <svg />, href: '/cfg' }],
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
    ).toBe('/rosters');
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
      expect.arrayContaining(['/home', '/rosters', '/cfg', '/inbox']),
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
});
