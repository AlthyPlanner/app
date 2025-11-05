/**
 * Test script for Google Calendar Integration
 * Run this to test the Google Calendar OAuth flow
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

async function testGoogleCalendarIntegration() {
  console.log('🧪 Testing Google Calendar Integration\n');

  try {
    // Test 1: Check authentication status
    console.log('1. Checking authentication status...');
    const authResponse = await fetch(`${API_BASE}/google/auth/status`);
    const authData = await authResponse.json();
    
    if (authResponse.ok) {
      console.log('✅ Auth status check successful');
      console.log(`   Authorized: ${authData.authorized}`);
      if (authData.authorized) {
        console.log(`   User: ${authData.user?.name} (${authData.user?.email})`);
      }
    } else {
      console.log('❌ Auth status check failed');
    }

    // Test 2: Get Google Calendar events (if authenticated)
    if (authData.authorized) {
      console.log('\n2. Fetching Google Calendar events...');
      const eventsResponse = await fetch(`${API_BASE}/google/events`);
      const eventsData = await eventsResponse.json();
      
      if (eventsResponse.ok) {
        console.log('✅ Google Calendar events fetched successfully');
        console.log(`   Found ${eventsData.events?.length || 0} events`);
        
        if (eventsData.events && eventsData.events.length > 0) {
          console.log('   Sample events:');
          eventsData.events.slice(0, 3).forEach((event, index) => {
            console.log(`     ${index + 1}. ${event.summary} - ${new Date(event.start).toLocaleDateString()}`);
          });
        }
      } else {
        console.log('❌ Failed to fetch Google Calendar events');
        console.log(`   Error: ${eventsData.error}`);
      }
    } else {
      console.log('\n2. Skipping Google Calendar events test (not authenticated)');
      console.log('   To test Google Calendar integration:');
      console.log('   1. Start the servers: npm start (server) && npm start (client)');
      console.log('   2. Go to http://localhost:3001');
      console.log('   3. Click "Sign in with Google" button');
      console.log('   4. Complete OAuth flow');
      console.log('   5. Run this test again');
    }

    // Test 3: Test logout (if authenticated)
    if (authData.authorized) {
      console.log('\n3. Testing logout...');
      const logoutResponse = await fetch(`${API_BASE}/google/auth/logout`, {
        method: 'POST'
      });
      const logoutData = await logoutResponse.json();
      
      if (logoutResponse.ok) {
        console.log('✅ Logout successful');
      } else {
        console.log('❌ Logout failed');
        console.log(`   Error: ${logoutData.error}`);
      }
    }

  } catch (error) {
    console.log('❌ Network Error:', error.message);
    console.log('\n💡 Make sure the server is running:');
    console.log('   cd server && npm start');
  }

  console.log('\n🎉 Google Calendar integration test completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Set up Google Cloud Console credentials');
  console.log('2. Add environment variables to .env file');
  console.log('3. Start both servers');
  console.log('4. Test OAuth flow in browser');
  console.log('5. Verify calendar events sync');
}

// Test OAuth URL generation
async function testOAuthURL() {
  console.log('\n🔗 Testing OAuth URL generation...');
  
  try {
    const response = await fetch(`${API_BASE}/google/auth/url`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ OAuth URL generated successfully');
      console.log(`   URL: ${data.url}`);
    } else {
      console.log('❌ Failed to generate OAuth URL');
    }
  } catch (error) {
    console.log('❌ Error testing OAuth URL:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Google Calendar Integration Tests\n');
  
  // Check if server is running
  try {
    const healthCheck = await fetch(`${API_BASE.replace('/api', '')}/`);
    if (!healthCheck.ok) {
      throw new Error('Server not responding');
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   cd server && npm start\n');
    return;
  }

  // Run tests
  await testOAuthURL();
  await testGoogleCalendarIntegration();
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testGoogleCalendarIntegration, testOAuthURL, runTests };
