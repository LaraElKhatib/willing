export async function setup() {}

export async function teardown() {
  const { default: database } = await import('../db/index.ts');
  await database.destroy();
}
