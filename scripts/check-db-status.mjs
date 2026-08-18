import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const projectRef = supabaseUrl ? supabaseUrl.replace("https://", "").split(".")[0] : "unknown";
console.log("Safe Supabase Project Ref:", projectRef);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  console.log("\n=== Checking Existing Production Tables ===");
  
  const { data: loads, error: loadErr } = await supabase.from("loads").select("id, status, vehicle_type, origin, destination").limit(3);
  console.log("Loads query status:", loadErr ? `ERROR: ${loadErr.message}` : `OK (${loads?.length || 0} rows found)`);

  const { data: bids, error: bidErr } = await supabase.from("bids").select("id, load_id, amount, status").limit(3);
  console.log("Bids query status:", bidErr ? `ERROR: ${bidErr.message}` : `OK (${bids?.length || 0} rows found)`);

  const { data: profiles, error: profErr } = await supabase.from("profiles").select("id, role, full_name").limit(3);
  console.log("Profiles query status:", profErr ? `ERROR: ${profErr.message}` : `OK (${profiles?.length || 0} rows found)`);

  // Check if new Phase 6 tables exist
  const { data: transports, error: trErr } = await supabase.from("transports").select("id").limit(1);
  console.log("Transports table status:", trErr ? `Table not found / Error: ${trErr.message}` : "TABLE ALREADY EXISTS");

  const { data: actuals, error: actErr } = await supabase.from("transport_cost_actuals").select("id").limit(1);
  console.log("Transport Cost Actuals table status:", actErr ? `Table not found / Error: ${actErr.message}` : "TABLE ALREADY EXISTS");
}

checkDatabase();
