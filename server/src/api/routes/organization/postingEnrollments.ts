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
      'volunteer_account.cv_path',
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

  return enrollments.map((enrollment) => {
    const payload: PostingEnrollment = {
      enrollment_id: enrollment.enrollment_id,
      volunteer_id: enrollment.volunteer_id,
      message: enrollment.message,
      attended: enrollment.attended,
      first_name: enrollment.first_name,
      last_name: enrollment.last_name,
      email: enrollment.email,
      date_of_birth: enrollment.date_of_birth,
      gender: enrollment.gender,
      skills: skillsByVolunteerId.get(enrollment.volunteer_id) || [],
    };

    if (enrollment.cv_path !== undefined) {
      payload.cv_path = enrollment.cv_path;
    }

    return payload;
  });
};
