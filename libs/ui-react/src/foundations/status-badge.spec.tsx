import { render, screen } from '@testing-library/react';
import { MetricDelta, StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders its label with the tone modifier class', () => {
    render(<StatusBadge tone="orange">Delayed</StatusBadge>);

    const badge = screen.getByText('Delayed');
    expect(badge.className).toContain('omni-status-badge--orange');
  });
});

describe('MetricDelta', () => {
  it('shows an up arrow, the absolute value and the suffix for a positive change', () => {
    render(<MetricDelta value={12} />);

    expect(screen.getByText(/↑\s*12%/)).toBeTruthy();
  });

  it('flips the colour, not the arrow, when a rising value is bad', () => {
    render(<MetricDelta value={3} upIsGood={false} />);

    const delta = screen.getByText(/↑\s*3%/);
    expect(delta.className).toContain('omni-metric-delta--bad');
  });
});
