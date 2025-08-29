import pool from '../db/postgres';

export interface Video {
  id?: number;
  video_id: string;
  title?: string;
  description?: string;
  uploader_id?: string;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

export async function updateVideoStatus(video_id: string, status: string): Promise<void> {
  await pool.query(
    `UPDATE videos SET status = $1, updated_at = now() WHERE video_id = $2`,
    [status, video_id]
  );
}

export async function listVideos(limit: number = 10, offset: number = 0): Promise<Video[]> {
  const result = await pool.query(
    `SELECT * FROM videos ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}