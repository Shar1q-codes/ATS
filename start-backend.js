const { spawn } = require("child_process");
const path = require("path");

console.log("Starting backend server...");

// Change to backend directory and start the server
const backend = spawn("npm", ["run", "start:dev"], {
  cwd: path.join(__dirname, "backend"),
  stdio: "inherit",
  shell: true,
});

backend.on("error", (error) => {
  console.error("Failed to start backend:", error);
});

backend.on("close", (code) => {
  console.log(`Backend process exited with code ${code}`);
});

// Keep the process running
process.on("SIGINT", () => {
  console.log("Shutting down backend...");
  backend.kill();
  process.exit();
});
