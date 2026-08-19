import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runFinancialIntegrityAudit } from "../../../utils/financialIntegrityService";

export const runtime = "nodejs";

function getSupabaseClient(authHeader = null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : {},
  });
}

/**
 * GET /api/financial-integrity
 * Runs real-time 7-point financial integrity audit.
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
    const supabase = getSupabaseClient(authHeader);

    const [transportsRes, settlementsRes, docsRes] = await Promise.all([
      supabase.from("transports").select("*"),
      supabase.from("settlements").select("*"),
      supabase.from("transport_documents").select("*"),
    ]);

    const audit = runFinancialIntegrityAudit({
      transports: transportsRes.data || [],
      settlements: settlementsRes.data || [],
      walletTransactions: [],
      documents: docsRes.data || [],
    });

    return NextResponse.json({
      success: true,
      audit,
      auditedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Finansal denetim çalıştırılamadı.", details: err.message },
      { status: 500 }
    );
  }
}
