const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  next();
}

export function createRateLimiter({ windowMs = DEFAULT_WINDOW_MS, max = 10 } = {}) {
  const attempts = new Map();
  let requestCount = 0;

  return (req, res, next) => {
    const now = Date.now();
    requestCount += 1;
    if (requestCount % 1000 === 0) {
      for (const [storedKey, storedEntry] of attempts) {
        if (storedEntry.resetAt <= now) attempts.delete(storedKey);
      }
    }
    const key = `${req.ip}:${String(req.body?.email || '').toLowerCase()}`;
    const current = attempts.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    entry.count += 1;
    attempts.set(key, entry);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message: 'Too many attempts. Please try again later.' });
    }
    next();
  };
}
