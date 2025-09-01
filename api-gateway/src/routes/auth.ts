import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createUser, getUserByUsername } from '../models/user';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, uploader, viewer]
 *     responses:
 *       200:
 *         description: Registration successful
 *       409:
 *         description: Username exists
 */
router.post('/register', async (req, res) => {
  const schema = z.object({
    username: z.string().min(3),
    password: z.string().min(6),
    role: z.enum(['admin', 'uploader', 'viewer']).optional()
  });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }
  const { username, password, role } = result.data;
  if (await getUserByUsername(username)) {
    return res.status(409).json({ error: 'Username exists' });
  }
  const passwordHash = await Bun.password.hash(password);
  const user = await createUser(username, passwordHash, role ?? 'viewer');
  res.json({ success: true, user: { username: user.username, role: user.role } });
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login with username and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Bad request
 */
router.post('/login', async (req, res) => {
  const schema = z.object({
    username: z.string().min(3),
    password: z.string().min(6)
  });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }
  const { username, password } = result.data;
  const user = await getUserByUsername(username);
  if (!user || !(await Bun.password.verify(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ success: true, token, role: user.role });
});

export default router;
