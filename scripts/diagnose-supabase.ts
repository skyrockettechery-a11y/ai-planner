import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Supabase environment variables not configured");
  process.exit(1);
}

console.log("✅ Supabase URL:", SUPABASE_URL);
console.log("✅ Supabase Anon Key configured: YES\n");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runDiagnostics() {
  try {
    console.log("=== SUPABASE DIAGNOSTICS ===\n");

    // 1. Check if tables exist
    console.log("1️⃣  Checking if tables exist...");
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public");

    if (tablesError) {
      console.error("❌ Error checking tables:", tablesError);
    } else {
      const tableNames = tables?.map((t: any) => t.table_name) || [];
      console.log(`   Found tables: ${tableNames.join(", ") || "NONE"}`);
      
      if (tableNames.includes("tasks")) {
        console.log("   ✅ tasks table EXISTS");
      } else {
        console.log("   ❌ tasks table MISSING");
      }
      
      if (tableNames.includes("user_preferences")) {
        console.log("   ✅ user_preferences table EXISTS");
      } else {
        console.log("   ❌ user_preferences table MISSING");
      }
    }

    // 2. Check tasks table structure
    console.log("\n2️⃣  Checking tasks table structure...");
    const { data: tasksColumns, error: tasksColumnsError } = await supabase
      .from("tasks")
      .select("*")
      .limit(0);

    if (tasksColumnsError) {
      console.error("   ❌ Error:", tasksColumnsError.message);
    } else {
      console.log("   ✅ tasks table is accessible");
    }

    // 3. Check user_preferences table structure
    console.log("\n3️⃣  Checking user_preferences table structure...");
    const { data: prefsColumns, error: prefsColumnsError } = await supabase
      .from("user_preferences")
      .select("*")
      .limit(0);

    if (prefsColumnsError) {
      console.error("   ❌ Error:", prefsColumnsError.message);
    } else {
      console.log("   ✅ user_preferences table is accessible");
    }

    // 4. Check RLS policies
    console.log("\n4️⃣  Checking Row Level Security (RLS) policies...");
    const { data: policies, error: policiesError } = await supabase
      .rpc("get_policies_info", { table_name: "tasks" })
      .catch(() => {
        // RPC might not exist, try direct query
        return { data: null, error: "RPC not available" };
      });

    if (policies) {
      console.log(`   Found ${policies.length} policies on tasks table`);
    } else {
      console.log("   ⚠️  Could not query RLS policies directly");
    }

    // 5. Check current user
    console.log("\n5️⃣  Checking current session...");
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error("   ❌ Error:", userError.message);
    } else if (user) {
      console.log("   ✅ Current user found");
      console.log(`   User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Identities: ${JSON.stringify(user.identities)}`);
    } else {
      console.log("   ⚠️  No authenticated user (anonymous session)");
    }

    // 6. Count data
    console.log("\n6️⃣  Counting data in tables...");
    
    const { count: tasksCount, error: tasksCountError } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true });

    if (tasksCountError) {
      console.error("   ❌ Error counting tasks:", tasksCountError.message);
    } else {
      console.log(`   Tasks in database: ${tasksCount ?? "unknown"}`);
    }

    const { count: prefsCount, error: prefsCountError } = await supabase
      .from("user_preferences")
      .select("*", { count: "exact", head: true });

    if (prefsCountError) {
      console.error("   ❌ Error counting preferences:", prefsCountError.message);
    } else {
      console.log(`   User preferences in database: ${prefsCount ?? "unknown"}`);
    }

    const { count: authCount, error: authCountError } = await supabase
      .rpc("count_auth_users", {})
      .catch(() => {
        return { count: null, error: "RPC not available" };
      });

    if (authCountError) {
      console.log("   ⚠️  Could not count auth users");
    } else {
      console.log(`   Auth users: ${authCount ?? "unknown"}`);
    }

    // 7. Sample tasks (if any exist)
    console.log("\n7️⃣  Sample tasks (first 3)...");
    const { data: sampleTasks, error: sampleTasksError } = await supabase
      .from("tasks")
      .select("id, user_id, title")
      .limit(3);

    if (sampleTasksError) {
      console.error("   ❌ Error:", sampleTasksError.message);
    } else if (sampleTasks && sampleTasks.length > 0) {
      sampleTasks.forEach((task: any, i: number) => {
        console.log(`   ${i + 1}. [${task.user_id}] ${task.title}`);
      });
    } else {
      console.log("   ℹ️  No tasks found in database");
    }

    console.log("\n=== END DIAGNOSTICS ===");
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

runDiagnostics();
