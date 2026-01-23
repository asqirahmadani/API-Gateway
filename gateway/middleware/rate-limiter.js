const redis = require("../config/redis.js");

const RATE_LIMITS = {
  public: { max: 10, window: 60 }, // request per minute
  standard: { max: 100, window: 60 },
  premium: { max: 500, window: 60 },
};

function getRateLimitForTier(tier) {
  return RATE_LIMITS[tier] || RATE_LIMITS.standard;
}

// rate limiter middleware
module.exports = function rateLimiter(tier = "public") {
  return async function (req, res, next) {
    try {
      const identifier = req.user ? req.user.username : req.ip;
      const limit = getRateLimitForTier(
        tier === "auto" && req.user ? req.user.tier : tier
      );

      const key = `ratelimit:${tier}:${identifier}`;
      const now = Date.now();
      const windowStart = now - limit.window * 1000;

      // get current count
      const requests = await redis.zRangeByScore(key, windowStart, now);
      const curretCount = requests.length;

      // set rate limit headers
      res.setHeader("X-RateLimit-Limit", limit.max);
      res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(0, limit.max - curretCount)
      );
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil((now + limit.window * 1000) / 1000)
      );

      if (curretCount >= limit.max) {
        return res.status(429).json({
          error: "Too Many Requests",
          message: `Rate limit exceeded. Max ${limit.max} requests per ${limit.window} seconds`,
          retryAfter: limit.window,
        });
      }

      // add current request
      await redis.zAdd(key, { score: now, value: `${now}` });

      // remove old entries
      await redis.zRemRangeByScore(key, 0, windowStart);

      // set expired
      await redis.expire(key, limit.window);

      next();
    } catch (error) {
      console.error("Rate limiter error:", error);
      // allow request if rate limiter fails
      next();
    }
  };
};
