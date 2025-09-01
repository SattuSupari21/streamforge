import express from 'express';
import { rateLimit } from './middleware/rateLimit';
import jwt from 'jsonwebtoken';
import ingestionRouter from './routes/ingestion';
import playbackRouter from './routes/playback';
import videoRouter from './routes/video';
import authRouter from './routes/auth'
import cors from 'cors';
import logger from './utils/logger';
import { setupSwagger } from './docs/swagger';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(rateLimit);
app.use('/ingestion', ingestionRouter);
app.use('/play', playbackRouter);
app.use('/videos', videoRouter);
app.use('/auth', authRouter);
setupSwagger(app);

app.get('/', (req, res) => {
  res.send('Adaptive Video Streaming API Gateway');
});

app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  logger.info(`API Gateway running on port ${port}. Docs at :${port}/docs`);
});