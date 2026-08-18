import { NextResponse } from "next/server";
import { normalizeFuelPrices } from "../../../utils/fuelService";

export const runtime = "nodejs";

const UCUZYAKITBUL_API_URL =
  process.env.FUEL_API_URL || "https://ucuzyakitbul.com.tr/api/prices/national";

// In-Memory Server Cache (30 Minutes TTL)
const CACHE_TTL_MS = 30 * 60 * 1000;
const MIN_REFRESH_INTERVAL_MS = 30 * 1000; // 30s rate-limit protection against spam

let fuelCache = {
  data: null,
  timestamp: 0,
  lastExternalFetch: 0,
};

async function fetchFromSource() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(UCUZYAKITBUL_API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "TORK-Logistics-Platform/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`External provider returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.prices)) {
      throw new Error("Invalid schema from fuel provider");
    }

    const normalized = normalizeFuelPrices(payload.prices, "ucuzyakitbul");
    return normalized;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const now = Date.now();

    const isCacheExpired = now - fuelCache.timestamp > CACHE_TTL_MS;
    const canRefresh = now - fuelCache.lastExternalFetch > MIN_REFRESH_INTERVAL_MS;

    // Serve fresh cache if available and not forced
    if (fuelCache.data && !isCacheExpired && !forceRefresh) {
      return NextResponse.json({
        success: true,
        provider: fuelCache.data.provider,
        isStale: false,
        cachedAt: new Date(fuelCache.timestamp).toISOString(),
        updatedAt: fuelCache.data.updatedAt,
        prices: fuelCache.data.prices,
      });
    }

    // Attempt fetch from external provider if allowed
    if (canRefresh || !fuelCache.data) {
      try {
        const freshData = await fetchFromSource();
        fuelCache.data = freshData;
        fuelCache.timestamp = now;
        fuelCache.lastExternalFetch = now;

        return NextResponse.json({
          success: true,
          provider: freshData.provider,
          isStale: false,
          cachedAt: new Date(fuelCache.timestamp).toISOString(),
          updatedAt: freshData.updatedAt,
          prices: freshData.prices,
        });
      } catch (fetchErr) {
        console.warn("[/api/fuel] External source fetch failed:", fetchErr.message);

        // Fallback to existing cache if available (Graceful Degradation)
        if (fuelCache.data) {
          return NextResponse.json({
            success: true,
            provider: fuelCache.data.provider,
            isStale: true,
            cachedAt: new Date(fuelCache.timestamp).toISOString(),
            updatedAt: fuelCache.data.updatedAt,
            prices: fuelCache.data.prices,
            warning: "Canlı sağlayıcıya ulaşılamadı, son bilinen veri sunuluyor.",
          });
        }

        // No cache available
        return NextResponse.json(
          {
            success: false,
            error: "Akaryakıt piyasa verilerine şu anda ulaşılamıyor.",
            details: fetchErr.message,
          },
          { status: 502 }
        );
      }
    }

    // If refresh requested within cooldown, return current cache
    return NextResponse.json({
      success: true,
      provider: fuelCache.data.provider,
      isStale: false,
      cachedAt: new Date(fuelCache.timestamp).toISOString(),
      updatedAt: fuelCache.data.updatedAt,
      prices: fuelCache.data.prices,
    });
  } catch (err) {
    console.error("[/api/fuel] Unexpected internal error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Akaryakıt fiyatları servisinde dahili hata oluştu.",
      },
      { status: 500 }
    );
  }
}
