import fs from 'fs';
import path from 'path';

import { sql } from 'kysely';
import zod from 'zod';

import config from '../config.ts';
import database from '../db/index.ts';

const DATASET_PATH = path.resolve('src/scripts/data/recommendation/dataset.json');
const TOP_K = 5;

const datasetSchema = zod.object({
  volunteers: zod.array(zod.object({
    id: zod.number().int().positive(),
    email: zod.email(),
  })),
  new_postings: zod.array(zod.object({
    id: zod.number().int().positive(),
    title: zod.string().min(1),
  })),
  expected_matches: zod.array(zod.object({
    volunteer_id: zod.number().int().positive(),
    top_5_new_posting_ids: zod.array(zod.number().int().positive()).length(TOP_K),
  })),
});

type AuditDataset = zod.infer<typeof datasetSchema>;

const loadDataset = (): AuditDataset => {
  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`Dataset file not found: ${DATASET_PATH}`);
  }

  const raw = fs.readFileSync(DATASET_PATH, 'utf8');
  return datasetSchema.parse(JSON.parse(raw));
};

const getVectorCoverage = async () => {
  const [org, postingOpp, postingCtx, volunteerProfile, volunteerExperience] = await Promise.all([
    database
      .selectFrom('organization_account')
      .select(sql<number>`count(*) filter (where org_vector is null)`.as('missing'))
      .select(sql<number>`count(*)`.as('total'))
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('organization_posting')
      .select(sql<number>`count(*) filter (where opportunity_vector is null)`.as('missing'))
      .select(sql<number>`count(*)`.as('total'))
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('organization_posting')
      .select(sql<number>`count(*) filter (where posting_context_vector is null)`.as('missing'))
      .select(sql<number>`count(*)`.as('total'))
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('volunteer_account')
      .select(sql<number>`count(*) filter (where profile_vector is null)`.as('missing'))
      .select(sql<number>`count(*)`.as('total'))
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('volunteer_account')
      .select(sql<number>`count(*) filter (where experience_vector is null)`.as('missing'))
      .select(sql<number>`count(*)`.as('total'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    organization: { missing: Number(org.missing), total: Number(org.total) },
    postingOpportunity: { missing: Number(postingOpp.missing), total: Number(postingOpp.total) },
    postingContext: { missing: Number(postingCtx.missing), total: Number(postingCtx.total) },
    volunteerProfile: { missing: Number(volunteerProfile.missing), total: Number(volunteerProfile.total) },
    volunteerExperience: { missing: Number(volunteerExperience.missing), total: Number(volunteerExperience.total) },
  };
};

const getVolunteerRecommendations = async (volunteerId: number) => {
  const vectors = await database
    .selectFrom('volunteer_account')
    .select(['profile_vector', 'experience_vector'])
    .where('id', '=', volunteerId)
    .executeTakeFirstOrThrow();

  const hasProfile = Boolean(vectors.profile_vector);
  const hasExperience = Boolean(vectors.experience_vector);

  let query = database
    .selectFrom('organization_posting')
    .select(['organization_posting.id', 'organization_posting.title'])
    .where('organization_posting.is_closed', '=', false)
    .where(({ not, exists, selectFrom, or }) => not(or([
      exists(
        selectFrom('enrollment')
          .select('enrollment.id')
          .whereRef('enrollment.posting_id', '=', 'organization_posting.id')
          .where('enrollment.volunteer_id', '=', volunteerId),
      ),
      exists(
        selectFrom('enrollment_application')
          .select('enrollment_application.id')
          .whereRef('enrollment_application.posting_id', '=', 'organization_posting.id')
          .where('enrollment_application.volunteer_id', '=', volunteerId),
      ),
    ])));

  if (hasProfile && vectors.profile_vector) {
    const profileSimilarity = sql<number>`1 - (organization_posting.posting_context_vector <=> ${vectors.profile_vector}::vector)`;

    if (hasExperience && vectors.experience_vector) {
      const experienceSimilarity = sql<number>`1 - (organization_posting.posting_context_vector <=> ${vectors.experience_vector}::vector)`;
      const finalScore = sql<number>`(0.6 * ${profileSimilarity}) + (0.4 * ${experienceSimilarity})`;
      query = query.orderBy(sql`${finalScore} desc nulls last`);
    } else {
      const profileOnlyScore = sql<number>`0.6 * ${profileSimilarity}`;
      query = query.orderBy(sql`${profileOnlyScore} desc nulls last`);
    }

    query = query.orderBy('organization_posting.start_date', 'desc').orderBy('organization_posting.start_time', 'desc');
  } else {
    query = query.orderBy('organization_posting.start_date', 'desc').orderBy('organization_posting.start_time', 'desc');
  }

  return query.limit(TOP_K).execute();
};

const auditRecommendations = async (dataset: AuditDataset) => {
  const emailByVolunteerDatasetId = new Map<number, string>();
  dataset.volunteers.forEach((volunteer) => {
    emailByVolunteerDatasetId.set(volunteer.id, volunteer.email);
  });

  const newPostingTitleByDatasetId = new Map<number, string>();
  dataset.new_postings.forEach((posting) => {
    newPostingTitleByDatasetId.set(posting.id, posting.title);
  });

  let volunteersChecked = 0;
  let exactTop5Matches = 0;
  let totalHitCount = 0;

  console.log('\nRecommendation Audit (Top-5):');

  for (const expected of dataset.expected_matches) {
    const email = emailByVolunteerDatasetId.get(expected.volunteer_id);
    if (!email) {
      console.log(`- volunteer_id=${expected.volunteer_id}: SKIPPED (missing email in dataset)`);
      continue;
    }

    const volunteer = await database
      .selectFrom('volunteer_account')
      .select(['id', 'email'])
      .where('email', '=', email)
      .executeTakeFirst();

    if (!volunteer) {
      console.log(`- ${email}: SKIPPED (not found in DB)`);
      continue;
    }

    const expectedTitles = expected.top_5_new_posting_ids
      .map(id => newPostingTitleByDatasetId.get(id))
      .filter((title): title is string => Boolean(title));
    const actual = await getVolunteerRecommendations(volunteer.id);
    const actualTitles = actual.map(posting => posting.title);

    const hitCount = expectedTitles.filter(title => actualTitles.includes(title)).length;
    const isExact = expectedTitles.length === TOP_K && expectedTitles.every((title, index) => title === actualTitles[index]);

    volunteersChecked += 1;
    totalHitCount += hitCount;
    if (isExact) exactTop5Matches += 1;

    console.log(`- ${email}: hits=${hitCount}/${TOP_K}${isExact ? ' (exact order match)' : ''}`);
  }

  const precisionAt5 = volunteersChecked === 0 ? 0 : totalHitCount / (volunteersChecked * TOP_K);
  const exactMatchRate = volunteersChecked === 0 ? 0 : exactTop5Matches / volunteersChecked;

  console.log('\nRecommendation Summary:');
  console.log(`- Volunteers audited: ${volunteersChecked}`);
  console.log(`- Aggregate Precision@5: ${precisionAt5.toFixed(3)}`);
  console.log(`- Exact top-5 order match rate: ${(exactMatchRate * 100).toFixed(1)}%`);
};

async function main() {
  if (config.NODE_ENV === 'production') {
    throw new Error('Refusing to audit recommendations in production.');
  }

  const dataset = loadDataset();
  const coverage = await getVectorCoverage();

  console.log('Vector Coverage:');
  console.log(`- organization_account.org_vector missing: ${coverage.organization.missing}/${coverage.organization.total}`);
  console.log(`- organization_posting.opportunity_vector missing: ${coverage.postingOpportunity.missing}/${coverage.postingOpportunity.total}`);
  console.log(`- organization_posting.posting_context_vector missing: ${coverage.postingContext.missing}/${coverage.postingContext.total}`);
  console.log(`- volunteer_account.profile_vector missing: ${coverage.volunteerProfile.missing}/${coverage.volunteerProfile.total}`);
  console.log(`- volunteer_account.experience_vector missing: ${coverage.volunteerExperience.missing}/${coverage.volunteerExperience.total}`);

  await auditRecommendations(dataset);
}

main()
  .catch((error) => {
    console.error('Recommendation audit failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.destroy();
  });
