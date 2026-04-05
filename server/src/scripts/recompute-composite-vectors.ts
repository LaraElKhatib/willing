import config from '../config.ts';
import database from '../db/index.ts';
import {
  recomputeOrganizationCompositeVectorOnly,
  recomputePostingContextVectorOnly,
  recomputeVolunteerExperienceVector,
} from '../services/embeddings/updates.ts';

const getIds = async () => {
  const [organizationRows, postingRows, volunteerRows] = await Promise.all([
    database.selectFrom('organization_account').select('id').orderBy('id', 'asc').execute(),
    database.selectFrom('organization_posting').select('id').orderBy('id', 'asc').execute(),
    database.selectFrom('volunteer_account').select('id').orderBy('id', 'asc').execute(),
  ]);

  return {
    organizationIds: organizationRows.map(row => row.id),
    postingIds: postingRows.map(row => row.id),
    volunteerIds: volunteerRows.map(row => row.id),
  };
};

const getMissingCounts = async () => {
  const [org, opp, ctx, profile, experience] = await Promise.all([
    database.selectFrom('organization_account').select(eb => eb.fn.countAll().as('count')).where('org_vector', 'is', null).executeTakeFirstOrThrow(),
    database.selectFrom('organization_posting').select(eb => eb.fn.countAll().as('count')).where('opportunity_vector', 'is', null).executeTakeFirstOrThrow(),
    database.selectFrom('organization_posting').select(eb => eb.fn.countAll().as('count')).where('posting_context_vector', 'is', null).executeTakeFirstOrThrow(),
    database.selectFrom('volunteer_account').select(eb => eb.fn.countAll().as('count')).where('profile_vector', 'is', null).executeTakeFirstOrThrow(),
    database.selectFrom('volunteer_account').select(eb => eb.fn.countAll().as('count')).where('experience_vector', 'is', null).executeTakeFirstOrThrow(),
  ]);

  return {
    orgMissing: Number(org.count),
    opportunityMissing: Number(opp.count),
    contextMissing: Number(ctx.count),
    profileMissing: Number(profile.count),
    experienceMissing: Number(experience.count),
  };
};

async function recomputeCompositeVectors() {
  if (config.NODE_ENV === 'production') {
    throw new Error('Refusing to recompute composite vectors in production.');
  }

  const { organizationIds, postingIds, volunteerIds } = await getIds();

  console.log('Starting composite-only vector recomputation (no OpenAI embedding calls)...');
  console.log(`Organizations: ${organizationIds.length}, Postings: ${postingIds.length}, Volunteers: ${volunteerIds.length}`);

  for (const organizationId of organizationIds) {
    await recomputeOrganizationCompositeVectorOnly(organizationId, database);
  }

  for (const postingId of postingIds) {
    await recomputePostingContextVectorOnly(postingId, database, { skipIfMissingOpportunityVector: true });
  }

  for (const volunteerId of volunteerIds) {
    await recomputeVolunteerExperienceVector(volunteerId, database);
  }

  const missing = await getMissingCounts();
  console.log(
    `Missing vectors: org=${missing.orgMissing}, opportunity=${missing.opportunityMissing}, context=${missing.contextMissing}, profile=${missing.profileMissing}, experience=${missing.experienceMissing}`,
  );
}

recomputeCompositeVectors()
  .catch((error) => {
    console.error('Recompute composite vectors failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.destroy();
  });
