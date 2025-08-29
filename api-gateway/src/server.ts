import express from 'express';
import { rateLimit } from './middleware/rateLimit';
import jwt from 'jsonwebtoken';
import ingestionRouter from './routes/ingestion';
import playbackRouter from './routes/playback';
import videoRouter from './routes/video';
import authRouter from './routes/auth'
import cors from 'cors';
import logger from './utils/logger';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(rateLimit);
app.use('/ingestion', ingestionRouter);
app.use('/play', playbackRouter);
app.use('/video', videoRouter);
app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.send('Adaptive Video Streaming API Gateway');
});

app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  logger.info(`API Gateway running at :${port}`);
});