import { ExternalLink, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

import type { ReactNode } from 'react';

// Tailwind safelists
// text-primary
// text-secondary
// text-accent
// text-neutral
// text-success
// text-error
// text-warning
// text-info

interface CardProps {
  children?: ReactNode;
  title?: string;
  description?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'error' | 'warning' | 'info';
  coloredText?: boolean;
  Icon?: LucideIcon;
  left?: ReactNode;
  right?: ReactNode;
  link?: string;
  padding?: boolean;
}

function Card({
  children,
  title,
  description,
  color = 'primary',
  coloredText = false,
  Icon,
  left,
  right,
  link,
  padding = true,
}: CardProps) {
  return (

    <div className="card bg-base-100 shadow-md border border-base-300">
      <div className={`card-body ${padding ? '' : 'p-0'}`}>
        {title && (
          link
            ? (
                <Link
                  to={link}
                >
                  <div className={`flex items-center gap-2 ${description ? '' : (children ? 'mb-3' : 'mb-1')}`}>
                    <h5 className={`font-bold text-lg inline-flex items-center gap-2 text-${coloredText ? color : ''} ${link ? `link link-hover link-${color}` : ``}`}>
                      {Icon && <Icon size={17} className={`text-${color}`} />}
                      {title}
                      {
                        link
                        && <ExternalLink size={13} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                      }
                    </h5>
                    { left }
                    <span className="flex-1"></span>
                    { right }
                  </div>
                </Link>
              )
            : (
                <div>
                  <div className={`flex items-center gap-2 ${description ? '' : (children ? 'mb-3' : 'mb-1')}`}>
                    <h5 className={`font-bold text-lg inline-flex items-center gap-2 text-${coloredText ? color : ''}`}>
                      {Icon && <Icon size={17} className={'text-' + color} />}
                      {title}
                    </h5>
                    { left }
                    <span className="flex-1"></span>
                    { right }
                  </div>
                </div>
              )
        )}
        { description && (
          <p className={`text-sm opacity-70 ${children ? 'mb-3' : 'mb-1'}`}>
            {description}
          </p>
        ) }
        { children }
      </div>
    </div>
  );
};

export default Card;
