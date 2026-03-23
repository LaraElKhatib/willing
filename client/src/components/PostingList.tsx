import { AlertCircle, Ban, Building2, Cake, Calendar, Clock, ExternalLink, LockOpen, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router';

import SkillsList from './skills/SkillsList';

import type { PostingWithContext } from '../../../server/src/types';

interface PostingListProps {
  posting: PostingWithContext;
  showCrisis?: boolean;
  variant?: 'volunteer' | 'organization';
}

const normalizeTimestamp = (value: string | Date | undefined | null) => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTime12Hour = (timeValue: string | undefined) => {
  if (!timeValue) return '';
  const [hoursRaw, minutesRaw] = timeValue.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeValue;
  const normalizedHours = ((hours % 24) + 24) % 24;
  const suffix = normalizedHours >= 12 ? 'PM' : 'AM';
  const hour12 = normalizedHours % 12 === 0 ? 12 : normalizedHours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

const formatCardDate = (dateValue: Date | null) => {
  if (!dateValue) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dateValue);
};

function PostingList({ posting, showCrisis = true, variant = 'volunteer' }: PostingListProps) {
  const postingDetailsPath = `/posting/${posting.id}`;

  const startDt = normalizeTimestamp(posting.start_date);
  const endDt = normalizeTimestamp(posting.end_date);
  const hasEndDate = Boolean(endDt);

  const startDateStr = formatCardDate(startDt) || 'TBA';
  const endDateStr = formatCardDate(endDt) || 'TBA';
  const startTimeStr = formatTime12Hour(posting.start_time || '')
    || (startDt
      ? startDt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      : 'TBA');
  const endTimeStr = formatTime12Hour(posting.end_time || '')
    || (endDt
      ? endDt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      : 'TBA');

  const volunteerFilled = posting.enrollment_count ?? 0;
  const volunteerCountText = posting.max_volunteers
    ? `${volunteerFilled}/${posting.max_volunteers}`
    : `${volunteerFilled}`;
  const locationText = posting.location_name || 'TBA';
  const isPostingFull = Boolean(posting.max_volunteers && volunteerFilled >= posting.max_volunteers);
  const organizationInitials = posting.organization_name
    ? posting.organization_name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word: string) => word[0]?.toUpperCase() ?? '')
        .join('')
    : '';

  const statusTag = posting.is_closed
    ? (
        <span className="badge badge-sm badge-error inline-flex items-center gap-1">
          <Ban size={12} />
          Closed
        </span>
      )
    : posting.application_status === 'pending'
      ? (
          <span className="badge badge-sm badge-warning inline-flex items-center gap-1">
            <Clock size={12} />
            Pending
          </span>
        )
      : posting.application_status === 'registered'
        ? (
            <span className="badge badge-sm badge-success inline-flex items-center gap-1">
              <Users size={12} />
              Registered
            </span>
          )
        : isPostingFull
          ? (
              <span className="badge badge-sm badge-error inline-flex items-center gap-1">
                <Users size={12} />
                Full
              </span>
            )
          : posting.automatic_acceptance
            ? (
                <span className="badge badge-sm badge-primary inline-flex items-center gap-1">
                  <LockOpen size={12} />
                  Open
                </span>
              )
            : (
                <span className="badge badge-sm badge-secondary inline-flex items-center gap-1">
                  <Clock size={12} />
                  Review Based
                </span>
              );

  return (
    <article className="collapse collapse-arrow relative overflow-visible border border-base-300 bg-base-100 shadow-sm hover:shadow-md transition-shadow">
      <input type="checkbox" />

      {showCrisis && posting.crisis_name && posting.crisis_id && (
        <Link
          to={`/volunteer/crises/${posting.crisis_id}/postings`}
          onClick={event => event.stopPropagation()}
          className="absolute -top-2 right-1 z-20 pointer-events-auto inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-sm text-accent-content shadow-sm rotate-3 transition-transform duration-200 hover:rotate-0"
        >
          <AlertCircle size={14} />
          <span className="truncate max-w-40 font-semibold">{posting.crisis_name}</span>
        </Link>
      )}

      <div className="collapse-title z-10 pointer-events-none flex items-center gap-3 pr-12">
        <div className="relative shrink-0 pointer-events-auto">
          <Link to={`/organization/${posting.organization_id}`} onClick={event => event.stopPropagation()} className="avatar avatar-placeholder">
            <div className="bg-primary text-primary-content rounded-full w-11 h-11">
              {organizationInitials
                ? <span className="text-sm font-semibold">{organizationInitials}</span>
                : <Building2 size={18} />}
            </div>
          </Link>
        </div>

        <div className="min-w-0 flex-1 relative">
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                to={postingDetailsPath}
                onClick={event => event.stopPropagation()}
                className="link link-primary link-hover no-underline hover:underline inline-flex min-w-0 items-center gap-2 pointer-events-auto"
              >
                <span className="truncate text-lg font-semibold leading-tight text-primary">{posting.title}</span>
                <ExternalLink size={14} />
              </Link>

              <div className="shrink-0 opacity-100">{statusTag}</div>
            </div>

            <span className="-ml-8 hidden items-center gap-1.5 justify-self-start text-sm opacity-70 lg:inline-flex">
              <Calendar size={14} className="shrink-0 text-primary" />
              Date
            </span>

            <span className="-ml-8 hidden items-center gap-1.5 justify-self-start text-sm opacity-70 lg:inline-flex">
              <Clock size={14} className="shrink-0 text-primary" />
              Time
            </span>

            <span className="-ml-8 hidden items-center gap-1.5 justify-self-start text-sm opacity-70 lg:inline-flex">
              <MapPin size={14} className="shrink-0 text-primary" />
              Location
            </span>
          </div>

          {variant === 'volunteer' && (
            <div className="mt-1 grid w-full grid-cols-1 items-center gap-x-3 gap-y-1 text-xs text-base-content lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              {posting.organization_name && (
                <Link
                  to={`/organization/${posting.organization_id}`}
                  onClick={event => event.stopPropagation()}
                  className="pointer-events-auto text-primary link link-hover no-underline hover:underline text-xs justify-self-start"
                >
                  {posting.organization_name}
                </Link>
              )}

              <span className="-ml-8 hidden min-w-0 truncate justify-self-start pr-1 font-medium lg:block">{hasEndDate ? `${startDateStr} - ${endDateStr}` : startDateStr}</span>

              <span className="-ml-8 hidden min-w-0 truncate justify-self-start pr-1 font-medium lg:block">{hasEndDate ? `${startTimeStr} - ${endTimeStr}` : startTimeStr}</span>

              <span className="-ml-8 hidden min-w-0 truncate justify-self-start font-medium lg:block">{locationText}</span>
            </div>
          )}

          {variant === 'organization' && (
            <div className="mt-1 hidden w-full grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-xs text-base-content lg:grid">
              <span aria-hidden="true"></span>

              <span className="-ml-8 min-w-0 truncate justify-self-start pr-1 font-medium">{hasEndDate ? `${startDateStr} - ${endDateStr}` : startDateStr}</span>

              <span className="-ml-8 min-w-0 truncate justify-self-start pr-1 font-medium">{hasEndDate ? `${startTimeStr} - ${endTimeStr}` : startTimeStr}</span>

              <span className="-ml-8 min-w-0 truncate justify-self-start font-medium">{locationText}</span>
            </div>
          )}
        </div>
      </div>

      <div className="collapse-content pt-0">
        <div className="mb-3 space-y-1 text-sm lg:hidden">
          <div className="inline-flex items-center gap-2">
            <Calendar size={14} className="text-primary" />
            <span className="opacity-70">Date:</span>
            <span className="font-medium text-base-content pr-3">{hasEndDate ? `${startDateStr} - ${endDateStr}` : startDateStr}</span>
          </div>

          <div className="inline-flex items-center gap-2">
            <Clock size={14} className="text-primary" />
            <span className="opacity-70">Time:</span>
            <span className="font-medium text-base-content pr-3">{hasEndDate ? `${startTimeStr} - ${endTimeStr}` : startTimeStr}</span>
          </div>

          <div className="inline-flex items-center gap-2">
            <MapPin size={14} className="text-primary" />
            <span className="opacity-70">Location:</span>
            <span className="font-medium text-base-content">{locationText}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="inline-flex items-center gap-2">
            <Users size={14} className="text-primary" />
            <span className="opacity-70">Volunteers:</span>
            <span className="font-medium text-base-content">{volunteerCountText}</span>
          </div>

          {posting.minimum_age && (
            <div className="inline-flex items-center gap-2">
              <Cake size={14} className="text-primary" />
              <span className="opacity-70">Age:</span>
              <span className="font-medium text-base-content">
                {posting.minimum_age}
                +
              </span>
            </div>
          )}
        </div>

        {posting.skills && posting.skills.length > 0 && (
          <div className="mt-3">
            <p className="text-xs opacity-70 mb-2">Skills</p>
            <SkillsList skills={posting.skills} limit={6} />
          </div>
        )}
      </div>
    </article>
  );
}

export default PostingList;
