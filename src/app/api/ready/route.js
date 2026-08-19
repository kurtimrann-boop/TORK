import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateCorrelationId } from "@/utils/errorService";

export const runtime = "nodejs";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

/**
 * GET /api/ready
 * Readiness probe verifying essential database tables and application initialization.
 */
export async function GET() {
  const requestId = generateCorrelationId("ready");
  const timestamp = new Date().toISOString();

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { status: "not_ready", error: "Database client not configured", requestId, timestamp },
      { status: 503 }
    );
  }

  const requiredTables = ["profiles", "loads", "bids", "transports", "settlements", "wallet_transactions"];
  const checks = {};
  let allReady = true;

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
      if (!error) {
        checks[table] = "available";
      } else {
        checks[table] = "unavailable";
        allReady = false;
      }
    } catch {
      checks[table] = "unreachable";
      allReady = false;
    }
  }

  return NextResponse.json(
    {
      status: allReady ? "ready" : "degraded",
      tables: checks,
      requestId,
      timestamp,
    },
    { status: allReady ? 200 : 200 }
  );
}
