/**
 * TORK Freight Pricing & Total Operating Cost Engine (Hürmüz Phase 5)
 * 
 * Mathematical, transparent, explainable B2B logistics cost model & Carrier Smart Bidding Intelligence.
 * 
 * Cost Stack:
 * Adjusted Operating Cost = Route Direct Cost + Load-Specific Cost + Operating Overhead (8%)
 * Recommended Price = Adjusted Operating Cost / (1 - Target Gross Margin)
 * Carrier Profit = Bid Amount - Adjusted Operating Cost
 * Carrier Gross Margin % = (Carrier Profit / Bid Amount) * 100
 * 
 * Strict Principles:
 * - NO arbitrary multipliers (NO "+12% frigo", NO "+15% ADR", NO "+8% bulk", NO "+5% pallet").
 * - Only verified real cost items or official government reference fees are added.
 * - Missing/unverified cost items are marked status="unavailable" with amount=null.
 * - NEVER display fake ₺0 as if it were free.
 * - Shipper CANNOT see carrier operating cost, profit, or margin calculations.
 */

export const OFFICIAL_SOURCES = {
  KGM: {
    id: "KGM",
    name: "Karayolları Genel Müdürlüğü (KGM)",
    year: "2026",
    url: "https://www.kgm.gov.tr/",
    specialPermitFee2026: 18813.80, // TL (KGM 2026 Özel Yük Taşıma İzin Belgesi Harcı)
  },
  TICARET_BAKANLIGI: {
    id: "TICARET_BAKANLIGI",
    name: "T.C. Ticaret Bakanlığı 2026 Hizmet Tarifesi",
    year: "2026",
    url: "https://destek.ticaret.gov.tr/duyurular/2026-yili-hizmet-tarifesi",
  },
  UHDGM_ADR: {
    id: "UHDGM_ADR",
    name: "Ulaştırma ve Altyapı Bakanlığı / UHDGM ADR Mevzuatı",
    year: "2026",
    url: "https://uhdgm.uab.gov.tr/",
  },
  TARIM_ORMAN: {
    id: "TARIM_ORMAN",
    name: "T.C. Tarım ve Orman Bakanlığı Soğuk Zincir & Gıda Güvenliği Standartları",
    year: "2026",
    url: "https://www.tarimorman.gov.tr/",
  },
  EPDK_UCUZYAKIT: {
    id: "EPDK_UCUZYAKIT",
    name: "EPDK & UcuzYakıtBul Canlı Pompa Fiyatları",
    year: "2026",
    url: "https://ucuzyakitbul.com.tr/",
  },
};

export const KGM_AXLE_CLASSES = {
  CLASS_1: { code: "1", label: "1. Sınıf (Aks aralığı < 3.20m)" },
  CLASS_2: { code: "2", label: "2. Sınıf (2 akslı - Kamyonet)" },
  CLASS_3: { code: "3", label: "3. Sınıf (3 akslı - Kamyon)" },
  CLASS_4: { code: "4", label: "4. Sınıf (4-5 akslı - Kırkayak)" },
  CLASS_5: { code: "5", label: "5. Sınıf (5+ akslı - TIR / Çekici)" },
};

export const LOAD_TYPES = {
  STANDARD_DRY: {
    id: "STANDARD_DRY",
    label: "Kuru Yük",
    complexityScore: 1,
    description: "Standart kapalı kasa / tenteli kuru kargo. Ek özel donanım gerektirmez.",
  },
  PALLETIZED: {
    id: "PALLETIZED",
    label: "Paletli Yük",
    complexityScore: 2,
    description: "Euro / standart paletli yükleme. Forklift / transpalet operasyonu.",
  },
  BULK: {
    id: "BULK",
    label: "Dökme Yük",
    complexityScore: 3,
    description: "Damperli / açık kasa dökme malzeme. Mekanik yükleme/boşaltma.",
  },
  REFRIGERATED: {
    id: "REFRIGERATED",
    label: "Frigo / Soğuk Zincir",
    complexityScore: 4,
    description: "İklimlendirmeli ve sıcaklık takipli gıda, ilaç, kimyasal taşıma.",
  },
  DANGEROUS_GOODS: {
    id: "DANGEROUS_GOODS",
    label: "Tehlikeli Madde (ADR)",
    complexityScore: 5,
    description: "SRC5 belgeli sürücü ve ADR Taşıt Uygunluk Belgesi gerektiren yükler.",
  },
  OVERSIZE: {
    id: "OVERSIZE",
    label: "Gabari Dışı / Özel Yük",
    complexityScore: 5,
    description: "Standart boyut/ağırlık sınırlarını aşan ve KGM Özel İzin Belgesi gerektirebilen yükler.",
  },
};

export const TEMPERATURE_CLASSES = {
  FROZEN: { id: "FROZEN", label: "Donuk (-18°C / -25°C)", minTemp: -25, maxTemp: -18 },
  CHILLED: { id: "CHILLED", label: "Soğuk (+2°C / +8°C)", minTemp: 2, maxTemp: 8 },
  COOL: { id: "COOL", label: "Serin (+8°C / +15°C)", minTemp: 8, maxTemp: 15 },
  GENERAL: { id: "GENERAL", label: "Genel / Kontrollü (+15°C / +25°C)", minTemp: 15, maxTemp: 25 },
};

export const ADR_CLASSES = {
  CLASS_1: { code: "1", label: "Sınıf 1: Patlayıcı Maddeler" },
  CLASS_2: { code: "2", label: "Sınıf 2: Gazlar (Sıkıştırılmış/Sıvılaştırılmış)" },
  CLASS_3: { code: "3", label: "Sınıf 3: Alevlenebilir Sıvılar" },
  CLASS_4: { code: "4", label: "Sınıf 4: Alevlenebilir Katılar" },
  CLASS_5: { code: "5", label: "Sınıf 5: Oksitleyici Maddeler & Organik Peroksitler" },
  CLASS_6: { code: "6", label: "Sınıf 6: Zehirli ve Bulaşıcı Maddeler" },
  CLASS_7: { code: "7", label: "Sınıf 7: Radyoaktif Maddeler" },
  CLASS_8: { code: "8", label: "Sınıf 8: Aşındırıcı (Korozif) Maddeler" },
  CLASS_9: { code: "9", label: "Sınıf 9: Muhtelif Tehlikeli Maddeler" },
};

export const PRICING_VEHICLE_CONFIG = {
  TIR: {
    id: "TIR",
    label: "TIR (13.60 Çekici & Treyler)",
    shortLabel: "TIR",
    kgmClass: KGM_AXLE_CLASSES.CLASS_5,
    maxGrossWeightTon: 40.0,
    maxCargoWeightTon: 26.0,
    maxVolumeM3: 90.0,
    maxEuroPallets: 33,
    consumptionPer100Km: 32.0, // L / 100 km
    monthlyDriverCost: 51200, // TL / month
    workingDaysPerMonth: 26,
    dailyWorkingHours: 8,
    maintenancePerKm: 5.0, // TL / km
    depreciationPerKm: 6.0, // TL / km
  },
  KIRKAYAK: {
    id: "KIRKAYAK",
    label: "Kırkayak (8x2 Ağır Kamyon)",
    shortLabel: "Kırkayak",
    kgmClass: KGM_AXLE_CLASSES.CLASS_4,
    maxGrossWeightTon: 32.0,
    maxCargoWeightTon: 20.0,
    maxVolumeM3: 65.0,
    maxEuroPallets: 22,
    consumptionPer100Km: 30.0,
    monthlyDriverCost: 48000,
    workingDaysPerMonth: 26,
    dailyWorkingHours: 8,
    maintenancePerKm: 4.5,
    depreciationPerKm: 5.5,
  },
  KAMYON: {
    id: "KAMYON",
    label: "Kamyon (Onteker / 16-24 Ton)",
    shortLabel: "Kamyon",
    kgmClass: KGM_AXLE_CLASSES.CLASS_3,
    maxGrossWeightTon: 24.0,
    maxCargoWeightTon: 15.0,
    maxVolumeM3: 45.0,
    maxEuroPallets: 18,
    consumptionPer100Km: 27.0,
    monthlyDriverCost: 43000,
    workingDaysPerMonth: 26,
    dailyWorkingHours: 8,
    maintenancePerKm: 4.0,
    depreciationPerKm: 4.5,
  },
  KAMYONET: {
    id: "KAMYONET",
    label: "Kamyonet (Panelvan / 3.5 Ton)",
    shortLabel: "Kamyonet",
    kgmClass: KGM_AXLE_CLASSES.CLASS_2,
    maxGrossWeightTon: 3.5,
    maxCargoWeightTon: 1.5,
    maxVolumeM3: 15.0,
    maxEuroPallets: 5,
    consumptionPer100Km: 12.0,
    monthlyDriverCost: 35000,
    workingDaysPerMonth: 26,
    dailyWorkingHours: 8,
    maintenancePerKm: 2.0,
    depreciationPerKm: 2.5,
  },
};

export const DEFAULT_VEHICLE_TYPE = "TIR";
export const DEFAULT_TARGET_MARGIN_PERCENT = 15; // 15% Recommended Gross Margin
export const DEFAULT_OVERHEAD_PERCENT = 8; // 8% Operational Overhead

/**
 * Normalizes load profile attributes and computes capacity utilization & complexity
 */
export function normalizeLoadProfile(loadProfile = {}) {
  if (!loadProfile || typeof loadProfile !== "object") {
    return {
      loadType: "STANDARD_DRY",
      tonnage: null,
      palletCount: null,
      packageCount: null,
      volumeM3: null,
      temperatureClass: null,
      isDangerousGoods: false,
      adrClass: null,
      isOversize: false,
      specialPermitRequired: false,
      specialHandling: null,
      loadingEquipment: null,
      unloadingEquipment: null,
      waitingHours: 0,
      complexityScore: 1,
    };
  }

  const rawType = (loadProfile.loadType || loadProfile.cargoType || loadProfile.cargo_type || "STANDARD_DRY").toUpperCase();
  let normalizedType = "STANDARD_DRY";
  if (rawType.includes("FRIGO") || rawType.includes("REFRIGERATED") || rawType.includes("SOĞUK")) {
    normalizedType = "REFRIGERATED";
  } else if (rawType.includes("ADR") || rawType.includes("TEHLİKELİ") || rawType.includes("DANGEROUS")) {
    normalizedType = "DANGEROUS_GOODS";
  } else if (rawType.includes("GABARİ") || rawType.includes("OVERSIZE") || rawType.includes("ÖZEL")) {
    normalizedType = "OVERSIZE";
  } else if (rawType.includes("PALET") || rawType.includes("PALLET")) {
    normalizedType = "PALLETIZED";
  } else if (rawType.includes("DÖKME") || rawType.includes("BULK")) {
    normalizedType = "BULK";
  } else if (LOAD_TYPES[rawType]) {
    normalizedType = rawType;
  }

  const baseConfig = LOAD_TYPES[normalizedType] || LOAD_TYPES.STANDARD_DRY;
  const isDangerous = Boolean(loadProfile.isDangerousGoods || loadProfile.is_dangerous || normalizedType === "DANGEROUS_GOODS");
  const isOversize = Boolean(loadProfile.isOversize || loadProfile.is_oversize || normalizedType === "OVERSIZE");
  const isRefrigerated = normalizedType === "REFRIGERATED";

  const tonnage = Number.isFinite(Number(loadProfile.tonnage || loadProfile.weight_tons)) && Number(loadProfile.tonnage || loadProfile.weight_tons) > 0
    ? Number(loadProfile.tonnage || loadProfile.weight_tons)
    : null;

  const palletCount = Number.isFinite(Number(loadProfile.palletCount || loadProfile.pallet_count)) && Number(loadProfile.palletCount || loadProfile.pallet_count) > 0
    ? parseInt(loadProfile.palletCount || loadProfile.pallet_count, 10)
    : null;

  const volumeM3 = Number.isFinite(Number(loadProfile.volumeM3 || loadProfile.volume_m3)) && Number(loadProfile.volumeM3 || loadProfile.volume_m3) > 0
    ? Number(loadProfile.volumeM3 || loadProfile.volume_m3)
    : null;

  const waitingHours = Number.isFinite(Number(loadProfile.waitingHours || loadProfile.waiting_hours)) && Number(loadProfile.waitingHours || loadProfile.waiting_hours) > 0
    ? Number(loadProfile.waitingHours || loadProfile.waiting_hours)
    : 0;

  let complexity = baseConfig.complexityScore;
  if (isDangerous && complexity < 5) complexity = 5;
  if (isOversize && complexity < 5) complexity = 5;

  return {
    loadType: normalizedType,
    loadTypeLabel: baseConfig.label,
    description: baseConfig.description,
    tonnage,
    palletCount,
    packageCount: loadProfile.packageCount || loadProfile.package_count || null,
    volumeM3,
    temperatureClass: isRefrigerated ? (loadProfile.temperatureClass || loadProfile.temperature_class || "CHILLED") : null,
    temperatureClassLabel: isRefrigerated ? (TEMPERATURE_CLASSES[loadProfile.temperatureClass || loadProfile.temperature_class]?.label || TEMPERATURE_CLASSES.CHILLED.label) : null,
    isDangerousGoods: isDangerous,
    adrClass: isDangerous ? (loadProfile.adrClass || loadProfile.adr_class || "CLASS_3") : null,
    adrClassLabel: isDangerous ? (ADR_CLASSES[loadProfile.adrClass || loadProfile.adr_class]?.label || ADR_CLASSES.CLASS_3.label) : null,
    isOversize,
    specialPermitRequired: Boolean(loadProfile.specialPermitRequired || loadProfile.special_permit_required || (isOversize && loadProfile.specialPermitRequired !== false)),
    specialHandling: loadProfile.specialHandling || loadProfile.special_handling || null,
    loadingEquipment: loadProfile.loadingEquipment || null,
    unloadingEquipment: loadProfile.unloadingEquipment || null,
    waitingHours,
    complexityScore: complexity,
  };
}

/**
 * Calculates complete operating cost breakdown, margin bands, and recommended freight prices
 */
export function calculateOperatingPricing({
  distanceKm,
  durationMinutes = null,
  vehicleType = "TIR",
  axleClass = null,
  fuelPricePerLiter = 78.54,
  customConsumption = null,
  customTollCost = null,
  tollStatus: explicitTollStatus = null,
  tollSource = null,
  loadProfile = null,
  targetMarginPercent = DEFAULT_TARGET_MARGIN_PERCENT,
  operatingOverheadPercent = DEFAULT_OVERHEAD_PERCENT,
  isRoundTrip = false,
  returnBufferPercent = 0,
}) {
  const dist = typeof distanceKm === "number" ? distanceKm : parseFloat(distanceKm);
  if (!Number.isFinite(dist) || dist <= 0) {
    return null;
  }

  const vKey = (vehicleType || "TIR").toUpperCase();
  const vConfig = PRICING_VEHICLE_CONFIG[vKey] || PRICING_VEHICLE_CONFIG.TIR;
  const normalizedLoad = normalizeLoadProfile(loadProfile);

  // Axle class override support
  const effectiveAxleClass = axleClass || vConfig.kgmClass.code;
  const effectiveAxleLabel = Object.values(KGM_AXLE_CLASSES).find(c => c.code === String(effectiveAxleClass))?.label || vConfig.kgmClass.label;

  // 1. Distance & Multipliers (Full Precision + Buffer support)
  const bufferPct = Number.isFinite(Number(returnBufferPercent)) ? Math.max(0, Math.min(100, Number(returnBufferPercent))) : 0;
  const tripMultiplier = isRoundTrip ? 2 * (1 + bufferPct / 100) : 1;
  const effectiveDistanceKm = dist * tripMultiplier;

  // 2. Duration & Driver Cost
  const effectiveDurationMinutes = durationMinutes && Number.isFinite(durationMinutes) && durationMinutes > 0
    ? (durationMinutes * tripMultiplier)
    : (effectiveDistanceKm / 65) * 60 + 60;

  const tripDurationHours = effectiveDurationMinutes / 60;

  // Driver labor hourly rate = monthlyCost / (workingDays * dailyHours)
  const hourlyDriverCost = vConfig.monthlyDriverCost / (vConfig.workingDaysPerMonth * vConfig.dailyWorkingHours);
  const driverCost = Math.round(tripDurationHours * hourlyDriverCost);

  // 3. Fuel Cost (High Precision: supports Custom Consumption)
  const unitFuelPrice = Number.isFinite(fuelPricePerLiter) && fuelPricePerLiter > 0 ? fuelPricePerLiter : 78.54;
  
  const isCustomConsumption = customConsumption !== null &&
    customConsumption !== undefined &&
    Number.isFinite(Number(customConsumption)) &&
    Number(customConsumption) >= 1 &&
    Number(customConsumption) <= 100;

  const consumption = isCustomConsumption
    ? Number(customConsumption)
    : vConfig.consumptionPer100Km;

  const fuelLiters = (effectiveDistanceKm / 100) * consumption;
  const fuelCostRaw = fuelLiters * unitFuelPrice;
  const fuelCost = Math.round(fuelCostRaw);

  // 4. Toll / Highway Cost
  let tollCost = null;
  let tollStatus = "unavailable";
  let effectiveTollSource = tollSource || "KGM (Doğrulanamadı)";

  if (customTollCost !== null && Number.isFinite(customTollCost) && customTollCost >= 0) {
    tollCost = Math.round(customTollCost * (isRoundTrip ? 2 : 1));
    tollStatus = explicitTollStatus || "exact";
    effectiveTollSource = tollSource || "KGM / Google Routes";
  } else {
    tollCost = null;
    tollStatus = "unavailable";
    effectiveTollSource = "Geçiş bilgisi bu rota için doğrulanamadı";
  }

  const tollIncluded = tollCost !== null && (tollStatus === "exact" || tollStatus === "estimated");

  // 5. Maintenance Cost
  const maintenanceCost = Math.round(effectiveDistanceKm * vConfig.maintenancePerKm);

  // 6. Depreciation / Amortization Cost
  const depreciationCost = Math.round(effectiveDistanceKm * vConfig.depreciationPerKm);

  // 7. Route Direct Cost
  const routeDirectCost = fuelCost + driverCost + (tollIncluded ? tollCost : 0) + maintenanceCost + depreciationCost;

  // 8. LOAD-SPECIFIC DIRECT COSTS (HÜRMÜZ PHASE 4 & 5)
  const loadSpecificItems = [];
  let totalLoadSpecificCost = 0;

  // 8.1. Palletized / Bulk Handling
  let handlingCost = null;
  let handlingStatus = "unavailable";
  let handlingSource = OFFICIAL_SOURCES.TICARET_BAKANLIGI.name;
  let handlingFormula = "Standart yükleme. Ekstra elleçleme maliyeti dahil edilmedi.";

  if (normalizedLoad.loadType === "PALLETIZED") {
    if (normalizedLoad.palletCount) {
      handlingStatus = "unverified";
      handlingFormula = `${normalizedLoad.palletCount} Euro Palet elleçleme gereksinimi.`;
    }
  } else if (normalizedLoad.loadType === "BULK") {
    handlingStatus = "unverified";
    handlingFormula = `Mekanik dökme yükleme / boşaltma operasyonu (${normalizedLoad.tonnage || "belirtilmemiş"} ton).`;
  }

  loadSpecificItems.push({
    key: "handling",
    label: "Elleçleme & Yükleme",
    cost: handlingCost,
    status: handlingStatus,
    isIncluded: false,
    sourceType: "OFFICIAL_REFERENCE",
    sourceName: handlingSource,
    formula: handlingFormula,
  });

  // 8.2. Refrigeration / Cold Chain Energy
  let refrigerationCost = null;
  let refrigerationStatus = "unavailable";
  let refrigerationSource = OFFICIAL_SOURCES.TARIM_ORMAN.name;
  let refrigerationFormula = "Soğutma enerji maliyeti henüz bağımsız telemetri ile doğrulanmadı (Dahil edilmedi).";

  if (normalizedLoad.loadType === "REFRIGERATED") {
    refrigerationStatus = "unavailable";
    refrigerationFormula = `Frigo iklimlendirme: ${normalizedLoad.temperatureClassLabel || "Soğuk Zincir"}. Sabit yüzdelik çarpan eklenmemiştir.`;
  }

  loadSpecificItems.push({
    key: "temperature",
    label: "Frigo / Sıcaklık Kontrolü",
    cost: refrigerationCost,
    status: refrigerationStatus,
    isIncluded: false,
    sourceType: "OFFICIAL_REFERENCE",
    sourceName: refrigerationSource,
    formula: refrigerationFormula,
  });

  // 8.3. ADR / Dangerous Goods Compliance
  let adrComplianceCost = null;
  let adrComplianceStatus = "unavailable";
  let adrComplianceSource = OFFICIAL_SOURCES.UHDGM_ADR.name;
  let adrComplianceFormula = "ADR mevzuat uyumluluğu (SRC5 + Taşıt Uygunluk Belgesi). Yapay risk yüzdesi eklenmemiştir.";

  if (normalizedLoad.isDangerousGoods) {
    adrComplianceStatus = "verified_requirement";
    adrComplianceFormula = `ADR ${normalizedLoad.adrClassLabel || "Tehlikeli Madde"}: SRC5 belgeli sürücü ve sertifikalı donanım zorunluluğu.`;
  }

  loadSpecificItems.push({
    key: "compliance",
    label: "ADR Mevzuat & Belgelendirme",
    cost: adrComplianceCost,
    status: adrComplianceStatus,
    isIncluded: false,
    sourceType: "OFFICIAL_REFERENCE",
    sourceName: adrComplianceSource,
    formula: adrComplianceFormula,
  });

  // 8.4. Oversize / Special Permit (Official KGM 2026 Fee)
  let permitCost = null;
  let permitStatus = "unavailable";
  let permitSource = OFFICIAL_SOURCES.KGM.name;
  let permitFormula = "Özel yük izin harcı gerekmemektedir.";

  if (normalizedLoad.isOversize && normalizedLoad.specialPermitRequired) {
    permitCost = Math.round(OFFICIAL_SOURCES.KGM.specialPermitFee2026);
    permitStatus = "exact";
    permitFormula = `KGM 2026 Özel Yük Taşıma İzin Belgesi Resmi Harcı: ₺${permitCost.toLocaleString("tr-TR")}`;
    totalLoadSpecificCost += permitCost;
  }

  loadSpecificItems.push({
    key: "permit",
    label: "KGM Özel Yük İzin Harcı",
    cost: permitCost,
    status: permitStatus,
    isIncluded: permitCost !== null,
    sourceType: "OFFICIAL_REFERENCE",
    sourceName: permitSource,
    formula: permitFormula,
  });

  // 8.5. Waiting / Demurrage Hours
  let waitingCost = null;
  let waitingStatus = "unavailable";
  let waitingFormula = normalizedLoad.waitingHours > 0
    ? `${normalizedLoad.waitingHours} saat bekleme süresi girildi. Gerçek işlem havuzu oluştukça hesaplanacaktır.`
    : "Bekleme süresi girilmedi.";

  loadSpecificItems.push({
    key: "waiting",
    label: "Bekleme / Demuraj",
    cost: waitingCost,
    status: waitingStatus,
    isIncluded: false,
    sourceType: "TORK_ASSUMPTION",
    sourceName: "TORK Bekleme Standartları",
    formula: waitingFormula,
  });

  // 9. Total Direct Cost & Overhead
  const totalDirectCost = routeDirectCost + totalLoadSpecificCost;
  const overheadPercent = Number.isFinite(operatingOverheadPercent) ? operatingOverheadPercent : DEFAULT_OVERHEAD_PERCENT;
  const overheadCost = Math.round(totalDirectCost * (overheadPercent / 100));

  // 10. Total Operating Cost (Taban Maliyet)
  const totalOperatingCost = totalDirectCost + overheadCost;

  // 11. Margin Bands (Price = Cost / (1 - Margin))
  const targetMargin = Math.min(Math.max(Number.isFinite(targetMarginPercent) ? targetMarginPercent : 15, 1), 60);

  // Recommended Price (Hedeflenen Marj)
  const recommendedPrice = Math.round(totalOperatingCost / (1 - targetMargin / 100));

  // Minimum Price (Düşük Marj - %8)
  const minMarginPercent = Math.min(8, targetMargin);
  const minimumPrice = Math.round(totalOperatingCost / (1 - minMarginPercent / 100));

  // Premium Price (Gelişmiş Marj - %20)
  const premiumMarginPercent = Math.max(20, targetMargin + 5);
  const premiumPrice = Math.round(totalOperatingCost / (1 - premiumMarginPercent / 100));

  // 12. Capacity & Utilization Calculation
  let weightUtilizationPercent = null;
  let volumeUtilizationPercent = null;
  let isOverweight = false;

  if (normalizedLoad.tonnage && vConfig.maxCargoWeightTon) {
    weightUtilizationPercent = Math.round((normalizedLoad.tonnage / vConfig.maxCargoWeightTon) * 100);
    if (normalizedLoad.tonnage > vConfig.maxCargoWeightTon) {
      isOverweight = true;
    }
  }

  if (normalizedLoad.volumeM3 && vConfig.maxVolumeM3) {
    volumeUtilizationPercent = Math.round((normalizedLoad.volumeM3 / vConfig.maxVolumeM3) * 100);
  }

  // 13. Data Quality Assessment
  let dataQuality = "MEDIUM";
  if (tollStatus === "exact" || permitStatus === "exact") {
    dataQuality = "HIGH";
  } else if (tollStatus === "estimated" || tollStatus === "unavailable") {
    dataQuality = "MEDIUM";
  } else {
    dataQuality = "LOW";
  }

  const formattedDistance = Math.round(effectiveDistanceKm * 10) / 10;
  const formattedHours = Math.round(tripDurationHours * 10) / 10;
  const formattedLiters = Math.round(fuelLiters * 10) / 10;

  return {
    route: {
      distanceKm: formattedDistance,
      baseDistanceKm: dist,
      durationMinutes: Math.round(effectiveDurationMinutes),
      durationHours: formattedHours,
      isRoundTrip,
      returnBufferPercent: bufferPct,
    },
    vehicle: {
      type: vConfig.id,
      label: vConfig.label,
      shortLabel: vConfig.shortLabel,
      kgmClass: String(effectiveAxleClass),
      kgmClassLabel: effectiveAxleLabel,
      maxCargoWeightTon: vConfig.maxCargoWeightTon,
      maxVolumeM3: vConfig.maxVolumeM3,
      maxEuroPallets: vConfig.maxEuroPallets,
    },
    load: {
      ...normalizedLoad,
      utilization: {
        weightPercent: weightUtilizationPercent,
        volumePercent: volumeUtilizationPercent,
        isOverweight,
      },
    },
    breakdown: {
      route: {
        fuel: {
          cost: fuelCost,
          rawCost: fuelCostRaw,
          liters: formattedLiters,
          consumptionPer100Km: consumption,
          isCustomConsumption,
          pricePerLiter: unitFuelPrice,
          source: isCustomConsumption ? "Kullanıcı Tanımlı Tüketim (Birim Fiyat: UcuzYakıtBul)" : "UcuzYakıtBul / EPDK",
          isAssumption: isCustomConsumption,
          formula: `${formattedDistance} km ÷ 100 × ${consumption} L × ₺${unitFuelPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
        },
        driver: {
          cost: driverCost,
          hours: formattedHours,
          hourlyRate: Math.round(hourlyDriverCost * 100) / 100,
          monthlyBase: vConfig.monthlyDriverCost,
          source: "TORK Operasyonel Varsayım (Bordro Tahmini)",
          isAssumption: true,
          formula: `${formattedHours} sa × ₺${(Math.round(hourlyDriverCost * 100) / 100).toLocaleString("tr-TR")}/sa (Aylık ₺${vConfig.monthlyDriverCost.toLocaleString("tr-TR")})`,
        },
        toll: {
          cost: tollCost,
          status: tollStatus, // "exact" | "estimated" | "unavailable"
          isIncluded: tollIncluded,
          source: effectiveTollSource,
          isAssumption: tollStatus === "estimated",
          formula: tollIncluded
            ? `Geçiş ücreti: ₺${tollCost.toLocaleString("tr-TR")}`
            : "Geçiş bilgisi bu rota için doğrulanamadı (Dahil edilmedi)",
          kgmReference: OFFICIAL_SOURCES.KGM,
        },
        maintenance: {
          cost: maintenanceCost,
          ratePerKm: vConfig.maintenancePerKm,
          source: "TORK Operasyonel Bakım & Lastik Varsayımı",
          isAssumption: true,
          formula: `${formattedDistance} km × ₺${vConfig.maintenancePerKm.toFixed(2)}/km`,
        },
        depreciation: {
          cost: depreciationCost,
          ratePerKm: vConfig.depreciationPerKm,
          source: "TORK Araç Amortisman & Yıpranma Varsayımı",
          isAssumption: true,
          formula: `${formattedDistance} km × ₺${vConfig.depreciationPerKm.toFixed(2)}/km`,
        },
        subtotal: routeDirectCost,
      },
      loadSpecific: {
        items: loadSpecificItems,
        totalCost: totalLoadSpecificCost,
      },
      overhead: {
        cost: overheadCost,
        ratePercent: overheadPercent,
        source: "TORK Genel İdare & Operasyon Yönetim Payı",
        isAssumption: true,
        formula: `Toplam Doğrudan Maliyet × %${overheadPercent}`,
      },
    },
    totals: {
      routeDirectCost,
      loadSpecificDirectCost: totalLoadSpecificCost,
      totalDirectCost,
      overheadCost,
      totalOperatingCost,
      targetMarginPercent: targetMargin,
      unitCostPerKm: Math.round((totalOperatingCost / effectiveDistanceKm) * 100) / 100,
    },
    pricingBands: {
      minimum: {
        price: minimumPrice,
        marginPercent: minMarginPercent,
        label: "Taban Fiyat (Düşük Marj)",
      },
      recommended: {
        price: recommendedPrice,
        marginPercent: targetMargin,
        label: "TORK Önerilen Navlun (Sağlıklı Operasyon Marjı)",
      },
      premium: {
        price: premiumPrice,
        marginPercent: premiumMarginPercent,
        label: "Premium Navlun (Ek Güvence & Hızlı Temin)",
      },
    },
    marketCalibration: {
      sampleSize: 0,
      medianObservedPrice: null,
      medianCost: null,
      observedCostRatio: null,
      status: "CALIBRATION_PENDING_REAL_TRANSACTIONS",
    },
    meta: {
      dataQuality,
      officialSources: OFFICIAL_SOURCES,
      sources: [
        { item: "Akaryakıt Fiyatı", source: "UcuzYakıtBul / EPDK", status: "Canlı Veri" },
        { item: "Yakıt Tüketimi", source: isCustomConsumption ? "Kullanıcı Tanımlı Tüketim" : "TORK Standart Filo Profili", status: isCustomConsumption ? "Özel Girdi" : "Standart Profil" },
        { item: "Mesafe & Rota", source: "OpenRouteService", status: "Canlı Veri" },
        { item: "Geçiş Ücreti", source: effectiveTollSource, status: tollIncluded ? (tollStatus === "exact" ? "Resmi Veri" : "Tahmini Veri") : "Doğrulanamadı" },
        { item: "Özel Yük İzin Harcı", source: OFFICIAL_SOURCES.KGM.name, status: permitCost !== null ? "Resmi Harç Tarifesi" : "Gerekmiyor" },
        { item: "Sürücü, Bakım, Amortisman", source: "TORK Lojistik Maliyet Standartları", status: "Operasyonel Varsayım" },
      ],
      disclaimer: "Bu fiyatlama motoru, şeffaf matematiksel maliyet bileşenlerine ve resmi harç tarifelerine dayalı operasyonel maliyet tahminidir. Yük türü için kanıtsız yüzdelik risk çarpanı eklenmez. Nihai navlun serbest piyasa koşullarında belirlenir.",
    },
  };
}

/**
 * Compares user budget with TORK recommended pricing band and returns mathematical alignment feedback
 */
export function evaluateBudgetAlignment(budgetAmount, recommendedPricing) {
  const budget = typeof budgetAmount === "number" ? budgetAmount : parseFloat(budgetAmount);
  if (!budget || !Number.isFinite(budget) || !recommendedPricing?.pricingBands) {
    return null;
  }

  const { minimum, recommended, premium } = recommendedPricing.pricingBands;
  const cost = recommendedPricing.totals.totalOperatingCost;

  if (budget < cost) {
    const diff = cost - budget;
    return {
      status: "BELOW_COST",
      label: "Taban Maliyetin Altında",
      color: "red",
      message: `Belirtilen bütçe, tahmini doğrudan operasyon maliyetinin (₺${cost.toLocaleString("tr-TR")}) ₺${diff.toLocaleString("tr-TR")} altındadır. Taşıyıcı bulma süresi uzayabilir.`,
    };
  }

  if (budget < minimum.price) {
    return {
      status: "BELOW_RECOMMENDED",
      label: "Önerilen Bandın Altında",
      color: "amber",
      message: `Bütçeniz operasyon maliyetini karşılıyor ancak %${minimum.marginPercent} asgari marjın biraz altında kalıyor.`,
    };
  }

  if (budget <= premium.price) {
    return {
      status: "OPTIMAL",
      label: "Sağlıklı Operasyon Marjına Uygun",
      color: "emerald",
      message: `Bütçeniz TORK önerilen navlun bandı (₺${minimum.price.toLocaleString("tr-TR")} – ₺${premium.price.toLocaleString("tr-TR")}) ile tam uyumludur.`,
    };
  }

  return {
    status: "PREMIUM",
    label: "Hızlı Eşleşme (Premium Bütçe)",
    color: "gold",
    message: `Bütçeniz pazar ortalamasının üzerinde; taşıyıcı tekliflerinin hızla toplanması beklenir.`,
  };
}

/**
 * Evaluates a carrier's bid against their estimated operating cost (Carrier Smart Bidding - Phase 5)
 */
export function evaluateCarrierBid(bidAmount, pricingResult) {
  const bid = typeof bidAmount === "number" ? bidAmount : parseFloat(bidAmount);
  if (!bid || !Number.isFinite(bid) || bid <= 0 || !pricingResult?.totals) {
    return null;
  }

  const cost = pricingResult.totals.totalOperatingCost;
  const profit = Math.round((bid - cost) * 100) / 100;
  const marginPercent = Math.round((profit / bid) * 1000) / 10; // 1 decimal place without premature rounding

  let quality = "HEALTHY";
  let label = "Sağlıklı Marj";
  let color = "emerald";
  let message = "Sağlıklı operasyon marjı.";

  if (profit < 0) {
    quality = "LOSS";
    label = "Zarar Riski";
    color = "red";
    message = "Bu teklif tahmini operasyon maliyetinin altındadır.";
  } else if (marginPercent < 8) {
    quality = "LOW_MARGIN";
    label = "Düşük Marj";
    color = "amber";
    message = "Düşük marj; beklenmedik gecikmelerde kârlılık riski oluşturabilir.";
  } else if (marginPercent < 15) {
    quality = "VIABLE";
    label = "Uygulanabilir";
    color = "blue";
    message = "Taban kârlılık sınırında operasyon marjı.";
  } else if (marginPercent <= 25) {
    quality = "HEALTHY";
    label = "Sağlıklı Marj";
    color = "emerald";
    message = "Pazar standardında sağlıklı operasyon marjı.";
  } else {
    quality = "PREMIUM";
    label = "Yüksek Marj";
    color = "gold";
    message = "Yüksek operasyonel kârlılık.";
  }

  return {
    bidAmount: bid,
    estimatedCost: cost,
    estimatedProfit: Math.round(profit),
    marginPercent,
    quality,
    label,
    color,
    message,
    source: "TORK Operasyonel Yorumlama",
  };
}
