import fs from 'fs';

import { Router, type Response } from 'express';
import sharp from 'sharp';

import {
  type AdminCertificateSettingsDeleteSignatureResponse,
  type AdminCertificateSettingsGetResponse,
  type AdminCertificateSettingsUpdateResponse,
  type AdminCertificateSettingsUploadSignatureResponse,
} from './certificateSettings.types.ts';
import database from '../../../db/index.ts';
import { newPlatformCertificateSettingsSchema } from '../../../db/tables/index.ts';
import { getAbsolutePlatformSignaturePath, platformSignatureMulter } from '../../../services/uploads/platformSignature.ts';
import uploadSingle from '../../../services/uploads/uploadSingle.ts';

const certificateSettingsRouter = Router();

certificateSettingsRouter.get('/', async (_req, res: Response<AdminCertificateSettingsGetResponse>) => {
  const settings = await database
    .selectFrom('platform_certificate_settings')
    .selectAll()
    .orderBy('id', 'desc')
    .executeTakeFirst();

  res.json({ settings: settings ?? null });
});

certificateSettingsRouter.put('/', async (req, res: Response<AdminCertificateSettingsUpdateResponse>) => {
  const body = newPlatformCertificateSettingsSchema
    .omit({ signature_path: true })
    .partial()
    .parse(req.body);

  let settings = await database
    .selectFrom('platform_certificate_settings')
    .selectAll()
    .orderBy('id', 'desc')
    .executeTakeFirst();

  if (settings) {
    settings = await database
      .updateTable('platform_certificate_settings')
      .set(body)
      .where('id', '=', settings.id)
      .returningAll()
      .executeTakeFirstOrThrow();
  } else {
    settings = await database
      .insertInto('platform_certificate_settings')
      .values({
        signatory_name: body.signatory_name ?? null,
        signatory_position: body.signatory_position ?? null,
        signature_path: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  res.json({ settings });
});

certificateSettingsRouter.post(
  '/upload-signature',
  uploadSingle(platformSignatureMulter, 'signature'),
  async (req, res: Response<AdminCertificateSettingsUploadSignatureResponse>) => {
    if (!req.file) {
      res.status(400);
      throw new Error('No signature file provided');
    }

    const uploadedPath = req.file.filename;
    const uploadedAbsolutePath = getAbsolutePlatformSignaturePath(uploadedPath);
    const normalizedPath = `platform-signature-${Date.now()}-normalized.png`;
    const normalizedAbsolutePath = getAbsolutePlatformSignaturePath(normalizedPath);

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

    const adminId = req.userJWT!.id;

    let settings = await database
      .selectFrom('platform_certificate_settings')
      .selectAll()
      .orderBy('id', 'desc')
      .executeTakeFirst();

    if (settings?.signature_path) {
      await fs.promises.unlink(getAbsolutePlatformSignaturePath(settings.signature_path)).catch(() => {});
    }

    if (settings) {
      settings = await database
        .updateTable('platform_certificate_settings')
        .set({
          signature_path: normalizedPath,
          signature_uploaded_by_admin_id: adminId,
        })
        .where('id', '=', settings.id)
        .returningAll()
        .executeTakeFirstOrThrow();
    } else {
      settings = await database
        .insertInto('platform_certificate_settings')
        .values({
          signatory_name: null,
          signatory_position: null,
          signature_path: normalizedPath,
          signature_uploaded_by_admin_id: adminId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    res.json({ settings });
  },
);

certificateSettingsRouter.delete('/signature', async (_req, res: Response<AdminCertificateSettingsDeleteSignatureResponse>) => {
  const settings = await database
    .selectFrom('platform_certificate_settings')
    .selectAll()
    .orderBy('id', 'desc')
    .executeTakeFirst();

  if (!settings) {
    res.status(404);
    throw new Error('Platform certificate settings not found');
  }

  if (settings.signature_path) {
    await fs.promises.unlink(getAbsolutePlatformSignaturePath(settings.signature_path)).catch(() => {});
  }

  await database
    .updateTable('platform_certificate_settings')
    .set({
      signature_path: null,
      signature_uploaded_by_admin_id: null,
    })
    .where('id', '=', settings.id)
    .execute();

  res.json({});
});

export default certificateSettingsRouter;
