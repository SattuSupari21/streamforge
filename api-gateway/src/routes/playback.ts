import express from 'express';
import { generateSignedUrl } from '../services/signedUrl';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import videoIdSchema from '../schemas/videoIdSchema';
import { getVideoByVideoId } from '../models/video';
import { cacheGet, cacheSet } from '../utils/cache';
import logger from '../utils/logger';

const router = express.Router();

router.get('/:videoId/manifest', async (req, res) => {
  const parseResult = videoIdSchema.safeParse(req.params.videoId);

  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid videoId parameter',
      details: parseResult.error.message,
    });
  }

  const bucket = process.env.MINIO_BUCKET_NAME || 'video-uploads';
  const videoId = req.params.videoId;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  const cacheKey = `video:manifest:${videoId}`;

  try {
    const cachedResponse = await cacheGet<{
      success: boolean;
      videoId: string;
      manifestUrl: string;
      expiresIn: number;
      timestamp: string;
    }>(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const videoRecord = await getVideoByVideoId(videoId);

    if (!videoRecord) {
      return res.status(404).json({ error: 'Video not found in database' });
    }

    if (videoRecord.status !== 'ready') {
      return res.status(409).json({
        error: 'Video not ready for playback',
        currentStatus: videoRecord.status,
      });
    }

    // Path to master playlist in MinIO
    const manifestKey = `transcoded/${videoId}/playlist.m3u8`;

    // Initialize S3 client for existence check
    const s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: process.env.MINIO_ENDPOINT || 'http://minio:9000',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true,
    });

    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: manifestKey }));
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return res.status(404).json({
          error: 'Manifest file does not exist for requested video',
          videoId,
        });
      }
      throw err;
    }

    // Generate signed URL for the manifest
    const signedManifestUrl = await generateSignedUrl(bucket, manifestKey);

    const responseData = {
      success: true,
      videoId,
      manifestUrl: signedManifestUrl,
      expiresIn: 3600,
      timestamp: new Date().toISOString(),
    };

    // Cache the response for 5 minutes (300 seconds)
    await cacheSet(cacheKey, responseData, 300);

    return res.json(responseData);
  } catch (error: any) {
    logger.error('Error generating signed URL:', error);
    return res.status(500).json({
      error: 'Failed to generate signed URL',
      details: error.message || error,
    });
  }
});

export default router;
