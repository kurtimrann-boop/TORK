import { NextResponse } from "next/server";
import { createPhoneVerificationRecord, getSmsProvider } from "@/utils/phoneVerificationService";
import { authenticateServerRequest } from "@/utils/serverAuthHelper";
import { createProductionError, ERROR_CODES, generateCorrelationId } from "@/utils/errorService";

export const runtime = "nodejs";

/**
 * POST /api/verification/phone/request
 * Initiates phone OTP request.
 */
export async function POST(request) {
  const requestId = generateCorrelationId("otp-req");

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

    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      const err = createProductionError({
        code: ERROR_CODES.VALIDATION_ERROR,
        userMessage: "Telefon numarası zorunludur.",
        requestId,
      });
      return NextResponse.json(err.clientPayload, { status: err.httpStatus });
    }

    const recResult = createPhoneVerificationRecord(user.id, phoneNumber);
    if (!recResult.success) {
      const err = createProductionError({
        code: ERROR_CODES.VALIDATION_ERROR,
        userMessage: recResult.error,
        requestId,
      });
      return NextResponse.json(err.clientPayload, { status: err.httpStatus });
    }

    const record = recResult.record;

    if (supabase) {
      try {
        await supabase.from("phone_verifications").insert({
          id: record.id,
          user_id: user.id,
          phone_number: record.phoneNumber,
          otp_hash: record.otpHash,
          otp_salt: record.otpSalt,
          attempts_count: record.attemptsCount,
          max_attempts: record.maxAttempts,
          status: record.status,
          expires_at: record.expiresAt,
        });
      } catch {
        // Fallback gracefully
      }
    }

    const smsProvider = getSmsProvider();
    await smsProvider.sendSms({
      to: record.phoneNumber,
      message: `TORK doğrulama kodunuz: ${recResult.devOtpCode}. Güvenliğiniz için kimseyle paylaşmayın.`,
      code: recResult.devOtpCode,
    });

    return NextResponse.json({
      success: true,
      message: "Doğrulama kodu SMS ile gönderildi.",
      verificationId: record.id,
      phoneNumber: record.formattedPhone,
      expiresAt: record.expiresAt,
      resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
      requestId,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "OTP isteği oluşturulamadı." },
      { status: 400 }
    );
  }
}
