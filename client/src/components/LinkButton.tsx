import { Link } from 'react-router-dom';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface LinkButtonProps {
  children: ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'error' | 'warning' | 'info' | 'ghost';
  style?: 'soft' | 'outline';
  disabled?: boolean;
  to: string;
  Icon?: LucideIcon;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  layout?: 'wide' | 'block';
  state?: unknown;
}

const ICON_SIZES = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 22,
  xl: 24,
};

function LinkButton({
  children,
  color,
  style,
  disabled = false,
  to,
  Icon,
  className = '',
  size = 'md',
  layout,
  state,
}: LinkButtonProps) {
  return (
    <Link
      className={`btn btn-${size} ${color ? `btn-${color}` : ''} ${layout ? `btn-${layout}` : ''} ${style ? `btn-${style}` : ''} ${disabled ? 'btn-disabled pointer-events-none' : ''} ${className}`.trim()}
      to={to}
      state={state}
      aria-disabled={disabled}
    >
      {
        Icon
          ? <Icon size={ICON_SIZES[size]} />
          : null
      }
      { children }
    </Link>
  );
}

export default LinkButton;
