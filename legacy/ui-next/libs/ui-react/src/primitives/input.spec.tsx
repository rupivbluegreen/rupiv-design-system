import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { Input } from './input';

describe('Input numeric', () => {
  it('forces left-to-right so numerals read the same on an Arabic page', () => {
    render(<Input numeric aria-label="Amount" />);

    const input = screen.getByLabelText('Amount');
    expect(input.getAttribute('dir')).toBe('ltr');
    expect(input.getAttribute('data-numeric')).toBe('true');
  });

  it('lets a caller-supplied dir win', () => {
    render(<Input numeric dir="rtl" aria-label="Amount" />);

    expect(screen.getByLabelText('Amount').getAttribute('dir')).toBe('rtl');
  });

  it('adds no dir or numeric marker to a text input', () => {
    render(<Input aria-label="Name" />);

    const input = screen.getByLabelText('Name');
    expect(input.getAttribute('dir')).toBeNull();
    expect(input.getAttribute('data-numeric')).toBeNull();
  });
});

describe('input.css numeric alignment', () => {
  // jsdom does not process CSS, so the rule is asserted on the source.
  const css = readFileSync(resolve(import.meta.dirname, 'input.css'), 'utf8');

  it('aligns to the end edge, which is the right edge because numeric inputs are ltr', () => {
    expect(css).toMatch(
      /\.omni-input\[data-numeric='true'\] \{[^}]*text-align: end;/,
    );
    expect(css).not.toMatch(/text-align:\s*(left|right)/);
  });
});
