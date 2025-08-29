import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import amqp from 'amqplib';
import { exec } from 'child_process';
import { pipeline } from 'stream';
import { createWriteStream, mkdirSync, existsSync, readdirSync, promises } from 'fs';
import { promisify } from 'util';
import path from 'path';
import { generateAndUploadManifests } from './services/manifestGenerator';
import transcodingJobSchema from './schemas/transcodingJobSchema';

import { updateVideoStatus } from './models/video';
import logger from './utils/logger';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.MINIO_ENDPOINT || 'http://minio:9000',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

const pipelinePromise = promisify(pipeline);

async function downloadFile(bucket: string, key: string, downloadPath: string) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  if (!response.Body) throw new Error('No file body received');

  mkdirSync(path.dirname(downloadPath), { recursive: true });
  const writeStream = createWriteStream(downloadPath);
  await pipelinePromise(response.Body as any, writeStream);
}

async function uploadFile(bucket: string, key: string, filePath: string) {
  const data = await promises.readFile(filePath);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: data,
    ContentLength: data.length,
    ContentType: 'video/MP2T',
  });
  await s3Client.send(command);
}

async function startWorker() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  const queue = 'transcode_queue';

  await channel.assertQueue(queue, { durable: true });
  channel.prefetch(1);

  logger.info('Transcoder worker started, waiting for jobs...');

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    let job;
    try {
      const parsed = transcodingJobSchema.safeParse(JSON.parse(msg.content.toString()));
      if (!parsed.success) {
        logger.error('Invalid job payload: ' + parsed.error.message);
        channel.nack(msg, false, false);
        return;
      }
      job = parsed.data;
    } catch (err) {
      logger.error('Failed to parse job JSON: ' + err);
      channel.nack(msg, false, false);
      return;
    }

    logger.info('Received job: ' + job);

    const { bucket, filename } = job;
    const videoId = path.parse(filename).name; // Assuming videoId is filename without extension

    const inputPath = `/tmp/input/${filename}`;
    const outputDir = `/tmp/output/${videoId}`;

    try {
      // Update video status to 'transcoding'
      await updateVideoStatus(videoId, 'transcoding');

      await downloadFile(bucket, filename, inputPath);
      logger.info('Downloaded input video to ' + inputPath);

      mkdirSync(outputDir, { recursive: true });

      const resolutions = ['1080p', '720p', '480p', '360p'];
      for (const res of resolutions) {
        mkdirSync(`${outputDir}/${res}`, { recursive: true });
      }

      logger.info('Running ffmpeg command...');
      const ffmpegCmd = `ffmpeg -y -i "${inputPath}" \\
-filter_complex "[0:v]split=4[v1080][v720][v480][v360]; \\
[v1080]scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2[v1080out]; \\
[v720]scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2[v720out]; \\
[v480]scale=w=854:h=480:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2[v480out]; \\
[v360]scale=w=640:h=360:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2[v360out]" \\
-map "[v1080out]" -map 0:a? -c:v libx264 -b:v 5000k -c:a aac -b:a 192k -preset medium -crf 23 -ac 2 -f segment -segment_time 6 -segment_format mpegts "${outputDir}/1080p/segment_%03d.ts" \\
-map "[v720out]" -map 0:a? -c:v libx264 -b:v 3000k -c:a aac -b:a 160k -preset medium -crf 23 -ac 2 -f segment -segment_time 6 -segment_format mpegts "${outputDir}/720p/segment_%03d.ts" \\
-map "[v480out]" -map 0:a? -c:v libx264 -b:v 1500k -c:a aac -b:a 128k -preset medium -crf 23 -ac 2 -f segment -segment_time 6 -segment_format mpegts "${outputDir}/480p/segment_%03d.ts" \\
-map "[v360out]" -map 0:a? -c:v libx264 -b:v 800k -c:a aac -b:a 96k -preset medium -crf 23 -ac 2 -f segment -segment_time 6 -segment_format mpegts "${outputDir}/360p/segment_%03d.ts"`;

      await new Promise<void>((resolve, reject) => {
        exec(ffmpegCmd, (error, stdout, stderr) => {
          if (error) {
            logger.error('FFmpeg error: ' + stderr || error.message);
            reject(error);
            return;
          }
          logger.info('FFmpeg output: ' + stdout);
          resolve();
        });
      });

      logger.info('Uploading segments back to MinIO...');
      for (const res of resolutions) {
        const resolutionDir = path.join(outputDir, res);
        if (existsSync(resolutionDir)) {
          const files = readdirSync(resolutionDir);
          for (const file of files) {
            const localPath = path.join(resolutionDir, file);
            const s3Key = `transcoded/${videoId}/${res}/${file}`;
            await uploadFile(bucket, s3Key, localPath);
            logger.info(`Uploaded ${file} to ${s3Key}`);
          }
        }
      }

      logger.info('Starting manifest generation...');
      await generateAndUploadManifests(bucket, videoId);
      logger.info('Manifest generation completed');

      await updateVideoStatus(videoId, 'ready');

      channel.ack(msg);
    } catch (err) {
      logger.error('Error processing job: ' + err);
      try {
        await updateVideoStatus(videoId, 'failed');
      } catch (e) {
        logger.error('Failed to update video status to failed: ' + e);
      }
      channel.nack(msg, false, false);
    }
  });
}

startWorker().catch(logger.error);
