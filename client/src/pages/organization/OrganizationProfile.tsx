import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { organizationAccountSchema } from '../../../../server/src/db/tables';
import { useOrganization } from '../../auth/useUsers';
import ColumnLayout from '../../components/layout/ColumnLayout';
import PageHeader from '../../components/layout/PageHeader';
import Loading from '../../components/Loading';
import LocationPicker from '../../components/LocationPicker';
import { executeAndShowError, FormField, FormRootError } from '../../utils/formUtils';
import requestServer from '../../utils/requestServer';

import type { OrganizationMeResponse } from '../../../../server/src/api/types';

const ORG_DESCRIPTION_MAX_LENGTH = 300;

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
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaveMessageVisible, setIsSaveMessageVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [position, setPosition] = useState<[number, number]>([33.90192863620578, 35.477959277880416]);

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
      setPosition([
        response.organization.latitude ?? 33.90192863620578,
        response.organization.longitude ?? 35.477959277880416,
      ]);
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

  const onMapPositionPick = useCallback((coords: [number, number], name?: string) => {
    setPosition(coords);
    form.setValue('latitude', coords[0]);
    form.setValue('longitude', coords[1]);

    if (name && !form.getFieldState('location_name').isDirty) {
      form.setValue('location_name', name);
    }
  }, [form]);

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
              latitude: position[0],
              longitude: position[1],
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
        setPosition([
          response.organization.latitude ?? position[0],
          response.organization.longitude ?? position[1],
        ]);
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
    setPosition([
      profile.organization.latitude ?? 33.90192863620578,
      profile.organization.longitude ?? 35.477959277880416,
    ]);
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

                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-2 block">Organization Description</label>
                          <textarea
                            id="organization-description"
                            className="textarea textarea-bordered w-full"
                            {...form.register('description')}
                            disabled={saving}
                            rows={5}
                            maxLength={ORG_DESCRIPTION_MAX_LENGTH}
                            placeholder="Describe your organization and impact."
                          />
                          <p
                            className={`block min-h-5 text-xs mt-1 ${
                              form.formState.errors.description ? 'text-error' : 'invisible'
                            }`}
                          >
                            {form.formState.errors.description?.message || 'placeholder'}
                          </p>
                          <p className="text-xs opacity-60 mt-1 text-right">
                            {formValues.description?.length || 0}
                            /
                            {ORG_DESCRIPTION_MAX_LENGTH}
                          </p>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-sm font-medium mb-2 block">Location on Map</label>
                          <LocationPicker
                            position={position}
                            setPosition={onMapPositionPick}
                            className="h-72"
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
                        <div className="rounded-box border border-base-300 p-3 md:col-span-2">
                          <p className="opacity-70 mb-2">Location on Map</p>
                          <LocationPicker
                            position={position}
                            setPosition={() => {}}
                            readOnly={true}
                            className="h-72"
                          />
                        </div>
                      </div>
                    )}
              </div>
            </div>

            {!isEditMode && (
              <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                  <h5 className="font-bold text-lg">Description</h5>
                  <p className="text-sm opacity-80 leading-relaxed mt-1">
                    {formValues.description?.trim() || 'No description added yet.'}
                  </p>
                </div>
              </div>
            )}

          </ColumnLayout>
        </div>
      </div>
    </div>
  );
}

export default OrganizationProfile;
