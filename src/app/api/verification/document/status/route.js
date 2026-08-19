import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/utils/serverAuthHelper";
import { createProductionError, ERROR_CODES, generateCorrelationId } from "@/utils/errorService";

export const runtime = "nodejs";

/**
 * GET /api/verification/document/status
 * Returns user's uploaded identity document status and verification details.
 */
export async function GET(request) {
  const requestId = generateCorrelationId("doc-status");

  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const { user, error: authErr, supabase } = await authenticateServerRequest(token);
    if (authErr || !user) {
      const err = createProductionError({
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        userMessage: authErr || "Geçersiz veya süresi dolmuş oturum.",
        requestId,
      });
      return NextResponse.json(err.clientPayload, { status: err.httpStatus });
    }

    if (!supabase) {
      return NextResponse.json({ success: true, document: null });
    }

    const { data: documents, error: dbErr } = await supabase
      .from("identity_documents")
      .select("id, document_type, status, ocr_confidence, rejection_reason, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (dbErr) {
      return NextResponse.json({ success: true, document: null });
    }

    const latestDoc = documents?.[0] || null;

    return NextResponse.json({
      success: true,
      document: latestDoc,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Belge durumu alınamadı." },
      { status: 500 }
    );
  }
}
