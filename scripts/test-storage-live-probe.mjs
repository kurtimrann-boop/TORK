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

async function testLiveStorage() {
  console.log("=== Testing Storage Bucket 'transport-documents' ===");

  // 1. Check getBucket
  const { data: bucket, error: bErr } = await supabase.storage.getBucket("transport-documents");
  if (bErr) {
    console.log("getBucket('transport-documents') response:", bErr.message);
  } else {
    console.log("Bucket found:", bucket.name, "| Public:", bucket.public, "| File Size Limit:", bucket.file_size_limit);
  }

  // 2. Test listing files in bucket
  const { data: files, error: fErr } = await supabase.storage.from("transport-documents").list();
  if (fErr) {
    console.log("list() in 'transport-documents' response:", fErr.message);
  } else {
    console.log("Files in bucket:", files.length);
  }

  // 3. Test uploading a small test fixture
  const testBuffer = Buffer.from("TORK QA TEST FIXTURE - NOT A REAL DOCUMENT", "utf-8");
  const testPath = `test-qa/probe-${Date.now()}.txt`;
  
  const { data: uploadRes, error: uErr } = await supabase.storage
    .from("transport-documents")
    .upload(testPath, testBuffer, {
      contentType: "text/plain",
      upsert: true,
    });

  if (uErr) {
    console.log("Test upload result (Anon key):", uErr.message);
    console.log("-> As expected, unauthenticated anonymous uploads to private bucket are BLOCKED by RLS.");
  } else {
    console.log("Test upload result:", uploadRes);
    // Cleanup
    await supabase.storage.from("transport-documents").remove([testPath]);
    console.log("Test fixture cleaned up.");
  }
}

testLiveStorage();
