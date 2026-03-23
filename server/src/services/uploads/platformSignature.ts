import fs from 'fs';
import path from 'path';

import multer from 'multer';

import { PLATFORM_SIGNATURE_UPLOAD_DIR } from './paths.js';

export const getAbsolutePlatformSignaturePath = (signaturePath: string) => {
  return path.join(PLATFORM_SIGNATURE_UPLOAD_DIR, signaturePath);
};

export const platformSignatureStorage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await fs.promises.mkdir(PLATFORM_SIGNATURE_UPLOAD_DIR, { recursive: true });
    cb(null, PLATFORM_SIGNATURE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `platform-signature-${Date.now()}${ext}`);
  },
});

export const platformSignatureMulter = multer({
  storage: platformSignatureStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    const allowedExts = ['.png', '.jpg', '.jpeg', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
      return cb(new Error('Only PNG, JPG, JPEG, and SVG image files are allowed.'));
    }

    cb(null, true);
  },
});
