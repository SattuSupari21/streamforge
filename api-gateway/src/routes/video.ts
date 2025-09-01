import express from 'express';
import { createVideo, getVideoByVideoId, listVideos } from '../models/video';
import createVideoSchema from '../schemas/createVideoSchema';

const router = express.Router();

/**
 * @openapi
 * /videos/createVideo:
 *   post:
 *     summary: Create a new video
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [uploaded, transcoding, failed]
 *     responses:
 *       200:
 *         description: Video created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to create video
 */
router.post('/createVideo', async (req, res) => {
  const parseResult = createVideoSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid input', details: parseResult.error.message });
  }
  try {
    const video = await createVideo({ ...parseResult.data, status: 'uploaded' });
    res.json({ success: true, video });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create video', details: err.message });
  }
});

/**
 * @openapi
 * /videos/getAllVideos:
 *   get:
 *     summary: List all videos
 *     responses:
 *       200:
 *         description: List of videos
 *       500:
 *         description: Failed to list videos
 */
router.get('/getAllVideos', async (req, res) => {
  const videos = await listVideos();
  res.json({ success: true, videos });
});

/**
 * @openapi
 * /videos/getVideoById/{videoId}:
 *   get:
 *     summary: Get a video by ID
 *     parameters:
 *       - name: videoId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video found
 *       404:
 *         description: Video not found
 *       500:
 *         description: Failed to fetch video
 */
router.get('/getVideoById/:videoId', async (req, res) => {
  try {
    const video = await getVideoByVideoId(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, video });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch video', details: err.message });
  }
});

export default router;
