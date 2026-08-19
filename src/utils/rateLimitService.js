/**
 * TORK API Rate Limiting & Abuse Prevention (Sprint 12)
 * 
 * Token bucket / sliding window rate limiter in memory for sensitive endpoints.
 * Protects against brute force and automated submission abuse without disrupting normal users.
 */

global.__TORK_RATE_LIMITS__ = global.__TORK_RATE_LIMITS__ || new Map();

export function checkRateLimit(
  identifier,
  {
    limit = 60, // max requests
    windowMs = 60 * 1000, // per 1 minute
  } = {}
) {
  const now = Date.now();
  const limits = global.__TORK_RATE_LIMITS__;

  let record = limits.get(identifier);
  if (!record || now - record.startTime > windowMs) {
    record = {
      startTime: now,
      count: 1,
    };
    limits.set(identifier, record);
    return {
      allowed: true,
      remaining: limit - 1,
      resetMs: windowMs,
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, windowMs - (now - record.startTime)),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetMs: Math.max(0, windowMs - (now - record.startTime)),
  };
}

export function resetRateLimits() {
  global.__TORK_RATE_LIMITS__.clear();
}
