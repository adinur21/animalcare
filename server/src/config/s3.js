import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

export function createS3Client() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

export const s3Client = createS3Client();
export const S3_BUCKET = process.env.S3_BUCKET || 'animalcare-assets';

export function buildObjectKey(fileName) {
  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
  return `animals/${randomUUID()}.${extension}`;
}

export async function uploadToS3(buffer, fileName, contentType) {
  if (!s3Client) {
    return { key: fileName, url: null };
  }

  const key = buildObjectKey(fileName);
  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ServerSideEncryption: 'AES256'
  }));

  return { key, url: await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  }), { expiresIn: 3600 }) };
}

export async function deleteFromS3(key) {
  if (!key || !s3Client) return;

  await s3Client.send(new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  }));
}

export async function getPresignedReadUrl(key, expiresIn = 3600) {
  if (!key || !s3Client) return null;

  return getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  }), { expiresIn });
}
