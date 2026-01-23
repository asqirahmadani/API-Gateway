const { createProxyMiddleware } = require("http-proxy-middleware");
const express = require("express");
const cors = require("cors");

const apiKeyValidator = require("./middleware/api-key-validator");
const rateLimiter = require("./middleware/rate-limiter");

const app = express();
const PORT = process.env.PORT || 8080;

// middleware
app.use(cors());
app.use(express.json());

// logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/* 
Public Routes
*/

// health check
app.get(
  "/health",
  rateLimiter("public", (req, res, next) => {
    res.json({
      status: "Gateway is running",
      timestamp: new Date().toISOString(),
      redis: "connected",
    });
  })
);

// public API
app.get("/api/public/*", rateLimiter("public"), (req, res) => {
  res.json({
    message: "Public API endpoint",
    info: "No authentication required",
    path: req.path,
  });
});

/* 
Protected Routes
*/

// Service A - Users API (required API key)
app.use(
  "/api/service-a",
  apiKeyValidator,
  rateLimiter("auto"),
  createProxyMiddleware({
    target: "http://service-a:3001",
    changeOrigin: true,
    pathRewrite: {
      "^/api/service-a": "",
    },
    onProxyReq: (proxyReq, req) => {
      // add user info to headers
      if (req.user) {
        proxyReq.setHeader("X-Consumer-Username", req.user.username);
        proxyReq.setHeader("X-Consumer-Tier", req.user.tier);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(
        `Proxied to Service A: ${req.method} ${req.path} by ${
          req.user?.username || "anonymous"
        }`
      );
    },
    onError: (err, req, res) => {
      console.error("Proxy error:", err.message);
      res.status(503).json({
        error: "Service Unavailable",
        message: "Service A is currently unavailable",
        service: "service-a",
      });
    },
  })
);

// Service B - Products API (requires API key)
app.use(
  "/api/service/b",
  apiKeyValidator,
  rateLimiter("auto"),
  createProxyMiddleware({
    target: "http://service-b:3002",
    changeOrigin: true,
    pathRewrite: {
      "^/api/service-b": "",
    },
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader("X-Consumer-Username", req.user.username);
      proxyReq.setHeader("X-Consumer-Tier", req.user.tier);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(
        `Proxied to Service B: ${req.method} ${req.path} by ${
          req.user?.username || "anonymous"
        }`
      );
    },
    onError: (err, req, res) => {
      console.error("Proxy error:", err.message);
      res.status(503).json({
        error: "Service Unavailable",
        message: "Service B is currently unavailable",
        service: "service-b",
      });
    },
  })
);

// Premium endpoints (higher rate limit)
app.use(
  "/api/premium",
  apiKeyValidator,
  (req, res, next) => {
    if (req.user.tier !== "premium") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Premium tier required to access this endpoint",
      });
    }
    next();
  },
  rateLimiter("premium"),
  createProxyMiddleware({
    target: "http://service-a:3001",
    changeOrigin: true,
    pathRewrite: {
      "^/api/premium": "",
    },
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader("X-Consumer-Username", req.user.username);
      proxyReq.setHeader("X-Consumer-Tier", "premium");
    },
  })
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "Endpoint not found",
    path: req.path,
  });
});

// error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

// start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
