import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from '../foundations/button';
import { EmptyState } from './empty-state';

function root(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

describe('EmptyState', () => {
  it('renders only what it is given: no built-in text', () => {
    const { container } = render(<EmptyState title="Nothing here" />);

    expect(container.textContent).toBe('Nothing here');
    expect(container.querySelector('.omni-empty-state-icon')).toBeNull();
    expect(container.querySelector('.omni-empty-state-description')).toBeNull();
    expect(container.querySelector('.omni-empty-state-action')).toBeNull();
  });

  it('renders the title, description, icon and action', () => {
    const { container } = render(
      <EmptyState
        icon={<svg data-testid="glyph" />}
        title="No cases yet"
        description="Cases appear here once they are received."
        action={<Button>Add case</Button>}
      />,
    );

    expect(screen.getByText('No cases yet')).toBeTruthy();
    expect(
      screen.getByText('Cases appear here once they are received.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add case' })).toBeTruthy();
    expect(
      container
        .querySelector('.omni-empty-state-icon')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(screen.getByTestId('glyph')).toBeTruthy();
  });

  it('lets the action work', () => {
    const onRetry = vi.fn();
    render(
      <EmptyState
        tone="red"
        title="Could not load"
        action={<Button onClick={onRetry}>Retry</Button>}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('is neutral by default and not announced', () => {
    const { container } = render(<EmptyState title="Empty" />);

    expect(root(container).className).toContain('omni-empty-state--neutral');
    expect(root(container).getAttribute('role')).toBeNull();
  });

  it('shows the red tone as an announced error', () => {
    const { container } = render(<EmptyState tone="red" title="Failed" />);

    expect(root(container).className).toContain('omni-empty-state--red');
    expect(screen.getByRole('alert').textContent).toBe('Failed');
  });

  it('keeps a caller role and className', () => {
    const { container } = render(
      <EmptyState tone="red" title="Failed" role="status" className="extra" />,
    );

    expect(root(container).getAttribute('role')).toBe('status');
    expect(root(container).className).toContain('extra');
  });

  it('renders Arabic content inside a right-to-left container', () => {
    render(
      <div dir="rtl" lang="ar">
        <EmptyState title="لا توجد بيانات" description="أضف أول عنصر" />
      </div>,
    );

    expect(screen.getByText('لا توجد بيانات')).toBeTruthy();
    expect(screen.getByText('أضف أول عنصر')).toBeTruthy();
  });
});
