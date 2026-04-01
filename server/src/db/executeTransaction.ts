import { type Kysely } from 'kysely';

const executeTransaction = async <DB, T>(
  db: Kysely<DB>,
  callback: (executor: Kysely<DB>) => Promise<T>,
): Promise<T> => {
  if (db.isTransaction) {
    return callback(db);
  }

  return db.transaction().execute(async trx => callback(trx));
};

export default executeTransaction;
