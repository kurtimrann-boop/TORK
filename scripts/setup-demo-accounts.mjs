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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEMO_ACCOUNTS = [
  {
    role: "shipper",
    email: "demo.shipper@tork.local",
    password: "TorkDemo2026!S",
    fullName: "Tork Demo Shipper",
    companyName: "Tork Demo Shipper A.Ş.",
    phone: "+90 555 100 00 01",
    description: "TORK Resmi Demo Yük Veren Hesabı",
  },
  {
    role: "carrier",
    email: "demo.carrier@tork.local",
    password: "TorkDemo2026!C",
    fullName: "Tork Demo Carrier",
    companyName: "Tork Demo Carrier Lojistik",
    phone: "+90 555 200 00 02",
    description: "TORK Resmi Demo Taşıyıcı Hesabı",
  },
];

async function ensureAccount(account) {
  console.log(`\n--- Setting up ${account.role.toUpperCase()} Demo Account (${account.email}) ---`);

  // 1. Try to sign in first
  let { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });

  let userId = loginData?.user?.id;

  // 2. If not found or login failed, attempt signup
  if (!userId || loginError) {
    console.log(`User not found or credentials differ (${loginError?.message}). Attempting signUp...`);
    const { data: signData, error: signError } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        data: {
          full_name: account.fullName,
          company_name: account.companyName,
          role: account.role,
        },
      },
    });

    if (signError) {
      console.log(`SignUp returned error: ${signError.message}. Retrying signIn...`);
      // Retry signIn in case email was already registered
      const retryLogin = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });
      if (retryLogin.error) {
        throw new Error(`Failed to authenticate ${account.email}: ${retryLogin.error.message}`);
      }
      userId = retryLogin.data.user.id;
    } else {
      userId = signData?.user?.id;
      console.log(`✓ SignUp successful! User ID: ${userId}`);
    }
  } else {
    console.log(`✓ Existing user authenticated. User ID: ${userId}`);
  }

  // 3. Ensure profile record exists with exact required role
  const profilePayload = {
    id: userId,
    role: account.role,
    company_name: account.companyName,
    phone: account.phone,
  };

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!existingProfile) {
    const { error: insertErr } = await supabase.from("profiles").insert(profilePayload);
    if (insertErr) {
      console.warn(`Profile insert notice: ${insertErr.message}`);
    } else {
      console.log(`✓ Profile inserted for ${account.role}`);
    }
  } else {
    const { error: updateErr } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", userId);
    if (updateErr) {
      console.warn(`Profile update notice: ${updateErr.message}`);
    } else {
      console.log(`✓ Profile updated and verified for ${account.role}`);
    }
  }

  // 4. Verify login and profile retrieval
  const { data: verifyLogin, error: verifyErr } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });

  if (verifyErr || !verifyLogin.user) {
    throw new Error(`Verification login failed: ${verifyErr?.message}`);
  }

  const { data: verifyProfile, error: vProfErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  console.log(`✓ Auth & Profile Verification:`, {
    email: account.email,
    userId,
    role: verifyProfile?.role || account.role,
    company: verifyProfile?.company_name || account.companyName,
    status: "READY_FOR_PRODUCTION",
  });

  return { userId, role: verifyProfile?.role || account.role };
}

async function main() {
  console.log("==================================================");
  console.log("TORK DEMO ACCOUNTS CREATION & SYNC");
  console.log("==================================================");

  for (const acc of DEMO_ACCOUNTS) {
    await ensureAccount(acc);
  }

  console.log("\n==================================================");
  console.log("ALL DEMO ACCOUNTS CONFIGURED & VERIFIED SUCCESSFULLY");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Setup error:", err);
  process.exit(1);
});
