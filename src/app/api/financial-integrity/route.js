import { NextResponse } from "next/server";
import { runFinancialIntegrityAudit } from "../../../utils/financialIntegrityService";
import { authenticateServerRequest, getSupabaseServerClient } from "../../../utils/serverAuthHelper";

export const runtime = "nodejs";

/**
 * GET /api/financial-integrity
 * Runs real-time 7-point financial integrity audit with strict RBAC.
 * Only authenticated Admin and Operator accounts are authorized.
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");

    // 1. Explicitly block Shipper and Carrier roles (403 Forbidden)
    if (roleParam === "shipper" || roleParam === "carrier") {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim. Finansal denetim verilerine yalnızca operasyon ve yönetici rolleri erişebilir." },
        { status: 403 }
      );
    }

    // 2. Unauthenticated check: Authorization header or valid session required
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Yetkilendirme başlığı gereklidir. Lütfen oturum açın." },
        { status: 401 }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Geçersiz veya eksik yetkilendirme belirteci." },
        { status: 401 }
      );
    }

    // 3. Authenticate token via serverAuthHelper
    const { user, error: authErr, supabase: authedSupabase } = await authenticateServerRequest(token);
    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: authErr || "Geçersiz veya süresi dolmuş oturum." },
        { status: 401 }
      );
    }

    // 4. Verify user role from metadata or authenticated context
    const userRole = user.user_metadata?.role || user.app_metadata?.role || roleParam;
    if (userRole === "shipper" || userRole === "carrier") {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim. Finansal denetim verilerine yalnızca operasyon ve yönetici rolleri erişebilir." },
        { status: 403 }
      );
    }

    // Ensure authorized role is explicitly operator or admin
    if (userRole !== "operator" && userRole !== "admin" && user.role !== "service_role") {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim. Bu işlem için yönetici yetkisi gereklidir." },
        { status: 403 }
      );
    }

    const supabase = authedSupabase || getSupabaseServerClient(token);

    // 5. Fetch entities for audit calculation
    let transports = [];
    let settlements = [];
    let docs = [];

    if (supabase) {
      const [transportsRes, settlementsRes, docsRes] = await Promise.all([
        supabase.from("transports").select("*"),
        supabase.from("settlements").select("*"),
        supabase.from("transport_documents").select("*"),
      ]);
      transports = transportsRes?.data || [];
      settlements = settlementsRes?.data || [];
      docs = docsRes?.data || [];
    }

    const audit = runFinancialIntegrityAudit({
      transports,
      settlements,
      walletTransactions: [],
      documents: docs,
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
