import { SERVER_BASE_URL } from '../../utils/requestServer.ts';
import Card from '../Card.tsx';

import type { VolunteerOrganizationSearchResult } from '../../../../server/src/api/types.ts';

type OrganizationCardProps = {
  organization: VolunteerOrganizationSearchResult;
};

function OrganizationCard({ organization }: OrganizationCardProps) {
  const logoUrl = organization.logo_path
    ? `${SERVER_BASE_URL}/organization/${organization.id}/logo`
    : null;

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="avatar avatar-placeholder shrink-0">
          {logoUrl
            ? (
                <div className="w-12 h-12 rounded-full overflow-hidden ring-1 ring-base-300 bg-base-100 flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt={`${organization.name} logo`}
                    className="h-full w-full object-contain"
                  />
                </div>
              )
            : (
                <div className="bg-primary text-primary-content w-12 h-12 rounded-full flex items-center justify-center">
                  {organization.name.slice(0, 2).toUpperCase()}
                </div>
              )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold">
            <a href={`/organization/${organization.id}`} className="link link-primary link-hover no-underline hover:underline">
              {organization.name}
            </a>
          </h3>
          <p className="text-sm text-base-content/70 mt-1">
            {organization.location_name || 'Location not set'}
          </p>
        </div>

        <span className="badge badge-secondary text-sm py-2 whitespace-nowrap">
          {organization.posting_count}
          {' '}
          postings
        </span>
      </div>

      <p className="text-sm text-base-content/70 mt-3 line-clamp-3 ml-1">
        {organization.description || 'No description provided.'}
      </p>
    </Card>
  );
}

export default OrganizationCard;
