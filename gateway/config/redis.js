const { createClient } = require("redis");

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || "redis",
    port: process.env.REDIS_PORT || 6379,
  },
});

redis.on("connect", () => {
  console.log("Redis connecting...");
});

redis.on("ready", () => {
  console.log("Redis ready");
});

redis.on("error", (err) => {
  console.log("Redis error:", err);
});

redis.on("end", () => {
  console.log("Redis disconnected");
});

(async () => {
  try {
    await redis.connect();
  } catch (error) {
    console.error("Failed to connect to redis:", error);
    process.exit(1);
  }
})();

module.exports = redis;
