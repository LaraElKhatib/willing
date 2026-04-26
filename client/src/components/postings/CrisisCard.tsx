import { AlertTriangle, Pin } from 'lucide-react';
import { type ReactNode } from 'react';

import Card from '../Card.tsx';
import { CARD_BADGES, CARD_COLORS } from './cardSemantics';

import type { Crisis } from '../../../../server/src/db/tables/index.ts';

type CrisisCardProps = {
  crisis: Crisis;
  link?: string;
  descriptionFallback?: string;
  right?: ReactNode;
  children?: ReactNode;
};

function CrisisCard({
  crisis,
  link,
  descriptionFallback = 'No crisis details were added for this event yet.',
  right,
  children,
}: CrisisCardProps) {
  return (
    <Card
      title={crisis.name}
      description={crisis.description || descriptionFallback}
      color={CARD_COLORS.crisis}
      coloredText={true}
      Icon={AlertTriangle}
      link={link ?? `/volunteer/crises/${crisis.id}/postings`}
      right={right ?? (crisis.pinned
        ? (
            <span className={CARD_BADGES.crisis}>
              <Pin size={12} />
              Pinned
            </span>
          )
        : undefined)}
    >
      {children}
    </Card>
  );
}

export default CrisisCard;
