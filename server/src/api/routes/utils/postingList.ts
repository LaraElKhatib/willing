import { sql } from 'kysely';

import { getSingleQueryValue } from './queryValue.js';

export type PostingSortDir = 'asc' | 'desc';
export type SharedPostingSortBy = 'start_date' | 'end_date' | 'created_at';

export type PostingDateTimeFilters = {
  startDateFrom?: Date;
  endDateTo?: Date;
  startTimeFrom?: string;
  endTimeTo?: string;
};

type PostingDateValue = Date | string | null | undefined;

type PostingSortLike = {
  start_date?: PostingDateValue;
  start_time?: string | null | undefined;
  end_date?: PostingDateValue;
  end_time?: string | null | undefined;
  created_at?: PostingDateValue | undefined;
};

type PostingSearchLike = {
  title: string;
  description: string;
  location_name: string;
  organization_name?: string | null;
  skills: Array<{ name: string }>;
};

type PostingQueryLike = {
  where: (...args: unknown[]) => PostingQueryLike;
  orderBy: (...args: unknown[]) => PostingQueryLike;
};

const normalizeDateKey = (value: PostingDateValue): string | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
};

const normalizeTimeKey = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return value.slice(0, 8);
};

const normalizeTimestampKey = (value: PostingDateValue): string | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  return value.toISOString();
};

const compareNullableKeys = (
  left: string | null,
  right: string | null,
  sortDir: PostingSortDir,
): number => {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const result = left.localeCompare(right);
  return sortDir === 'asc' ? result : -result;
};

const parseDateBoundary = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
};

export const parsePostingDateTimeFilters = (query: Record<string, unknown>): PostingDateTimeFilters => {
  const startDateFrom = parseDateBoundary(getSingleQueryValue(query.start_date_from));
  const endDateTo = parseDateBoundary(getSingleQueryValue(query.end_date_to));
  const startTimeFrom = getSingleQueryValue(query.start_time_from);
  const endTimeTo = getSingleQueryValue(query.end_time_to);

  const filters: PostingDateTimeFilters = {};

  if (startDateFrom) filters.startDateFrom = startDateFrom;
  if (endDateTo) filters.endDateTo = endDateTo;
  if (startTimeFrom) filters.startTimeFrom = startTimeFrom;
  if (endTimeTo) filters.endTimeTo = endTimeTo;

  return filters;
};

export const applyPostingDateTimeFilters = <Q extends PostingQueryLike>(
  query: Q,
  filters: PostingDateTimeFilters,
): Q => {
  let nextQuery = query;

  if (filters.startDateFrom) {
    nextQuery = nextQuery.where('organization_posting.start_date', '>=', filters.startDateFrom) as Q;
  }

  if (filters.endDateTo) {
    nextQuery = nextQuery
      .where('organization_posting.end_date', 'is not', null)
      .where('organization_posting.end_date', '<=', filters.endDateTo) as Q;
  }

  if (filters.startTimeFrom) {
    nextQuery = nextQuery.where('organization_posting.start_time', '>=', filters.startTimeFrom) as Q;
  }

  if (filters.endTimeTo) {
    nextQuery = nextQuery
      .where('organization_posting.end_time', 'is not', null)
      .where('organization_posting.end_time', '<=', filters.endTimeTo) as Q;
  }

  return nextQuery;
};

export const matchesPostingDateTimeFilters = <T extends Pick<PostingSortLike, 'start_date' | 'start_time' | 'end_date' | 'end_time'>>(
  posting: T,
  filters: PostingDateTimeFilters,
): boolean => {
  const postingStartDateKey = normalizeDateKey(posting.start_date);
  const postingEndDateKey = normalizeDateKey(posting.end_date);
  const startDateFilterKey = normalizeDateKey(filters.startDateFrom);
  const endDateFilterKey = normalizeDateKey(filters.endDateTo);
  const postingStartTimeKey = normalizeTimeKey(posting.start_time);
  const postingEndTimeKey = normalizeTimeKey(posting.end_time);
  const startTimeFilterKey = normalizeTimeKey(filters.startTimeFrom);
  const endTimeFilterKey = normalizeTimeKey(filters.endTimeTo);

  if (startDateFilterKey && (!postingStartDateKey || postingStartDateKey < startDateFilterKey)) {
    return false;
  }

  if (endDateFilterKey && (!postingEndDateKey || postingEndDateKey > endDateFilterKey)) {
    return false;
  }

  if (startTimeFilterKey && (!postingStartTimeKey || postingStartTimeKey < startTimeFilterKey)) {
    return false;
  }

  if (endTimeFilterKey && (!postingEndTimeKey || postingEndTimeKey > endTimeFilterKey)) {
    return false;
  }

  return true;
};

export const matchesPostingSearch = <T extends PostingSearchLike>(posting: T, search: string): boolean => {
  if (!search) return true;

  const normalizedSearch = search.toLowerCase();

  return posting.title.toLowerCase().includes(normalizedSearch)
    || posting.description.toLowerCase().includes(normalizedSearch)
    || posting.location_name.toLowerCase().includes(normalizedSearch)
    || (posting.organization_name?.toLowerCase().includes(normalizedSearch) ?? false)
    || posting.skills.some(skill => skill.name.toLowerCase().includes(normalizedSearch));
};

export const sortPostingsBySharedSort = <T extends PostingSortLike>(
  postings: T[],
  sortBy: SharedPostingSortBy,
  sortDir: PostingSortDir,
): T[] => {
  return [...postings].sort((left, right) => {
    switch (sortBy) {
      case 'created_at':
        return compareNullableKeys(
          normalizeTimestampKey(left.created_at),
          normalizeTimestampKey(right.created_at),
          sortDir,
        );
      case 'end_date': {
        const dateCompare = compareNullableKeys(
          normalizeDateKey(left.end_date ?? left.start_date),
          normalizeDateKey(right.end_date ?? right.start_date),
          sortDir,
        );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return compareNullableKeys(
          normalizeTimeKey(left.end_time ?? left.start_time),
          normalizeTimeKey(right.end_time ?? right.start_time),
          sortDir,
        );
      }
      case 'start_date':
      default: {
        const dateCompare = compareNullableKeys(
          normalizeDateKey(left.start_date),
          normalizeDateKey(right.start_date),
          sortDir,
        );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return compareNullableKeys(
          normalizeTimeKey(left.start_time),
          normalizeTimeKey(right.start_time),
          sortDir,
        );
      }
    }
  });
};

export const applySharedPostingSort = <Q extends PostingQueryLike>(
  query: Q,
  sortBy: SharedPostingSortBy,
  sortDir: PostingSortDir,
): Q => {
  switch (sortBy) {
    case 'created_at':
      return query.orderBy('organization_posting.created_at', sortDir) as Q;
    case 'end_date':
      return query
        .orderBy(sql`coalesce(organization_posting.end_date, organization_posting.start_date)`, sortDir)
        .orderBy(sql`coalesce(organization_posting.end_time, organization_posting.start_time)`, sortDir) as Q;
    case 'start_date':
    default:
      return query
        .orderBy('organization_posting.start_date', sortDir)
        .orderBy('organization_posting.start_time', sortDir) as Q;
  }
};
