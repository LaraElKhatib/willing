export const getSingleQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value.at(0);
    return typeof firstValue === 'string' ? firstValue : undefined;
  }

  return undefined;
};
