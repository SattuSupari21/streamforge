import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableAutoPipelining: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export default redis;
