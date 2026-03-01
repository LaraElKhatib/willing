import { OrganizationPosting, PostingSkill } from '../../../db/tables.js';
import { PostingWithSkills, PostingEnrollment, Success, PostingApplication } from '../../../types.js';

export type OrganizationPostingCreateResponse = {
  posting: OrganizationPosting;
  skills: PostingSkill[];
};

export type OrganizationPostingListResponse = {
  postings: PostingWithSkills[];
};

export type OrganizationPostingResponse = {
  posting: OrganizationPosting;
  skills: PostingSkill[];
};

export type OrganizationPostingEnrollmentsResponse = {
  enrollments: PostingEnrollment[];
};

export type OrganizationPostingUpdateResponse = {
  posting: OrganizationPosting;
  skills: PostingSkill[];
};

export type OrganizationPostingDeleteResponse = Success;

export type OrganizationPostingApplicationsReponse = {
  applications: PostingApplication[];
};

export type OrganizationPostingApplicationAcceptanceResponse = Success;

export type OrganizationPostingApplicationRejectionResponse = Success;
