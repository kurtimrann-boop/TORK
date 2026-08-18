import { NextResponse } from "next/server";
import { normalizeCityStationPrices, normalizeFuelPrices, resolveProvince } from "../../../../utils/fuelService";

export const runtime = "nodejs";

const STATIONS_API_URL = "https://ucuzyakitbul.com.tr/api/stations";
const NATIONAL_API_URL = "https://ucuzyakitbul.com.tr/api/prices/national";

// In-Memory City Cache (30 Minutes TTL per City)
const CACHE_TTL_MS = 30 * 60 * 1000;
const MIN_REFRESH_INTERVAL_MS = 30 * 1000;

// Keyed by `fuel-city-${provinceCode}`
const cityCache = new Map();

async function fetchCityStations(cityName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `${STATIONS_API_URL}?city=${encodeURIComponent(cityName)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "TORK-Logistics-Platform/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Stations API returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    return payload?.stations || [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNationalFallback() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(NATIONAL_API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "TORK-Logistics-Platform/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload?.prices) return null;

    return normalizeFuelPrices(payload.prices, "ucuzyakitbul");
  } catch (err) {
    console.warn("[/api/fuel/city] National fallback fetch error:", err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const provinceQuery = searchParams.get("provinceCode") || searchParams.get("province") || searchParams.get("city");
    const forceRefresh = searchParams.get("refresh") === "true";

    const resolved = resolveProvince(provinceQuery);
    if (!resolved) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz veya bulunamayan il parametresi.",
        },
        { status: 400 }
      );
    }

    const cacheKey = `fuel-city-${resolved.code}`;
    const now = Date.now();
    const cachedEntry = cityCache.get(cacheKey);

    const isCacheExpired = cachedEntry ? now - cachedEntry.timestamp > CACHE_TTL_MS : true;
    const canRefresh = cachedEntry ? now - cachedEntry.lastExternalFetch > MIN_REFRESH_INTERVAL_MS : true;

    // Serve valid cached city prices
    if (cachedEntry && !isCacheExpired && !forceRefresh) {
      return NextResponse.json({
        success: true,
        provider: "ucuzyakitbul",
        isNationalFallback: cachedEntry.isNationalFallback || false,
        isStale: false,
        cachedAt: new Date(cachedEntry.timestamp).toISOString(),
        province: resolved,
        stationCount: cachedEntry.data.stationCount || 0,
        prices: cachedEntry.data.prices,
        updatedAt: cachedEntry.data.updatedAt,
      });
    }

    // Fetch fresh data if needed
    if (canRefresh || !cachedEntry) {
      try {
        const stations = await fetchCityStations(resolved.name);

        if (stations && stations.length > 0) {
          const normalized = normalizeCityStationPrices(stations, resolved, "ucuzyakitbul");

          cityCache.set(cacheKey, {
            data: normalized,
            isNationalFallback: false,
            timestamp: now,
            lastExternalFetch: now,
          });

          return NextResponse.json({
            success: true,
            provider: "ucuzyakitbul",
            isNationalFallback: false,
            isStale: false,
            cachedAt: new Date(now).toISOString(),
            province: resolved,
            stationCount: normalized.stationCount,
            prices: normalized.prices,
            updatedAt: normalized.updatedAt,
          });
        } else {
          // If no stations for this specific city, fallback to national
          const nationalData = await fetchNationalFallback();
          if (nationalData) {
            cityCache.set(cacheKey, {
              data: nationalData,
              isNationalFallback: true,
              timestamp: now,
              lastExternalFetch: now,
            });

            return NextResponse.json({
              success: true,
              provider: "ucuzyakitbul",
              isNationalFallback: true,
              isStale: false,
              warning: `${resolved.name} için yerel istasyon verisi bulunamadı, Türkiye geneli ortalama fiyatlar sunuluyor.`,
              cachedAt: new Date(now).toISOString(),
              province: resolved,
              prices: nationalData.prices,
              updatedAt: nationalData.updatedAt,
            });
          }
        }
      } catch (fetchErr) {
        console.warn(`[/api/fuel/city] Error fetching city stations for ${resolved.name}:`, fetchErr.message);

        // Serve stale cached entry if available
        if (cachedEntry) {
          return NextResponse.json({
            success: true,
            provider: "ucuzyakitbul",
            isNationalFallback: cachedEntry.isNationalFallback || false,
            isStale: true,
            warning: "Canlı şehir fiyatlarına ulaşılamadı, son bilinen veri sunuluyor.",
            cachedAt: new Date(cachedEntry.timestamp).toISOString(),
            province: resolved,
            prices: cachedEntry.data.prices,
            updatedAt: cachedEntry.data.updatedAt,
          });
        }

        // Try national fallback before failing
        const nationalData = await fetchNationalFallback();
        if (nationalData) {
          return NextResponse.json({
            success: true,
            provider: "ucuzyakitbul",
            isNationalFallback: true,
            isStale: false,
            warning: "Yerel şehir verisi alınamadı, Türkiye geneli fiyatlar kullanılıyor.",
            cachedAt: new Date(now).toISOString(),
            province: resolved,
            prices: nationalData.prices,
            updatedAt: nationalData.updatedAt,
          });
        }

        return NextResponse.json(
          {
            success: false,
            error: `${resolved.name} akaryakıt verilerine ulaşılamıyor.`,
            details: fetchErr.message,
          },
          { status: 502 }
        );
      }
    }

    // Cooldown return
    return NextResponse.json({
      success: true,
      provider: "ucuzyakitbul",
      isNationalFallback: cachedEntry.isNationalFallback || false,
      isStale: false,
      cachedAt: new Date(cachedEntry.timestamp).toISOString(),
      province: resolved,
      prices: cachedEntry.data.prices,
      updatedAt: cachedEntry.data.updatedAt,
    });
  } catch (err) {
    console.error("[/api/fuel/city] Unexpected error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Şehir akaryakıt fiyatları servisinde dahili hata oluştu.",
      },
      { status: 500 }
    );
  }
}
