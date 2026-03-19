import Loading from './Loading';

import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'style'> {
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'error' | 'warning' | 'info' | 'ghost';
  style?: 'soft' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  Icon: LucideIcon;
  className?: string;
}

const ICON_SIZES = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 22,
  xl: 24,
};

function IconButton({
  color = 'ghost',
  style,
  loading = false,
  disabled = false,
  Icon,
  className = '',
  size = 'md',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`btn btn-${size} btn-square btn-${color} ${style ? `btn-${style}` : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {
        loading
          ? <Loading size={size} />
          : <Icon size={ICON_SIZES[size]} />
      }
    </button>
  );
}

export default IconButton;
