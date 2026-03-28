import { type Crisis } from '../../../db/tables/index.ts';
import { type SuccessResponse } from '../../../types.ts';

export type AdminCrisesResponse = {
  crises: Crisis[];
};

export type AdminCrisisCreateResponse = {
  crisis: Crisis;
};

export type AdminCrisisUpdateResponse = {
  crisis: Crisis;
};

export type AdminCrisisPinResponse = {
  crisis: Crisis;
};

export type AdminCrisisDeleteResponse = SuccessResponse;
