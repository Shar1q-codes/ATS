/**
 * Simple mock backend server for testing connectivity
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration matching our implementation
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
    ],
    exposedHeaders: ["Authorization"],
  })
);

app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    uptime: process.uptime(),
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      configured: true,
    },
    message: "Mock backend server is running successfully!",
  });
});

// Auth endpoints for testing
app.post("/api/auth/login", (req, res) => {
  res.json({
    message: "Mock login endpoint",
    user: { id: "1", email: "test@example.com" },
    access_token: "mock-token",
  });
});

app.options("/api/auth/login", (req, res) => {
  res.status(200).end();
});

// Catch all for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(
    `🔧 CORS Origin: ${process.env.CORS_ORIGIN || "http://localhost:3000"}`
  );
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Shutting down mock backend server...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Shutting down mock backend server...");
  process.exit(0);
});
