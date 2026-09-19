import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import './skeleton.css';

/** Keys of `--tx-radius-*`. */
export type SkeletonRadius = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'pill';

export interface SkeletonProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> {
  /** Any CSS length. Defaults to the full width of the container. */
  inlineSize?: CSSProperties['inlineSize'];
  /** Any CSS length. Defaults to one line of body text. */
  blockSize?: CSSProperties['blockSize'];
  /** Token key: `pill` with equal sizes gives a circle. */
  radius?: SkeletonRadius;
}

/**
 * A placeholder block for content that is still loading. It pulses in opacity,
 * which reads the same in both directions, and stands still under
 * `prefers-reduced-motion`. It is `aria-hidden`: mark the loading region with
 * `aria-busy="true"` (and a visible or screen-reader label) instead.
 */
export function Skeleton({
  inlineSize = '100%',
  blockSize = 'var(--tx-space-2)',
  radius = 'xs',
  className,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <span
      className={cn('omni-skeleton', className)}
      style={{
        inlineSize,
        blockSize,
        borderRadius: `var(--tx-radius-${radius})`,
        ...style,
      }}
      {...rest}
      aria-hidden="true"
    />
  );
}

export interface SkeletonTextProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** Number of lines, at least 1. */
  lines?: number;
  /** Width of the last line when there is more than one, so the block reads as a paragraph. */
  lastLineInlineSize?: CSSProperties['inlineSize'];
}

/** Placeholder lines for a paragraph or a card body. */
export function SkeletonText({
  lines = 3,
  lastLineInlineSize = '60%',
  className,
  ...rest
}: SkeletonTextProps) {
  const count = Math.max(1, Math.floor(lines));
  return (
    <div
      className={cn('omni-skeleton-text', className)}
      {...rest}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          blockSize="var(--tx-typography-size-body-md)"
          inlineSize={
            index === count - 1 && count > 1 ? lastLineInlineSize : '100%'
          }
        />
      ))}
    </div>
  );
}
