import { NextResponse } from "next/server";
import { calculateOperatingPricing } from "../../../../utils/pricingService";

export const runtime = "nodejs";

const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

// 24-hour Server-Side Toll Cache
const TOLL_CACHE = new Map();
const TOLL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getTollCacheKey(origin, destination, axleClass = "5") {
  return `toll-${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}_${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}-${axleClass}`;
}

async function attemptGoogleTollEnrichment(origin, destination, axleClass = "5") {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    return null;
  }

  const cacheKey = getTollCacheKey(origin, destination, axleClass);
  const cached = TOLL_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < TOLL_CACHE_TTL_MS) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      travelMode: "DRIVE",
      extraComputations: ["TOLLS"],
      routeModifiers: {
        vehicleInfo: {
          emissionType: "DIESEL",
        },
      },
    };

    const response = await fetch(GOOGLE_ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.travelAdvisory.tollInfo,routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = await response.json();
    const tollInfo = data?.routes?.[0]?.travelAdvisory?.tollInfo;
    if (tollInfo?.estimatedPrice?.length > 0) {
      const priceObj = tollInfo.estimatedPrice.find((p) => p.currencyCode === "TRY") || tollInfo.estimatedPrice[0];
      const units = parseInt(priceObj?.units || "0", 10);
      const nanos = (priceObj?.nanos || 0) / 1e9;
      const totalToll = units + nanos;

      if (totalToll > 0) {
        const result = {
          cost: Math.round(totalToll),
          status: "estimated",
          source: "Google Routes Toll Intelligence (KGM Uyumlu)",
          currency: priceObj.currencyCode || "TRY",
        };
        TOLL_CACHE.set(cacheKey, { data: result, cachedAt: Date.now() });
        return result;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      distanceKm,
      durationMinutes,
      vehicleType = "TIR",
      axleClass,
      fuelPricePerLiter,
      consumptionPer100Km,
      loadProfile,
      targetMarginPercent = 15,
      operatingOverheadPercent = 8,
      isRoundTrip = false,
      returnBufferPercent = 0,
      origin,
      destination,
      customTollCost,
    } = body;

    // Strict Validation
    const numDist = typeof distanceKm === "number" ? distanceKm : parseFloat(distanceKm);
    if (!Number.isFinite(numDist) || numDist <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçerli bir rota mesafesi (distanceKm > 0) gereklidir.",
        },
        { status: 400 }
      );
    }

    if (fuelPricePerLiter !== undefined && fuelPricePerLiter !== null) {
      const numFuel = Number(fuelPricePerLiter);
      if (!Number.isFinite(numFuel) || numFuel <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Geçersiz akaryakıt fiyatı (fuelPricePerLiter > 0 olmalıdır).",
          },
          { status: 400 }
        );
      }
    }

    if (consumptionPer100Km !== undefined && consumptionPer100Km !== null) {
      const numCons = Number(consumptionPer100Km);
      if (!Number.isFinite(numCons) || numCons < 1 || numCons > 100) {
        return NextResponse.json(
          {
            success: false,
            error: "Özel tüketim değeri 1 ile 100 L/100km arasında olmalıdır.",
          },
          { status: 400 }
        );
      }
    }

    if (targetMarginPercent !== undefined && targetMarginPercent !== null) {
      const numMargin = Number(targetMarginPercent);
      if (!Number.isFinite(numMargin) || numMargin < 1 || numMargin >= 100) {
        return NextResponse.json(
          {
            success: false,
            error: "Hedef kâr marjı %1 ile %99 arasında olmalıdır.",
          },
          { status: 400 }
        );
      }
    }

    // Optional toll enrichment
    let tollCost = null;
    let tollStatus = "unavailable";
    let tollSource = null;

    if (customTollCost !== undefined && customTollCost !== null && Number.isFinite(Number(customTollCost))) {
      tollCost = Number(customTollCost);
      tollStatus = "exact";
      tollSource = "Kullanıcı Tanımlı Geçiş Ücreti";
    } else if (origin && destination) {
      const googleToll = await attemptGoogleTollEnrichment(origin, destination, axleClass || (vehicleType === "TIR" ? "5" : "3"));
      if (googleToll) {
        tollCost = googleToll.cost;
        tollStatus = googleToll.status || "estimated";
        tollSource = googleToll.source;
      }
    }

    const pricingResult = calculateOperatingPricing({
      distanceKm: numDist,
      durationMinutes,
      vehicleType,
      axleClass,
      fuelPricePerLiter,
      customConsumption: consumptionPer100Km,
      customTollCost: tollCost,
      tollStatus,
      tollSource,
      loadProfile,
      targetMarginPercent,
      operatingOverheadPercent,
      isRoundTrip,
      returnBufferPercent,
    });

    if (!pricingResult) {
      return NextResponse.json(
        {
          success: false,
          error: "Fiyatlama hesaplaması gerçekleştirilemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pricing: pricingResult,
    });
  } catch (err) {
    console.error("[/api/pricing/estimate] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Fiyatlama motorunda sunucu hatası oluştu.",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
