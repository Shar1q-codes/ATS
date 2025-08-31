// Simple integration test to verify auth fixes
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testAuthFlow() {
  console.log('Testing authentication flow...');

  try {
    // Test registration
    console.log('1. Testing registration...');
    const registerData = {
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'recruiter',
      companyName: 'Test Company',
    };

    const registerResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      registerData,
    );
    console.log('✓ Registration successful');
    console.log('Response structure:', Object.keys(registerResponse.data));

    // Verify response structure matches frontend expectations
    const { accessToken, refreshToken, expiresIn, user } =
      registerResponse.data;
    if (!accessToken || !refreshToken || !expiresIn || !user) {
      throw new Error('Registration response missing required fields');
    }
    console.log('✓ Response structure matches frontend expectations');

    // Test login
    console.log('2. Testing login...');
    const loginData = {
      email: 'test@example.com',
      password: 'TestPassword123',
    };

    const loginResponse = await axios.post(
      `${API_BASE_URL}/auth/login`,
      loginData,
    );
    console.log('✓ Login successful');

    // Test token refresh
    console.log('3. Testing token refresh...');
    const refreshData = {
      refresh_token: loginResponse.data.refreshToken,
    };

    const refreshResponse = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      refreshData,
    );
    console.log('✓ Token refresh successful');

    // Test verify endpoint
    console.log('4. Testing token verification...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${refreshResponse.data.accessToken}`,
      },
    });
    console.log('✓ Token verification successful');

    console.log('\n🎉 All authentication tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Only run if backend is available
axios
  .get(`${API_BASE_URL}/health`)
  .then(() => testAuthFlow())
  .catch(() => {
    console.log('Backend not running. Skipping integration test.');
    console.log(
      'To test manually, start the backend and run: node test-auth-integration.js',
    );
  });
