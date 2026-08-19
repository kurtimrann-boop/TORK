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

async function inspect() {
  const { data: shipperAuth } = await supabase.auth.signInWithPassword({
    email: "demo.shipper@tork.local",
    password: "TorkDemo2026!S",
  });

  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${shipperAuth.session.access_token}` } },
  });

  console.log("Trying minimal load insert with standard columns...");
  const { data: load1, error: err1 } = await client
    .from("loads")
    .insert({
      shipper_id: shipperAuth.user.id,
      origin: "İstanbul",
      destination: "Ankara",
      cargo_type: "Genel Kargo",
      status: "open",
    })
    .select();

  console.log("Minimal load insert result:", { load1, err1 });

  if (load1 && load1[0]) {
    console.log("Existing columns on loads:", Object.keys(load1[0]));
    // Clean up
    await client.from("loads").delete().eq("id", load1[0].id);
  }

  const { data: carrierAuth } = await supabase.auth.signInWithPassword({
    email: "demo.carrier@tork.local",
    password: "TorkDemo2026!C",
  });

  const cClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${carrierAuth.session.access_token}` } },
  });

  console.log("Trying minimal bid query...");
  const { data: bidSample, error: bidErr } = await cClient.from("bids").select("*").limit(1);
  console.log("Bid query result:", { bidSample, bidErr });
}

inspect();
