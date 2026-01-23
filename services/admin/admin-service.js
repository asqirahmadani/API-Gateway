const redis = require("./config/redis");
const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

function generateApiKey() {
  const keyId = crypto.randomBytes(16).toString("hex");
  const keySecret = crypto.randomBytes(32).toString("hex");
  return { keyId, keySecret, fullKey: `${keyId}:${keySecret}` };
}

/* 
ROUTES
*/

// root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Admin Service",
    message: "API Key Management System",
    endpoint: {
      "POST /api/users": "Create new user with API key",
      "GET /api/users": "List all users",
      "GET /api/users/:username": "Get user details",
      "DELETE /api/users/:username": "Delete user",
      "GET /api/keys": "List all API keys",
      "GET /health": "Health check",
    },
  });
});

// health check
app.get("/health", async (req, res) => {
  try {
    await redis.ping();
    res.json({
      status: "healthy",
      redis: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      redis: "disconnected",
      error: error.message,
    });
  }
});

// create user with API key
app.post("/api/users", async (req, res) => {
  try {
    const { username, email, tier = "standard" } = req.body;

    if (!username || !email) {
      return res.status(400).json({
        error: "Username and email are required",
      });
    }

    // check if user exists
    const existingUser = await redis.get(`user:${username}`);
    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
      });
    }

    const apiKey = generateApiKey();
    const userData = {
      username,
      email,
      tier,
      createdAt: new Date().toISOString(),
      apiKeyId: apiKey.keyId,
    };

    // save to redis
    await redis.set(`user:${username}`, JSON.stringify(userData));
    await redis.set(
      `apikey:${apiKey.keyId}`,
      JSON.stringify({
        username,
        tier,
        secret: apiKey.keySecret,
        createdAt: new Date().toISOString(),
      }),
    );

    // add to users list
    await redis.sAdd("users:list", username);

    res.status(201).json({
      message: "User created successfully",
      user: userData,
      apiKey: {
        keyId: apiKey.keyId,
        keySecret: apiKey.keySecret,
        fullKey: apiKey.fullKey,
        usage: `Use in header: X-API-Key: ${apiKey.fullKey}`,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: error.message });
  }
});

// list all users
app.get("/api/users", async (req, res) => {
  try {
    const usernames = await redis.sMembers("users:list");

    const users = await Promise.all(
      usernames.map(async (username) => {
        const userData = await redis.get(`user:${username}`);
        return JSON.parse(userData);
      }),
    );

    res.json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).json({ error: error.message });
  }
});

// get user by username
app.get("/api/users/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const userData = await redis.get(`user:${username}`);

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = JSON.parse(userData);

    // get API key details
    const apiKeyData = await redis.get(`apikey:${user.apiKeyId}`);
    const apiKey = JSON.parse(apiKeyData);

    res.json({
      user,
      apiKey: {
        keyId: user.apiKeyId,
        keySecret: apiKey.secret,
        fullKey: `${user.apiKeyId}:${apiKey.secret}`,
      },
    });
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ error: error.message });
  }
});

// delete user
app.delete("/api/users/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const userData = await redis.get(`user:${username}`);

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = JSON.parse(userData);

    // delete user data
    await redis.del(`user:${username}`);
    await redis.del(`apikey:${user.apiKeyId}`);
    await redis.sRem("users:list", username);

    res.json({
      message: "User deleted successfully",
      username,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: error.message });
  }
});

// list all API keys
app.get("/api/keys", async (req, res) => {
  try {
    const keys = await redis.keys("apikey:*");

    const apiKeys = await Promise.all(
      keys.map(async (key) => {
        const keyData = await redis.get(key);
        const parsed = JSON.parse(keyData);
        return {
          keyId: key.replace("apikey:", ""),
          username: parsed.username,
          tier: parsed.tier,
          createdAt: parsed.createdAt,
        };
      }),
    );

    res.json({
      count: apiKeys.length,
      keys: apiKeys,
    });
  } catch (error) {
    console.error("Error listing keys:", error);
    res.status(500).json({ error: error.message });
  }
});

// validate API key
app.post("/api/validate", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }

    const [keyId, keySecret] = apiKey.split(":");
    const keyData = await redis.get(`apikey:${keyId}`);

    if (!keyData) {
      return res.status(401).json({
        valid: false,
        error: "Invalid API key",
      });
    }

    const key = JSON.parse(keyData);
    if (key.secret !== keySecret) {
      return res.status(401).json({
        valid: false,
        error: "Invalid API key secret",
      });
    }

    res.json({
      valid: true,
      username: key.username,
      tier: key.tier,
    });
  } catch (error) {
    console.error("Error validating key:", error);
    res.status(500).json({ error: error.message });
  }
});

// error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.stack(500).json({ error: "Internal Server Error" });
});

// start server
async function startServer() {
  try {
    await redis.ping();
    app.listen(PORT, () => {
      console.log(`Admin Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
