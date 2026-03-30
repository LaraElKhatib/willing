import { Pin } from 'lucide-react';

import Card from '../Card.tsx';

import type { Crisis } from '../../../../server/src/db/tables/index.ts';

type CrisisCardProps = {
  crisis: Crisis;
};

function CrisisCard({ crisis }: CrisisCardProps) {
  return (
    <Card
      title={crisis.name}
      description={crisis.description || 'No crisis description provided.'}
      link={`/volunteer/crises/${crisis.id}/postings`}
      right={crisis.pinned ? <Pin size={16} className="text-primary" /> : undefined}
    />
  );
}

export default CrisisCard;
