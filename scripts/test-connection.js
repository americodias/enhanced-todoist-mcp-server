#!/usr/bin/env node

/**
 * Test script to verify Todoist API connectivity
 * Run with: npm run test-connection
 */

// Use environment variables directly (dotenv not needed for this script)

const TODOIST_API_TOKEN = process.env.TODOIST_API_TOKEN;

if (!TODOIST_API_TOKEN) {
  console.error('❌ Error: TODOIST_API_TOKEN environment variable is required');
  console.log('📝 Instructions:');
  console.log('1. Go to https://todoist.com/prefs/integrations');
  console.log('2. Copy your API token');
  console.log('3. Set it as environment variable: export TODOIST_API_TOKEN=your_token');
  console.log('4. Or create a .env file with: TODOIST_API_TOKEN=your_token');
  process.exit(1);
}

async function testConnection() {
  console.log('🔍 Testing Todoist API connection...');
  
  try {
    // Test basic API connectivity
    const response = await fetch('https://api.todoist.com/rest/v2/projects', {
      headers: {
        'Authorization': `Bearer ${TODOIST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const projects = await response.json();
    console.log('✅ API connection successful!');
    console.log(`📁 Found ${projects.length} project(s)`);
    
    if (projects.length > 0) {
      console.log('📋 Sample projects:');
      projects.slice(0, 3).forEach((project) => {
        console.log(`  - ${project.name} (ID: ${project.id})`);
      });
    }

    // Test tasks endpoint
    const tasksResponse = await fetch('https://api.todoist.com/rest/v2/tasks', {
      headers: {
        'Authorization': `Bearer ${TODOIST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (tasksResponse.ok) {
      const tasks = await tasksResponse.json();
      console.log(`✅ Found ${tasks.length} task(s)`);
      
      if (tasks.length > 0) {
        console.log('📝 Sample tasks:');
        tasks.slice(0, 3).forEach((task) => {
          console.log(`  - ${task.content} (Priority: ${task.priority})`);
        });
      }
    }

    console.log('\n🎉 Your Todoist MCP server should work correctly!');
    console.log('📚 Next steps:');
    console.log('1. Build the project: npm run build');
    console.log('2. Add to Claude Desktop configuration');
    console.log('3. Restart Claude Desktop');

  } catch (error) {
    console.error('❌ Connection failed:', error instanceof Error ? error.message : error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify your API token is correct');
    console.log('2. Check your internet connection');
    console.log('3. Ensure you have access to Todoist');
  }
}

testConnection();
