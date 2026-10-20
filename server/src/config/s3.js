import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

export function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1'
  });
}

export const s3Client = createS3Client();
export const S3_BUCKET = process.env.S3_BUCKET;

function requireBucket() {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET is not configured.');
  }

  return S3_BUCKET;
}

export function buildObjectKey(fileName) {
  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
  return `animals/${randomUUID()}.${extension}`;
}

export async function uploadToS3(buffer, fileName, contentType) {
  const key = buildObjectKey(fileName);
  await s3Client.send(new PutObjectCommand({
    Bucket: requireBucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ServerSideEncryption: 'AES256'
  }));

  return { key, url: await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: requireBucket(),
    Key: key
  }), { expiresIn: 3600 }) };
}

export async function deleteFromS3(key) {
  if (!key) return;

  await s3Client.send(new DeleteObjectCommand({
    Bucket: requireBucket(),
    Key: key
  }));
}

export async function getPresignedReadUrl(key, expiresIn = 3600) {
  if (!key) return null;

  return getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: requireBucket(),
    Key: key
  }), { expiresIn });
}
