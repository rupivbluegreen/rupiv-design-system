import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button, IconButton } from './button';

describe('Button', () => {
  it('renders its label and calls onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).not.toHaveBeenCalled();
    expect(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('passes aria-disabled through to the DOM for the styles to key on', () => {
    render(<Button aria-disabled="true">Save</Button>);

    expect(
      screen
        .getByRole('button', { name: 'Save' })
        .getAttribute('aria-disabled'),
    ).toBe('true');
  });

  it('keeps variant and size classes', () => {
    render(
      <Button variant="ghost" size="sm">
        Skip
      </Button>,
    );

    const { className } = screen.getByRole('button', { name: 'Skip' });
    expect(className).toContain('omni-button--ghost');
    expect(className).toContain('omni-button--sm');
  });
});

describe('IconButton', () => {
  it('takes its accessible name from label and honours disabled', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Close" icon={<svg />} disabled onClick={onClick} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('button.css disabled styles', () => {
  // jsdom does not process CSS, so the rules are asserted on the source.
  const css = readFileSync(resolve(import.meta.dirname, 'button.css'), 'utf8');
  const block = css.slice(css.indexOf('/* Unavailable'));

  it.each([
    '.omni-button:disabled',
    ".omni-button[aria-disabled='true']",
    '.omni-icon-button:disabled',
    ".omni-icon-button[aria-disabled='true']",
  ])('styles %s', (selector) => {
    expect(block).toContain(selector);
  });

  it('uses token colours and a not-allowed cursor, and no opacity', () => {
    expect(block).toContain('cursor: not-allowed;');
    expect(block).toContain('color: var(--tx-color-text-tertiary);');
    expect(block).toContain('background: var(--tx-color-surface-subtle);');
    expect(block).toContain('border-color: var(--tx-color-border-subtle);');
    expect(block).not.toMatch(/opacity\s*:/);
    expect(block).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });

  it('cancels the primary hover brightening', () => {
    expect(block).toContain('filter: none;');
  });
});
