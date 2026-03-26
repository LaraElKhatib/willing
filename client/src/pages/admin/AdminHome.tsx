import { AlertCircle, ArrowRight, ClipboardCheck, LayoutDashboard } from 'lucide-react';
import { useCallback } from 'react';

import Card from '../../components/Card';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import LinkButton from '../../components/LinkButton';
import requestServer from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type {
  AdminCrisesResponse,
  AdminOrganizationRequestsResponse,
} from '../../../../server/src/api/types';

function AdminHome() {
  const getOrganizationRequests = useCallback(async () => {
    const res = await requestServer<AdminOrganizationRequestsResponse>('/admin/getOrganizationRequests', { includeJwt: true });
    return res.organizationRequests;
  }, []);

  const getCrises = useCallback(async () => {
    const res = await requestServer<AdminCrisesResponse>('/admin/crises', { includeJwt: true });
    return res.crises;
  }, []);

  const { data: organizationRequests } = useAsync(getOrganizationRequests, { immediate: true });
  const { data: crises } = useAsync(getCrises, { immediate: true });

  const pinnedCrises = crises?.filter(crisis => crisis.pinned) ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Quick overview of requests and active crises."
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Organization Requests"
          description="Review incoming organization applications and approve or reject requests."
          Icon={ClipboardCheck}
          right={
            !organizationRequests
              ? <div className="skeleton w-16 h-6" />
              : (
                  <span className="badge badge-primary">
                    {organizationRequests.length}
                    {' '}
                    Pending
                  </span>
                )
          }
        >
          <LinkButton
            to="/admin/requests"
            style="outline"
            size="sm"
            Icon={ArrowRight}
            className="ml-auto"
          >
            Open Requests
          </LinkButton>
        </Card>
        <Card
          title="Crisis"
          description={
            crises === undefined
              ? 'Loading pinned crises...'
              : pinnedCrises.length > 0
                ? `Pinned (${pinnedCrises.length}): ${pinnedCrises.map(crisis => crisis.name).join(', ')}`
                : 'No pinned crisis at the moment.'
          }
          Icon={AlertCircle}
          right={
            !crises
              ? <div className="skeleton w-16 h-6" />
              : (
                  <span className="badge badge-secondary">
                    {crises.length}
                    {' '}
                    Total
                  </span>
                )
          }
        >
          <LinkButton
            to="/admin/crises"
            style="outline"
            size="sm"
            Icon={ArrowRight}
            className="ml-auto"
          >
            Open Crises
          </LinkButton>
        </Card>
      </div>
    </PageContainer>
  );
}

export default AdminHome;
