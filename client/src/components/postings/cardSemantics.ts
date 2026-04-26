export const CARD_COLORS = {
  crisis: 'accent',
  enrollment: 'success',
  pending: 'warning',
} as const;

export const CARD_BADGES = {
  crisis: 'badge badge-accent badge-outline inline-flex items-center gap-1',
  enrollment: 'badge badge-success inline-flex items-center gap-1',
  pending: 'badge badge-warning inline-flex items-center gap-1',
  neutral: 'badge badge-ghost inline-flex items-center gap-1',
} as const;
