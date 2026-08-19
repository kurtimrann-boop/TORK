import { recordAuditEvent } from "./auditService.js";
import { recordMetricEvent } from "./metricService.js";
import { createProductionError, ERROR_CODES, ERROR_SEVERITY } from "./errorService.js";

/**
 * TORK Master Verification Service (Sprint 13)
 * 
 * Unified verification facade managing Phone + Driver's License verification status.
 * Enforces strict Carrier Marketplace Bidding Gate:
 *   If phone_verified !== true OR identity_verified !== true -> Carrier bidding is blocked (403).
 */

export const VERIFICATION_LEVELS = {
  UNVERIFIED: "UNVERIFIED",
  PHONE_VERIFIED: "PHONE_VERIFIED",
  IDENTITY_VERIFIED: "IDENTITY_VERIFIED",
  FULLY_VERIFIED: "FULLY_VERIFIED",
};

/**
 * Computes overall verification status for a user/carrier profile.
 */
export function computeVerificationStatus(profile = {}) {
  const isPhoneVerified = Boolean(profile.phoneVerified ?? profile.phone_verified ?? false);
  const isIdentityVerified = Boolean(profile.identityVerified ?? profile.identity_verified ?? false);
  const phoneNumber = profile.phoneNumber || profile.phone_number || null;
  const identityDocument = profile.identityDocument || profile.identity_document || null;

  let level = VERIFICATION_LEVELS.UNVERIFIED;

  if (isPhoneVerified && isIdentityVerified) {
    level = VERIFICATION_LEVELS.FULLY_VERIFIED;
  } else if (isPhoneVerified) {
    level = VERIFICATION_LEVELS.PHONE_VERIFIED;
  } else if (isIdentityVerified) {
    level = VERIFICATION_LEVELS.IDENTITY_VERIFIED;
  }

  const isEligibleForMarketplace = isPhoneVerified && isIdentityVerified;

  const missingSteps = [];
  if (!isPhoneVerified) missingSteps.push("PHONE_VERIFICATION_REQUIRED");
  if (!isIdentityVerified) missingSteps.push("IDENTITY_DOCUMENT_REQUIRED");

  return {
    phoneVerified: isPhoneVerified,
    identityVerified: isIdentityVerified,
    phoneNumber,
    verificationLevel: level,
    isEligibleForMarketplace,
    missingSteps,
    documentStatus: identityDocument ? identityDocument.status : "not_uploaded",
  };
}

export function isCarrierEligibleForMarketplace(profile) {
  const phone = Boolean(profile?.phone_verified ?? profile?.phoneVerified);
  const idDoc = Boolean(profile?.identity_verified ?? profile?.identityVerified);
  return phone && idDoc;
}

/**
 * Carrier Marketplace Bidding Gate
 * Throws structured production error if carrier is not fully verified.
 */
export function assertCarrierVerificationEligibility(carrierProfile) {
  if (!carrierProfile) {
    return {
      eligible: false,
      error: createProductionError({
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        userMessage: "Kullanıcı profili bulunamadı.",
        severity: ERROR_SEVERITY.HIGH,
      }),
    };
  }

  const phoneOk = carrierProfile.phone_verified === true || carrierProfile.phoneVerified === true;
  const identityOk = carrierProfile.identity_verified === true || carrierProfile.identityVerified === true;

  if (!phoneOk || !identityOk) {
    const missing = [];
    if (!phoneOk) missing.push("telefon doğrulaması");
    if (!identityOk) missing.push("ehliyet/kimlik belgesi doğrulaması");

    const message = `Yük borsasında teklif verebilmek için ${missing.join(" ve ")} adımlarını tamamlamanız gerekmektedir.`;

    return {
      eligible: false,
      missingRequirements: missing,
      error: createProductionError({
        code: ERROR_CODES.AUTHORIZATION_ERROR,
        userMessage: message,
        internalDetail: `Carrier ${carrierProfile.id || "unknown"} failed verification gate: phone=${phoneOk}, identity=${identityOk}`,
        severity: ERROR_SEVERITY.MEDIUM,
      }),
    };
  }

  return { eligible: true };
}

/**
 * Records verification lifecycle events in audit and metric pipelines.
 */
export function logVerificationEvent({
  userId,
  eventType,
  statusFrom,
  statusTo,
  metadata = {},
  actorRole = "carrier",
}) {
  // 1. Record in audit trail with secret redaction
  recordAuditEvent({
    eventType: `verification.${eventType}`,
    actorId: userId,
    entityType: "profile_verification",
    entityId: userId,
    metadata: {
      statusFrom,
      statusTo,
      ...metadata,
    },
  });

  // 2. Telemetry metrics
  recordMetricEvent(`VERIFICATION_${eventType.toUpperCase()}`, {
    actorRole,
  });
}
