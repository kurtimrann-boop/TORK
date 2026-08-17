import { NextResponse } from "next/server";

/**
 * TORK — Rota Hesaplama API
 *
 * Browser -> /api/routes -> HeiGIT OpenRouteService -> normalize response
 *
 * API key yalnızca server-side okunur (.env.local).
 * Client'a asla gönderilmez.
 */

const ORS_BASE_URL = "https://api.heigit.org/openrouteservice/v2/directions";
const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY;

const SUPPORTED_PROFILES = ["driving-car", "driving-hgv"];

/**
 * ORS geometry'yi (encoded polyline) TorkMap routePoints formatına çevirir.
 * POST body'de geojson=true kullanırsak ORS doğrudan GeoJSON döner,
 * böylece manuel decode gerekmez.
 */
function decodeGeometry(geometry, isEncoded = false) {
  if (!geometry) return [];

  // ORS "geojson" true ise coordinates dizisi: [[lng, lat], ...]
  if (Array.isArray(geometry)) {
    return geometry.map(([lng, lat]) => ({ lat, lng }));
  }

  // Değilse encoded polyline olabilir (fallback olarak boş döndür)
  if (isEncoded && typeof geometry === "string") {
    try {
      return decodePolyline(geometry).map(([lat, lng]) => ({ lat, lng }));
    } catch (err) {
      console.error("Polyline decode hatası:", err.message);
      return [];
    }
  }

  return [];
}

/**
 * Encoded polyline string -> [lat, lng] çiftleri
 * (OpenRouteService encoded polyline formatı)
 */
function decodePolyline(str, precision = 5) {
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

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
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
 * Mesafeyi km cinsinden "X.XXX km" formatına çevirir.
 */
function formatDistanceTR(meters) {
  const km = meters / 1000;
  return `${km.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} km`;
}

export async function POST(request) {
  // API key kontrolü
  if (!ORS_API_KEY) {
    console.error("[routes] OPENROUTESERVICE_API_KEY tanımlı değil (.env.local)");
    return NextResponse.json(
      {
        success: false,
        error: "Rota servisi yapılandırılmadı.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const origin = body?.origin;
    const destination = body?.destination;
    const profile = body?.profile || "driving-car";

    if (
      !origin?.lat ||
      !origin?.lng ||
      !destination?.lat ||
      !destination?.lng
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Başlangıç ve varış koordinatları zorunludur.",
        },
        { status: 400 }
      );
    }

    if (!SUPPORTED_PROFILES.includes(profile)) {
      return NextResponse.json(
        {
          success: false,
          error: "Desteklenmeyen profil.",
        },
        { status: 400 }
      );
    }

    // HeiGIT OpenRouteService isteği — geojson=true ile cihaz-friendly yanıt
    const orsUrl = `${ORS_BASE_URL}/${profile}?api_key=${encodeURIComponent(
      ORS_API_KEY
    )}&start=${origin.lng},${origin.lat}&end=${destination.lng},${
      destination.lat
    }&geojson=true`;

    const orsResponse = await fetch(orsUrl, {
      method: "GET",
      headers: {
        Accept: "application/json, application/geo+json",
      },
      next: { revalidate: 0 }, // cache'i Next.js'e bırakma, biz yönetiyoruz
    });

    if (!orsResponse.ok) {
      const errorText = await orsResponse.text();
      console.error(
        "[routes] HeiGIT OpenRouteService hatası:",
        orsResponse.status,
        errorText.slice(0, 200)
      );

      let clientStatus = 502;
      if (orsResponse.status === 401 || orsResponse.status === 403) {
        clientStatus = orsResponse.status;
      } else if (orsResponse.status === 429) {
        clientStatus = 429;
      }

      return NextResponse.json(
        {
          success: false,
          error: "Rota servisine şu anda ulaşılamıyor.",
        },
        { status: clientStatus }
      );
    }

    const orsData = await orsResponse.json();

    const feature = orsData?.features?.[0];
    if (!feature) {
      return NextResponse.json(
        {
          success: false,
          error: "Rota bulunamadı.",
        },
        { status: 404 }
      );
    }

    const geometryCoordinates = feature?.geometry?.coordinates;
    const segments = feature?.properties?.segments;
    const summary = feature?.properties?.summary;

    if (!geometryCoordinates || !segments || segments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Rota bulunamadı.",
        },
        { status: 404 }
      );
    }

    const distanceMeters = Math.round(summary?.distance || segments.reduce((sum, segment) => sum + (segment.distance || 0), 0));
    const durationSeconds = Math.round(summary?.duration || segments.reduce((sum, segment) => sum + (segment.duration || 0), 0));

    return NextResponse.json({
      success: true,
      provider: "openrouteservice",
      profile,
      distanceMeters,
      durationSeconds,
      distanceKm: Number((distanceMeters / 1000).toFixed(1)),
      durationMinutes: Math.round(durationSeconds / 60),
      distanceText: formatDistanceTR(distanceMeters),
      durationText: formatDurationTR(durationSeconds / 60),
      geometry: decodeGeometry(geometryCoordinates),
    });
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