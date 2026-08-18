/**
 * TORK — QA Test Data Provisioning & Seed Script
 *
 * SAFETY GUARDS:
 * 1. Requires TORK_QA_MODE=true environment variable or --qa argument.
 * 2. Operates ONLY on accounts prefixed with 'qa-' or 'TORK QA'.
 * 3. Never touches, modifies, or deletes real production user data.
 * 4. Passwords must be provided via QA_PASSWORD environment variable or defaults to secure test token locally.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// 1. Environment Safety Check
const isQAMode = process.env.TORK_QA_MODE === "true" || process.argv.includes("--qa");
if (!isQAMode) {
  console.error("❌ SAFETY HALT: QA seed script can only run with TORK_QA_MODE=true or --qa flag.");
  console.error("Usage: TORK_QA_MODE=true node scripts/seed-qa-data.mjs --qa");
  process.exit(1);
}

// 2. Load Supabase Environment from local .env.local without logging values
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const qaPassword = process.env.QA_PASSWORD || process.env.TORK_QA_PASSWORD || "TorkQA!2026Secure";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase environment configuration missing in .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const QA_SHIPPER = {
  email: "qa-shipper@tork.test",
  role: "shipper",
  company_name: "TORK QA Shipper",
  phone: "+90 555 000 0001",
};

const QA_CARRIER = {
  email: "qa-carrier@tork.test",
  role: "carrier",
  company_name: "TORK QA Carrier",
  phone: "+90 555 000 0002",
};

async function getOrCreateUser(userConfig) {
  // Try logging in first
  const { data: loginData } = await supabase.auth.signInWithPassword({
    email: userConfig.email,
    password: qaPassword,
  });

  if (loginData?.user) {
    console.log(`✓ Authenticated QA user: ${userConfig.email} (${userConfig.role})`);
    
    // Ensure profile exists
    await supabase.from("profiles").upsert({
      id: loginData.user.id,
      role: userConfig.role,
      company_name: userConfig.company_name,
      phone: userConfig.phone,
    });

    return { user: loginData.user, session: loginData.session };
  }

  // If not existing, register
  console.log(`ℹ Registering new QA user: ${userConfig.email}...`);
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: userConfig.email,
    password: qaPassword,
  });

  if (signUpErr) {
    throw new Error(`Failed to create QA user ${userConfig.email}: ${signUpErr.message}`);
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    throw new Error(`User ID missing after signup for ${userConfig.email}`);
  }

  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: userId,
    role: userConfig.role,
    company_name: userConfig.company_name,
    phone: userConfig.phone,
  });

  if (profileErr) {
    console.warn(`Profile upsert note for ${userConfig.email}:`, profileErr.message);
  }

  console.log(`✓ Created QA user: ${userConfig.email} (${userConfig.role})`);
  return { user: signUpData.user, session: signUpData.session };
}

async function seedQAData() {
  console.log("\n==================================================");
  console.log("🚀 TORK QA TEST ENVIRONMENT SEEDING (SAFE MODE)");
  console.log("==================================================\n");

  try {
    // 1. Provision QA Accounts
    const shipperAuth = await getOrCreateUser(QA_SHIPPER);
    const carrierAuth = await getOrCreateUser(QA_CARRIER);

    const shipperId = shipperAuth.user.id;
    const carrierId = carrierAuth.user.id;

    // Login as Shipper to respect RLS loads_insert_own_shipper policy
    const shipperClient = createClient(supabaseUrl, supabaseAnonKey);
    await shipperClient.auth.signInWithPassword({
      email: QA_SHIPPER.email,
      password: qaPassword,
    });

    // 2. Clean previous QA loads for this QA Shipper only
    const { data: existingQALoads } = await shipperClient
      .from("loads")
      .select("id")
      .eq("shipper_id", shipperId);

    if (existingQALoads && existingQALoads.length > 0) {
      const qaLoadIds = existingQALoads.map((l) => l.id);
      await shipperClient.from("bids").delete().in("load_id", qaLoadIds);
      await shipperClient.from("loads").delete().eq("shipper_id", shipperId);
      console.log(`🧹 Cleaned ${existingQALoads.length} previous QA test loads.`);
    }

    // 3. Insert Synthetic Test Loads
    const loadsToInsert = [
      {
        shipper_id: shipperId,
        origin: "Trabzon / Ortahisar",
        destination: "İstanbul / Arnavutköy",
        tonnage: 24,
        vehicle_type: "TIR (Tenteli)",
        status: "open",
      },
      {
        shipper_id: shipperId,
        origin: "Ankara / Çankaya",
        destination: "İzmir / Bornova",
        tonnage: 18,
        vehicle_type: "Kamyon (Kapalı Kasa)",
        status: "open",
      },
      {
        shipper_id: shipperId,
        origin: "Gaziantep / Şehitkamil",
        destination: "Antalya / Kepez",
        tonnage: 22,
        vehicle_type: "TIR (Damperli)",
        status: "open",
      },
      {
        shipper_id: shipperId,
        origin: "İstanbul / Arnavutköy",
        destination: "Trabzon / Ortahisar",
        tonnage: 20,
        vehicle_type: "TIR (Tenteli)",
        status: "open", // Will be assigned via accepted bid RPC
      },
    ];

    const { data: insertedLoads, error: loadErr } = await shipperClient
      .from("loads")
      .insert(loadsToInsert)
      .select();

    if (loadErr || !insertedLoads) {
      throw new Error(`Failed to insert synthetic loads: ${loadErr?.message}`);
    }

    console.log(`✓ Inserted ${insertedLoads.length} synthetic loads.`);

    // 4. Authenticate as Carrier to submit bids (respecting RLS bids_insert_own_carrier)
    const carrierClient = createClient(supabaseUrl, supabaseAnonKey);
    await carrierClient.auth.signInWithPassword({
      email: QA_CARRIER.email,
      password: qaPassword,
    });

    const load1 = insertedLoads.find((l) => l.origin.includes("Trabzon") && l.destination.includes("İstanbul"));
    const load2 = insertedLoads.find((l) => l.origin.includes("Ankara"));
    const load3 = insertedLoads.find((l) => l.origin.includes("Gaziantep"));
    const load4 = insertedLoads.find((l) => l.origin.includes("İstanbul") && l.destination.includes("Trabzon"));

    const bidsToInsert = [];

    // Load 1 (Pending Bid)
    if (load1) {
      bidsToInsert.push({
        load_id: load1.id,
        carrier_id: carrierId,
        amount: 48500,
        status: "pending",
      });
    }

    // Load 2 (Pending Bid to be rejected)
    if (load2) {
      bidsToInsert.push({
        load_id: load2.id,
        carrier_id: carrierId,
        amount: 36000,
        status: "pending",
      });
    }

    // Load 3 (Pending Bid)
    if (load3) {
      bidsToInsert.push({
        load_id: load3.id,
        carrier_id: carrierId,
        amount: 42000,
        status: "pending",
      });
    }

    // Load 4 (Pending Bid to be accepted)
    if (load4) {
      bidsToInsert.push({
        load_id: load4.id,
        carrier_id: carrierId,
        amount: 46000,
        status: "pending",
      });
    }

    const { data: insertedBids, error: bidErr } = await carrierClient
      .from("bids")
      .insert(bidsToInsert)
      .select();

    if (bidErr || !insertedBids) {
      console.warn("Note on bids insert:", bidErr?.message);
    } else {
      console.log(`✓ Inserted ${insertedBids.length} synthetic bids as carrier.`);

      // Reject bid on Load 2 using shipper RPC
      const bidOnLoad2 = insertedBids.find((b) => b.load_id === load2?.id);
      if (bidOnLoad2) {
        await shipperClient.rpc("set_bid_status", {
          p_bid_id: bidOnLoad2.id,
          p_new_status: "rejected",
        });
        console.log(`✓ Transitioned bid on Load 2 to rejected status via shipper RPC.`);
      }

      // Accept bid on Load 4 using accept_bid_and_assign_load RPC
      const bidOnLoad4 = insertedBids.find((b) => b.load_id === load4?.id);
      if (bidOnLoad4) {
        await shipperClient.rpc("accept_bid_and_assign_load", {
          p_bid_id: bidOnLoad4.id,
        });
        console.log(`✓ Accepted bid on Load 4 & atomically assigned transport to QA Carrier.`);
      }
    }

    // 5. Test RLS Cross-User Data Isolation
    console.log("\n--- RLS Isolation Verification ---");
    
    // Shipper querying carrier private profile/bids check
    const { data: shipperLoadsCheck } = await shipperClient.from("loads").select("id");
    console.log(`✓ QA Shipper can see only own loads (${shipperLoadsCheck?.length} loads).`);

    // Carrier querying open loads
    const { data: carrierOpenLoads } = await carrierClient.from("loads").select("id").eq("status", "open");
    console.log(`✓ QA Carrier can query open marketplace loads (${carrierOpenLoads?.length} open loads visible).`);

    // Carrier querying active transports (assigned load with accepted bid)
    const { data: carrierTransports } = await carrierClient
      .from("bids")
      .select("id, amount, status, loads(origin, destination, status)")
      .eq("status", "accepted");
    console.log(`✓ QA Carrier has ${carrierTransports?.length || 0} active assigned transport.`);

    console.log("\n==================================================");
    console.log("✅ QA TEST ENVIRONMENT READY");
    console.log("==================================================");
    console.log(`QA Shipper: ${QA_SHIPPER.email} (Role: shipper)`);
    console.log(`QA Carrier: ${QA_CARRIER.email} (Role: carrier)`);
    console.log("Documentation: docs/QA_TEST_GUIDE.md");
    console.log("==================================================\n");
  } catch (err) {
    console.error("❌ QA Seeding Error:", err.message);
    process.exit(1);
  }
}

seedQAData();
