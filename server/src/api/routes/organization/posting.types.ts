import { type Crisis, type PostingWithoutVectors, type PostingSkill } from '../../../db/tables/index.ts';
import { type PostingWithSkills, type PostingEnrollment, type SuccessResponse, type PostingApplication } from '../../../types.ts';

export type PostingCreateResponse = {
  posting: PostingWithoutVectors;
  skills: PostingSkill[];
};

export type PostingListResponse = {
  postings: (PostingWithSkills & { enrollment_count: number; is_full: boolean })[];
};

export type PostingResponse = {
  posting: PostingWithoutVectors;
  skills: PostingSkill[];
  is_full: boolean;
  crisis?: Crisis;
};

export type PostingEnrollmentsResponse = {
  enrollments: PostingEnrollment[];
};

export type PostingUpdateResponse = {
  posting: PostingWithoutVectors;
  skills: PostingSkill[];
  crisis?: Crisis;
};

export type PostingDeleteResponse = SuccessResponse;

export type PostingApplicationsReponse = {
  applications: PostingApplication[];
};

export type PostingApplicationAcceptanceResponse = SuccessResponse;

export type PostingApplicationRejectionResponse = SuccessResponse;
