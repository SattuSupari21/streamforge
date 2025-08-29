import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MINIO_INTERNAL_ENDPOINT = process.env.MINIO_ENDPOINT || 'http://minio:9000';
const MINIO_PUBLIC_BASE_URL = process.env.MINIO_PUBLIC_BASE_URL || 'http://localhost:8080/play';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: MINIO_INTERNAL_ENDPOINT,
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function generateSignedUrl(bucket: string, key: string, expiresIn: number = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn,
  });

  const url = new URL(signedUrl);

  const publicBase = new URL(MINIO_PUBLIC_BASE_URL);

  url.protocol = publicBase.protocol;
  url.host = publicBase.host;

  const bucketKeyPath = `/${bucket}/${key}`;

  url.pathname = publicBase.pathname.replace(/\/$/, '') + bucketKeyPath;

  return url.toString();
}

export async function generateSignedUrlsForVideo(bucket: string, videoId: string): Promise<{ manifestUrl: string }> {
  const manifestKey = `transcoded/${videoId}/playlist.m3u8`;
  const manifestUrl = await generateSignedUrl(bucket, manifestKey, 3600); // 1 hour expiry
  return { manifestUrl };
}
