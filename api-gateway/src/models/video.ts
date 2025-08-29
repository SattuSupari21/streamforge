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

export async function createVideo(video: Video): Promise<Video> {
  const { video_id, title, description, uploader_id, status } = video;
  const result = await pool.query(
    `INSERT INTO videos (video_id, title, description, uploader_id, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [video_id, title, description, uploader_id, status]
  );
  return result.rows[0];
}

export async function getVideoByVideoId(video_id: string): Promise<Video | null> {
  const result = await pool.query(
    `SELECT * FROM videos WHERE video_id = $1 LIMIT 1`,
    [video_id]
  );
  return result.rows[0] || null;
}

export async function listVideos(limit: number = 10, offset: number = 0): Promise<Video[]> {
  const result = await pool.query(
    `SELECT * FROM videos ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}
