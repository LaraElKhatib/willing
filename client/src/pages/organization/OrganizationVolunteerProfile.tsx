import { AlertTriangle, Building2, Calendar, Clock3, FileText, Mail, MapPin, Mars, Users, Venus } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router';

import Alert from '../../components/Alert';
import ColumnLayout from '../../components/layout/ColumnLayout';
import PageHeader from '../../components/layout/PageHeader';
import Loading from '../../components/Loading';
import SkillsList from '../../components/skills/SkillsList';
import requestServer from '../../utils/requestServer';
import useAsync from '../../utils/useAsync';

import type { OrganizationVolunteerProfileResponse } from '../../../../server/src/api/types';

const formatExperienceDateRange = (startValue: Date | string, endValue?: Date | string) => {
  const startDate = new Date(startValue);
  const endDate = endValue ? new Date(endValue) : null;

  const startText = Number.isNaN(startDate.getTime())
    ? 'Date unavailable'
    : startDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  if (!endDate || Number.isNaN(endDate.getTime())) return startText;

  const endText = endDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return `${startText} - ${endText}`;
};

function OrganizationVolunteerProfile() {
  const { volunteerId } = useParams<{ volunteerId: string }>();

  const {
    data,
    loading,
    error,
    trigger,
  } = useAsync<OrganizationVolunteerProfileResponse, []>(
    async () => {
      if (!volunteerId) throw new Error('Volunteer ID is missing.');
      return requestServer<OrganizationVolunteerProfileResponse>(`/organization/volunteer/${volunteerId}`, {
        includeJwt: true,
      });
    },
    { immediate: true, notifyOnError: true },
  );

  const profile = data?.profile;

  const volunteerName = useMemo(() => {
    if (!profile) return '';
    return `${profile.volunteer.first_name} ${profile.volunteer.last_name}`.trim();
  }, [profile]);

  const initials = useMemo(() => {
    if (!profile) return '';
    return `${profile.volunteer.first_name.charAt(0)}${profile.volunteer.last_name.charAt(0)}`.toUpperCase();
  }, [profile]);

  const formattedDateOfBirth = useMemo(() => {
    if (!profile) return '-';
    const parsed = new Date(profile.volunteer.date_of_birth);
    if (Number.isNaN(parsed.getTime())) return profile.volunteer.date_of_birth;
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [profile]);

  const formattedGender = useMemo(() => {
    if (!profile) return '';
    if (profile.volunteer.gender === 'male') return 'Male';
    if (profile.volunteer.gender === 'female') return 'Female';
    return 'Other';
  }, [profile]);

  const genderBadgeStyles = useMemo(() => {
    if (!profile) return '';
    if (profile.volunteer.gender === 'male') return 'badge-info';
    if (profile.volunteer.gender === 'female') return 'badge-secondary';
    return 'badge-accent';
  }, [profile]);

  if (loading && !profile) {
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

  if (error && !profile) {
    return (
      <div className="grow bg-base-200">
        <div className="p-6 md:container mx-auto">
          <Alert color="error">
            {error.message || 'Failed to load volunteer profile.'}
          </Alert>
          <button className="btn btn-outline mt-4" onClick={() => { void trigger(); }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="grow bg-base-200">
      <div className="p-6 md:container mx-auto">
        <PageHeader
          title={volunteerName || 'Volunteer'}
          subtitle="Volunteer profile details visible to organizations."
          icon={FileText}
          showBack
          defaultBackTo="/organization"
        />

        <div className="mt-4">
          <ColumnLayout
            sidebar={(
              <div className="card bg-base-100 shadow-md mt-4">
                <div className="card-body">
                  <div className="flex items-center gap-4">
                    <div className="avatar">
                      <div className="bg-primary text-primary-content rounded-full w-20 flex items-center justify-center">
                        <span className="text-2xl">{initials || 'V'}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{volunteerName}</h4>
                      <div className="mt-1">
                        <span className={`badge badge-sm gap-1 ${genderBadgeStyles}`}>
                          {profile.volunteer.gender === 'male' && <Mars size={12} />}
                          {profile.volunteer.gender === 'female' && <Venus size={12} />}
                          {profile.volunteer.gender === 'other' && <span className="font-bold">*</span>}
                          {formattedGender}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="divider my-4" />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="opacity-70 flex items-center gap-2">
                        <Mail size={14} />
                        Email
                      </span>
                      <span className="font-medium text-right break-all">{profile.volunteer.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="opacity-70 flex items-center gap-2">
                        <Calendar size={14} />
                        Date of Birth
                      </span>
                      <span className="font-medium text-right">{formattedDateOfBirth}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm opacity-70 mb-2 block">Description</label>
                    <p className="text-sm opacity-80 whitespace-pre-wrap wrap-break-word">
                      {profile.volunteer.description || 'No description added yet.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-0 gap-y-3">
              <div className="stat place-items-center bg-base-100 shadow-md rounded-2xl sm:rounded-l-2xl sm:rounded-r-none">
                <div className="stat-title text-base">Completed Postings</div>
                <div className="stat-value text-2xl text-primary/80 inline-flex w-full items-center justify-center gap-2">
                  <Users className="h-6 w-6 shrink-0 stroke-current" />
                  <span>{profile.experience_stats.total_completed_experiences}</span>
                </div>
              </div>
              <div className="stat place-items-center bg-base-100 shadow-md rounded-2xl sm:rounded-none">
                <div className="stat-title text-base">Hours Completed</div>
                <div className="stat-value text-2xl text-primary/80 inline-flex w-full items-center justify-center gap-2">
                  <Clock3 className="h-6 w-6 shrink-0 stroke-current" />
                  <span>{profile.experience_stats.total_hours_completed.toFixed(1)}</span>
                </div>
              </div>
              <div className="stat place-items-center bg-base-100 shadow-md rounded-2xl sm:rounded-r-2xl sm:rounded-l-none">
                <div className="stat-title text-base">Organizations</div>
                <div className="stat-value text-2xl text-primary/80 inline-flex w-full items-center justify-center gap-2">
                  <Building2 className="h-6 w-6 shrink-0 stroke-current" />
                  <span>{profile.experience_stats.organizations_supported}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-0 gap-y-3">
              <div className="stat place-items-center bg-base-100 shadow-md rounded-2xl sm:rounded-l-2xl sm:rounded-r-none">
                <div className="stat-title text-base">Crisis-Related</div>
                <div className="stat-value text-2xl text-primary/80 inline-flex w-full items-center justify-center gap-2">
                  <AlertTriangle className="h-6 w-6 shrink-0 stroke-current" />
                  <span>{profile.experience_stats.crisis_related_experiences}</span>
                </div>
              </div>
              <div className="stat place-items-center bg-base-100 shadow-md rounded-2xl sm:rounded-none">
                <div className="stat-title text-base">Total Skills Used</div>
                <div className="stat-value text-2xl text-primary/80 inline-flex w-full items-center justify-center gap-2">
                  <FileText className="h-6 w-6 shrink-0 stroke-current" />
                  <span>{profile.experience_stats.total_skills_used}</span>
                </div>
              </div>
              <div className="stat place-items-center bg-base-100 shadow-md rounded-2xl sm:rounded-r-2xl sm:rounded-l-none">
                <div className="stat-title text-base">Most Volunteered Crisis</div>
                <div className="stat-value text-lg text-primary/80 inline-flex w-full items-center justify-center gap-2 px-2">
                  <span className="max-w-full truncate text-center">{profile.experience_stats.most_volunteered_crisis ?? 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md mt-4">
              <div className="card-body">
                <h5 className="font-bold text-lg">Skills</h5>
                <p className="text-sm opacity-70 mt-1">Volunteer skill set.</p>
                <SkillsList skills={profile.skills} enableLimit={false} />
              </div>
            </div>

            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h5 className="font-bold text-lg">Previous Experiences</h5>
                <p className="text-sm opacity-70 mt-1">
                  Past volunteering experiences completed through the platform.
                </p>

                {profile.completed_experiences.length === 0
                  ? (
                      <div className="alert alert-soft mt-4">
                        <span className="text-sm">No completed experiences to show yet.</span>
                      </div>
                    )
                  : (
                      <div className="mt-4 space-y-3">
                        {profile.completed_experiences.map(experience => (
                          <div key={experience.enrollment_id} className="rounded-lg border border-base-300 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Link to={`/posting/${experience.posting_id}`} className="font-semibold text-base text-primary hover:underline">
                                {experience.posting_title}
                              </Link>
                              <span className="badge badge-success">Present</span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm opacity-80">
                              <span className="inline-flex items-center gap-1">
                                <Building2 size={14} />
                                {experience.organization_name}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={14} />
                                {experience.location_name}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar size={14} />
                                {formatExperienceDateRange(experience.start_timestamp, experience.end_timestamp)}
                              </span>
                            </div>

                            {experience.crisis_name && (
                              <span className="badge badge-accent badge-outline mt-3">
                                {experience.crisis_name}
                              </span>
                            )}
                          </div>
                        ))}
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

export default OrganizationVolunteerProfile;
