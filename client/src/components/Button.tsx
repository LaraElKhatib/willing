import Loading from './Loading';

import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// const _TAILWIND_SAFELIST = [
//   'btn-xs',
//   'btn-sm',
//   'btn-md',
//   'btn-lg',
//   'btn-xl',
//
//   'btn-primary',
//   'btn-secondary',
//   'btn-accent',
//   'btn-neutral',
//   'btn-success',
//   'btn-error',
//   'btn-warning',
//   'btn-info',
//   'btn-ghost',
//
//   'btn-soft',
//   'btn-outline',
//
//   'btn-block',
//   'btn-wide',
// ];

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'style'> {
  children?: ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'error' | 'warning' | 'info' | 'ghost';
  style?: 'soft' | 'outline';
  loading?: boolean;
  Icon?: LucideIcon;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  layout?: 'wide' | 'block';
}

const ICON_SIZES = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 22,
  xl: 24,
};

function Button({
  children,
  color,
  style,
  loading = false,
  disabled = false,
  Icon,
  className = '',
  size = 'md',
  layout,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${size} ${layout ? `btn-${layout}` : ''} ${color ? `btn-${color}` : ''} ${style ? `btn-${style}` : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {
        loading
          ? <Loading size={size} />
          : Icon
            ? <Icon size={ICON_SIZES[size]} />
            : null
      }
      {children}
    </button>
  );
}

export default Button;
