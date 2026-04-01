import { sql, type Kysely } from 'kysely';

import { type Database } from '../../../db/tables/index.ts';
import { type PostingWithContext, type PostingApplicationStatus } from '../../../types.ts';

export const postingWithContextSelectColumns = [
  'organization_posting.id',
  'organization_posting.organization_id',
  'organization_posting.crisis_id',
  'organization_posting.title',
  'organization_posting.description',
  'organization_posting.latitude',
  'organization_posting.longitude',
  'organization_posting.max_volunteers',
  'organization_posting.start_date',
  'organization_posting.start_time',
  'organization_posting.end_date',
  'organization_posting.end_time',
  'organization_posting.minimum_age',
  'organization_posting.automatic_acceptance',
  'organization_posting.is_closed',
  'organization_posting.allows_partial_attendance',
  'organization_posting.location_name',
  'organization_posting.created_at',
  'organization_posting.updated_at',
  'crisis.name as crisis_name',
  'organization_account.name as organization_name',
  'organization_account.logo_path as organization_logo_path',
] as const;

type PostingWithContextBase = Omit<PostingWithContext, 'skills' | 'enrollment_count' | 'application_status'>;

type BuildPostingsWithContextOptions = {
  volunteerId: number;
  postings: PostingWithContextBase[];
  applicationStatusByPostingId?: ReadonlyMap<number, Extract<PostingApplicationStatus, 'registered' | 'pending'>>;
};

export async function buildPostingsWithContext(
  db: Kysely<Database>,
  {
    volunteerId,
    postings,
    applicationStatusByPostingId,
  }: BuildPostingsWithContextOptions,
): Promise<PostingWithContext[]> {
  if (postings.length === 0) {
    return [];
  }

  const postingIds = postings.map(posting => posting.id);

  const [skills, enrollmentCounts, volunteerEnrollments, volunteerPendingApplications] = await Promise.all([
    db
      .selectFrom('posting_skill')
      .selectAll()
      .where('posting_id', 'in', postingIds)
      .execute(),
    db
      .selectFrom('enrollment')
      .select([
        'posting_id',
        sql<number>`count(enrollment.id)`.as('count'),
      ])
      .where('posting_id', 'in', postingIds)
      .groupBy('posting_id')
      .execute(),
    applicationStatusByPostingId
      ? Promise.resolve([])
      : db
          .selectFrom('enrollment')
          .select('posting_id')
          .where('volunteer_id', '=', volunteerId)
          .where('posting_id', 'in', postingIds)
          .execute(),
    applicationStatusByPostingId
      ? Promise.resolve([])
      : db
          .selectFrom('enrollment_application')
          .select('posting_id')
          .where('volunteer_id', '=', volunteerId)
          .where('posting_id', 'in', postingIds)
          .execute(),
  ]);

  const skillsByPostingId = new Map<number, typeof skills>();
  skills.forEach((skill) => {
    if (!skillsByPostingId.has(skill.posting_id)) {
      skillsByPostingId.set(skill.posting_id, []);
    }
    skillsByPostingId.get(skill.posting_id)!.push(skill);
  });

  const countsByPostingId = new Map<number, number>();
  enrollmentCounts.forEach((countRow) => {
    countsByPostingId.set(countRow.posting_id, Number(countRow.count ?? 0));
  });

  const resolvedApplicationStatusByPostingId = new Map<number, PostingApplicationStatus>();

  if (applicationStatusByPostingId) {
    applicationStatusByPostingId.forEach((status, postingId) => {
      resolvedApplicationStatusByPostingId.set(postingId, status);
    });
  } else {
    volunteerPendingApplications.forEach((row) => {
      resolvedApplicationStatusByPostingId.set(row.posting_id, 'pending');
    });
    volunteerEnrollments.forEach((row) => {
      resolvedApplicationStatusByPostingId.set(row.posting_id, 'registered');
    });
  }

  return postings.map(posting => ({
    ...posting,
    crisis_name: posting.crisis_name ?? null,
    skills: skillsByPostingId.get(posting.id) ?? [],
    enrollment_count: countsByPostingId.get(posting.id) ?? 0,
    application_status: resolvedApplicationStatusByPostingId.get(posting.id) ?? 'none',
  }));
}
