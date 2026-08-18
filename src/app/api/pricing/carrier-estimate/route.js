import { NextResponse } from "next/server";
import { calculateOperatingPricing, evaluateCarrierBid } from "../../../../utils/pricingService";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      distanceKm = 730,
      durationMinutes = 525,
      vehicleType = "TIR",
      bidAmount,
      customConsumption = null,
      isRoundTrip = false,
      returnBufferPercent = 0,
      loadProfile = null,
    } = body;

    const numDist = typeof distanceKm === "number" ? distanceKm : parseFloat(distanceKm);
    if (!Number.isFinite(numDist) || numDist <= 0) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir rota mesafesi (distanceKm > 0) gereklidir." },
        { status: 400 }
      );
    }

    if (bidAmount !== undefined && bidAmount !== null) {
      const numBid = Number(bidAmount);
      if (!Number.isFinite(numBid) || numBid <= 0) {
        return NextResponse.json(
          { success: false, error: "Geçersiz teklif tutarı (bidAmount > 0 olmalıdır)." },
          { status: 400 }
        );
      }
    }

    if (customConsumption !== undefined && customConsumption !== null) {
      const numCons = Number(customConsumption);
      if (!Number.isFinite(numCons) || numCons < 1 || numCons > 100) {
        return NextResponse.json(
          { success: false, error: "Özel tüketim değeri 1 ile 100 L/100km arasında olmalıdır." },
          { status: 400 }
        );
      }
    }

    const pricingResult = calculateOperatingPricing({
      distanceKm: numDist,
      durationMinutes,
      vehicleType,
      customConsumption,
      loadProfile,
      isRoundTrip,
      returnBufferPercent,
    });

    if (!pricingResult) {
      return NextResponse.json(
        { success: false, error: "Fiyatlama hesaplaması gerçekleştirilemedi." },
        { status: 500 }
      );
    }

    const analytics = bidAmount ? evaluateCarrierBid(bidAmount, pricingResult) : null;

    return NextResponse.json({
      success: true,
      pricing: pricingResult,
      analytics,
    });
  } catch (err) {
    console.error("[/api/pricing/carrier-estimate] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Taşıyıcı teklif analitiği hesaplanırken sunucu hatası oluştu.",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
