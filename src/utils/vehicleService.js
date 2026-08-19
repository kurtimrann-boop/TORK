/**
 * TORK Carrier Vehicle Management Service (Sprint 13.8)
 * 
 * Provides validation, normalization, and business rules for carrier fleet vehicles.
 */

export const VEHICLE_TYPES = {
  TIR: "TIR (Çekici + Yarı Römork)",
  KAMYON: "Kamyon (Kırkayak / 10 Teker)",
  KAMYONET: "Kamyonet (Panelvan / Transit)",
  ONTEKER: "10 Teker",
};

export const TRAILER_TYPES = {
  TENTELI: "Tenteli / Standart",
  FRIGO: "Frigorifik (Termokin)",
  ACIK: "Açık Kasa / Sal Kasa",
  KONTEYNER: "Konteyner Taşıyıcı",
  DAMPER: "Damperli Kasa",
  LOWBED: "Lowbed / Ağır Yük",
};

export const VEHICLE_VERIFICATION_STATUS = {
  UNVERIFIED: "unverified",
  PENDING_REVIEW: "pending_review",
  VERIFIED: "verified",
  REJECTED: "rejected",
};

/**
 * Normalizes a Turkish license plate string (e.g. "34 abc 123" -> "34 ABC 123").
 */
export function normalizePlateNumber(rawPlate) {
  if (!rawPlate || typeof rawPlate !== "string") return "";
  return rawPlate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Validates Turkish license plate format.
 * Valid standard patterns:
 *   - 34 A 1234
 *   - 34 AB 123 / 34 AB 1234
 *   - 34 ABC 12 / 34 ABC 123
 */
export function validatePlateNumber(plate) {
  const normalized = normalizePlateNumber(plate);
  const plateWithoutSpaces = normalized.replace(/\s/g, "");

  // TR plates: 2 digits (01-81), followed by 1-3 letters, followed by 2-5 digits
  const trPlateRegex = /^(0[1-9]|[1-7][0-9]|8[01])[A-Z]{1,3}\d{2,5}$/;
  if (!trPlateRegex.test(plateWithoutSpaces)) {
    return {
      valid: false,
      error: "Geçersiz Türkiye plaka formatı (Örn: 34 ABC 123).",
    };
  }

  return {
    valid: true,
    normalized,
    compact: plateWithoutSpaces,
  };
}

/**
 * Validates carrier vehicle creation/update payload.
 */
export function validateVehiclePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Geçersiz araç bilgisi." };
  }

  const { plateNumber, vehicleType, brand, model, modelYear, capacityTons, trailerType } = payload;

  const plateVal = validatePlateNumber(plateNumber);
  if (!plateVal.valid) {
    return plateVal;
  }

  if (!brand || typeof brand !== "string" || brand.trim().length < 2) {
    return { valid: false, error: "Araç markası en az 2 karakter olmalıdır (Örn: Mercedes-Benz, Ford)." };
  }

  if (!model || typeof model !== "string" || model.trim().length < 1) {
    return { valid: false, error: "Araç modeli belirtilmelidir (Örn: Actros 1845, F-MAX)." };
  }

  const currentYear = new Date().getFullYear();
  const year = Number(modelYear);
  if (modelYear !== undefined && modelYear !== null && modelYear !== "") {
    if (isNaN(year) || year < 1990 || year > currentYear + 1) {
      return { valid: false, error: `Model yılı 1990 ile ${currentYear + 1} arasında olmalıdır.` };
    }
  }

  const capacity = Number(capacityTons);
  if (isNaN(capacity) || capacity < 0.5 || capacity > 60) {
    return { valid: false, error: "Taşıma kapasitesi 0.5 ile 60 ton arasında olmalıdır." };
  }

  return {
    valid: true,
    vehicle: {
      plateNumber: plateVal.normalized,
      vehicleType: vehicleType || "TIR",
      brand: brand.trim(),
      model: model.trim(),
      modelYear: year || currentYear,
      capacityTons: capacity,
      trailerType: trailerType || "Tenteli",
    },
  };
}
