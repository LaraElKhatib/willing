import type { Generated } from 'kysely';

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
