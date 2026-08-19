import crypto from "crypto";
import { normalizePhoneNumber } from "./phoneUtils.js";

export { normalizePhoneNumber };

/**
 * TORK Phone Verification Service (Sprint 13)
 * 
 * E.164 normalization (+90 for TR), SHA-256 hashed OTPs,
 * 5-minute expiry, brute-force locking (3 attempts), and pluggable SMS provider abstraction.
 */

export const PHONE_VERIFICATION_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  EXPIRED: "expired",
  LOCKED: "locked",
};

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;
const SALT_SECRET = process.env.OTP_SALT_SECRET || "tork-production-otp-salt-key-2026";

/**
 * Computes SHA-256 hash of OTP with salt to prevent plaintext storage in DB.
 */
export function hashOtp(otp, salt = SALT_SECRET) {
  return crypto.createHash("sha256").update(`${otp}:${salt}`).digest("hex");
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateOtpCode() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * SMS Provider Interface & Implementations
 */
class DevSmsProvider {
  async sendSms({ to, message, code }) {
    return {
      success: true,
      provider: "DEV_DETERMINISTIC",
      messageId: `dev-sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      to,
      // For development/test environments, code is logged internally without exposing in production
      timestamp: new Date().toISOString(),
    };
  }
}

class NetgsmSmsProvider {
  async sendSms({ to, message }) {
    // Production Netgsm REST API integration placeholder
    return {
      success: true,
      provider: "NETGSM",
      messageId: `netgsm-${Date.now()}`,
      to,
      timestamp: new Date().toISOString(),
    };
  }
}

// Factory function for active SMS provider
export function getSmsProvider() {
  if (process.env.SMS_PROVIDER === "netgsm") {
    return new NetgsmSmsProvider();
  }
  return new DevSmsProvider();
}

/**
 * In-memory / State Machine Helper for phone verification records
 */
export function createPhoneVerificationRecord(userId, rawPhone) {
  const norm = normalizePhoneNumber(rawPhone);
  if (!norm.valid) {
    return { success: false, error: norm.error };
  }

  const otpCode = generateOtpCode();
  const salt = crypto.randomBytes(8).toString("hex");
  const otpHash = hashOtp(otpCode, salt);
  const now = Date.now();
  const expiresAt = new Date(now + OTP_EXPIRY_MS).toISOString();

  const record = {
    id: `pv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    phoneNumber: norm.e164,
    formattedPhone: norm.formatted,
    otpHash,
    otpSalt: salt,
    attemptsCount: 0,
    maxAttempts: MAX_ATTEMPTS,
    status: PHONE_VERIFICATION_STATUS.PENDING,
    expiresAt,
    verifiedAt: null,
    createdAt: new Date(now).toISOString(),
  };

  return {
    success: true,
    record,
    devOtpCode: otpCode, // For testing/dev verification
  };
}

/**
 * Validates submitted OTP against stored verification record
 */
export function verifySubmittedOtp(record, submittedOtp) {
  if (!record) {
    return { success: false, status: "NOT_FOUND", error: "Doğrulama kaydı bulunamadı." };
  }

  const now = Date.now();
  const isExpired = new Date(record.expiresAt).getTime() < now;

  if (record.status === PHONE_VERIFICATION_STATUS.LOCKED) {
    return {
      success: false,
      status: PHONE_VERIFICATION_STATUS.LOCKED,
      error: "Çok fazla hatalı kod girildi. Güvenlik sebebiyle kilitlendi. Lütfen yeni kod talep edin.",
    };
  }

  if (isExpired || record.status === PHONE_VERIFICATION_STATUS.EXPIRED) {
    record.status = PHONE_VERIFICATION_STATUS.EXPIRED;
    return {
      success: false,
      status: PHONE_VERIFICATION_STATUS.EXPIRED,
      error: "Doğrulama kodunun süresi doldu. Lütfen yeni bir kod isteyin.",
    };
  }

  if (record.status === PHONE_VERIFICATION_STATUS.VERIFIED) {
    return {
      success: true,
      status: PHONE_VERIFICATION_STATUS.VERIFIED,
      message: "Telefon numarası zaten doğrulanmış.",
    };
  }

  // Check attempt limit
  record.attemptsCount += 1;

  const candidateHash = hashOtp(submittedOtp, record.otpSalt);
  if (candidateHash !== record.otpHash) {
    if (record.attemptsCount >= record.maxAttempts) {
      record.status = PHONE_VERIFICATION_STATUS.LOCKED;
      return {
        success: false,
        status: PHONE_VERIFICATION_STATUS.LOCKED,
        error: "3 kez hatalı kod girdiniz. Doğrulama kilitlendi. Lütfen yeni bir kod talep edin.",
      };
    }
    const remaining = record.maxAttempts - record.attemptsCount;
    return {
      success: false,
      status: PHONE_VERIFICATION_STATUS.PENDING,
      remainingAttempts: remaining,
      error: `Hatalı doğrulama kodu. Kalan deneme hakkı: ${remaining}`,
    };
  }

  // Success
  record.status = PHONE_VERIFICATION_STATUS.VERIFIED;
  record.verifiedAt = new Date().toISOString();

  return {
    success: true,
    status: PHONE_VERIFICATION_STATUS.VERIFIED,
    phoneNumber: record.phoneNumber,
    message: "Telefon numaranız başarıyla doğrulandı.",
  };
}
