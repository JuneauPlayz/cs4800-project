import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const receiptUploadRoot = path.join(__dirname, '..', '..', 'uploads', 'receipts');
const DEFAULT_MAX_RECEIPT_IMAGE_BYTES = 10 * 1024 * 1024;
const configuredMaxReceiptBytes = Number(process.env.RECEIPT_UPLOAD_MAX_BYTES);
const hasConfiguredReceiptLimit = Number.isFinite(configuredMaxReceiptBytes) && configuredMaxReceiptBytes > 0;
const MAX_RECEIPT_IMAGE_BYTES = hasConfiguredReceiptLimit ? configuredMaxReceiptBytes : DEFAULT_MAX_RECEIPT_IMAGE_BYTES;

const allowedMimeTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/pjpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/heic', 'heic'],
  ['image/heif', 'heif']
]);

function receiptError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function receiptTypeFromBytes(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'))) {
    return { mimeType: 'image/gif', extension: 'gif' };
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = bytes.subarray(8, 12).toString('ascii').toLowerCase();
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) {
      return { mimeType: 'image/heic', extension: 'heic' };
    }
    if (['heif', 'mif1', 'msf1'].includes(brand)) {
      return { mimeType: 'image/heif', extension: 'heif' };
    }
  }
  return null;
}

function receiptTypeFor({ mimeType, bytes }) {
  const normalizedMimeType = String(mimeType || '').split(';')[0].trim().toLowerCase();
  const configuredExtension = allowedMimeTypes.get(normalizedMimeType);
  if (configuredExtension) {
    return { mimeType: normalizedMimeType, extension: configuredExtension };
  }

  const sniffedType = receiptTypeFromBytes(bytes);
  if (sniffedType) return sniffedType;

  throw receiptError('Receipt image must be a JPEG, PNG, WebP, GIF, HEIC, or HEIF file.');
}

function normalizeBase64Payload(imageBase64, fallbackMimeType) {
  const trimmed = String(imageBase64 || '').trim();
  const dataUrlMatch = trimmed.match(/^data:([^;,]+);base64,(.+)$/is);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      base64: dataUrlMatch[2]
    };
  }

  return {
    mimeType: fallbackMimeType,
    base64: trimmed
  };
}

export function getReceiptUploadRoot() {
  fs.mkdirSync(receiptUploadRoot, { recursive: true });
  return receiptUploadRoot;
}

export function saveReceiptImageBytes({ bytes, mimeType = 'image/jpeg' } = {}) {
  if (!bytes) return null;

  const imageBytes = Buffer.from(bytes);
  if (!imageBytes.length) {
    throw receiptError('Receipt image data is empty.');
  }
  if (imageBytes.length > MAX_RECEIPT_IMAGE_BYTES) {
    throw receiptError('Receipt image is too large. Try a smaller image or retake the receipt photo.', 413);
  }

  const { extension } = receiptTypeFor({ mimeType, bytes: imageBytes });
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const uploadRoot = getReceiptUploadRoot();
  fs.writeFileSync(path.join(uploadRoot, fileName), imageBytes, { flag: 'wx' });
  return `/receipts/${fileName}`;
}

export function saveReceiptImage({ imageBase64, mimeType = 'image/jpeg' } = {}) {
  if (!imageBase64) return null;

  const payload = normalizeBase64Payload(imageBase64, mimeType);
  const cleanBase64 = payload.base64.replace(/\s/g, '');
  if (!cleanBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64) || cleanBase64.length % 4 === 1) {
    throw receiptError('Receipt image data is invalid.');
  }

  return saveReceiptImageBytes({
    bytes: Buffer.from(cleanBase64, 'base64'),
    mimeType: payload.mimeType
  });
}
