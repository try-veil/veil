const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;
const GRAFANA_API_URL = process.env.GRAFANA_API_URL || 'http://grafana:3000';
const TOKEN_FILE = '/shared/grafana-token.txt';

console.log('This is new updated code............xxxxxxjjjjjx...');
// Using admin credentials instead of token
console.log('Using admin credentials for Grafana API access');

// Dashboard templates path
const TEMPLATES_PATH = path.join(__dirname, 'templates', 'dashboards');
console.log('Dashboard templates path:', TEMPLATES_PATH);

app.use(express.json());

// Function to load dashboard template from file
function loadDashboardTemplate(templateType) {
  try {
    const templatePath = path.join(TEMPLATES_PATH, templateType, `${templateType}-dashboard.json`);
    console.log(`   → Loading template from: ${templatePath}`);
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    return JSON.parse(templateContent);
  } catch (error) {
    console.log(`   → ❌ Failed to load template for ${templateType}:`, error.message);
    throw new Error(`Failed to load dashboard template for ${templateType}: ${error.message}`);
  }
}

// Function to personalize dashboard with user info
function personalizeDashboard(template, userInfo) {
  let dashboardJson = JSON.stringify(template);
  
  // Replace placeholders with actual user info
  dashboardJson = dashboardJson.replace(/USER_NAME_PLACEHOLDER/g, userInfo.email);
  dashboardJson = dashboardJson.replace(/USER_PROVIDER_ID_PLACEHOLDER/g, userInfo.providerId || userInfo.id);
  
  return JSON.parse(dashboardJson);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'grafana-folder-webhook' });
});

// Webhook endpoint for FusionAuth user registration
app.post('/webhook/user-registered', async (req, res) => {
  const startTime = Date.now();
  console.log('\n=== 🎯 WEBHOOK REQUEST RECEIVED ===');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`📨 Full payload:`, JSON.stringify(req.body, null, 2));
  
  try {
    // Extract user information from FusionAuth webhook payload
    const { event } = req.body;
    if (!event || !event.user) {
      console.log('❌ VALIDATION ERROR: Missing event.user in payload');
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const user = event.user;
    const userEmail = user.email;
    
    if (!userEmail) {
      console.log('❌ VALIDATION ERROR: Missing user email');
      return res.status(400).json({ error: 'User email is required' });
    }

    console.log(`\n=== 📋 PROCESSING USER: ${userEmail} ===`);

    // Step 1: Get user from Grafana (expect user to already exist)
    console.log('🔍 STEP 1: Looking up user in Grafana...');
    console.log(`   → Sending GET request to: ${GRAFANA_API_URL}/api/users/lookup?loginOrEmail=${userEmail}`);
    console.log(`   → Using credentials: admin`);
    
    let grafanaUser = await getGrafanaUserByEmail(userEmail);
    if (!grafanaUser) {
      console.log(`❌ USER NOT FOUND: ${userEmail} not found in Grafana`);
      throw new Error(`User ${userEmail} does not exist in Grafana. User must be created through another process.`);
    }
    
    console.log(`✅ USER FOUND: Existing Grafana user ID = ${grafanaUser.id}`);
    console.log(`   → User details:`, JSON.stringify(grafanaUser, null, 2));

    // Step 2: Check if private folder already exists or create one
    const folderName = `${userEmail}'s Dashboards`;
    console.log(`\n🗂️  STEP 2: Checking for existing private folder "${folderName}"...`);
    
    let folder = await findUserPrivateFolder(userEmail);
    if (folder) {
      console.log(`✅ FOLDER EXISTS: Found existing folder ID = ${folder.id}, UID = ${folder.uid}`);
      console.log(`   → Folder details:`, JSON.stringify(folder, null, 2));
    } else {
      console.log(`❌ FOLDER NOT FOUND: Creating new folder "${folderName}"...`);
      console.log(`   → Sending POST request to: ${GRAFANA_API_URL}/api/folders`);
      
      folder = await createGrafanaFolder(folderName);
      if (!folder) {
        throw new Error('Failed to create folder');
      }

      console.log(`✅ FOLDER CREATED: ID = ${folder.id}, UID = ${folder.uid}`);
      console.log(`   → Folder details:`, JSON.stringify(folder, null, 2));

      // Step 3: Set folder permissions (only for newly created folders)
      console.log(`\n🔐 STEP 3: Setting folder permissions...`);
      console.log(`   → Granting admin access to user ID ${grafanaUser.id} for folder UID ${folder.uid}`);
      console.log(`   → Sending POST request to: ${GRAFANA_API_URL}/api/folders/${folder.uid}/permissions`);
      
      await setFolderPermissions(folder.uid, grafanaUser.id);

      console.log(`✅ PERMISSIONS SET: User ${userEmail} has admin access to folder "${folderName}"`);
    }
    
    // Step 4: Provision default dashboards for the user
    console.log(`\n📊 STEP 4: Provisioning default dashboards...`);
    await provisionDefaultDashboards(grafanaUser, folder);

    const processingTime = Date.now() - startTime;
    console.log(`\n=== 🎉 SUCCESS SUMMARY ===`);
    console.log(`✅ User: ${userEmail} (Grafana ID: ${grafanaUser.id})`);
    console.log(`✅ Folder: "${folderName}" (ID: ${folder.id})`);
    console.log(`✅ Permissions: Admin access granted`);
    console.log(`⏱️  Total processing time: ${processingTime}ms`);
    console.log(`=== END WEBHOOK PROCESSING ===\n`);
    
    res.json({ 
      message: 'Private folder created and dashboards provisioned successfully',
      folder: {
        name: folderName,
        id: folder.id,
        uid: folder.uid
      },
      user: {
        email: userEmail,
        id: grafanaUser.id
      },
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.log(`\n=== ❌ ERROR SUMMARY ===`);
    console.log(`💥 Error: ${error.message}`);
    console.log(`📊 Error details:`, error.response?.data || 'No additional details');
    console.log(`⏱️  Processing time before error: ${processingTime}ms`);
    console.log(`=== END WEBHOOK PROCESSING ===\n`);
    
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Check if user's private folder already exists
async function findUserPrivateFolder(userEmail) {
  try {
    const folderName = `${userEmail}'s Dashboards`;
    console.log(`   → Making API call to search for folder "${folderName}"...`);
    
    const response = await axios.get(`${GRAFANA_API_URL}/api/folders`, {
      auth: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    console.log(`   → ✅ Grafana API Response (${response.status}): Found ${response.data.length} folders`);
    
    // Find folder by exact title match
    const existingFolder = response.data.find(folder => folder.title === folderName);
    
    if (existingFolder) {
      console.log(`   → ✅ Found existing folder: ${existingFolder.title}`);
      return existingFolder;
    } else {
      console.log(`   → ❌ No existing folder found with title: ${folderName}`);
      return null;
    }
  } catch (error) {
    console.log(`   → ❌ Grafana API Error (${error.response?.status}):`, error.response?.data || error.message);
    throw error;
  }
}

// Get Grafana user by email
async function getGrafanaUserByEmail(email) {
  try {
    console.log(`   → Making API call to lookup user...`);
    const response = await axios.get(`${GRAFANA_API_URL}/api/users/lookup?loginOrEmail=${email}`, {
      auth: {
        username: 'admin',
        password: 'admin123'
      }
    });
    console.log(`   → ✅ Grafana API Response (${response.status}):`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`   → ❌ Grafana API Response (404): User not found`);
      return null; // User not found
    }
    console.log(`   → ❌ Grafana API Error (${error.response?.status}):`, error.response?.data || error.message);
    throw error;
  }
}


// Create a new folder in Grafana
async function createGrafanaFolder(title) {
  try {
    console.log(`   → Making API call to create folder...`);
    console.log(`   → Folder payload:`, JSON.stringify({ title }, null, 2));
    const response = await axios.post(`${GRAFANA_API_URL}/api/folders`, {
      title: title
    }, {
      auth: {
        username: 'admin',
        password: 'admin123'
      }
    });
    console.log(`   → ✅ Grafana API Response (${response.status}):`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log(`   → ❌ Grafana API Error (${error.response?.status}):`, error.response?.data || error.message);
    throw error;
  }
}

// Set folder permissions to restrict access to specific user
async function setFolderPermissions(folderUid, userId) {
  try {
    // Set restrictive permissions: only the specific user and admin should have access
    const permissionsPayload = {
      items: [
        {
          userId: 1, // Admin user ID
          permission: 4 // Admin permission
        },
        {
          userId: userId,
          permission: 4 // Admin permission for the folder owner
        }
      ]
    };
    
    console.log(`   → Making API call to set permissions...`);
    console.log(`   → Permissions payload:`, JSON.stringify(permissionsPayload, null, 2));
    
    const response = await axios.post(`${GRAFANA_API_URL}/api/folders/${folderUid}/permissions`, permissionsPayload, {
      auth: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    console.log(`   → ✅ Grafana API Response (${response.status}):`, response.data || 'No response body');
  } catch (error) {
    console.log(`   → ❌ Grafana API Error (${error.response?.status}):`, error.response?.data || error.message);
    throw error;
  }
}

// Determine user role based on FusionAuth roles
function getUserRole(user) {
  const roles = user.registrations?.[0]?.roles || [];
  
  // Check if user has admin role
  if (roles.includes('grafana-admin') || roles.includes('admin')) {
    return 'admin';
  }
  
  // Default to provider/viewer role
  return 'provider';
}

// Extract provider ID from user datatea
function getUserProviderId(user) {
  // Try to get provider_id from user data or registrations
  const providerId = user.data?.provider_id || 
                    user.registrations?.[0]?.data?.provider_id ||
                    user.id; // Fallback to user ID
  
  return providerId;
}

// Create log dashboard based on user role
async function createLogDashboard(folderId, userRole, userEmail, providerId) {
  console.log(`\n📊 STEP 4: Creating log dashboard for ${userRole} user...`);
  
  let dashboardTemplate;
  let dashboardTitle;
  
  if (userRole === 'admin') {
    dashboardTemplate = { ...ADMIN_DASHBOARD_TEMPLATE };
    dashboardTitle = `${userEmail} - Admin Log Dashboard`;
  } else {
    dashboardTemplate = { ...PROVIDER_DASHBOARD_TEMPLATE };
    dashboardTitle = `${userEmail} - My API Logs`;
    
    // Replace provider ID placeholder in the template
    const dashboardJson = JSON.stringify(dashboardTemplate).replace(
      /USER_PROVIDER_ID_PLACEHOLDER/g, 
      providerId
    );
    dashboardTemplate = JSON.parse(dashboardJson);
  }
  
  // Set the dashboard title and folder
  dashboardTemplate.title = dashboardTitle;
  dashboardTemplate.folderId = folderId;
  
  const payload = {
    dashboard: dashboardTemplate,
    folderId: folderId,
    overwrite: true
  };
  
  console.log(`   → Creating ${userRole} dashboard: "${dashboardTitle}"`);
  console.log(`   → Dashboard will be created in folder ID: ${folderId}`);
  console.log(`   → Provider ID filter: ${providerId}`);
  
  try {
    const response = await axios.post(`${GRAFANA_API_URL}/api/dashboards/db`, payload, {
      auth: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    console.log(`   → ✅ Dashboard created successfully (${response.status})`);
    console.log(`   → Dashboard URL: ${response.data.url}`);
    
    return response.data;
  } catch (error) {
    console.log(`   → ❌ Dashboard creation failed (${error.response?.status}):`, error.response?.data || error.message);
    throw error;
  }
}

// Provision default dashboards for the user
async function provisionDefaultDashboards(grafanaUser, folder) {
  console.log(`\n📊 STEP 4: Provisioning personalized dashboards for ${grafanaUser.email}...`);
  
  try {
    // Extract user info - use email as provider ID to match logs
    const providerId = grafanaUser.email; // Use email instead of ID to match log entries
    const userRole = grafanaUser.login === 'admin' ? 'admin' : 'provider';
    
    console.log(`   → Extracted provider ID: ${providerId} for user: ${grafanaUser.email}`);
    console.log(`   → User role: ${userRole}`);
    console.log(`   → Provider ID: ${providerId}`);
    
    // Load the appropriate dashboard template
    console.log(`   → Loading dashboard template for role: ${userRole}`);
    const dashboardTemplate = loadDashboardTemplate(userRole);
    console.log(`   → Dashboard template loaded successfully`);
    
    // Personalize the dashboard
    console.log(`   → Personalizing dashboard with user info`);
    const personalizedDashboard = personalizeDashboard(dashboardTemplate, {
      email: grafanaUser.email,
      id: grafanaUser.id,
      providerId: providerId
    });
    console.log(`   → Dashboard personalized with title: "${personalizedDashboard.title}"`);
    
    // Create dashboard payload for Grafana API
    const dashboardPayload = {
      dashboard: {
        ...personalizedDashboard,
        id: null, // Let Grafana assign ID
        folderId: folder.id
      },
      folderId: folder.id,
      overwrite: true
    };
    
    console.log(`   → Creating dashboard: "${personalizedDashboard.title}" in folder ID: ${folder.id}`);
    console.log(`   → Dashboard payload prepared, making API call to Grafana...`);
    
    // Check if dashboard already exists in the folder
    console.log(`   → Checking for existing dashboards in folder...`);
    try {
      const existingDashboards = await axios.get(`${GRAFANA_API_URL}/api/search?type=dash-db&folderId=${folder.id}`, {
        auth: {
          username: 'admin',
          password: 'admin123'
        }
      });
      
      const existingDashboard = existingDashboards.data.find(dash => dash.title === personalizedDashboard.title);
      if (existingDashboard) {
        console.log(`   → ✅ Dashboard already exists: ${personalizedDashboard.title} (ID: ${existingDashboard.id})`);
        console.log(`   → Skipping dashboard creation as it already exists`);
        return { url: existingDashboard.url, id: existingDashboard.id, status: 'already_exists' };
      }
    } catch (searchError) {
      console.log(`   → Warning: Could not check for existing dashboards, proceeding with creation`);
    }
    
    // Create the dashboard in Grafana
    const response = await axios.post(`${GRAFANA_API_URL}/api/dashboards/db`, dashboardPayload, {
      auth: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    console.log(`   → ✅ Dashboard created successfully: ${personalizedDashboard.title}`);
    console.log(`   → Dashboard URL: ${response.data.url || 'URL not provided'}`);
    return response.data;
    
  } catch (error) {
    console.log(`   → ❌ Failed to provision dashboard:`, error.message);
    if (error.response) {
      console.log(`   → Grafana API Error (${error.response.status}):`, JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.log(`   → Error code:`, error.code);
    }
    throw error;
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Webhook service listening on port ${PORT}`);
  console.log(`Grafana API URL: ${GRAFANA_API_URL}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});