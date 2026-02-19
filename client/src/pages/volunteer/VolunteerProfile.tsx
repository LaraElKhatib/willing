import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Lock, Mars, Venus } from 'lucide-react';

import Loading from '../../components/Loading';
import requestServer from '../../utils/requestServer';

type VolunteerProfileResponse = {
  volunteer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other';
    description?: string;
  };
  skills: string[];
  cv: string | null;
  privacy: string | null;
  unavailableFields: Array<'cv'>;
};

type ProfileFormState = {
  description: string;
  skills: string;
  cv: string;
  privacy: 'public' | 'private';
};
const DESCRIPTION_MAX_LENGTH = 300;
const SKILL_BADGE_STYLES = [
  'badge-primary',
  'badge-secondary',
  'badge-accent',
  'badge-info',
] as const;

const getDefaultFormState = (profile: VolunteerProfileResponse): ProfileFormState => ({
  description: profile.volunteer.description ?? '',
  skills: profile.skills.join(', '),
  cv: profile.cv ?? '',
  privacy: profile.privacy === 'private' ? 'private' : 'public',
});

function VolunteerProfile() {
  const [profile, setProfile] = useState<VolunteerProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    description: '',
    skills: '',
    cv: '',
    privacy: 'public',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await requestServer<VolunteerProfileResponse>('/volunteer/profile', {}, true);
      setProfile(response);
      setForm(getDefaultFormState(response));
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const volunteerName = useMemo(() => {
    if (!profile) return '';
    return `${profile.volunteer.first_name} ${profile.volunteer.last_name}`.trim();
  }, [profile]);

  const formattedGender = useMemo(() => {
    if (!profile?.volunteer.gender) return 'Not specified';

    const value = profile.volunteer.gender.toLowerCase();
    if (value === 'male') return 'Male';
    if (value === 'female') return 'Female';
    if (value === 'other') return 'Other';

    return value.charAt(0).toUpperCase() + value.slice(1);
  }, [profile?.volunteer.gender]);

  const genderBadgeStyles = useMemo(() => {
    if (!profile?.volunteer.gender) return 'badge-outline';
    if (profile.volunteer.gender === 'male') return 'badge-info';
    if (profile.volunteer.gender === 'female') return 'badge-secondary';
    return 'badge-accent';
  }, [profile?.volunteer.gender]);

  const initials = useMemo(() => {
    const nameParts = volunteerName.trim().split(/\s+/).filter(Boolean);
    return nameParts
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }, [volunteerName]);

  const parsedSkills = useMemo(() => (
    form.skills
      .split(',')
      .map(skill => skill.trim())
      .filter(Boolean)
  ), [form.skills]);

  const formattedDateOfBirth = useMemo(() => {
    if (!profile?.volunteer.date_of_birth) return '-';

    const parsed = new Date(profile.volunteer.date_of_birth);
    if (Number.isNaN(parsed.getTime())) {
      return profile.volunteer.date_of_birth;
    }

    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [profile?.volunteer.date_of_birth]);

  const updateForm = useCallback((field: keyof ProfileFormState, value: string) => {
    const nextValue = field === 'description' ? value.slice(0, DESCRIPTION_MAX_LENGTH) : value;
    setForm(prev => ({ ...prev, [field]: nextValue }));
    setSaveError(null);
    setSaveMessage(null);
  }, []);

  const onSave = useCallback(async () => {
    if (!isEditMode || !profile) return;

    try {
      setSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const response = await requestServer<VolunteerProfileResponse>(
        '/volunteer/profile',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: form.description,
            skills: parsedSkills,
            cv: form.cv || null,
            privacy: form.privacy,
          }),
        },
        true,
      );

      setProfile(response);
      setForm(getDefaultFormState(response));
      setSaveMessage('Profile changes saved.');
      setIsEditMode(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [form.cv, form.description, form.privacy, isEditMode, parsedSkills, profile]);

  const onCancelEdit = useCallback(() => {
    if (!profile) return;
    setForm(getDefaultFormState(profile));
    setIsEditMode(false);
    setSaveError(null);
    setSaveMessage(null);
  }, [profile]);

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
          <button className="btn btn-outline mt-4" onClick={loadProfile}>Retry</button>
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

  const avatarUrl = '';
  const unavailableCv = profile.unavailableFields.includes('cv');

  return (
    <div className="grow bg-base-200">
      <div className="p-6 md:container mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight">Volunteer Profile</h3>
            <p className="opacity-70 mt-1">Manage your details, availability, and focus areas.</p>
          </div>
          <div className="flex gap-2">
            {
              isEditMode
                ? (
                    <button className="btn btn-outline" onClick={onCancelEdit} disabled={saving}>
                      Cancel
                    </button>
                  )
                : (
                    <button className="btn btn-outline" onClick={() => setIsEditMode(true)}>
                      Edit Profile
                    </button>
                  )
            }
            {isEditMode && (
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {saveMessage && (
          <div role="alert" className="alert alert-success mt-4">
            <span>{saveMessage}</span>
          </div>
        )}

        {saveError && (
          <div role="alert" className="alert alert-error mt-4">
            <span>{saveError}</span>
          </div>
        )}

        {unavailableCv && (
          <div role="alert" className="alert alert-info mt-4">
            <span>
              Some profile fields are not configured in the current database:
              {' CV'}
              .
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    {avatarUrl
                      ? (
                          <div className="rounded-full w-20">
                            <img src={avatarUrl} alt={`${volunteerName} avatar`} />
                          </div>
                        )
                      : (
                          <div className="bg-primary text-primary-content rounded-full w-20 flex items-center justify-center">
                            <span className="text-2xl">{initials || 'V'}</span>
                          </div>
                        )}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">{volunteerName}</h4>
                    <div className="mt-1">
                      <span className={`badge badge-sm gap-1 ${genderBadgeStyles}`}>
                        {profile.volunteer.gender === 'male' && <Mars size={12} />}
                        {profile.volunteer.gender === 'female' && <Venus size={12} />}
                        {profile.volunteer.gender === 'other' && <span className="font-bold">•</span>}
                        {formattedGender}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm opacity-70 mb-2 block">Description</label>
                  {isEditMode
                    ? (
                        <>
                          <textarea
                            id="volunteer-description"
                            className="textarea textarea-bordered w-full"
                            value={form.description}
                            onChange={(e) => updateForm('description', e.target.value)}
                            disabled={saving}
                            rows={4}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                          />
                          <p className="text-xs opacity-60 mt-1 text-right">
                            {form.description.length}
                            /
                            {DESCRIPTION_MAX_LENGTH}
                          </p>
                        </>
                      )
                    : (
                        <p className="text-sm opacity-80 whitespace-pre-wrap break-words">
                          {form.description || 'No description added yet.'}
                        </p>
                      )}
                </div>

                <div className="divider my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Email</span>
                    <span className="font-medium">{profile.volunteer.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Date of Birth</span>
                    <span className="font-medium">{formattedDateOfBirth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Status</span>
                    <span className="badge badge-success">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h5 className="font-bold text-lg">Skills</h5>
                <p className="text-sm opacity-70 mt-1">Separate skills with commas.</p>
                {isEditMode && (
                  <div className="mt-3">
                    <input
                      className="input input-bordered w-full"
                      value={form.skills}
                      onChange={(e) => updateForm('skills', e.target.value)}
                      disabled={saving}
                      placeholder="e.g. Teaching, Event Planning, First Aid"
                    />
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {parsedSkills.length > 0
                    ? parsedSkills.map((skill, index) => (
                        <span key={skill} className={`badge ${SKILL_BADGE_STYLES[index % SKILL_BADGE_STYLES.length]}`}>{skill}</span>
                      ))
                    : <span className="text-sm opacity-60">No skills added yet.</span>}
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h5 className="font-bold text-lg">Previous Experiences</h5>
                <p className="text-sm opacity-70 mt-1">
                  This section will show your past volunteering experiences completed through the platform.
                </p>
                <div className="alert alert-soft mt-4">
                  <span className="text-sm">No experiences to show yet.</span>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="w-full">
                    <h5 className="font-bold text-lg">Resume</h5>
                    <p className="text-sm opacity-70 mb-2">CV link or path (if supported by database schema).</p>
                    {isEditMode
                      ? (
                          <input
                            className="input input-bordered w-full"
                            value={form.cv}
                            onChange={(e) => updateForm('cv', e.target.value)}
                            disabled={saving || unavailableCv}
                            placeholder={unavailableCv ? 'CV field not configured in database' : 'Paste CV URL'}
                          />
                        )
                      : (
                          <p className="text-sm opacity-80 break-all">
                            {unavailableCv ? 'Not configured in database.' : (form.cv || 'No CV added yet.')}
                          </p>
                        )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h5 className="font-bold text-lg">Privacy Setting</h5>
                <p className="text-sm opacity-70 mb-2">Profile visibility preference.</p>
                {isEditMode
                  ? (
                      <div className="join">
                        <button
                          type="button"
                          className={`btn btn-sm join-item gap-2 ${form.privacy === 'public' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => updateForm('privacy', 'public')}
                          disabled={saving}
                        >
                          <Globe size={14} />
                          Public
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm join-item gap-2 ${form.privacy === 'private' ? 'btn-warning' : 'btn-outline'}`}
                          onClick={() => updateForm('privacy', 'private')}
                          disabled={saving}
                        >
                          <Lock size={14} />
                          Private
                        </button>
                      </div>
                    )
                  : (
                      <span className={`badge gap-2 ${form.privacy === 'private' ? 'badge-warning' : 'badge-primary'}`}>
                        {form.privacy === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                        {form.privacy === 'private' ? 'Private' : 'Public'}
                      </span>
                    )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VolunteerProfile;
