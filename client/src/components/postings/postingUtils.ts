import type { PostingWithContext } from '../../../../server/src/types';

export const normalizeTimestamp = (value: string | Date | undefined | null): Date | null => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatTime12Hour = (timeValue: string | undefined): string => {
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

export const formatCardDate = (dateValue: Date | null): string => {
  if (!dateValue) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dateValue);
};

export const getPostingDates = (startDate: string | Date, endDate: string | Date | null | undefined): string[] => {
  const normalizeDateOnly = (value: string | Date | null | undefined) => {
    if (value == null) return undefined;
    if (value instanceof Date) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }

    const datePart = value.split('T')[0]?.trim();
    return datePart || undefined;
  };

  const parseIsoDateParts = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return undefined;

    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  };

  const formatDateToIso = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

  const normalizedStartDate = normalizeDateOnly(startDate);
  const normalizedEndDate = normalizeDateOnly(endDate ?? startDate);
  const startParts = normalizedStartDate ? parseIsoDateParts(normalizedStartDate) : undefined;
  const endParts = normalizedEndDate ? parseIsoDateParts(normalizedEndDate) : undefined;

  if (!startParts || !endParts) {
    return [];
  }

  const result: string[] = [];
  const current = new Date(startParts.year, startParts.month - 1, startParts.day);
  const end = new Date(endParts.year, endParts.month - 1, endParts.day);

  while (current.getTime() <= end.getTime()) {
    result.push(formatDateToIso(current));
    current.setDate(current.getDate() + 1);
  }

  return result;
};

export const isPostingFullyBooked = (posting: PostingWithContext): boolean => {
  if (posting.max_volunteers == null) {
    return false;
  }

  if (!posting.allows_partial_attendance) {
    return (posting.enrollment_count ?? 0) >= posting.max_volunteers;
  }

  const postingDates = getPostingDates(posting.start_date, posting.end_date);
  if (postingDates.length === 0) {
    return false;
  }

  return postingDates.every(date => (posting.date_capacity?.[date] ?? 0) >= posting.max_volunteers!);
};

export const hasPostingEnded = (endDt: Date | null): boolean => {
  if (!endDt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endLocal = new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate());
  return endLocal < today;
};
