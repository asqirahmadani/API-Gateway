const redis = require("../config/redis.js");

// middleware for API key validation
module.exports = async function apiKeyValidator(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "API key is required. Use header: X-API-Key",
      });
    }

    const [keyId, keySecret] = apiKey.split(":");

    if (!keyId || !keySecret) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid API key format. Use: keyId:keySecret",
      });
    }

    // get key from redis
    const keyData = await redis.get(`apikey:${keyId}`);

    if (!keyData) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid API key",
      });
    }

    const key = JSON.parse(keyData);

    // verify secret
    if (key.secret !== keySecret) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid API key secret",
      });
    }

    req.user = {
      username: key.username,
      tier: key.tier,
    };

    next();
  } catch (error) {
    console.error("API key validation error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to validate API key",
    });
  }
};
