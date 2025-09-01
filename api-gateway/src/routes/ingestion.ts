import express from 'express';
import multer from 'multer';
import { CreateBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../services/minioClient';
import { connectRabbitMQ, sendTranscodeJob } from '../services/rabbitmq';
import uploadSchema from '../schemas/uploadSchema';
import { createVideo, getVideoByVideoId } from '../models/video';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // max 500 MB
});

const videoFormats = ['video/mp4', 'video/mkv', 'video/webm'];

/**
 * @openapi
 * /ingestion/upload:
 *   post:
 *     summary: Upload a video chunk
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upload successful
 *       400:
 *         description: Bad request
 *       500:
 *         description: Upload failed
 *       401:
 *         description: Unauthorized
 */
router.post('/upload', requireAuth(['uploader', 'admin']), upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file chunk uploaded' });
    }
    if (!videoFormats.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type' });
    }

    const parseResult = uploadSchema.safeParse({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid upload", details: parseResult.error.message });
    }

    const bucketName = 'video-uploads';
    const videoId = req.file.originalname;

    const existingVideo = await getVideoByVideoId(videoId);
    if (existingVideo) {
      return res.status(400).json({ error: 'Video already exists' });
    }

    async function ensureBucket() {
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
      } catch (err: any) {
        if (err.name !== 'BucketAlreadyOwnedByYou') {
          throw err;
        }
      }
    }
    
    await ensureBucket();

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: videoId,
      Body: req.file.buffer,
      ContentLength: req.file.size,
      ContentType: req.file.mimetype,
    }));

    await createVideo({
      video_id: videoId.split(".")[0],
      status: 'uploaded',
    });

    try {
      const { channel } = await connectRabbitMQ();
      await sendTranscodeJob(channel, {
        filename: videoId,
        bucket: bucketName,
        timestamp: new Date().toISOString(),
      });
      res.status(200).json({ message: "Upload successful and job queued", filename: videoId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: "Upload failed", details: errorMessage });
    }

  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : 'Upload error' });
  }
});

export default router;
