/**
 * TORK — Sprint 10: Database Diagnostics & Connection Probe
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

let env = {};
try {
  const envFile = fs.readFileSync("/Users/basquiat/Desktop/TORK/.env.local", "utf8");
  env = Object.fromEntries(
    envFile
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
} catch (e) {
  console.error("Could not read .env.local:", e.message);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("=== TORK SUPABASE CONNECTION PROBE ===");
console.log("Supabase URL configured:", Boolean(supabaseUrl));
console.log("Supabase Key configured:", Boolean(supabaseKey));

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: Supabase environment variables not found.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function probe() {
  const tables = [
    "profiles",
    "loads",
    "bids",
    "transports",
    "transport_documents",
    "settlements",
    "wallet_transactions",
    "settlement_disputes",
    "transport_cancellations",
    "audit_logs",
    "operational_alerts",
  ];

  console.log("\n--- Checking Table Access via Public/Anon Client ---");
  for (const t of tables) {
    try {
      const { data, error, count } = await supabase.from(t).select("*", { count: "exact", head: true });
      if (error) {
        console.log(`Table '${t}': [RESPONSE] Code: ${error.code} | Message: ${error.message}`);
      } else {
        console.log(`Table '${t}': [ONLINE] Active, Count: ${count ?? 0}`);
      }
    } catch (err) {
      console.log(`Table '${t}': [EXCEPTION] ${err.message}`);
    }
  }

  console.log("\n--- Checking Authenticated Access with Demo Accounts ---");
  const { data: authShipper, error: errShipper } = await supabase.auth.signInWithPassword({
    email: "demo.shipper@tork.local",
    password: "TorkDemo2026!S",
  });
  if (errShipper) {
    console.log("Shipper Login Error:", errShipper.message);
  } else {
    console.log("✓ Shipper Authenticated successfully:", authShipper.user.id);
  }

  const { data: authCarrier, error: errCarrier } = await supabase.auth.signInWithPassword({
    email: "demo.carrier@tork.local",
    password: "TorkDemo2026!C",
  });
  if (errCarrier) {
    console.log("Carrier Login Error:", errCarrier.message);
  } else {
    console.log("✓ Carrier Authenticated successfully:", authCarrier.user.id);
  }
}

probe();
