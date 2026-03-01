import { Enrollment, OrganizationPosting, PostingSkill } from '../../../db/tables.js';
import { PostingWithSkillsAndOrgName } from '../../../types.js';

export type VolunteerPostingSearchResponse = {
  postings: PostingWithSkillsAndOrgName[];
};

export type VolunteerPostingResponse = {
  hasPendingApplication: boolean;
  posting: OrganizationPosting;
  skills: PostingSkill[];
  isEnrolled: boolean;
};

export type VolunteerPostingEnrollResponse = {
  enrollment: Enrollment;
};
