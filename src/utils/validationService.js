/**
 * TORK — Production Input Validation & Security Service (Sprint 7)
 * 
 * Provides centralized input validation, sanitization, and error standardization.
 */

export function isValidId(id) {
  if (!id || typeof id !== "string") return false;
  const trimmed = id.trim();
  if (trimmed.length < 3 || trimmed.length > 64) return false;
  // Allows alphanumeric, dashes, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

export function validatePositiveAmount(amount, fieldName = "Tutar", { min = 0.01, max = 10_000_000 } = {}) {
  if (amount === null || amount === undefined) {
    return { valid: false, error: `${fieldName} alanı zorunludur.` };
  }
  const num = Number(amount);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return { valid: false, error: `${fieldName} geçerli bir sayı olmalıdır.` };
  }
  if (num < min) {
    return { valid: false, error: `${fieldName} en az ${min} olmalıdır.` };
  }
  if (num > max) {
    return { valid: false, error: `${fieldName} en fazla ${max.toLocaleString("tr-TR")} olabilir.` };
  }
  // Deterministic 2-decimal rounding
  const rounded = Math.round(num * 100) / 100;
  return { valid: true, value: rounded };
}

export function validateCoordinates(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
    return { valid: false, error: "Koordinatlar geçerli sayı olmalıdır." };
  }
  if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) {
    return { valid: false, error: "Koordinatlar geçerli coğrafi aralıkta olmalıdır." };
  }
  return { valid: true, lat: nLat, lng: nLng };
}

export function validateEnum(value, allowedValues, fieldName = "Durum") {
  if (!value || typeof value !== "string") {
    return { valid: false, error: `${fieldName} değeri zorunludur.` };
  }
  const normalized = value.trim().toLowerCase();
  const allowed = allowedValues.map((v) => v.toLowerCase());
  if (!allowed.includes(normalized)) {
    return {
      valid: false,
      error: `Geçersiz ${fieldName}: '${value}'. Geçerli değerler: [${allowedValues.join(", ")}]`,
    };
  }
  return { valid: true, value: normalized };
}

export function validateString(str, fieldName = "Metin", { minLength = 1, maxLength = 1000 } = {}) {
  if (typeof str !== "string") {
    return { valid: false, error: `${fieldName} geçerli bir metin olmalıdır.` };
  }
  const trimmed = str.trim();
  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} en az ${minLength} karakter olmalıdır.` };
  }
  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} en fazla ${maxLength} karakter olabilir.` };
  }
  return { valid: true, value: trimmed };
}

/**
 * Standardized safe error formatter preventing stack trace / SQL leaks
 */
export function createSafeError(statusCode, message, code = null) {
  return {
    success: false,
    error: message,
    code: code || `ERR_${statusCode}`,
    timestamp: new Date().toISOString(),
  };
}
