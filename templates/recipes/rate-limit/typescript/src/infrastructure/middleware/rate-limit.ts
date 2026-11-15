import { NextFunction, Request, Response } from 'express';

/**
 * Fixed-window rate limit per client IP, kept in memory. Good for a single
 * instance; with several instances behind a load balancer, use a shared store.
 * Behind a proxy, set `app.set('trust proxy', 1)` so `req.ip` is the client.
 */
export interface RateLimitOptions {
  /** Window length in milliseconds (RATE_LIMIT_WINDOW_MS, default 60000). */
  windowMs?: number;
  /** Requests allowed per client and window (RATE_LIMIT_MAX, default 100). */
  max?: number;
  now?: () => number;
}

export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const max = options.max ?? Number(process.env.RATE_LIMIT_MAX ?? 100);
  const now = options.now ?? Date.now;
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Forget finished windows so memory does not grow with every client seen.
  const cleanup = setInterval(() => {
    const time = now();
    for (const [key, entry] of hits) if (entry.resetAt <= time) hits.delete(key);
  }, windowMs);
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const time = now();
    const key = req.ip ?? 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= time) {
      entry = { count: 0, resetAt: time + windowMs };
      hits.set(key, entry);
    }
    entry.count++;

    const resetSeconds = Math.ceil((entry.resetAt - time) / 1000);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('RateLimit-Reset', String(resetSeconds));
    if (entry.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    next();
  };
}
