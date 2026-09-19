import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'start',
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={['omni-button', `omni-button--${variant}`, `omni-button--${size}`, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon && iconPosition === 'start' ? <span className="omni-button-icon">{icon}</span> : null}
      {children}
      {icon && iconPosition === 'end' ? <span className="omni-button-icon">{icon}</span> : null}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <button
      aria-label={label}
      className={['omni-icon-button', `omni-icon-button--${size}`, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon}
    </button>
  );
}
