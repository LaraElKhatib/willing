import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import IconButton from '../IconButton';

type HorizontalScrollSectionProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  hasItems: boolean;
  emptyState?: ReactNode;
  children?: ReactNode;
  orientation?: 'horizontal' | 'vertical';
};

function HorizontalScrollSection({
  title,
  subtitle,
  action,
  hasItems,
  emptyState,
  children,
  orientation = 'horizontal',
}: HorizontalScrollSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showStartFade, setShowStartFade] = useState(false);
  const [showEndFade, setShowEndFade] = useState(false);
  const showHorizontalControls = orientation === 'horizontal';

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasItems || orientation !== 'horizontal') {
      setShowStartFade(false);
      setShowEndFade(false);
      return undefined;
    }

    const updateFades = () => {
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      setShowStartFade(container.scrollLeft > 8);
      setShowEndFade(maxScrollLeft - container.scrollLeft > 8);
    };

    updateFades();
    container.addEventListener('scroll', updateFades, { passive: true });

    const resizeObserver = new ResizeObserver(updateFades);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateFades);
      resizeObserver.disconnect();
    };
  }, [children, hasItems, orientation]);

  const scrollByPage = (direction: -1 | 1) => {
    const container = scrollContainerRef.current;
    if (!container || orientation !== 'horizontal') return;

    container.scrollBy({
      left: direction * Math.max(container.clientWidth * 0.85, 280),
      behavior: 'smooth',
    });
  };

  return (
    <section className="space-y-4">
      <div className={showHorizontalControls ? 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' : undefined}>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="mt-1 opacity-70">{subtitle}</p>
          )}
        </div>

        {showHorizontalControls && (
          <div className="flex items-center gap-2 self-start">
            {action}
            <IconButton
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={!hasItems}
              aria-label={`Scroll ${title} left`}
              Icon={ChevronLeft}
            >
            </IconButton>
            <IconButton
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={!hasItems}
              aria-label={`Scroll ${title} right`}
              Icon={ChevronRight}
            >
            </IconButton>
          </div>
        )}
      </div>

      {hasItems
        ? (
            <div className="relative">
              <div
                ref={scrollContainerRef}
                className={orientation === 'horizontal'
                  ? 'flex gap-4 overflow-x-scroll overflow-y-hidden py-3 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                  : 'flex flex-col gap-3 py-3'}
              >
                {children}
              </div>

              {orientation === 'horizontal' && (
                <>
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-base-200 via-base-200/80 to-transparent transition-opacity duration-200 ${
                      showStartFade ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-base-200 via-base-200/80 to-transparent transition-opacity duration-200 ${
                      showEndFade ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </>
              )}
            </div>
          )
        : emptyState}

      {!showHorizontalControls && action && (
        <div className="pt-1">
          {action}
        </div>
      )}
    </section>
  );
}

export default HorizontalScrollSection;
