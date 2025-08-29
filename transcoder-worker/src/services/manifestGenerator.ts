import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from '../utils/logger';

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://minio:9000',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
});

const MINIO_INTERNAL_ENDPOINT = 'minio:9000';
const MINIO_PUBLIC_BASE_URL = 'http://localhost:8080/play';

async function generateSignedUrlWithPublicHost(bucket: string, key: string, expiresIn = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

  const url = new URL(signedUrl);

  url.protocol = new URL(MINIO_PUBLIC_BASE_URL).protocol;
  url.host = new URL(MINIO_PUBLIC_BASE_URL).host;

  const publicBasePath = new URL(MINIO_PUBLIC_BASE_URL).pathname.replace(/\/$/, '');

  url.pathname = `${publicBasePath}/${bucket}/${key}`;

  return url.toString();
}

async function listSegments(bucket: string, prefix: string): Promise<string[]> {
  const command = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix });
  const response = await s3Client.send(command);
  if (!response.Contents) return [];
  return response.Contents
    .map(obj => obj.Key!)
    .filter(key => key.endsWith('.ts') || key.endsWith('.m4s'))
    .sort();
}

async function generateVariantPlaylistSigned(bucket: string, playlistPrefix: string): Promise<string> {
  const segments = await listSegments(bucket, playlistPrefix);
  if (segments.length === 0) return '';

  const segmentUrls = await Promise.all(
    segments.map(key => generateSignedUrlWithPublicHost(bucket, key, 3600)) // 1 hour expiry for segments
  );

  const playlistContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:0
${segmentUrls.map(url => `#EXTINF:6.0,\n${url}`).join('\n')}
#EXT-X-ENDLIST
`;

  return playlistContent.trim();
}

const renditions = [
  { name: '1080p', bandwidth: 5000000, resolution: '1920x1080' },
  { name: '720p', bandwidth: 2800000, resolution: '1280x720' },
  { name: '480p', bandwidth: 1400000, resolution: '854x480' },
  { name: '360p', bandwidth: 800000, resolution: '640x360' },
];

export async function generateAndUploadManifests(bucket: string, videoName: string) {
  const masterLines = ['#EXTM3U', '#EXT-X-VERSION:3', ''];

  for (const rendition of renditions) {
    const prefix = `transcoded/${videoName}/${rendition.name}/`;

    const variantPlaylistContent = await generateVariantPlaylistSigned(bucket, prefix);

    if (!variantPlaylistContent) {
      console.warn(`No segments found in ${prefix}`);
      continue;
    }

    const variantKey = `${prefix}playlist.m3u8`;
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: variantKey,
      Body: variantPlaylistContent,
      ContentType: 'application/vnd.apple.mpegurl',
    }));

    const signedVariantPlaylistUrl = await generateSignedUrlWithPublicHost(bucket, variantKey, 3600);

    masterLines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bandwidth},RESOLUTION=${rendition.resolution}`);
    masterLines.push(signedVariantPlaylistUrl);
    masterLines.push('');
  }

  const masterPlaylistContent = masterLines.join('\n').trim();

  const masterKey = `transcoded/${videoName}/playlist.m3u8`;
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: masterKey,
    Body: masterPlaylistContent,
    ContentType: 'application/vnd.apple.mpegurl',
  }));

  logger.info(`Uploaded master playlist at ${masterKey}`);
}
