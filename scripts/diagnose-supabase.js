#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Load .env.local
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("\n=== SUPABASE ENVIRONMENT CHECK ===");
console.log("NEXT_PUBLIC_SUPABASE_URL:", SUPABASE_URL ? "✅ SET" : "❌ MISSING");
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✅ SET" : "❌ MISSING");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("\n❌ Supabase environment variables not configured");
  process.exit(1);
}

// Simple fetch using built-in modules
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runDiagnostics() {
  try {
    console.log("\n=== SUPABASE API DIAGNOSTICS ===\n");

    // 1. Check if Supabase is reachable
    console.log("1️⃣  Checking Supabase connectivity...");
    try {
      const response = await fetchUrl(SUPABASE_URL, {
        headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}` }
      });
      if (response.status < 500) {
        console.log("   ✅ Supabase is reachable");
      } else {
        console.log(`   ⚠️  Supabase error: ${response.status}`);
      }
    } catch (e) {
      console.error(`   ❌ Cannot reach Supabase: ${e.message}`);
    }

    // 2. List tables using REST API
    console.log("\n2️⃣  Checking tables via REST API...");
    const headers = {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    try {
      const tablesResponse = await fetchUrl(
        `${SUPABASE_URL}/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name`,
        { headers }
      );
      
      if (tablesResponse.status === 200) {
        const tables = JSON.parse(tablesResponse.body);
        const tableNames = tables.map(t => t.table_name);
        console.log(`   Found tables: ${tableNames.join(", ") || "NONE"}`);
        
        console.log(`   ${tableNames.includes("tasks") ? "✅" : "❌"} tasks table`);
        console.log(`   ${tableNames.includes("user_preferences") ? "✅" : "❌"} user_preferences table`);
      } else {
        console.log(`   ⚠️  Could not list tables: ${tablesResponse.status}`);
        console.log(`   Response: ${tablesResponse.body.substring(0, 200)}`);
      }
    } catch (e) {
      console.error(`   ❌ Error listing tables: ${e.message}`);
    }

    // 3. Try to fetch tasks
    console.log("\n3️⃣  Attempting to read tasks table...");
    try {
      const tasksResponse = await fetchUrl(
        `${SUPABASE_URL}/rest/v1/tasks?limit=1`,
        { headers }
      );
      
      if (tasksResponse.status === 200) {
        const tasks = JSON.parse(tasksResponse.body);
        console.log(`   ✅ tasks table is readable`);
        console.log(`   Found ${tasks.length} task(s) in database`);
        if (tasks.length > 0) {
          console.log(`   Sample task:`);
          console.log(`     ID: ${tasks[0].id}`);
          console.log(`     user_id: ${tasks[0].user_id}`);
          console.log(`     title: ${tasks[0].title}`);
        }
      } else if (tasksResponse.status === 404) {
        console.log("   ❌ tasks table does not exist");
      } else if (tasksResponse.status === 403) {
        console.log("   ❌ Permission denied (RLS policy blocking read)");
      } else {
        console.log(`   ⚠️  Error: ${tasksResponse.status}`);
        console.log(`   Response: ${tasksResponse.body.substring(0, 300)}`);
      }
    } catch (e) {
      console.error(`   ❌ Error: ${e.message}`);
    }

    // 4. Try to fetch user_preferences
    console.log("\n4️⃣  Attempting to read user_preferences table...");
    try {
      const prefsResponse = await fetchUrl(
        `${SUPABASE_URL}/rest/v1/user_preferences?limit=1`,
        { headers }
      );
      
      if (prefsResponse.status === 200) {
        const prefs = JSON.parse(prefsResponse.body);
        console.log(`   ✅ user_preferences table is readable`);
        console.log(`   Found ${prefs.length} preference(s) in database`);
      } else if (prefsResponse.status === 404) {
        console.log("   ❌ user_preferences table does not exist");
      } else if (prefsResponse.status === 403) {
        console.log("   ❌ Permission denied (RLS policy blocking read)");
      } else {
        console.log(`   ⚠️  Error: ${prefsResponse.status}`);
        console.log(`   Response: ${prefsResponse.body.substring(0, 300)}`);
      }
    } catch (e) {
      console.error(`   ❌ Error: ${e.message}`);
    }

    // 5. Check auth
    console.log("\n5️⃣  Checking authentication status...");
    try {
      const authResponse = await fetchUrl(
        `${SUPABASE_URL}/auth/v1/user`,
        { headers }
      );
      
      if (authResponse.status === 200) {
        const user = JSON.parse(authResponse.body);
        console.log(`   ✅ Authenticated as user`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
      } else if (authResponse.status === 401) {
        console.log("   ℹ️  Not authenticated (anonymous session)");
      } else {
        console.log(`   ⚠️  Auth check returned: ${authResponse.status}`);
      }
    } catch (e) {
      console.error(`   ❌ Error: ${e.message}`);
    }

    console.log("\n=== END DIAGNOSTICS ===\n");
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

runDiagnostics().catch(console.error);
