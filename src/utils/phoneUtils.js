/**
 * TORK Phone Normalization and Utility Helpers
 * Client-safe, zero Node-dependency module.
 */

/**
 * Normalizes any Turkish or international phone number to strict E.164 format.
 * Examples:
 *   "0532 123 45 67" -> "+905321234567"
 *   "5321234567"     -> "+905321234567"
 *   "+905321234567"  -> "+905321234567"
 *   "905321234567"   -> "+905321234567"
 */
export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { valid: false, error: "Telefon numarası geçerli bir metin olmalıdır." };
  }

  // Strip all whitespace, dashes, parentheses
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // 1. Turkish mobile numbers
  if (cleaned.startsWith("05") && cleaned.length === 11) {
    cleaned = "90" + cleaned.substring(1);
  } else if (cleaned.startsWith("5") && cleaned.length === 10) {
    cleaned = "90" + cleaned;
  } else if (cleaned.startsWith("905") && cleaned.length === 12) {
    // Already in correct 905XXXXXXXXX format
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    // Landline or non-mobile in TR
    return { valid: false, error: "Yalnızca cep telefonu numaraları kabul edilmektedir (05XX...)." };
  } else {
    // Check if other valid international format with at least 10 digits
    if (cleaned.length < 10 || cleaned.length > 15 || !/^\d+$/.test(cleaned)) {
      return { valid: false, error: "Geçersiz telefon numarası biçimi." };
    }
  }

  const e164 = `+${cleaned}`;

  // Formatted display representation: +90 (5XX) XXX XX XX
  let formatted = e164;
  if (cleaned.startsWith("905") && cleaned.length === 12) {
    const p1 = cleaned.substring(2, 5);
    const p2 = cleaned.substring(5, 8);
    const p3 = cleaned.substring(8, 10);
    const p4 = cleaned.substring(10, 12);
    formatted = `+90 (${p1}) ${p2} ${p3} ${p4}`;
  }

  return {
    valid: true,
    e164,
    formatted,
    national: cleaned.startsWith("90") ? "0" + cleaned.substring(2) : cleaned,
  };
}
