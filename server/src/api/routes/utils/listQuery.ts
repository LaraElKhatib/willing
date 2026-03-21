import zod from 'zod';

import { getSingleQueryValue } from './queryValue.js';

type SortDir = 'asc' | 'desc';

type ParseListQueryOptions<SortBy extends string> = {
  allowedSortBy: readonly SortBy[];
  defaultSortBy: SortBy;
  defaultSortDir?: SortDir;
};

type ParsedListQuery<SortBy extends string> = {
  search: string;
  sortBy: SortBy;
  sortDir: SortDir;
};

const sortDirSchema = zod.enum(['asc', 'desc']);

export const parseListQuery = <SortBy extends string>(
  query: Record<string, unknown>,
  options: ParseListQueryOptions<SortBy>,
): ParsedListQuery<SortBy> => {
  const {
    allowedSortBy,
    defaultSortBy,
    defaultSortDir = 'desc',
  } = options;

  const sortByInput = getSingleQueryValue(query.sortBy);
  const sortDirInput = getSingleQueryValue(query.sortDir);
  const searchInput = getSingleQueryValue(query.search);

  const sortBy = sortByInput && allowedSortBy.includes(sortByInput as SortBy)
    ? sortByInput as SortBy
    : defaultSortBy;

  const sortDir = sortDirInput && sortDirSchema.safeParse(sortDirInput).success
    ? sortDirInput as SortDir
    : defaultSortDir;

  const search = (searchInput ?? '').trim();

  return { search, sortBy, sortDir };
};

export const parseOptionalBooleanQueryParam = (value: unknown): boolean | undefined => {
  const singleValue = getSingleQueryValue(value);

  if (!singleValue) {
    return undefined;
  }

  const normalized = singleValue.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return undefined;
};

export const parseOptionalNumberQueryParam = (value: unknown): number | undefined => {
  const singleValue = getSingleQueryValue(value);

  if (!singleValue) {
    return undefined;
  }

  const parsed = Number(singleValue);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
};
