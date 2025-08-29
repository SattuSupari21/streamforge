import express from 'express';
import { createVideo, getVideoByVideoId, listVideos } from '../models/video';
import createVideoSchema from '../schemas/createVideoSchema';

const router = express.Router();

router.post('/video', async (req, res) => {
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

router.get('/videos', async (req, res) => {
  const videos = await listVideos();
  res.json({ success: true, videos });
});

router.get('/video/:videoId', async (req, res) => {
  try {
    const video = await getVideoByVideoId(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, video });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch video', details: err.message });
  }
});

export default router;
