import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonText } from './skeleton';

function firstElement(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

describe('Skeleton', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(<Skeleton />);

    expect(firstElement(container).getAttribute('aria-hidden')).toBe('true');
  });

  it('cannot be un-hidden by a caller', () => {
    const { container } = render(<Skeleton aria-hidden={false} />);

    expect(firstElement(container).getAttribute('aria-hidden')).toBe('true');
  });

  it('fills the container by default and uses the small radius token', () => {
    const { container } = render(<Skeleton />);
    const { style } = firstElement(container);

    expect(style.getPropertyValue('inline-size')).toBe('100%');
    expect(style.getPropertyValue('block-size')).toBe('var(--tx-space-2)');
    expect(style.borderRadius).toBe('var(--tx-radius-xs)');
  });

  it('maps inlineSize, blockSize and radius to logical size properties and a radius token', () => {
    const { container } = render(
      <Skeleton inlineSize="8rem" blockSize={24} radius="pill" />,
    );
    const { style } = firstElement(container);

    expect(style.getPropertyValue('inline-size')).toBe('8rem');
    expect(style.getPropertyValue('block-size')).toBe('24px');
    expect(style.borderRadius).toBe('var(--tx-radius-pill)');
  });

  it('keeps a caller className and extra attributes', () => {
    const { container } = render(<Skeleton className="extra" data-x="1" />);
    const element = firstElement(container);

    expect(element.className).toBe('omni-skeleton extra');
    expect(element.getAttribute('data-x')).toBe('1');
  });

  it('only animates opacity and switches the animation off for reduced motion', () => {
    const css = readFileSync(
      resolve(import.meta.dirname, 'skeleton.css'),
      'utf8',
    );

    expect(css).toMatch(/@keyframes omni-skeleton-pulse/);
    expect(css).not.toMatch(/transform|translate|background-position/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.omni-skeleton\s*\{\s*animation: none;/,
    );
  });
});

describe('SkeletonText', () => {
  it('renders three lines by default, the last one shorter', () => {
    const { container } = render(<SkeletonText />);
    const lines = container.querySelectorAll<HTMLElement>('.omni-skeleton');

    expect(lines).toHaveLength(3);
    expect(lines[0]?.style.getPropertyValue('inline-size')).toBe('100%');
    expect(lines[2]?.style.getPropertyValue('inline-size')).toBe('60%');
  });

  it('keeps a single line full width and clamps the count to at least one', () => {
    const { container } = render(<SkeletonText lines={0} />);
    const lines = container.querySelectorAll<HTMLElement>('.omni-skeleton');

    expect(lines).toHaveLength(1);
    expect(lines[0]?.style.getPropertyValue('inline-size')).toBe('100%');
  });

  it('is hidden from assistive technology', () => {
    const { container } = render(<SkeletonText lines={2} />);

    expect(firstElement(container).getAttribute('aria-hidden')).toBe('true');
  });
});
