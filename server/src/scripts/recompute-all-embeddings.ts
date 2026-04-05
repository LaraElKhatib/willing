import config from '../config.ts';
import database from '../db/index.ts';
import {
  recomputeOrganizationVector,
  recomputePostingVectors,
  recomputeVolunteerExperienceVector,
  recomputeVolunteerProfileVector,
} from '../services/embeddings/updates.ts';

const MAX_PASSES = 3;

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

async function recomputeAllEmbeddings() {
  if (config.NODE_ENV === 'production') {
    throw new Error('Refusing to recompute all embeddings in production.');
  }

  const { organizationIds, postingIds, volunteerIds } = await getIds();

  console.log('Starting full embedding recomputation...');
  console.log(`Organizations: ${organizationIds.length}, Postings: ${postingIds.length}, Volunteers: ${volunteerIds.length}`);

  for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
    console.log(`\nPass ${pass}/${MAX_PASSES}`);

    for (const organizationId of organizationIds) {
      await recomputeOrganizationVector(organizationId, database);
    }

    for (const postingId of postingIds) {
      await recomputePostingVectors(postingId, database);
    }

    for (const volunteerId of volunteerIds) {
      await recomputeVolunteerProfileVector(volunteerId, database);
    }

    for (const volunteerId of volunteerIds) {
      await recomputeVolunteerExperienceVector(volunteerId, database);
    }

    const missing = await getMissingCounts();
    console.log(
      `Missing vectors after pass ${pass}: org=${missing.orgMissing}, opportunity=${missing.opportunityMissing}, context=${missing.contextMissing}, profile=${missing.profileMissing}, experience=${missing.experienceMissing}`,
    );

    if (missing.orgMissing === 0
      && missing.opportunityMissing === 0
      && missing.contextMissing === 0
      && missing.profileMissing === 0
    ) {
      console.log('Core vector fields are fully populated.');
      break;
    }
  }
}

recomputeAllEmbeddings()
  .catch((error) => {
    console.error('Recompute-all embeddings failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.destroy();
  });
