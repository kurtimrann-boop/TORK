import { NextResponse } from "next/server";
import { computeVerificationStatus } from "@/utils/verificationService";
import { authenticateServerRequest } from "@/utils/serverAuthHelper";
import { createProductionError, ERROR_CODES, generateCorrelationId } from "@/utils/errorService";

export const runtime = "nodejs";

/**
 * GET /api/verification/status
 * Returns overall verification status, verification level, and marketplace eligibility
 */
export async function GET(request) {
  const requestId = generateCorrelationId("verif-status");

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

    let profile = null;
    let docs = [];

    if (supabase) {
      try {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, role, phone_number, phone_verified, identity_verified, verification_level")
          .eq("id", user.id)
          .single();
        profile = p;

        const { data: d } = await supabase
          .from("identity_documents")
          .select("id, status, ocr_confidence, rejection_reason")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        docs = d || [];
      } catch {
        // Fallback gracefully
      }
    }

    const latestDoc = docs?.[0] || null;

    const verificationPayload = computeVerificationStatus({
      phoneVerified: profile?.phone_verified || false,
      identityVerified: profile?.identity_verified || false,
      phoneNumber: profile?.phone_number || null,
      identityDocument: latestDoc,
    });

    return NextResponse.json({
      success: true,
      verification: verificationPayload,
    });
  } catch (err) {
    const prodError = createProductionError({
      code: ERROR_CODES.DATABASE_ERROR,
      userMessage: "Doğrulama durumu alınamadı.",
      developerMessage: err.message,
      requestId,
    });
    return NextResponse.json(prodError.clientPayload, { status: prodError.httpStatus });
  }
}
