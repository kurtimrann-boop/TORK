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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBucketCreation() {
  console.log("=== Testing Storage Bucket Creation ===");
  console.log("Project:", supabaseUrl.replace("https://", "").split(".")[0]);

  try {
    const { data: bucket, error: bErr } = await supabase.storage.createBucket("transport-documents", {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
    });

    if (bErr) {
      console.log("Bucket creation result:", bErr.message);
    } else {
      console.log("Bucket created successfully:", bucket);
    }

    const { data: buckets, error: lErr } = await supabase.storage.listBuckets();
    console.log("Existing buckets on Supabase:", buckets ? buckets.map(b => b.name) : lErr?.message);
  } catch (e) {
    console.log("Exception during bucket creation:", e.message);
  }
}

testBucketCreation();
