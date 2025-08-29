import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 requests
  duration: 1, // per 1 second by IP
});

export const rateLimit = (req: Request, res: Response, next: NextFunction) => {
    if (req.ip) {
        rateLimiter.consume(req.ip)
        .then(() => {
            next();
        })
        .catch(() => {
            res.status(429).json({ message: 'Too Many Requests' });
        });
    }
};
