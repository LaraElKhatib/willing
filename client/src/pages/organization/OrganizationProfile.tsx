import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Mail, MapPin, Phone, Compass, Calendar, Clock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { organizationAccountSchema } from '../../../../server/src/db/tables';
import { useOrganization } from '../../auth/useUsers';
import ColumnLayout from '../../components/layout/ColumnLayout';
import PageHeader from '../../components/layout/PageHeader';
import Loading from '../../components/Loading';
import SkillsList from '../../components/skills/SkillsList';
import { executeAndShowError, FormField, FormRootError } from '../../utils/formUtils';
import requestServer from '../../utils/requestServer';

import type { OrganizationMeResponse, OrganizationPostingListResponse } from '../../../../server/src/api/types';

const profileFormSchema = organizationAccountSchema.omit({
  id: true,
  password: true,
  email: true,
  name: true,
  url: true,
  org_vector: true,
  created_at: true,
  updated_at: true,
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

function OrganizationProfile() {
  const organizationFromAuth = useOrganization();
  const [profile, setProfile] = useState<OrganizationMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [postingsError, setPostingsError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaveMessageVisible, setIsSaveMessageVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [postings, setPostings] = useState<OrganizationPostingListResponse['postings']>([]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onTouched',
    defaultValues: {
      phone_number: '',
      description: '',
      location_name: '',
      latitude: undefined,
      longitude: undefined,
    },
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await requestServer<OrganizationMeResponse>(
        '/organization/me',
        { includeJwt: true },
      );
      setProfile(response);
      form.reset({
        phone_number: response.organization.phone_number,
        description: response.organization.description ?? '',
        location_name: response.organization.location_name,
        latitude: response.organization.latitude,
        longitude: response.organization.longitude,
      });

      try {
        setPostingsError(null);
        const postingsResponse = await requestServer<OrganizationPostingListResponse>(
          '/organization/posting',
          { includeJwt: true },
        );
        setPostings(postingsResponse.postings);
      } catch (error) {
        setPostings([]);
        setPostingsError(error instanceof Error ? error.message : 'Failed to load postings');
      }
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to load organization profile');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!saveMessage) return;
    setIsSaveMessageVisible(true);

    const fadeTimeout = setTimeout(() => {
      setIsSaveMessageVisible(false);
    }, 2400);

    const removeTimeout = setTimeout(() => {
      setSaveMessage(null);
    }, 3000);

    return () => {
      clearTimeout(fadeTimeout);
      clearTimeout(removeTimeout);
    };
  }, [saveMessage]);

  const formValues = form.watch();

  const initials = useMemo(() => {
    const words = (profile?.organization.name ?? '').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('');
  }, [profile?.organization.name]);

  const recentPostings = useMemo(
    () => [...postings]
      .sort((left, right) => {
        const leftTs = new Date(left.created_at).getTime();
        const rightTs = new Date(right.created_at).getTime();
        return rightTs - leftTs;
      })
      .slice(0, 3),
    [postings],
  );

  const organizationSummary = useMemo(() => {
    const location = formValues.location_name || profile?.organization.location_name;
    const hasWebsite = Boolean(profile?.organization.url);
    const description = formValues.description?.trim();
    if (description) return description;

    if (!location && !hasWebsite) {
      return 'Keep your profile updated so volunteers can understand your organization at a glance.';
    }

    return [
      `Based in ${location || 'the region'}.`,
      hasWebsite
        ? 'Actively recruiting volunteers through Willing.'
        : 'Share your website to strengthen your profile trust and visibility.',
    ].join(' ');
  }, [formValues.description, formValues.location_name, profile?.organization.location_name, profile?.organization.url]);

  const onSave = form.handleSubmit(async (data) => {
    if (!isEditMode) return;

    await executeAndShowError(form, async () => {
      try {
        setSaving(true);
        setSaveMessage(null);

        const response = await requestServer<OrganizationMeResponse>(
          '/organization/profile',
          {
            method: 'PUT',
            body: {
              phone_number: data.phone_number,
              description: data.description,
              location_name: data.location_name,
              latitude: data.latitude,
              longitude: data.longitude,
            },
            includeJwt: true,
          },
        );

        setProfile(response);
        form.reset({
          phone_number: response.organization.phone_number,
          description: response.organization.description ?? '',
          location_name: response.organization.location_name,
          latitude: response.organization.latitude,
          longitude: response.organization.longitude,
        });
        setSaveMessage('Profile changes saved.');
        setIsEditMode(false);
      } finally {
        setSaving(false);
      }
    });
  });

  const onCancelEdit = useCallback(() => {
    if (!profile) return;

    form.reset({
      phone_number: profile.organization.phone_number,
      description: profile.organization.description ?? '',
      location_name: profile.organization.location_name,
      latitude: profile.organization.latitude,
      longitude: profile.organization.longitude,
    });
    setIsEditMode(false);
    setSaveMessage(null);
    form.clearErrors();
  }, [form, profile]);

  if (loading) {
    return (
      <div className="grow bg-base-200">
        <div className="p-6 md:container mx-auto">
          <div className="flex justify-center mt-8">
            <Loading size="xl" />
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="grow bg-base-200">
        <div className="p-6 md:container mx-auto">
          <div role="alert" className="alert alert-error">
            <span>{fetchError}</span>
          </div>
          <button className="btn btn-outline mt-4" onClick={loadProfile}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="grow bg-base-200">
        <div className="p-6 md:container mx-auto">
          <div role="alert" className="alert alert-warning">
            <span>Profile not found.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grow bg-base-200">
      <div className="p-6 md:container mx-auto">
        <PageHeader
          title="Profile"
          subtitle="Manage your organization profile details."
          actions={(
            <>
              {isEditMode
                ? (
                    <button className="btn btn-outline" onClick={onCancelEdit} disabled={saving}>
                      Cancel
                    </button>
                  )
                : (
                    <button className="btn btn-outline" onClick={() => setIsEditMode(true)}>
                      Edit Profile
                    </button>
                  )}
              {isEditMode && (
                <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </>
          )}
        />

        {saveMessage && (
          <div
            role="alert"
            className={`alert alert-success mt-4 transition-all duration-500 ${
              isSaveMessageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
            }`}
          >
            <span>{saveMessage}</span>
          </div>
        )}

        <FormRootError form={form} />

        <div className="mt-4">
          <ColumnLayout
            sidebar={(
              <div className="card bg-base-100 shadow-md mt-4">
                <div className="card-body">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary text-primary-content rounded-full w-20 h-20 flex items-center justify-center">
                      <span className="text-2xl">{initials || 'O'}</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{profile.organization.name || organizationFromAuth?.name || 'Organization'}</h4>
                      <span className="badge badge-primary badge-sm mt-1 gap-1">
                        <Building2 size={12} />
                        Organization
                      </span>
                    </div>
                  </div>

                  <div className="divider my-4" />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="opacity-70 flex items-center gap-2">
                        <Mail size={14} />
                        Email
                      </span>
                      <span className="font-medium text-right break-all">{profile.organization.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="opacity-70 flex items-center gap-2">
                        <MapPin size={14} />
                        Location
                      </span>
                      <span className="font-medium text-right">{formValues.location_name || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          >
            <div className="card bg-base-100 shadow-md mt-4">
              <div className="card-body">
                <h5 className="font-bold text-lg">Organization Details</h5>
                <p className="text-sm opacity-70 mt-1">Keep your information accurate for volunteers.</p>

                {isEditMode
                  ? (
                      <div className={`mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 ${saving ? 'pointer-events-none opacity-70' : ''}`}>
                        <FormField form={form} name="phone_number" label="Phone Number" Icon={Phone} />
                        <FormField form={form} name="location_name" label="Location Name" Icon={MapPin} />

                        <fieldset className="fieldset w-full">
                          <label className="label">
                            <span className="label-text font-medium">Latitude</span>
                          </label>
                          <div className="relative">
                            <Compass className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 z-10" size={18} />
                            <input
                              type="number"
                              step="any"
                              className={`input input-bordered w-full focus:input-primary pl-10 ${
                                form.formState.errors.latitude ? 'input-error' : ''
                              }`}
                              placeholder="Latitude"
                              {...form.register('latitude', {
                                setValueAs: (value) => {
                                  if (value === '' || value === null || value === undefined) return undefined;
                                  const parsed = Number(value);
                                  return Number.isNaN(parsed) ? undefined : parsed;
                                },
                              })}
                            />
                          </div>
                          {form.formState.errors.latitude?.message && (
                            <p className="text-error text-sm mt-1">{form.formState.errors.latitude.message}</p>
                          )}
                        </fieldset>

                        <fieldset className="fieldset w-full">
                          <label className="label">
                            <span className="label-text font-medium">Longitude</span>
                          </label>
                          <div className="relative">
                            <Compass className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 z-10" size={18} />
                            <input
                              type="number"
                              step="any"
                              className={`input input-bordered w-full focus:input-primary pl-10 ${
                                form.formState.errors.longitude ? 'input-error' : ''
                              }`}
                              placeholder="Longitude"
                              {...form.register('longitude', {
                                setValueAs: (value) => {
                                  if (value === '' || value === null || value === undefined) return undefined;
                                  const parsed = Number(value);
                                  return Number.isNaN(parsed) ? undefined : parsed;
                                },
                              })}
                            />
                          </div>
                          {form.formState.errors.longitude?.message && (
                            <p className="text-error text-sm mt-1">{form.formState.errors.longitude.message}</p>
                          )}
                        </fieldset>

                        <div className="md:col-span-2">
                          <FormField
                            form={form}
                            name="description"
                            label="Organization Description"
                            type="textarea"
                            Icon={Building2}
                            placeholder="Describe your organization and impact."
                          />
                        </div>
                      </div>
                    )
                  : (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="rounded-box border border-base-300 p-3">
                          <p className="opacity-70">Organization Name</p>
                          <p className="font-semibold mt-1">{profile.organization.name || '-'}</p>
                        </div>
                        <div className="rounded-box border border-base-300 p-3">
                          <p className="opacity-70">Phone Number</p>
                          <p className="font-semibold mt-1">{formValues.phone_number || '-'}</p>
                        </div>
                        <div className="rounded-box border border-base-300 p-3">
                          <p className="opacity-70">Website URL</p>
                          <a
                            href={profile.organization.url || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold mt-1 text-primary break-all inline-block"
                          >
                            {profile.organization.url || '-'}
                          </a>
                        </div>
                        <div className="rounded-box border border-base-300 p-3">
                          <p className="opacity-70">Location Name</p>
                          <p className="font-semibold mt-1">{formValues.location_name || '-'}</p>
                        </div>
                        <div className="rounded-box border border-base-300 p-3">
                          <p className="opacity-70">Latitude</p>
                          <p className="font-semibold mt-1">
                            {formValues.latitude !== undefined ? formValues.latitude : '-'}
                          </p>
                        </div>
                        <div className="rounded-box border border-base-300 p-3">
                          <p className="opacity-70">Longitude</p>
                          <p className="font-semibold mt-1">
                            {formValues.longitude !== undefined ? formValues.longitude : '-'}
                          </p>
                        </div>
                        <div className="rounded-box border border-base-300 p-3 md:col-span-2">
                          <p className="opacity-70">Organization Description</p>
                          <p className="font-semibold mt-1 whitespace-pre-wrap break-words">
                            {formValues.description || 'No description added yet.'}
                          </p>
                        </div>
                      </div>
                    )}
              </div>
            </div>

            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h5 className="font-bold text-lg">About Organization</h5>
                <p className="text-sm opacity-80 leading-relaxed mt-1">
                  {organizationSummary}
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h5 className="font-bold text-lg">Most Recent Postings</h5>
                <p className="text-sm opacity-70 mt-1">Latest opportunities from your organization.</p>

                {postingsError && (
                  <div role="alert" className="alert alert-warning mt-3">
                    <span>{postingsError}</span>
                  </div>
                )}

                {!postingsError && recentPostings.length === 0 && (
                  <div className="alert alert-soft mt-3">
                    <span className="text-sm">No postings created yet.</span>
                  </div>
                )}

                <div className="space-y-3 mt-3">
                  {recentPostings.map(posting => (
                    <article key={posting.id} className="rounded-box border border-base-300 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h6 className="font-semibold text-base">{posting.title}</h6>
                          <p className="text-sm opacity-80 mt-1 line-clamp-3 whitespace-pre-wrap break-words">
                            {posting.description}
                          </p>
                        </div>
                        <span className={`badge ${posting.is_closed ? 'badge-error' : 'badge-primary'}`}>
                          {posting.is_closed ? 'Closed' : 'Open'}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-sm opacity-80">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={14} />
                          {posting.location_name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(posting.start_timestamp).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(posting.start_timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {posting.skills.length > 0 && (
                        <div className="mt-3">
                          <SkillsList skills={posting.skills.map(skill => skill.name)} />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </ColumnLayout>
        </div>
      </div>
    </div>
  );
}

export default OrganizationProfile;
