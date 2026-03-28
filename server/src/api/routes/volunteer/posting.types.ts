import { type Enrollment, type EnrollmentApplication } from '../../../db/tables/index.ts';
import { type PostingWithContext, type SuccessResponse } from '../../../types.ts';

export type VolunteerEnrollmentsResponse = {
  postings: PostingWithContext[];
};

export type VolunteerPostingSearchResponse = {
  postings: PostingWithContext[];
};

export type VolunteerPostingResponse = {
  posting: PostingWithContext;
};

export type VolunteerPostingEnrollResponse = {
  enrollment: Enrollment | EnrollmentApplication;
  isOpen: boolean;
};

export type VolunteerPostingWithdrawResponse = SuccessResponse;
