import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync("/Users/basquiat/Desktop/TORK/.env.local", "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testInsert() {
  const { data: shipperAuth } = await supabase.auth.signInWithPassword({
    email: "demo.shipper@tork.local",
    password: "TorkDemo2026!S",
  });

  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${shipperAuth.session.access_token}` } },
  });

  console.log("Inserting load with existing table schema...");
  const { data: load1, error: err1 } = await client
    .from("loads")
    .insert({
      shipper_id: shipperAuth.user.id,
      origin: "İstanbul",
      destination: "Ankara",
      tonnage: 24,
      vehicle_type: "TIR",
      status: "open",
      distance_km: 450,
    })
    .select()
    .single();

  console.log("Load insert result:", { load1, err1 });

  if (load1) {
    console.log("✓ Success! Load ID:", load1.id);
    console.log("All load keys:", Object.keys(load1));

    // Test carrier placing bid
    const { data: carrierAuth } = await supabase.auth.signInWithPassword({
      email: "demo.carrier@tork.local",
      password: "TorkDemo2026!C",
    });

    const cClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${carrierAuth.session.access_token}` } },
    });

    const { data: bid1, error: bidErr } = await cClient
      .from("bids")
      .insert({
        load_id: load1.id,
        carrier_id: carrierAuth.user.id,
        amount: 42000,
        status: "pending",
      })
      .select()
      .single();

    console.log("Bid insert result:", { bid1, bidErr });

    // Cleanup
    if (bid1) {
      await cClient.from("bids").delete().eq("id", bid1.id);
      console.log("✓ Cleaned up bid");
    }
    await client.from("loads").delete().eq("id", load1.id);
    console.log("✓ Cleaned up load");
  }
}

testInsert();
