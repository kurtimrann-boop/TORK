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
console.log("==================================================");
console.log("LIVE PRODUCTION SUPABASE PROBE:", projectRef);
console.log("==================================================");

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probe() {
  const report = {
    projectRef,
    tables: {},
    storageBuckets: [],
    migrationStatus: "UNKNOWN",
  };

  const tablesToCheck = [
    "transports",
    "transport_estimate_snapshots",
    "transport_cost_actuals",
    "transport_documents",
    "settlements",
    "loads",
    "bids",
    "profiles",
  ];

  console.log("\n1. Probing Cloud Database Tables:");
  let appliedCount = 0;
  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      report.tables[table] = { exists: false, error: error.message };
      console.log(`- public.${table}: ❌ NOT FOUND / ERROR (${error.message})`);
    } else {
      report.tables[table] = { exists: true, rows: data?.length || 0 };
      console.log(`- public.${table}: ✓ EXISTS (${data?.length || 0} rows accessible)`);
      if (["transports", "transport_estimate_snapshots", "transport_cost_actuals", "transport_documents", "settlements"].includes(table)) {
        appliedCount++;
      }
    }
  }

  if (appliedCount === 5) {
    report.migrationStatus = "APPLIED";
  } else if (appliedCount === 0) {
    report.migrationStatus = "NOT APPLIED";
  } else {
    report.migrationStatus = `PARTIALLY APPLIED (${appliedCount}/5 tables)`;
  }
  console.log(`\nMigration Status on Production Cloud DB: ${report.migrationStatus}`);

  console.log("\n2. Probing Cloud Storage Buckets:");
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) {
      console.log(`- Storage listBuckets error: ${bErr.message}`);
      report.storageStatus = "STORAGE_ERROR";
    } else {
      report.storageBuckets = (buckets || []).map(b => b.name);
      console.log(`- Buckets found:`, report.storageBuckets.length > 0 ? report.storageBuckets.join(", ") : "None");
      const hasTransportDocs = report.storageBuckets.includes("transport-documents");
      report.storageStatus = hasTransportDocs ? "READY" : "NOT CONFIGURED";
      console.log(`- 'transport-documents' Bucket Status: ${report.storageStatus}`);
    }
  } catch (e) {
    console.log(`- Storage check exception: ${e.message}`);
    report.storageStatus = "NOT CONFIGURED";
  }

  return report;
}

probe().then(r => {
  console.log("\n==================================================");
  console.log("PROBE RESULT SUMMARY:");
  console.log(JSON.stringify(r, null, 2));
});
