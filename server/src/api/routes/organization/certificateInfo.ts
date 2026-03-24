import fs from 'fs';

import { Router, Response } from 'express';
import sharp from 'sharp';

import {
  GetCertificateInfoResponse,
  UpdateCertificateInfoResponse,
  UploadCertificateSignatureResponse,
  DeleteCertificateSignatureResponse,
} from './certificateInfo.types.js';
import database from '../../../db/index.js';
import {
  organizationCertificateInfoSchema,
  newOrganizationCertificateInfoSchema,
} from '../../../db/tables/index.js';
import { orgSignatureMulter, getAbsoluteSignaturePath } from '../../../services/uploads/orgSignature.js';
import uploadSingle from '../../../services/uploads/uploadSingle.js';

const certificateInfoRouter = Router();
const requiredCertificateFieldsSchema = organizationCertificateInfoSchema.pick({
  hours_threshold: true,
  signatory_name: true,
  signatory_position: true,
  signature_path: true,
});

const validateCertificateEnabledRequirements = ({
  certificateInfo,
  hasLogo,
}: {
  certificateInfo: {
    hours_threshold: number | null;
    signatory_name: string | null;
    signatory_position: string | null;
    signature_path: string | null;
  };
  hasLogo: boolean;
}) => {
  if (!hasLogo) {
    return 'Organization profile picture is required to enable certificates.';
  }

  const parsed = requiredCertificateFieldsSchema.safeParse(certificateInfo);
  if (!parsed.success) {
    return 'Certificate information is incomplete.';
  }

  if (
    parsed.data.hours_threshold === null
    || !parsed.data.signatory_name?.trim()
    || !parsed.data.signatory_position?.trim()
    || !parsed.data.signature_path?.trim()
  ) {
    return 'Please provide minimum volunteer hours, signatory name, signatory position, and signature before enabling certificates.';
  }

  return null;
};

// GET /organization/certificate-info
certificateInfoRouter.get('/', async (req, res: Response<GetCertificateInfoResponse>) => {
  const organizationId = req.userJWT!.id;

  const organization = await database
    .selectFrom('organization_account')
    .select(['certificate_info_id'])
    .where('id', '=', organizationId)
    .executeTakeFirstOrThrow();

  let certificateInfo = null;

  if (organization.certificate_info_id) {
    certificateInfo = await database
      .selectFrom('organization_certificate_info')
      .selectAll()
      .where('id', '=', organization.certificate_info_id)
      .executeTakeFirst();
  }

  res.json({ certificateInfo: certificateInfo || null });
});

// PUT /organization/certificate-info (update info without signature)
certificateInfoRouter.put('/', async (req, res: Response<UpdateCertificateInfoResponse>) => {
  const organizationId = req.userJWT!.id;
  const body = newOrganizationCertificateInfoSchema
    .omit({ signature_path: true })
    .partial()
    .parse(req.body);

  const organization = await database
    .selectFrom('organization_account')
    .select(['certificate_info_id', 'logo_path'])
    .where('id', '=', organizationId)
    .executeTakeFirstOrThrow();

  let certificateInfo;

  if (organization.certificate_info_id) {
    const currentInfo = await database
      .selectFrom('organization_certificate_info')
      .selectAll()
      .where('id', '=', organization.certificate_info_id)
      .executeTakeFirstOrThrow();

    const nextInfo = {
      hours_threshold: body.hours_threshold ?? currentInfo.hours_threshold,
      signatory_name: body.signatory_name ?? currentInfo.signatory_name,
      signatory_position: body.signatory_position ?? currentInfo.signatory_position,
      signature_path: currentInfo.signature_path,
      certificate_feature_enabled: body.certificate_feature_enabled ?? currentInfo.certificate_feature_enabled,
    };

    if (nextInfo.certificate_feature_enabled) {
      const validationError = validateCertificateEnabledRequirements({
        certificateInfo: nextInfo,
        hasLogo: Boolean(organization.logo_path),
      });
      if (validationError) {
        res.status(400);
        throw new Error(validationError);
      }
    }

    // Update existing certificate info
    certificateInfo = await database
      .updateTable('organization_certificate_info')
      .set(body)
      .where('id', '=', organization.certificate_info_id)
      .returningAll()
      .executeTakeFirstOrThrow();
  } else {
    // Create new certificate info
    const createPayload = {
      ...body,
      certificate_feature_enabled: body.certificate_feature_enabled ?? false,
    };

    if (createPayload.certificate_feature_enabled) {
      const validationError = validateCertificateEnabledRequirements({
        certificateInfo: {
          hours_threshold: createPayload.hours_threshold ?? null,
          signatory_name: createPayload.signatory_name ?? null,
          signatory_position: createPayload.signatory_position ?? null,
          signature_path: null,
        },
        hasLogo: Boolean(organization.logo_path),
      });
      if (validationError) {
        res.status(400);
        throw new Error(validationError);
      }
    }

    certificateInfo = await database
      .insertInto('organization_certificate_info')
      .values(createPayload)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Link it to the organization
    await database
      .updateTable('organization_account')
      .set({ certificate_info_id: certificateInfo.id })
      .where('id', '=', organizationId)
      .execute();
  }

  res.json({ certificateInfo });
});

// POST /organization/certificate-info/upload-signature (upload signature file)
certificateInfoRouter.post(
  '/upload-signature',
  uploadSingle(orgSignatureMulter, 'signature'),
  async (req, res: Response<UploadCertificateSignatureResponse>) => {
    if (!req.file) {
      res.status(400);
      throw new Error('No signature file provided');
    }

    const organizationId = req.userJWT!.id;
    const uploadedSignaturePath = req.file.filename;
    const uploadedAbsolutePath = getAbsoluteSignaturePath(uploadedSignaturePath);
    const normalizedSignaturePath = `org-signature-${organizationId}-${Date.now()}-normalized.png`;
    const normalizedAbsolutePath = getAbsoluteSignaturePath(normalizedSignaturePath);

    try {
      await sharp(uploadedAbsolutePath)
        .trim({ threshold: 10 })
        .flatten({ background: '#ffffff' })
        .png()
        .toFile(normalizedAbsolutePath);
      await fs.promises.unlink(uploadedAbsolutePath).catch(() => {});
    } catch (_error) {
      await fs.promises.unlink(uploadedAbsolutePath).catch(() => {});
      res.status(400);
      throw new Error('Failed to process signature image. Please upload a valid PNG, JPG, or SVG file.');
    }

    const organization = await database
      .selectFrom('organization_account')
      .select(['certificate_info_id'])
      .where('id', '=', organizationId)
      .executeTakeFirstOrThrow();

    let certificateInfo;

    if (organization.certificate_info_id) {
      // Get existing certificate info to delete old signature if exists
      const existing = await database
        .selectFrom('organization_certificate_info')
        .select(['signature_path'])
        .where('id', '=', organization.certificate_info_id)
        .executeTakeFirstOrThrow();

      if (existing.signature_path) {
        const oldPath = getAbsoluteSignaturePath(existing.signature_path);
        try {
          await fs.promises.unlink(oldPath);
        } catch (error) {
          console.error(`Failed to delete old signature: ${oldPath}`, error);
        }
      }

      // Update certificate info with new signature
      certificateInfo = await database
        .updateTable('organization_certificate_info')
        .set({ signature_path: normalizedSignaturePath })
        .where('id', '=', organization.certificate_info_id)
        .returningAll()
        .executeTakeFirstOrThrow();
    } else {
      // Create new certificate info with signature
      certificateInfo = await database
        .insertInto('organization_certificate_info')
        .values({
          signature_path: normalizedSignaturePath,
          certificate_feature_enabled: false,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Link it to the organization
      await database
        .updateTable('organization_account')
        .set({ certificate_info_id: certificateInfo.id })
        .where('id', '=', organizationId)
        .execute();
    }

    res.json({ certificateInfo });
  },
);

// DELETE /organization/certificate-info/signature (delete signature file)
certificateInfoRouter.delete(
  '/signature',
  async (req, res: Response<DeleteCertificateSignatureResponse>) => {
    const organizationId = req.userJWT!.id;

    const organization = await database
      .selectFrom('organization_account')
      .select(['certificate_info_id'])
      .where('id', '=', organizationId)
      .executeTakeFirstOrThrow();

    if (!organization.certificate_info_id) {
      res.status(404);
      throw new Error('Certificate info not found');
    }

    const certificateInfo = await database
      .selectFrom('organization_certificate_info')
      .select(['signature_path', 'certificate_feature_enabled'])
      .where('id', '=', organization.certificate_info_id)
      .executeTakeFirstOrThrow();

    if (certificateInfo.certificate_feature_enabled) {
      res.status(400);
      throw new Error('Disable certificates before removing signature.');
    }

    if (certificateInfo.signature_path) {
      const oldPath = getAbsoluteSignaturePath(certificateInfo.signature_path);
      try {
        await fs.promises.unlink(oldPath);
      } catch (error) {
        console.error(`Failed to delete signature: ${oldPath}`, error);
      }

      // Clear signature path in database
      await database
        .updateTable('organization_certificate_info')
        .set({ signature_path: null })
        .where('id', '=', organization.certificate_info_id)
        .execute();
    }

    res.json({});
  },
);

export default certificateInfoRouter;
