import { Crisis } from '../../../db/tables/index.js';
import { SuccessResponse } from '../../../types.js';

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
