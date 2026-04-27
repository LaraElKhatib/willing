export const getLocalOffsetMinutes = (): number => -new Date().getTimezoneOffset();

export const toUtcTime = (localTime: string): string => {
  const [hh, mm] = localTime.split(':').map(Number);
  const totalMinutes = (hh * 60 + mm) - getLocalOffsetMinutes();
  const utcHh = ((totalMinutes / 60 | 0) + 24) % 24;
  const utcMm = ((totalMinutes % 60) + 60) % 60;
  return `${String(utcHh).padStart(2, '0')}:${String(utcMm).padStart(2, '0')}`;
};

export const toLocalTime = (utcTime: string): string => {
  const [hh, mm] = utcTime.split(':').map(Number);
  const totalMinutes = (hh * 60 + mm) + getLocalOffsetMinutes();
  const localHh = ((totalMinutes / 60 | 0) + 24) % 24;
  const localMm = ((totalMinutes % 60) + 60) % 60;
  return `${String(localHh).padStart(2, '0')}:${String(localMm).padStart(2, '0')}`;
};
