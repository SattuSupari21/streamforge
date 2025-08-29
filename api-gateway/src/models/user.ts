import pool from '../db/postgres';

export async function createUser(username: string, passwordHash: string, role = 'viewer') {
  const res = await pool.query(
    `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *`,
    [username, passwordHash, role]
  );
  return res.rows[0];
}

export async function getUserByUsername(username: string) {
  const res = await pool.query(
    `SELECT * FROM users WHERE username = $1 LIMIT 1`, [username]
  );
  return res.rows[0] || null;
}
