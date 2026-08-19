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
const supabaseKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

export async function runAuthAudit() {
  console.log("\n==================================================");
  console.log("AUDIT SECTION 1: AUTH A TO Z");
  console.log("==================================================");

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Shipper Valid Login
  const { data: sLogin, error: sLoginErr } = await supabase.auth.signInWithPassword({
    email: "qa-shipper@tork.test",
    password: "TorkQA!2026Secure",
  });
  assert(!sLoginErr && sLogin.user?.id, "Shipper login with valid credentials");
  assert(sLogin.session?.access_token, "Shipper session access_token issued");

  // Fetch Shipper Profile
  const { data: sProfile, error: sProfErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", sLogin.user.id)
    .single();
  assert(!sProfErr && sProfile?.role === "shipper", "Shipper profile has role='shipper'");

  // 2. Carrier Valid Login
  const { data: cLogin, error: cLoginErr } = await supabase.auth.signInWithPassword({
    email: "qa-carrier@tork.test",
    password: "TorkQA!2026Secure",
  });
  assert(!cLoginErr && cLogin.user?.id, "Carrier login with valid credentials");
  assert(cLogin.session?.access_token, "Carrier session access_token issued");

  // Fetch Carrier Profile
  const { data: cProfile, error: cProfErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", cLogin.user.id)
    .single();
  assert(!cProfErr && cProfile?.role === "carrier", "Carrier profile has role='carrier'");

  // 3. Invalid Password Handling
  const { error: invalidPassErr } = await supabase.auth.signInWithPassword({
    email: "qa-shipper@tork.test",
    password: "WrongPassword!2026",
  });
  assert(invalidPassErr && invalidPassErr.message, "Invalid password rejected with error message");

  // 4. Invalid Email Handling
  const { error: invalidEmailErr } = await supabase.auth.signInWithPassword({
    email: "nonexistent-user-12345@tork.test",
    password: "SomePassword!2026",
  });
  assert(invalidEmailErr && invalidEmailErr.message, "Non-existent email rejected cleanly");

  // 5. Empty Email / Password Handling
  const { error: emptyEmailErr } = await supabase.auth.signInWithPassword({
    email: "",
    password: "SomePassword!2026",
  });
  assert(emptyEmailErr !== null, "Empty email rejected");

  const { error: emptyPassErr } = await supabase.auth.signInWithPassword({
    email: "qa-shipper@tork.test",
    password: "",
  });
  assert(emptyPassErr !== null, "Empty password rejected");

  // 6. Session Persistence / Refresh Check
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  assert(!sessionErr, "Session retrieval is functional");

  // 7. Logout Check
  const { error: logoutErr } = await supabase.auth.signOut();
  assert(!logoutErr, "Sign out executes cleanly");

  const { data: postLogoutSession } = await supabase.auth.getSession();
  assert(postLogoutSession.session === null, "Post-logout session is null");

  console.log(`AUTH AUDIT SUMMARY: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}

if (process.argv[1].endsWith("audit-auth.mjs")) {
  runAuthAudit().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
