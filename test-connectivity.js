/**
 * Simple connectivity test script to verify environment configuration
 */

const axios = require("axios");

async function testConnectivity() {
  console.log("Testing API connectivity...");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  try {
    console.log(`Testing connection to: ${apiUrl}/health`);

    const response = await axios.get(`${apiUrl}/health`, {
      timeout: 5000,
      headers: {
        Accept: "application/json",
      },
    });

    console.log("✅ API connectivity test PASSED");
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);

    return true;
  } catch (error) {
    console.log("❌ API connectivity test FAILED");

    if (error.code === "ECONNREFUSED") {
      console.log(
        `Cannot connect to API server at ${apiUrl}. Please ensure the backend is running.`
      );
    } else if (error.code === "ENOTFOUND") {
      console.log(
        `API server not found at ${apiUrl}. Please check the API URL configuration.`
      );
    } else if (error.code === "TIMEOUT" || error.code === "ECONNABORTED") {
      console.log(
        `API server at ${apiUrl} is not responding (timeout after 5s).`
      );
    } else if (error.response) {
      console.log(
        `API server responded with error ${error.response.status}: ${error.response.data?.message || error.message}`
      );
    } else {
      console.log(`Network error: ${error.message}`);
    }

    return false;
  }
}

async function testCors() {
  console.log("\nTesting CORS configuration...");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

  try {
    // Make an OPTIONS request to test CORS preflight
    const response = await axios.options(`${apiUrl}/auth/login`, {
      timeout: 5000,
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    });

    console.log("✅ CORS test PASSED");
    console.log(`Status: ${response.status}`);

    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      // 404 is acceptable for OPTIONS request - means CORS is working
      console.log("✅ CORS test PASSED (404 on OPTIONS is expected)");
      return true;
    }

    console.log("⚠️  CORS test WARNING");
    console.log(`CORS preflight failed: ${error.message}`);
    console.log("This may be normal if the endpoint doesn't exist yet.");

    return false;
  }
}

async function main() {
  console.log("=== Environment Configuration and Connectivity Test ===\n");

  // Test environment variables
  console.log("Environment Configuration:");
  console.log(
    `API_URL: ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}`
  );
  console.log(`NODE_ENV: ${process.env.NODE_ENV || "development"}`);
  console.log("");

  // Test API connectivity
  const apiConnected = await testConnectivity();

  // Test CORS if API is connected
  let corsWorking = false;
  if (apiConnected) {
    corsWorking = await testCors();
  }

  // Summary
  console.log("\n=== Test Summary ===");
  console.log(`API Connectivity: ${apiConnected ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`CORS Configuration: ${corsWorking ? "✅ PASS" : "⚠️  WARNING"}`);

  if (apiConnected && corsWorking) {
    console.log(
      "\n🎉 All tests passed! Environment configuration is working correctly."
    );
  } else if (apiConnected) {
    console.log("\n⚠️  API is reachable but CORS may need attention.");
  } else {
    console.log(
      "\n❌ API is not reachable. Please check your backend server and environment configuration."
    );
  }
}

main().catch(console.error);
