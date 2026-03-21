import { sql } from 'kysely';

export type PostingSortDir = 'asc' | 'desc';
export type SharedPostingSortBy = 'start_date' | 'end_date' | 'created_at';

export type PostingDateTimeFilters = {
  startDateFrom?: Date;
  endDateTo?: Date;
  startTimeFrom?: string;
  endTimeTo?: string;
};

type PostingQueryLike = {
  where: (...args: unknown[]) => PostingQueryLike;
  orderBy: (...args: unknown[]) => PostingQueryLike;
};

const getSingleQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value.at(0);
    return typeof firstValue === 'string' ? firstValue : undefined;
  }

  return undefined;
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
        .orderBy(sql`organization_posting.end_date is null`, 'asc')
        .orderBy('organization_posting.end_date', sortDir)
        .orderBy('organization_posting.end_time', sortDir) as Q;
    case 'start_date':
    default:
      return query
        .orderBy('organization_posting.start_date', sortDir)
        .orderBy('organization_posting.start_time', sortDir) as Q;
  }
};
