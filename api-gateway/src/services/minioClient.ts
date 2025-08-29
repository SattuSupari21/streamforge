import { S3Client } from '@aws-sdk/client-s3';

const minioConfig = {
  region: 'us-east-1',
  endpoint: 'http://minio:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true, // Needed for MinIO
};

export const s3Client = new S3Client(minioConfig);
