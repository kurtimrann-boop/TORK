import { NextResponse } from "next/server";
import { verifyPricingCalculation } from "../../../../utils/torkVerifiedService";
import { analyzeWithGemini } from "../../../../utils/geminiService";

export const runtime = "nodejs";

/**
 * TORK — AI Operasyonel Analiz & Bağımsız Denetim Endpoint'i
 * 
 * POST /api/ai/analyze
 * 
 * Payload:
 * {
 *   "mode": "audit" | "explain" | "pricing" | "risk",
 *   "audience": "shipper" | "carrier",
 *   "context": { route, vehicle, load, fuel, pricing, bid, ... },
 *   "inputParams": { distanceKm, vehicleType, ... },
 *   "calculatedPricing": { totals, breakdown, pricingBands, ... },
 *   "bidParams": { bidAmount, ... }
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const mode = body?.mode || "audit";
    const audience = body?.audience || "shipper";
    const rawContext = body?.context || {};
    const inputParams = body?.inputParams || rawContext?.inputParams || {};
    const calculatedPricing = body?.calculatedPricing || rawContext?.pricing || null;
    const bidParams = body?.bidParams || rawContext?.bid || null;

    // 1. TORK VERIFIED — Bağımsız Matematiksel Denetim
    let verifiedResult = null;
    if (calculatedPricing || inputParams.distanceKm) {
      verifiedResult = verifyPricingCalculation({
        inputParams,
        calculatedPricing,
        bidParams,
      });
    }

    // Bağlama denetim sonucunu iliştir
    const enrichedContext = {
      ...rawContext,
      pricing: calculatedPricing || rawContext.pricing,
      verifiedAudit: verifiedResult,
      bid: bidParams || rawContext.bid,
    };

    // 2. GEMINI INTELLIGENCE — Açıklama, Yorumlama ve Risk Analizi
    const aiResult = await analyzeWithGemini({
      mode,
      context: enrichedContext,
      audience,
    });

    return NextResponse.json({
      success: true,
      mode,
      audience,
      verified: verifiedResult,
      ai: aiResult,
    });
  } catch (err) {
    console.error("[/api/ai/analyze] İstek işlenirken hata:", err.message);
    return NextResponse.json(
      {
        success: false,
        error: "Analiz servisi isteği işleyemedi.",
      },
      { status: 500 }
    );
  }
}
