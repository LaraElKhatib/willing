import type { Generated } from 'kysely';

export type WithGeneratedColumns<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: Generated<T[P]>;
};

export type WithGeneratedID<T> = Omit<T, 'id'> & {
  id: Generated<number>;
};

export type WithGeneratedIDAndCreatedAt<T> = Omit<T, 'id' | 'created_at'> & {
  id: Generated<number>;
  created_at: Generated<Date>;
};

export type WithGeneratedIDAndTimestamps<T> = Omit<T, 'id' | 'created_at' | 'updated_at'> & {
  id: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};
