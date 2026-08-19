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
 * GET /api/health
 * Public health probe for monitoring systems and container orchestrators.
 */
export async function GET() {
  const requestId = generateCorrelationId("health");
  const timestamp = new Date().toISOString();

  const supabase = getSupabaseClient();
  let dbStatus = "unhealthy";

  if (supabase) {
    try {
      const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" });
      if (!error) {
        dbStatus = "healthy";
      } else {
        dbStatus = "degraded";
      }
    } catch {
      dbStatus = "unreachable";
    }
  }

  const overallStatus = dbStatus === "healthy" ? "healthy" : dbStatus === "degraded" ? "degraded" : "unhealthy";

  return NextResponse.json(
    {
      status: overallStatus,
      services: {
        database: dbStatus,
        api: "healthy",
        auth: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) ? "configured" : "missing",
      },
      requestId,
      timestamp,
      version: "1.0.0-rc",
    },
    { status: overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503 }
  );
}
