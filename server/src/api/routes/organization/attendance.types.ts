import { OrganizationPostingWithoutVectors } from '../../../db/tables/index.js';
import { PostingEnrollment, SuccessResponse } from '../../../types.js';

export type OrganizationPostingEnrollmentAttendanceUpdateResponse = SuccessResponse;

export type OrganizationPostingAttendanceResponse = {
  posting: Pick<OrganizationPostingWithoutVectors, 'id' | 'title' | 'location_name'>;
  enrollments: PostingEnrollment[];
};

export type OrganizationPostingAttendanceBulkUpdateResponse = {
  updated_count: number;
};
