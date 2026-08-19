/**
 * TORK Centralized Production-Safe Error System (Sprint 12)
 * 
 * Standardized error classification, correlation ID generation,
 * severity scoring, and client-safe payload formatting without leaking
 * SQL errors, stack traces, or internal server secrets.
 */

export const ERROR_CODES = {
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  DATABASE_ERROR: "DATABASE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  PRICING_ERROR: "PRICING_ERROR",
  SETTLEMENT_ERROR: "SETTLEMENT_ERROR",
  WALLET_ERROR: "WALLET_ERROR",
  ROUTE_ERROR: "ROUTE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

export const ERROR_SEVERITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

export const HTTP_STATUS_MAP = {
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  DATABASE_ERROR: 503,
  NETWORK_ERROR: 502,
  PRICING_ERROR: 400,
  SETTLEMENT_ERROR: 400,
  WALLET_ERROR: 400,
  ROUTE_ERROR: 400,
  INTERNAL_ERROR: 500,
};

export function generateCorrelationId(prefix = "tork-req") {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${randomPart}`;
}

export function createProductionError({
  code = ERROR_CODES.INTERNAL_ERROR,
  userMessage = "İşlem sırasında beklenmeyen bir hata oluştu.",
  internalDetail = null,
  severity = ERROR_SEVERITY.MEDIUM,
  requestId = null,
  metadata = {},
} = {}) {
  const correlationId = requestId || generateCorrelationId();
  const httpStatus = HTTP_STATUS_MAP[code] || 500;
  const timestamp = new Date().toISOString();

  // Internal diagnostic record (safe for logging, never exposed raw to user)
  const internalLogRecord = {
    correlationId,
    code,
    httpStatus,
    severity,
    userMessage,
    internalDetail: typeof internalDetail === "object" ? JSON.stringify(internalDetail) : String(internalDetail || ""),
    timestamp,
    metadata,
  };

  // Client-safe JSON payload (strictly sanitized)
  const clientPayload = {
    success: false,
    error: userMessage,
    code,
    requestId: correlationId,
    timestamp,
  };

  return {
    httpStatus,
    clientPayload,
    internalLogRecord,
  };
}

export function sanitizeErrorMessage(rawError) {
  if (!rawError) return "Bilinmeyen bir hata oluştu.";
  const msg = typeof rawError === "string" ? rawError : rawError.message || String(rawError);

  // Mask database details
  if (msg.includes("PGRST") || msg.includes("postgres") || msg.includes("syntax error") || msg.includes("schema cache")) {
    return "Veritabanı işleminde geçici bir sorun oluştu. Lütfen tekrar deneyin.";
  }
  if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
    return "Ağ bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin.";
  }
  if (msg.includes("JWT") || msg.includes("token") || msg.includes("apikey")) {
    return "Oturum doğrulama hatası.";
  }

  return msg;
}
