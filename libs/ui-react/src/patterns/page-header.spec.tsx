import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Button } from '../foundations/button';
import { StatusBadge } from '../foundations/status-badge';
import { PageHeader } from './page-header';

const trail = [
  { label: 'Rosters', href: '/rosters' },
  { label: 'Riyadh', href: '/rosters/riyadh' },
  { label: 'Week 38' },
];

describe('PageHeader', () => {
  it('renders the title as the page h1', () => {
    render(<PageHeader title="Forecast Explorer" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Forecast Explorer' }),
    ).toBeTruthy();
  });

  it('renders the subtitle only when given', () => {
    const { rerender, container } = render(
      <PageHeader title="Rosters" subtitle="Week 38" />,
    );
    expect(screen.getByText('Week 38')).toBeTruthy();

    rerender(<PageHeader title="Rosters" />);
    expect(container.querySelector('.omni-page-header-subtitle')).toBeNull();
  });

  it('has no breadcrumb nav and no other text unless given', () => {
    const { container } = render(<PageHeader title="Only title" />);

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(container.textContent).toBe('Only title');
  });

  describe('breadcrumbs', () => {
    it('names the nav from the breadcrumbLabel prop', () => {
      render(
        <PageHeader
          title="Week 38"
          breadcrumbs={trail}
          breadcrumbLabel="مسار التنقل"
        />,
      );

      expect(
        screen.getByRole('navigation', { name: 'مسار التنقل' }),
      ).toBeTruthy();
    });

    it('adds no accessible name of its own when breadcrumbLabel is omitted', () => {
      render(<PageHeader title="Week 38" breadcrumbs={trail} />);

      expect(
        screen.getByRole('navigation').getAttribute('aria-label'),
      ).toBeNull();
    });

    it('links the earlier crumbs and marks the last one as the current page', () => {
      render(
        <PageHeader
          title="Week 38"
          breadcrumbs={trail}
          breadcrumbLabel="Trail"
        />,
      );
      const nav = screen.getByRole('navigation', { name: 'Trail' });

      const links = within(nav).getAllByRole('link');
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/rosters',
        '/rosters/riyadh',
      ]);
      const current = within(nav).getByText('Week 38');
      expect(current.getAttribute('aria-current')).toBe('page');
      expect(current.closest('a')).toBeNull();
    });

    it('renders a crumb without href as plain text', () => {
      render(
        <PageHeader
          title="Detail"
          breadcrumbs={[{ label: 'Admin' }, { label: 'Users' }]}
        />,
      );

      expect(screen.queryAllByRole('link')).toHaveLength(0);
      expect(screen.getByText('Admin').getAttribute('aria-current')).toBeNull();
    });

    it('mirrors the chevrons in right-to-left and skips the one after the current page', () => {
      const { container } = render(
        <PageHeader title="Week 38" breadcrumbs={trail} />,
      );
      const separators = container.querySelectorAll(
        '.omni-page-header-crumb-separator',
      );

      expect(separators).toHaveLength(2);
      separators.forEach((separator) => {
        expect(separator.getAttribute('class')).toContain(
          'tx-directional-icon',
        );
        expect(separator.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });

  it('renders the meta slot beside the title', () => {
    render(
      <PageHeader
        title="Forecast"
        meta={<StatusBadge tone="blue">Synthetic</StatusBadge>}
      />,
    );

    expect(screen.getByText('Synthetic')).toBeTruthy();
  });

  it('renders working actions', () => {
    const onExport = vi.fn();
    render(
      <PageHeader
        title="Rosters"
        actions={<Button onClick={onExport}>Export</Button>}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('keeps a caller className and attributes', () => {
    const { container } = render(
      <PageHeader title="X" className="extra" data-testid="ph" />,
    );
    const header = container.firstElementChild as HTMLElement;

    expect(header.className).toBe('omni-page-header extra');
    expect(header.getAttribute('data-testid')).toBe('ph');
  });

  it('renders inside a right-to-left container without throwing', () => {
    render(
      <div dir="rtl" lang="ar">
        <PageHeader
          title="مستكشف التوقعات"
          subtitle="الأسبوع 38"
          breadcrumbs={[
            { label: 'الجداول', href: '/rosters' },
            { label: 'الرياض' },
          ]}
          breadcrumbLabel="مسار التنقل"
          actions={<Button>تصدير</Button>}
        />
      </div>,
    );

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'مستكشف التوقعات',
    );
  });
});

describe('page-header.css', () => {
  // jsdom does not process CSS, so the two typography rules are asserted on the source.
  const css = readFileSync(
    resolve(import.meta.dirname, 'page-header.css'),
    'utf8',
  );

  it('sets the display font to regular weight and wraps on narrow widths', () => {
    expect(css).toMatch(
      /\.omni-page-header-title \{[^}]*font-family: var\(--tx-typography-font-display\);[^}]*font-weight: var\(--tx-typography-weight-regular\);/s,
    );
    expect(css).toMatch(/\.omni-page-header \{[^}]*flex-wrap: wrap;/s);
  });

  it('switches the title to the Arabic family under :lang(ar) and [dir=rtl]', () => {
    expect(css).toMatch(
      /\.omni-page-header-title:lang\(ar\),\s*\[dir='rtl'\] \.omni-page-header-title,\s*\.omni-page-header-title\[dir='rtl'\] \{[^}]*font-family: var\(--tx-typography-font-arabic\);/s,
    );
  });
});
