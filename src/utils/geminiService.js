import { GoogleGenAI } from "@google/genai";

/**
 * TORK INTELLIGENCE — Gemini Operations Intelligence Katmanı (V1)
 * 
 * ANA İLKE:
 * Hürmüz = Hesaplama Otoritesi
 * Tork Verified = Bağımsız Denetçi
 * Gemini = Açıklama, Yorumlama, Risk Analizi ve Özetleme Katmanı
 * 
 * GEMINI HÜRMÜZ HESAPLAMASINI ASLA DEĞİŞTİREMEZ.
 */

// Basit Deterministic In-Memory Cache (LRU-like, max 500 entries)
const AI_CACHE = new Map();
const MAX_CACHE_ENTRIES = 500;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 saat

function getCacheKey(mode, audience, context) {
  const normalized = JSON.stringify({
    mode,
    audience,
    dist: context?.route?.distanceKm,
    veh: context?.vehicle?.type || context?.vehicle?.label,
    load: context?.load?.loadType,
    cost: context?.pricing?.totals?.totalOperatingCost || context?.pricing?.totals?.totalDirectCost,
    rec: context?.pricing?.pricingBands?.recommended?.price,
    bid: context?.bid?.bidAmount,
  });
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return `${mode}_${audience}_${hash}`;
}

/**
 * Rol bazlı gizlilik sanitizasyonu:
 * Yük Veren (Shipper) tarafına Taşıyıcı maliyeti, kârı ve marjı ASLA iletilmez.
 */
export function sanitizeContextForAudience(context = {}, audience = "shipper") {
  if (!context || typeof context !== "object") return {};

  const sanitized = { ...context };

  if (audience === "shipper") {
    // Taşıyıcı gizli finansal verilerini temizle
    delete sanitized.carrierCost;
    delete sanitized.carrierProfit;
    delete sanitized.carrierMargin;
    delete sanitized.carrierMarginPercent;
    delete sanitized.targetOperatingCost;
    if (sanitized.bid) {
      const safeBid = { ...sanitized.bid };
      delete safeBid.operatingCost;
      delete safeBid.estimatedProfit;
      delete safeBid.estimatedMargin;
      delete safeBid.profit;
      delete safeBid.margin;
      sanitized.bid = safeBid;
    }
    if (sanitized.financials) {
      const safeFinancials = { ...sanitized.financials };
      delete safeFinancials.projectedProfit;
      delete safeFinancials.marginPercent;
      sanitized.financials = safeFinancials;
    }
  }

  return sanitized;
}

const SYSTEM_INSTRUCTION = `Sen TORK Lojistik Zekası (TORK Intelligence Operations Analyst) yapay zeka operasyon analistisin.

GÖREVİN VE ÇALIŞMA İLKELERİN:
1. HÜRMÜZ hesaplama motorunu lojistik ve navlun maliyetlerinde TEK YETKİLİ OTORİTE kabul et.
2. TORK VERIFIED denetim motoru sonuçlarını bağımsız matematiksel doğrulama referansı kabul et.
3. HESAP SONUCUNU DEĞİŞTİRME. Verilmeyen veya uydurma sayı üretme.
4. Bilinmeyen veya doğrulanmamış geçiş/harç ücretlerini 0 TL kabul etme ("doğrulanmadı" olarak açıkla).
5. Sadece sana verilen bağlamdaki verileri kullan.
6. Yanıtını MUTLAKA geçerli JSON formatında ver.

JSON ŞEMASI:
{
  "summary": "Operasyonun genel 1-2 cümlelik analizi",
  "pricingAssessment": "Navlun ve maliyet dengesi değerlendirmesi",
  "risks": [
    "Operasyonel risk faktörü 1",
    "Maliyet veya rota riski 2"
  ],
  "opportunities": [
    "Operasyonel fırsat veya kârlılık potansiyeli 1"
  ],
  "recommendedActions": [
    "Öncelikli operasyonel aksiyon 1",
    "Öncelikli operasyonel aksiyon 2"
  ],
  "findings": [
    {
      "type": "INFO" | "WARNING" | "OPPORTUNITY",
      "title": "Başlık",
      "detail": "Kısa açıklama"
    }
  ],
  "assessment": "HEALTHY" | "CAUTION" | "RISK",
  "confidence": "HIGH" | "MEDIUM"
}`;

/**
 * Gemini ile operasyon ve maliyet analizi üretir.
 * 
 * @param {Object} params
 * @param {"audit"|"explain"|"pricing"|"risk"|"dashboard"} params.mode - Analiz modu
 * @param {Object} params.context - Yapılandırılmış operasyon, rota ve fiyat bağlamı
 * @param {"shipper"|"carrier"|"admin"} [params.audience] - Hedef kitle
 * @returns {Promise<Object>} Yapılandırılmış analiz yanıtı
 */
export async function analyzeWithGemini({ mode = "audit", context = {}, audience = "shipper" } = {}) {
  const sanitizedContext = sanitizeContextForAudience(context, audience);

  // Cache Kontrolü
  const cacheKey = getCacheKey(mode, audience, sanitizedContext);
  const cached = AI_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return {
      ...cached.data,
      fromCache: true,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // API Key tanımlı değilse güvenli ve bilgilendirici fallback dön
    return getOfflineFallbackAnalysis({ mode, context: sanitizedContext, audience, reason: "API_KEY_NOT_CONFIGURED" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `Lojistik Operasyon Analizi Talebi:
Mod: ${mode.toUpperCase()}
Hedef Kitle: ${audience === "carrier" ? "Taşıyıcı / Nakliyeci" : "Yük Veren / Kurumsal Lojistik"}

Operasyon Bağlamı:
${JSON.stringify(sanitizedContext, null, 2)}

Yukarıdaki verilere dayanarak operasyon özetini, fiyatlandırma yorumunu, riskleri, fırsatları ve önerilen aksiyonları JSON formatında analiz et.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim() || "{}";
    let parsedData = null;

    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // JSON Markdown bloğu varsa temizle
      const cleaned = responseText.replace(/```json\s*|```/g, "").trim();
      parsedData = JSON.parse(cleaned);
    }

    const structuredResult = {
      success: true,
      mode,
      audience,
      summary: parsedData.summary || "Operasyonel analiz başarıyla tamamlandı.",
      pricingAssessment: parsedData.pricingAssessment || parsedData.summary || "Maliyet ve navlun değerleri incelendi.",
      risks: Array.isArray(parsedData.risks) ? parsedData.risks : [],
      opportunities: Array.isArray(parsedData.opportunities) ? parsedData.opportunities : [],
      recommendedActions: Array.isArray(parsedData.recommendedActions)
        ? parsedData.recommendedActions
        : (Array.isArray(parsedData.recommendations) ? parsedData.recommendations : []),
      recommendations: Array.isArray(parsedData.recommendedActions)
        ? parsedData.recommendedActions
        : (Array.isArray(parsedData.recommendations) ? parsedData.recommendations : []),
      findings: Array.isArray(parsedData.findings) ? parsedData.findings : [],
      assessment: parsedData.assessment || "HEALTHY",
      confidence: parsedData.confidence || "HIGH",
      analyzedAt: new Date().toISOString(),
      provider: "gemini-2.5-flash",
      fromCache: false,
    };

    // Cache'e kaydet
    if (AI_CACHE.size >= MAX_CACHE_ENTRIES) {
      const firstKey = AI_CACHE.keys().next().value;
      if (firstKey) AI_CACHE.delete(firstKey);
    }
    AI_CACHE.set(cacheKey, { data: structuredResult, cachedAt: Date.now() });

    return structuredResult;
  } catch (err) {
    // Server-side güvenli log (Secret göstermeden)
    console.error("[GeminiService] Analiz üretilirken hata:", err.message || "Bilinmeyen hata");
    return getOfflineFallbackAnalysis({ mode, context: sanitizedContext, audience, reason: err.message });
  }
}

/**
 * Gemini erişilemediğinde sistemin çökmesini engelleyen deterministik fallback analizi
 */
export function getOfflineFallbackAnalysis({ mode, context, audience, reason }) {
  const dist = context?.route?.distanceKm || 0;
  const cost = context?.pricing?.totals?.totalOperatingCost || context?.pricing?.totals?.totalDirectCost || 0;
  const recPrice = context?.pricing?.pricingBands?.recommended?.price || 0;
  const fuelCost = context?.pricing?.breakdown?.route?.fuelCost || context?.pricing?.breakdown?.route?.fuel?.cost || 0;
  const signals = context?.signals || [];
  const activeLoadsCount = context?.dashboardSummary?.activeLoadsCount ?? context?.activeLoads?.length ?? (dist > 0 ? 1 : 0);
  const bidsCount = context?.dashboardSummary?.pendingBidsCount ?? context?.pendingBids?.length ?? 0;
  const transportsCount = context?.dashboardSummary?.transportsCount ?? context?.activeTransports?.length ?? 0;

  const fuelRatio = cost > 0 ? Math.round((fuelCost / cost) * 100) : 60;

  const findings = [];
  if (fuelCost > 0) {
    findings.push({
      type: "INFO",
      title: "En Büyük Maliyet Kalemi",
      detail: `Yakıt gideri (₺${fuelCost.toLocaleString("tr-TR")}), toplam operasyon tabanının yaklaşık %${fuelRatio}'ini oluşturmaktadır.`,
    });
  } else if (cost > 0) {
    findings.push({
      type: "INFO",
      title: "Taban Operasyon Maliyeti",
      detail: `Toplam doğrudan maliyet ve genel gider tabanı ₺${cost.toLocaleString("tr-TR")} olarak hesaplanmıştır.`,
    });
  }

  if (dist > 0) {
    findings.push({
      type: "INFO",
      title: "Güzergah Parametresi",
      detail: `${dist} km efektif karayolu mesafesi ve operasyonel sürüş süresi temel alınmıştır.`,
    });
  }

  if (context?.verifiedAudit?.score === 100) {
    findings.push({
      type: "INFO",
      title: "TORK Verified Denetimi",
      detail: "Hürmüz hesaplaması bağımsız matematiksel denetimden tam puan (%100) ile geçmiştir.",
    });
  } else if (context?.verifiedAudit?.warnings?.length > 0) {
    findings.push({
      type: "WARNING",
      title: "Denetim Uyarıları",
      detail: context.verifiedAudit.warnings[0],
    });
  }

  const risks = [];
  const opportunities = [];
  const recommendedActions = [
    "Akaryakıt tüketimini rota boyunca canlı telemetri ile takip edin.",
    "Navlun tekliflerini serbest piyasa koşullarında TORK taban maliyetini referans alarak değerlendirin.",
  ];

  if (signals.some((s) => s.id === "SIG_PRICE_LOW_BID")) {
    risks.push("Gelen teklifler arasında operasyon taban maliyetinin altında kalan teklifler mevcut.");
    recommendedActions.unshift("Düşük teklif veren taşıyıcılarla filo uygunluğu ve hizmet kapsamını teyit edin.");
  }

  if (signals.some((s) => s.id === "SIG_OPS_COST_OVERRUN")) {
    risks.push("Bazı aktif seferlerde gerçekleşen maliyetler planlanan bütçe tavanını aştı.");
    recommendedActions.push("Sefer mutabakat kartı üzerinden sapma kalemlerini inceleyin.");
  }

  if (risks.length === 0) {
    risks.push("Kritik operasyonel maliyet riski tespit edilmedi; standart rota takibi yeterlidir.");
  }

  opportunities.push("TORK şeffaf taban maliyet modeli sayesinde sefer başına bütçe sapma riski minimize edilmektedir.");
  if (activeLoadsCount > 0) {
    opportunities.push(`${activeLoadsCount} aktif ilanda anlık fiyatlandırma şeffaflığı ile daha hızlı eşleşme sağlanabilir.`);
  }

  let summary = "";
  if (mode === "dashboard") {
    summary = `Bugünkü operasyonda ${activeLoadsCount} aktif yük, ${bidsCount} bekleyen teklif ve ${transportsCount} aktif sefer yönetilmektedir.`;
  } else {
    summary = `${dist > 0 ? `${dist} km'lik` : ""} rota için operasyonel taban maliyet ₺${cost.toLocaleString("tr-TR")}${recPrice > 0 ? `, tavsiye edilen navlun ₺${recPrice.toLocaleString("tr-TR")}` : ""} olarak hesaplanmıştır.`;
  }

  const pricingAssessment = cost > 0
    ? `Hürmüz Faz 5 hesaplamasına göre doğrudan operasyon tabanı ₺${cost.toLocaleString("tr-TR")} seviyesindedir.`
    : "Piyasa koşulları ve güncel EPDK akaryakıt verileri baz alınarak navlun dengesi korunmaktadır.";

  return {
    success: true,
    mode,
    audience,
    summary,
    pricingAssessment,
    risks,
    opportunities,
    recommendedActions,
    recommendations: recommendedActions,
    findings,
    assessment: risks.length > 1 || signals.some((s) => s.level === "WARNING") ? "CAUTION" : "HEALTHY",
    confidence: "MEDIUM",
    analyzedAt: new Date().toISOString(),
    provider: "tork-rule-engine-fallback",
    offlineNotice: reason === "API_KEY_NOT_CONFIGURED" ? "Gemini API anahtarı yapılandırılmadığından kural tabanlı analiz sunuldu." : "Gemini servisine ulaşılamadığından kural tabanlı analiz sunuldu.",
    fromCache: false,
  };
}
