import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ClipboardList, Flag, Globe, Mail, MapPin, Phone, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import zod from 'zod';

import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/IconButton';
import ColumnLayout from '../components/layout/ColumnLayout';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';
import LocationPicker from '../components/LocationPicker';
import OrganizationProfilePicture from '../components/OrganizationProfilePicture';
import PostingCollection from '../components/postings/PostingCollection';
import PostingViewModeToggle from '../components/postings/PostingViewModeToggle';
import { FormField, FormRootError } from '../utils/formUtils';
import requestServer from '../utils/requestServer';
import useAsync from '../utils/useAsync';

import type { OrganizationProfileResponse } from '../../../server/src/api/types';
import type { PostingWithContext } from '../../../server/src/types';

const reportOrganizationSchema = zod.object({
  title: zod.enum(['scam', 'impersonation', 'harassment', 'inappropriate_behavior', 'other']),
  message: zod.string().trim().min(1, 'Message is required').max(1000, 'Message must be at most 1000 characters'),
});

type ReportOrganizationFormData = zod.infer<typeof reportOrganizationSchema>;

function OrganizationProfile() {
  const { id } = useParams<{ id: string }>();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const reportForm = useForm<ReportOrganizationFormData>({
    resolver: zodResolver(reportOrganizationSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      title: 'scam',
      message: '',
    },
  });

  const { data, loading, error } = useAsync(
    async () => {
      if (!id) throw new Error('Organization ID is required');
      const response = await requestServer<OrganizationProfileResponse>(
        `/organization/${id}`,
        {
          method: 'GET',
          includeJwt: false,
        },
      );
      return response;
    },
    { immediate: !!id },
  );

  const closeReportModal = () => {
    setReportModalOpen(false);
    reportForm.reset({
      title: 'scam',
      message: '',
    });
  };

  const postingsWithContext = useMemo<PostingWithContext[]>(() => {
    if (!data) return [];

    return data.postings.map(posting => ({
      ...posting,
      organization_name: data.organization.name,
      organization_logo_path: data.organization.logo_path,
      crisis_name: null,
      enrollment_count: 0,
      application_status: 'none',
    }));
  }, [data]);

  if (!id) {
    return (
      <div className="flex flex-col min-h-screen bg-base-200">
        <div className="grow">
          <div className="p-6 md:container mx-auto">
            <div className="text-sm text-base-content/70">Invalid organization ID</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Organization Profile"
        subtitle="View organization details and available opportunities"
        icon={Building2}
        showBack
        defaultBackTo="/"
        actions={(
          <Button
            color="error"
            style="outline"
            type="button"
            Icon={Flag}
            onClick={() => setReportModalOpen(true)}
          >
            Report organization
          </Button>
        )}
      />

      {error && <div className="mb-4 text-sm text-base-content/70">Unable to load organization profile.</div>}

      {loading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {!loading && data && (
        <ColumnLayout
          sidebar={(
            <>
              <Card>
                <div className="flex flex-col items-center text-center">
                  <OrganizationProfilePicture
                    organizationName={data.organization.name}
                    organizationId={data.organization.id}
                    logoPath={data.organization.logo_path}
                    size={96}
                  />
                  <h2 className="text-2xl font-bold mt-4">
                    {data.organization.name}
                  </h2>
                </div>
                <div className="divider my-4" />

                <div className="space-y-4">
                  {data.organization.location_name && (
                    <div className="flex gap-3">
                      <MapPin
                        size={20}
                        className="text-primary shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-xs opacity-70 font-semibold mb-0.5">
                          LOCATION
                        </p>
                        <p className="text-sm">
                          {data.organization.location_name}
                        </p>
                      </div>
                    </div>
                  )}

                  {data.organization.email && (
                    <div className="flex gap-3">
                      <Mail
                        size={20}
                        className="text-primary shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-xs opacity-70 font-semibold mb-0.5">
                          EMAIL
                        </p>
                        <a
                          href={`mailto:${data.organization.email}`}
                          className="link link-primary text-sm break-all"
                        >
                          {data.organization.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {data.organization.phone_number && (
                    <div className="flex gap-3">
                      <Phone
                        size={20}
                        className="text-primary shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-xs opacity-70 font-semibold mb-0.5">
                          PHONE
                        </p>
                        <a
                          href={`tel:${data.organization.phone_number}`}
                          className="link link-primary text-sm"
                        >
                          {data.organization.phone_number}
                        </a>
                      </div>
                    </div>
                  )}

                  {data.organization.url && (
                    <div className="flex gap-3">
                      <Globe
                        size={20}
                        className="text-primary shrink-0 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-xs opacity-70 font-semibold mb-0.5">
                          WEBSITE
                        </p>
                        <a
                          href={data.organization.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-primary text-sm break-all"
                        >
                          {data.organization.url}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {(data.organization.latitude && data.organization.longitude) && (
                <Card
                  title="Location"
                  description="Organization location on map."
                  Icon={MapPin}
                >
                  <LocationPicker
                    position={[
                      data.organization.latitude,
                      data.organization.longitude,
                    ]}
                    setPosition={() => {}}
                    readOnly={true}
                  />
                </Card>
              )}
            </>
          )}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <h3 className="text-2xl font-bold tracking-tight">
                Postings
              </h3>
              <span className="badge badge-lg badge-primary">
                {postingsWithContext.length}
              </span>

              <div className="ml-auto">
                <PostingViewModeToggle />
              </div>
            </div>

            {postingsWithContext.length === 0
              ? (
                  <EmptyState
                    Icon={ClipboardList}
                    title="No active opportunities right now"
                    description="This organization has no active postings at the moment."
                  />
                )
              : (
                  <PostingCollection
                    postings={postingsWithContext}
                    variant="organization"
                    cardsContainerClassName="grid grid-cols-1 gap-6 md:grid-cols-2"
                    listContainerClassName="space-y-4"
                  />
                )}
          </div>
        </ColumnLayout>
      )}

      <div className={`modal ${reportModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box border border-base-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">Report Organization</h3>
            <IconButton
              type="button"
              Icon={X}
              onClick={closeReportModal}
              aria-label="Close report modal"
              title="Close"
            />
          </div>

          <form className="space-y-2">
            <FormField
              form={reportForm}
              name="title"
              label="Report Type"
              selectOptions={[
                { label: 'Scam', value: 'scam' },
                { label: 'Impersonation', value: 'impersonation' },
                { label: 'Harassment', value: 'harassment' },
                { label: 'Inappropriate behavior', value: 'inappropriate_behavior' },
                { label: 'Other', value: 'other' },
              ]}
            />

            <FormField
              form={reportForm}
              name="message"
              label="Message"
              type="textarea"
              placeholder="Describe what happened and why you are reporting this organization"
            />

            <FormRootError form={reportForm} />
          </form>
        </div>
        <div className="modal-backdrop" onClick={closeReportModal}>Close</div>
      </div>
    </PageContainer>
  );
}

export default OrganizationProfile;
