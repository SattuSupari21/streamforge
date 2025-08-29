import redis from '../db/redis';

export async function cacheGet<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
}
