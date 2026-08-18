import { NextResponse } from "next/server";

/**
 * TORK — Akıllı Navlun Rota Hesaplama API
 *
 * MİMARİ:
 * 1. PRIMARY: OpenRouteService (ORS) Directions API
 * 2. FALLBACK: Google Routes API (computeRoutes)
 * 3. SERVER CACHE: In-memory route cache (aynı rota için sıfır maliyet & anında yanıt)
 *
 * GÜVENLİK:
 * - API Key'ler yalnızca server-side okunur (process.env).
 * - İstemciye (client) asla key sızdırılmaz.
 * - Loglarda ve raporlarda secret değerler maskelenir.
 */

const ORS_BASE_URL = "https://api.heigit.org/openrouteservice/v2/directions";
const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

const SUPPORTED_PROFILES = ["driving-car", "driving-hgv"];
const REQUEST_TIMEOUT_MS = 6000;

// In-memory Server-Side Route Cache (LRU-like size capped Map)
const ROUTE_CACHE = new Map();
const MAX_CACHE_ENTRIES = 1000;

function getCacheKey(profile, origin, destination) {
  return `${profile}_${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}_${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
}

function setInCache(key, value) {
  if (ROUTE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = ROUTE_CACHE.keys().next().value;
    if (firstKey) ROUTE_CACHE.delete(firstKey);
  }
  ROUTE_CACHE.set(key, {
    ...value,
    cachedAt: Date.now(),
  });
}

/**
 * Süreyi dakika cinsinden "X saat Y dakika" formatına çevirir.
 */
function formatDurationTR(totalMinutes) {
  const minutes = Math.round(totalMinutes);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} dakika`;
  if (mins === 0) return `${hours} saat`;
  return `${hours} saat ${mins} dakika`;
}

/**
 * Mesafeyi metre cinsinden "X.XXX km" formatına çevirir.
 */
function formatDistanceTR(meters) {
  const km = meters / 1000;
  return `${km.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} km`;
}

/**
 * Encoded polyline string -> [{ lat, lng }] nesne dizisi
 * (Google Routes & ORS uyumlu standard precision 5)
 */
function decodePolyline(str, precision = 5) {
  if (!str || typeof str !== "string") return [];

  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];
  const factor = Math.pow(10, precision);
  const len = str.length;

  while (index < len) {
    let result = 1;
    let shift = 0;
    let b;

    do {
      b = str.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;

    do {
      b = str.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({ lat: lat / factor, lng: lng / factor });
  }

  return coordinates;
}

/**
 * PRIMARY PROVIDER: OpenRouteService (ORS)
 */
async function fetchOrsRoute(origin, destination, profile) {
  const orsApiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!orsApiKey) {
    throw new Error("ORS_KEY_MISSING");
  }

  const orsUrl = `${ORS_BASE_URL}/${profile}?api_key=${encodeURIComponent(
    orsApiKey
  )}&start=${origin.lng},${origin.lat}&end=${destination.lng},${destination.lat}&geojson=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(orsUrl, {
      method: "GET",
      headers: {
        Accept: "application/json, application/geo+json",
      },
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const status = response.status;
      throw new Error(`ORS_HTTP_${status}`);
    }

    const orsData = await response.json();
    const feature = orsData?.features?.[0];
    if (!feature) throw new Error("ORS_NO_FEATURE");

    const geometryCoordinates = feature?.geometry?.coordinates;
    const segments = feature?.properties?.segments;
    const summary = feature?.properties?.summary;

    if (!geometryCoordinates || !segments || segments.length === 0) {
      throw new Error("ORS_INVALID_GEOMETRY");
    }

    const distanceMeters = Math.round(
      summary?.distance || segments.reduce((sum, s) => sum + (s.distance || 0), 0)
    );
    const durationSeconds = Math.round(
      summary?.duration || segments.reduce((sum, s) => sum + (s.duration || 0), 0)
    );

    if (distanceMeters <= 0) throw new Error("ORS_ZERO_DISTANCE");

    const geometry = geometryCoordinates.map(([lng, lat]) => ({ lat, lng }));
    const validGeometry = geometry.filter(
      (p) => typeof p.lat === "number" && Number.isFinite(p.lat) && typeof p.lng === "number" && Number.isFinite(p.lng)
    );

    if (validGeometry.length < 2) throw new Error("ORS_GEOMETRY_TOO_SHORT");

    return {
      success: true,
      provider: "openrouteservice",
      profile,
      distanceMeters,
      durationSeconds,
      distanceKm: Number((distanceMeters / 1000).toFixed(1)),
      durationMinutes: Math.round(durationSeconds / 60),
      distanceText: formatDistanceTR(distanceMeters),
      durationText: formatDurationTR(durationSeconds / 60),
      geometry: validGeometry,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * FALLBACK PROVIDER: Google Routes API (computeRoutes)
 */
async function fetchGoogleRoute(origin, destination, profile) {
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!googleApiKey) {
    throw new Error("GOOGLE_KEY_MISSING");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const payload = {
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
      routingPreference: "TRAFFIC_UNAWARE",
    };

    const response = await fetch(GOOGLE_ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      next: { revalidate: 0 },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const status = response.status;
      throw new Error(`GOOGLE_HTTP_${status}`);
    }

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error("GOOGLE_NO_ROUTE");

    const distanceMeters = Number(route.distanceMeters);
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      throw new Error("GOOGLE_INVALID_DISTANCE");
    }

    // Google duration format: "31520s"
    const durationSecondsRaw = typeof route.duration === "string"
      ? parseInt(route.duration.replace("s", ""), 10)
      : Number(route.duration);
    const durationSeconds = Number.isFinite(durationSecondsRaw) ? durationSecondsRaw : Math.round(distanceMeters / 22);

    const encodedPolyline = route?.polyline?.encodedPolyline;
    if (!encodedPolyline) throw new Error("GOOGLE_NO_POLYLINE");

    const geometry = decodePolyline(encodedPolyline);
    const validGeometry = geometry.filter(
      (p) => typeof p.lat === "number" && Number.isFinite(p.lat) && typeof p.lng === "number" && Number.isFinite(p.lng)
    );

    if (validGeometry.length < 2) throw new Error("GOOGLE_GEOMETRY_TOO_SHORT");

    return {
      success: true,
      provider: "google",
      profile,
      distanceMeters,
      durationSeconds,
      distanceKm: Number((distanceMeters / 1000).toFixed(1)),
      durationMinutes: Math.round(durationSeconds / 60),
      distanceText: formatDistanceTR(distanceMeters),
      durationText: formatDurationTR(durationSeconds / 60),
      geometry: validGeometry,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const origin = body?.origin;
    const destination = body?.destination;
    const profile = body?.profile || "driving-car";

    const validateCoord = (value, name) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return NextResponse.json(
          { success: false, error: `${name} koordinatı geçerli bir sayı olmalı.` },
          { status: 400 }
        );
      }
      if (name.includes("enlem") && (value < -90 || value > 90)) {
        return NextResponse.json(
          { success: false, error: `${name} -90 ile 90 arasında olmalı.` },
          { status: 400 }
        );
      }
      if (name.includes("boylam") && (value < -180 || value > 180)) {
        return NextResponse.json(
          { success: false, error: `${name} -180 ile 180 arasında olmalı.` },
          { status: 400 }
        );
      }
      return null;
    };

    const originLatErr = validateCoord(origin?.lat, "Başlangıç enlem");
    if (originLatErr) return originLatErr;

    const originLngErr = validateCoord(origin?.lng, "Başlangıç boylam");
    if (originLngErr) return originLngErr;

    const destLatErr = validateCoord(destination?.lat, "Varış enlem");
    if (destLatErr) return destLatErr;

    const destLngErr = validateCoord(destination?.lng, "Varış boylam");
    if (destLngErr) return destLngErr;

    if (!SUPPORTED_PROFILES.includes(profile)) {
      return NextResponse.json(
        { success: false, error: "Desteklenmeyen profil." },
        { status: 400 }
      );
    }

    // 1. CHECK SERVER-SIDE IN-MEMORY CACHE
    const cacheKey = getCacheKey(profile, origin, destination);
    const cachedResult = ROUTE_CACHE.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.cachedAt < 24 * 60 * 60 * 1000) {
      return NextResponse.json({
        ...cachedResult,
        fromCache: true,
      });
    }

    // 2. ATTEMPT PRIMARY: OpenRouteService
    try {
      const orsResult = await fetchOrsRoute(origin, destination, profile);
      setInCache(cacheKey, orsResult);
      return NextResponse.json(orsResult);
    } catch (orsError) {
      console.warn(`[routes] Primary (ORS) başarısız oldu [${orsError.message}]. Google Routes Fallback deneniyor...`);

      // 3. ATTEMPT FALLBACK: Google Routes API
      try {
        const googleResult = await fetchGoogleRoute(origin, destination, profile);
        console.log(`[routes] Google Routes Fallback başarılı.`);
        setInCache(cacheKey, googleResult);
        return NextResponse.json(googleResult);
      } catch (googleError) {
        console.error(`[routes] Fallback (Google) da başarısız oldu [${googleError.message}].`);

        return NextResponse.json(
          {
            success: false,
            error: "Rota servisine şu anda ulaşılamıyor.",
          },
          { status: 502 }
        );
      }
    }
  } catch (err) {
    console.error("[routes] İstek işlenirken hata:", err.message);
    return NextResponse.json(
      {
        success: false,
        error: "Rota hesaplanamadı.",
      },
      { status: 500 }
    );
  }
}