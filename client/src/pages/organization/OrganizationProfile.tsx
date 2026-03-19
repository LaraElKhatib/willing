import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ImageUp, Mail, MapPin, Phone, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { newOrganizationCertificateInfoSchema, organizationAccountSchema } from '../../../../server/src/db/tables';
import { useOrganization } from '../../auth/useUsers';
import ColumnLayout from '../../components/layout/ColumnLayout';
import PageHeader from '../../components/layout/PageHeader';
import Loading from '../../components/Loading';
import LocationPicker from '../../components/LocationPicker';
import { ToggleButton } from '../../components/ToggleButton';
import { executeAndShowError, FormField, FormRootError } from '../../utils/formUtils';
import requestServer, { SERVER_BASE_URL } from '../../utils/requestServer';

import type {
  DeleteCertificateSignatureResponse,
  GetCertificateInfoResponse,
  OrganizationDeleteLogoResponse,
  OrganizationMeResponse,
  OrganizationUploadLogoResponse,
  UpdateCertificateInfoResponse,
  UploadCertificateSignatureResponse,
} from '../../../../server/src/api/types';

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

const certificateFormSchema = newOrganizationCertificateInfoSchema.pick({
  certificate_feature_enabled: true,
  signatory_name: true,
  signatory_position: true,
}).extend({
  hours_threshold: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return null;
      if (typeof value === 'number') return value;
      return Number(value);
    },
    z.number().int().min(0, 'Hours threshold must be >= 0').nullable(),
  ),
  hasLogo: z.boolean(),
  hasSignature: z.boolean(),
}).superRefine((data, ctx) => {
  if (!data.certificate_feature_enabled) return;

  if (!data.hasLogo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['certificate_feature_enabled'],
      message: 'Organization profile picture is required to enable certificates.',
    });
  }
  if (data.hours_threshold === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hours_threshold'],
      message: 'Hours threshold is required when certificate feature is enabled.',
    });
  }
  if (!data.signatory_name?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['signatory_name'],
      message: 'Signatory name is required when certificate feature is enabled.',
    });
  }
  if (!data.signatory_position?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['signatory_position'],
      message: 'Signatory position is required when certificate feature is enabled.',
    });
  }
  if (!data.hasSignature) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hasSignature'],
      message: 'Signature image is required when certificate feature is enabled.',
    });
  }
});

type ProfileFormData = z.infer<typeof profileFormSchema>;
type CertificateFormData = z.infer<typeof certificateFormSchema>;

function OrganizationProfile() {
  const organizationFromAuth = useOrganization();
  const [profile, setProfile] = useState<OrganizationMeResponse | null>(null);
  const [certificateInfo, setCertificateInfo] = useState<GetCertificateInfoResponse['certificateInfo']>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaveMessageVisible, setIsSaveMessageVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [position, setPosition] = useState<[number, number]>([33.90192863620578, 35.477959277880416]);
  const [logoBusy, setLogoBusy] = useState(false);
  const [signatureBusy, setSignatureBusy] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);

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

  const certificateForm = useForm<CertificateFormData>({
    resolver: zodResolver(certificateFormSchema),
    mode: 'onTouched',
    defaultValues: {
      certificate_feature_enabled: false,
      hours_threshold: null,
      signatory_name: '',
      signatory_position: '',
      hasLogo: false,
      hasSignature: false,
    },
  });

  const resetFormsFromData = useCallback((
    organizationResponse: OrganizationMeResponse,
    certificateInfoResponse: GetCertificateInfoResponse['certificateInfo'],
  ) => {
    form.reset({
      phone_number: organizationResponse.organization.phone_number,
      description: organizationResponse.organization.description ?? '',
      location_name: organizationResponse.organization.location_name,
      latitude: organizationResponse.organization.latitude,
      longitude: organizationResponse.organization.longitude,
    });
    certificateForm.reset({
      certificate_feature_enabled: certificateInfoResponse?.certificate_feature_enabled ?? false,
      hours_threshold: certificateInfoResponse?.hours_threshold ?? null,
      signatory_name: certificateInfoResponse?.signatory_name ?? '',
      signatory_position: certificateInfoResponse?.signatory_position ?? '',
      hasLogo: Boolean(organizationResponse.organization.logo_path),
      hasSignature: Boolean(certificateInfoResponse?.signature_path),
    });
    setPosition([
      organizationResponse.organization.latitude ?? 33.90192863620578,
      organizationResponse.organization.longitude ?? 35.477959277880416,
    ]);
  }, [form, certificateForm]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      setSaveError(null);

      const [organizationResponse, certificateResponse] = await Promise.all([
        requestServer<OrganizationMeResponse>(
          '/organization/me',
          { includeJwt: true },
        ),
        requestServer<GetCertificateInfoResponse>(
          '/organization/certificate-info',
          { includeJwt: true },
        ),
      ]);

      setProfile(organizationResponse);
      setCertificateInfo(certificateResponse.certificateInfo);
      resetFormsFromData(organizationResponse, certificateResponse.certificateInfo);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to load organization profile');
    } finally {
      setLoading(false);
    }
  }, [resetFormsFromData]);

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
  const certificateValues = certificateForm.watch();

  const initials = useMemo(() => {
    const words = (profile?.organization.name ?? '').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('');
  }, [profile?.organization.name]);

  const logoUrl = useMemo(() => {
    if (!profile?.organization.logo_path) return '';
    return `${SERVER_BASE_URL}/organization/${profile.organization.id}/logo?v=${logoVersion}`;
  }, [logoVersion, profile]);

  const onMapPositionPick = useCallback((coords: [number, number], name?: string) => {
    setPosition(coords);
    form.setValue('latitude', coords[0]);
    form.setValue('longitude', coords[1]);

    if (name && !form.getFieldState('location_name').isDirty) {
      form.setValue('location_name', name);
    }
  }, [form]);

  const onUploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLogoBusy(true);
      setSaveError(null);
      setSaveMessage(null);

      const formData = new FormData();
      formData.append('logo', file);

      const response = await requestServer<OrganizationUploadLogoResponse>(
        '/organization/logo',
        {
          method: 'POST',
          body: formData,
          includeJwt: true,
        },
      );

      setProfile(response);
      certificateForm.setValue('hasLogo', true, { shouldValidate: true });
      setLogoVersion(prev => prev + 1);
      setSaveMessage('Profile picture uploaded.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to upload profile picture');
    } finally {
      setLogoBusy(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const onDeleteLogo = async () => {
    try {
      setLogoBusy(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await requestServer<OrganizationDeleteLogoResponse>(
        '/organization/logo',
        {
          method: 'DELETE',
          includeJwt: true,
        },
      );

      setProfile(response);
      certificateForm.setValue('hasLogo', false, { shouldValidate: true });
      setLogoVersion(prev => prev + 1);
      setSaveMessage('Profile picture removed.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to remove profile picture');
    } finally {
      setLogoBusy(false);
    }
  };

  const onUploadSignature = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setSignatureBusy(true);
      setSaveError(null);
      setSaveMessage(null);

      const formData = new FormData();
      formData.append('signature', file);

      const response = await requestServer<UploadCertificateSignatureResponse>(
        '/organization/certificate-info/upload-signature',
        {
          method: 'POST',
          body: formData,
          includeJwt: true,
        },
      );

      setCertificateInfo(response.certificateInfo);
      certificateForm.setValue('hasSignature', true, { shouldValidate: true });
      setSaveMessage('Certificate signature uploaded.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to upload signature');
    } finally {
      setSignatureBusy(false);
      if (signatureInputRef.current) signatureInputRef.current.value = '';
    }
  };

  const onDeleteSignature = async () => {
    try {
      setSignatureBusy(true);
      setSaveError(null);
      setSaveMessage(null);

      await requestServer<DeleteCertificateSignatureResponse>(
        '/organization/certificate-info/signature',
        {
          method: 'DELETE',
          includeJwt: true,
        },
      );

      setCertificateInfo(prev => prev ? { ...prev, signature_path: null } : prev);
      certificateForm.setValue('hasSignature', false, { shouldValidate: true });
      setSaveMessage('Certificate signature removed.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to remove signature');
    } finally {
      setSignatureBusy(false);
    }
  };

  const onSave = form.handleSubmit(async (profileData) => {
    if (!isEditMode) return;

    await executeAndShowError(form, async () => {
      const certificateIsValid = await certificateForm.trigger();
      if (!certificateIsValid) {
        throw new Error('Certificate settings are invalid.');
      }

      const certificateData = certificateFormSchema.parse(certificateForm.getValues());

      try {
        setSaving(true);
        setSaveError(null);
        setSaveMessage(null);

        const [organizationResponse, certificateResponse] = await Promise.all([
          requestServer<OrganizationMeResponse>(
            '/organization/profile',
            {
              method: 'PUT',
              body: {
                phone_number: profileData.phone_number,
                description: profileData.description,
                location_name: profileData.location_name,
                latitude: profileData.latitude,
                longitude: profileData.longitude,
              },
              includeJwt: true,
            },
          ),
          requestServer<UpdateCertificateInfoResponse>(
            '/organization/certificate-info',
            {
              method: 'PUT',
              body: {
                certificate_feature_enabled: certificateData.certificate_feature_enabled,
                hours_threshold: certificateData.hours_threshold,
                signatory_name: certificateData.signatory_name?.trim() ? certificateData.signatory_name.trim() : null,
                signatory_position: certificateData.signatory_position?.trim() ? certificateData.signatory_position.trim() : null,
              },
              includeJwt: true,
            },
          ),
        ]);

        setProfile(organizationResponse);
        setCertificateInfo(certificateResponse.certificateInfo);
        resetFormsFromData(organizationResponse, certificateResponse.certificateInfo);
        setSaveMessage('Profile changes saved.');
        setIsEditMode(false);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Failed to save profile');
      } finally {
        setSaving(false);
      }
    });
  });

  const onCancelEdit = useCallback(() => {
    if (!profile) return;
    resetFormsFromData(profile, certificateInfo);
    setIsEditMode(false);
    setSaveError(null);
    setSaveMessage(null);
    form.clearErrors();
    certificateForm.clearErrors();
  }, [certificateForm, certificateInfo, form, profile, resetFormsFromData]);

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

        {saveError && (
          <div role="alert" className="alert alert-error mt-4">
            <span>{saveError}</span>
          </div>
        )}

        <FormRootError form={form} />
        <FormRootError form={certificateForm} />

        <div className="mt-4">
          <ColumnLayout
            sidebar={(
              <div className="card bg-base-100 shadow-md mt-4">
                <div className="card-body">
                  <div className="flex items-center gap-4">
                    <div className="avatar">
                      {logoUrl
                        ? (
                            <div className="rounded-full w-20">
                              <img src={logoUrl} alt={`${profile.organization.name} logo`} />
                            </div>
                          )
                        : (
                            <div className="bg-primary text-primary-content rounded-full w-20 h-20 flex items-center justify-center">
                              <span className="text-2xl">{initials || 'O'}</span>
                            </div>
                          )}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{profile.organization.name || organizationFromAuth?.name || 'Organization'}</h4>
                      <span className="badge badge-primary badge-sm mt-1 gap-1">
                        <Building2 size={12} />
                        Organization
                      </span>
                    </div>
                  </div>

                  {isEditMode && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                        onChange={onUploadLogo}
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm gap-2"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoBusy || saving}
                      >
                        <ImageUp size={14} />
                        {logoBusy ? 'Uploading...' : 'Upload Picture'}
                      </button>
                      {profile.organization.logo_path && (
                        <button
                          type="button"
                          className="btn btn-outline btn-error btn-sm gap-2"
                          onClick={onDeleteLogo}
                          disabled={logoBusy || saving}
                        >
                          <Trash2 size={14} />
                          Remove Picture
                        </button>
                      )}
                    </div>
                  )}

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

            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h5 className="font-bold text-lg flex items-center gap-2">
                  <ShieldCheck size={18} />
                  Certificate Settings
                </h5>
                <p className="text-sm opacity-70 mt-1">
                  Allow volunteers to include this organization on generated certificates.
                </p>

                {isEditMode
                  ? (
                      <div className={`mt-3 space-y-4 ${saving ? 'pointer-events-none opacity-70' : ''}`}>
                        <ToggleButton
                          form={certificateForm}
                          name="certificate_feature_enabled"
                          label="Enable Certificate Feature"
                          compact={true}
                          options={[
                            { value: true, label: 'Enabled', btnColor: 'btn-primary' },
                            { value: false, label: 'Disabled' },
                          ]}
                          disabled={saving}
                        />
                        {!profile.organization.logo_path && (
                          <div role="alert" className="alert alert-warning">
                            <span>Upload organization profile picture before enabling this feature.</span>
                          </div>
                        )}

                        {certificateValues.certificate_feature_enabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              form={certificateForm}
                              name="hours_threshold"
                              label="Hours Threshold"
                              type="number"
                            />
                            <FormField
                              form={certificateForm}
                              name="signatory_name"
                              label="Signatory Name"
                            />
                            <FormField
                              form={certificateForm}
                              name="signatory_position"
                              label="Signatory Position"
                            />
                            <div className="space-y-2">
                              <label className="text-sm font-medium block">Signature</label>
                              <input
                                ref={signatureInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                className="hidden"
                                onChange={onUploadSignature}
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm gap-2"
                                  onClick={() => signatureInputRef.current?.click()}
                                  disabled={signatureBusy || saving}
                                >
                                  <ImageUp size={14} />
                                  {signatureBusy ? 'Uploading...' : 'Upload Signature'}
                                </button>
                                {certificateInfo?.signature_path && (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-error btn-sm gap-2"
                                    onClick={onDeleteSignature}
                                    disabled={signatureBusy || saving}
                                  >
                                    <Trash2 size={14} />
                                    Remove Signature
                                  </button>
                                )}
                              </div>
                              {!certificateInfo?.signature_path && (
                                <p className="text-xs text-warning">No signature uploaded yet.</p>
                              )}
                              {certificateForm.formState.errors.hasSignature?.message && (
                                <p className="text-xs text-error">{certificateForm.formState.errors.hasSignature.message}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  : (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="rounded-box border border-base-300 p-3">
                          <p className="opacity-70">Feature Status</p>
                          <p className="font-semibold mt-1">
                            {certificateInfo?.certificate_feature_enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                        <div className="rounded-box border border-base-300 p-3">
                          <p className="opacity-70">Hours Threshold</p>
                          <p className="font-semibold mt-1">{certificateInfo?.hours_threshold ?? '-'}</p>
                        </div>
                        <div className="rounded-box border border-base-300 p-3">
                          <p className="opacity-70">Signatory Name</p>
                          <p className="font-semibold mt-1">{certificateInfo?.signatory_name || '-'}</p>
                        </div>
                        <div className="rounded-box border border-base-300 p-3">
                          <p className="opacity-70">Signatory Position</p>
                          <p className="font-semibold mt-1">{certificateInfo?.signatory_position || '-'}</p>
                        </div>
                      </div>
                    )}
              </div>
            </div>
          </ColumnLayout>
        </div>
      </div>
    </div>
  );
}

export default OrganizationProfile;
