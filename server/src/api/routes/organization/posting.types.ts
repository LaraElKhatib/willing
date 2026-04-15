import { type Crisis, type PostingWithoutVectors, type PostingSkill } from '../../../db/tables/index.ts';
import { type PostingWithSkills, type PostingEnrollment, type SuccessResponse, type PostingApplication } from '../../../types.ts';

export type OrganizationPostingCreateResponse = {
  posting: PostingWithoutVectors;
  skills: PostingSkill[];
};

export type OrganizationPostingListResponse = {
  postings: (PostingWithSkills & { enrollment_count: number; is_full: boolean })[];
};

export type OrganizationPostingResponse = {
  posting: PostingWithoutVectors;
  skills: PostingSkill[];
  is_full: boolean;
  crisis?: Crisis;
};

export type OrganizationPostingEnrollmentsResponse = {
  enrollments: PostingEnrollment[];
};

export type OrganizationPostingUpdateResponse = {
  posting: PostingWithoutVectors;
  skills: PostingSkill[];
  crisis?: Crisis;
};

export type OrganizationPostingDeleteResponse = SuccessResponse;

export type OrganizationPostingApplicationsReponse = {
  applications: PostingApplication[];
};

export type OrganizationPostingApplicationAcceptanceResponse = SuccessResponse;

export type OrganizationPostingApplicationRejectionResponse = SuccessResponse;
