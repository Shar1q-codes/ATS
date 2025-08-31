#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

class BackendStarter {
  constructor() {
    this.backendProcess = null;
    this.healthCheckUrl = "http://localhost:3001/api/health";
    this.maxRetries = 30;
    this.retryDelay = 2000;
  }

  async start() {
    console.log("🚀 Starting backend service...");

    try {
      // Check if backend is already running
      if (await this.isBackendRunning()) {
        console.log("✅ Backend is already running");
        return true;
      }

      // Start the backend process
      await this.startBackendProcess();

      // Wait for backend to be healthy
      const isHealthy = await this.waitForHealthy();

      if (isHealthy) {
        console.log("✅ Backend started successfully and is healthy");
        return true;
      } else {
        console.error("❌ Backend failed to become healthy");
        return false;
      }
    } catch (error) {
      console.error("❌ Failed to start backend:", error.message);
      return false;
    }
  }

  async isBackendRunning() {
    try {
      const response = await axios.get(this.healthCheckUrl, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async startBackendProcess() {
    return new Promise((resolve, reject) => {
      const backendDir = path.join(__dirname, "..", "backend");

      // Check if backend directory exists
      if (!fs.existsSync(backendDir)) {
        reject(new Error("Backend directory not found"));
        return;
      }

      // Check if package.json exists
      const packageJsonPath = path.join(backendDir, "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        reject(new Error("Backend package.json not found"));
        return;
      }

      console.log("📦 Starting backend process...");

      // Start the backend process
      this.backendProcess = spawn("npm", ["run", "start:dev"], {
        cwd: backendDir,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      });

      // Handle process output
      this.backendProcess.stdout.on("data", (data) => {
        const output = data.toString();
        if (output.includes("Application is running on")) {
          console.log("🎯 Backend process started");
          resolve();
        }
        // Optionally log backend output (uncomment for debugging)
        // console.log(`Backend: ${output.trim()}`);
      });

      this.backendProcess.stderr.on("data", (data) => {
        const error = data.toString();
        console.error(`Backend Error: ${error.trim()}`);
      });

      this.backendProcess.on("error", (error) => {
        console.error("Failed to start backend process:", error);
        reject(error);
      });

      this.backendProcess.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Backend process exited with code ${code}`);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.backendProcess && !this.backendProcess.killed) {
          console.log("⏰ Backend startup timeout, but process is running");
          resolve();
        }
      }, 30000);
    });
  }

  async waitForHealthy() {
    console.log("🔍 Waiting for backend to become healthy...");

    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const response = await axios.get(this.healthCheckUrl, {
          timeout: 5000,
        });

        if (response.status === 200) {
          // Also check the detailed health endpoint
          try {
            const detailedResponse = await axios.get(
              `${this.healthCheckUrl}/detailed`,
              { timeout: 5000 }
            );
            if (detailedResponse.status === 200) {
              console.log("💚 Backend is healthy");
              return true;
            }
          } catch (detailedError) {
            // Basic health check passed, detailed might not be ready yet
            console.log("💛 Backend basic health check passed");
            return true;
          }
        }
      } catch (error) {
        // Health check failed, continue retrying
      }

      console.log(`⏳ Health check ${i + 1}/${this.maxRetries} - waiting...`);
      await this.sleep(this.retryDelay);
    }

    return false;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async stop() {
    if (this.backendProcess && !this.backendProcess.killed) {
      console.log("🛑 Stopping backend process...");
      this.backendProcess.kill("SIGTERM");

      // Wait a bit for graceful shutdown
      await this.sleep(5000);

      if (!this.backendProcess.killed) {
        console.log("🔨 Force killing backend process...");
        this.backendProcess.kill("SIGKILL");
      }
    }
  }

  async restart() {
    await this.stop();
    await this.sleep(2000);
    return await this.start();
  }
}

// CLI interface
if (require.main === module) {
  const starter = new BackendStarter();
  const command = process.argv[2] || "start";

  switch (command) {
    case "start":
      starter.start().then((success) => {
        process.exit(success ? 0 : 1);
      });
      break;

    case "stop":
      starter.stop().then(() => {
        process.exit(0);
      });
      break;

    case "restart":
      starter.restart().then((success) => {
        process.exit(success ? 0 : 1);
      });
      break;

    case "check":
      starter.isBackendRunning().then((running) => {
        console.log(
          running ? "✅ Backend is running" : "❌ Backend is not running"
        );
        process.exit(running ? 0 : 1);
      });
      break;

    default:
      console.log("Usage: node start-backend.js [start|stop|restart|check]");
      process.exit(1);
  }

  // Handle process termination
  process.on("SIGINT", async () => {
    console.log("\n🛑 Received SIGINT, stopping backend...");
    await starter.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n🛑 Received SIGTERM, stopping backend...");
    await starter.stop();
    process.exit(0);
  });
}

module.exports = BackendStarter;
