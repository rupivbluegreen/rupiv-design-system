import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import './surface.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}

/** The standard container for a page section — a rounded, softly-elevated card on the page surface. */
export function Card({ children, padding = 'md', className, ...rest }: CardProps) {
  return (
    <div className={['omni-card', `omni-card--${padding}`, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function Stack({
  gap = '2',
  children,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { gap?: '0-5' | '1' | '1-5' | '2' | '3' | '4' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `var(--tx-space-${gap})`, ...style }} {...rest}>
      {children}
    </div>
  );
}

export function Inline({
  gap = '2',
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  children,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  gap?: '0-5' | '1' | '1-5' | '2' | '3' | '4';
  align?: CSSProperties['alignItems'];
  justify?: CSSProperties['justifyContent'];
  wrap?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        gap: `var(--tx-space-${gap})`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
