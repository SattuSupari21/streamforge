import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export function requireAuth(roles: string[] = ['viewer', 'uploader', 'admin']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const JWT_SECRET = process.env.JWT_SECRET || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const decoded = jwt.verify(header.slice(7), JWT_SECRET);
      if (typeof decoded === 'string' || !('role' in decoded)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const payload = decoded as JwtPayload & { role: string };
      if (!roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      (req as any).user = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}
