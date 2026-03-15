import database from '../../../db/index.js';
import { type PostingEnrollment } from '../../../types.js';

export const getPostingEnrollments = async (postingId: number): Promise<PostingEnrollment[]> => {
  const enrollments = await database
    .selectFrom('enrollment')
    .innerJoin('volunteer_account', 'volunteer_account.id', 'enrollment.volunteer_id')
    .select([
      'enrollment.id as enrollment_id',
      'enrollment.volunteer_id',
      'enrollment.message',
      'enrollment.attended',
      'volunteer_account.first_name',
      'volunteer_account.last_name',
      'volunteer_account.email',
      'volunteer_account.date_of_birth',
      'volunteer_account.gender',
    ])
    .where('enrollment.posting_id', '=', postingId)
    .orderBy('volunteer_account.last_name', 'asc')
    .orderBy('volunteer_account.first_name', 'asc')
    .execute();

  const volunteerIds = enrollments.map(enrollment => enrollment.volunteer_id);
  const skills = volunteerIds.length > 0
    ? await database
        .selectFrom('volunteer_skill')
        .selectAll()
        .where('volunteer_id', 'in', volunteerIds)
        .execute()
    : [];

  const skillsByVolunteerId = new Map<number, typeof skills>();
  skills.forEach((skill) => {
    if (!skillsByVolunteerId.has(skill.volunteer_id)) {
      skillsByVolunteerId.set(skill.volunteer_id, []);
    }
    skillsByVolunteerId.get(skill.volunteer_id)!.push(skill);
  });

  return enrollments.map(enrollment => ({
    ...enrollment,
    skills: skillsByVolunteerId.get(enrollment.volunteer_id) || [],
  }));
};
