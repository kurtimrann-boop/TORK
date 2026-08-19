import { TURKEY_PROVINCE_COORDINATES, getProvinceCoordinate } from "../data/turkeyProvinceCoordinates.js";
import { getProvinceByCode, TURKEY_PROVINCES } from "../data/turkeyProvinces.js";
import { getDistrictCoordinate, getDistrictCoordinatesByProvince } from "../data/turkeyDistrictCoordinates.js";

/**
 * TORK — Lokasyon yardımcı fonksiyonları
 * UI ile veri yapısını ayırır.
 */

/**
 * İl kodundan koordinat getirir.
 * Bilinmeyen il kodu için null döner.
 */
export function getProvinceCoordinates(provinceCode) {
  return getProvinceCoordinate(provinceCode);
}

/**
 * Koordinatları normalleştirir.
 * Kısmi veriyi tamamlar, geçersiz değerleri null yapar.
 */
export function normalizeLocation(location) {
  if (!location) return null;

  const lat = Number(location.lat);
  const lng = Number(location.lng);

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
}

/**
 * Lokasyonu Türkçe etiket olarak biçimlendirir.
 * Örnek: "Trabzon / Ortahisar" veya "Trabzon"
 */
export function formatLocationLabel(location) {
  if (!location) return "";

  const { provinceName, districtName } = location;

  if (provinceName && districtName) {
    return `${provinceName} / ${districtName}`;
  }

  return provinceName || districtName || "";
}

/**
 * Zorunlu marker alanlarını üretir.
 * GPS verisi yoksa il merkezi koordinatını kullanır.
 * İlçe koordinatı varsa onu kullanır, yoksa il koordinatına düşer.
 */
export function getMarkerLocation(provinceCode, point = null, districtId = null) {
  const normalized = normalizeLocation(point);

  if (normalized) return normalized;

  if (districtId) {
    const districtCoord = getDistrictCoordinate(districtId);
    if (districtCoord) {
      return normalizeLocation({ lat: districtCoord.latitude, lng: districtCoord.longitude });
    }
  }

  const coordinates = getProvinceCoordinates(provinceCode);
  return coordinates ? normalizeLocation(coordinates) : null;
}

/**
 * İl + ilçe seçiminden tek location object üretir.
 */
export function buildLocationObject({ provinceCode, provinceName, districtId, districtName } = {}) {
  if (!provinceCode) return null;

  const province = getProvinceByCode(provinceCode);
  const resolvedProvinceName = provinceName || province?.name || "";

  let coordinates = null;

  if (districtId) {
    const district = getDistrictCoordinate(districtId);
    if (district) {
      coordinates = normalizeLocation({ lat: district.latitude, lng: district.longitude });
    }
  }

  if (!coordinates && districtName) {
    const districts = getDistrictCoordinatesByProvince(provinceCode);
    const match = districts.find(
      (d) => d.districtName.toLocaleUpperCase("tr-TR") === districtName.toLocaleUpperCase("tr-TR")
    );
    if (match) {
      coordinates = normalizeLocation({ lat: match.latitude, lng: match.longitude });
    }
  }

  if (!coordinates) {
    const provinceCoord = getProvinceCoordinate(provinceCode);
    coordinates = provinceCoord ? normalizeLocation(provinceCoord) : null;
  }

  return {
    provinceCode,
    provinceName: resolvedProvinceName,
    districtId: districtId || null,
    districtName: districtName || null,
    ...coordinates,
  };
}

/**
 * İl kodundan il adını getirir.
 */
export function getProvinceNameByCode(provinceCode) {
  const province = getProvinceByCode(provinceCode);
  return province?.name || "";
}

/**
 * Rota görselleştirme için label üretir.
 * İlçe yoksa yalnızca il adı gösterilir.
 */
export function getRouteVisualLabels(origin, destination) {
  return {
    originLabel: formatLocationLabel(origin) || "Başlangıç",
    destinationLabel: formatLocationLabel(destination) || "Varış",
  };
}

/**
 * İki nokta arasında görsel polyline için basit yol noktaları üretir.
 * Bu GERÇEK yol rotası değildir, yalnızca görsel bağlantıdır.
 * Google Routes API entegre olduğunda bu fonksiyon kullanılmayacak.
 */
export function createVisualPolyline(originPoint, destinationPoint) {
  if (!originPoint || !destinationPoint) return [];

  return [
    { lat: originPoint.lat, lng: originPoint.lng },
    { lat: destinationPoint.lat, lng: destinationPoint.lng },
  ];
}

/**
 * Rota verisi için geleceğe hazır şema.
 * provider null olduğunda mesafe/süre hesaplanmaz.
 */
export function createRouteData({ origin, destination, points = [] }) {
  return {
    origin,
    destination,
    points,
    distanceMeters: null,
    durationSeconds: null,
    provider: null,
  };
}

/**
 * Shared session cache for route distances.
 * Keyed by loadId so bid cards can access route data without re-fetching.
 */
const routeDistanceCache = new Map();

export function setRouteDistance(loadId, distanceKm, durationMinutes) {
  if (!loadId) return;
  routeDistanceCache.set(loadId, {
    distanceKm,
    durationMinutes,
    updatedAt: Date.now(),
  });
}

export function getRouteDistance(loadId) {
  if (!loadId) return null;
  return routeDistanceCache.get(loadId) || null;
}

/**
 * Resolves geographical coordinates from any location representation (string, object, code).
 */
export function resolveLocationCoordinates(locInput) {
  if (!locInput) return null;

  // Case 1: Already has lat/lng
  if (typeof locInput === "object" && typeof locInput.lat === "number" && typeof locInput.lng === "number") {
    const norm = normalizeLocation(locInput);
    if (norm) {
      return {
        ...norm,
        provinceName: locInput.provinceName || locInput.name || "",
        districtName: locInput.districtName || "",
      };
    }
  }

  // Case 2: Object with provinceCode / districtId
  if (typeof locInput === "object" && locInput.provinceCode) {
    return buildLocationObject({
      provinceCode: locInput.provinceCode,
      provinceName: locInput.provinceName,
      districtId: locInput.districtId,
      districtName: locInput.districtName,
    });
  }

  // Case 3: String like "İstanbul / Arnavutköy" or "Ankara"
  if (typeof locInput === "string") {
    const raw = locInput.trim();
    if (!raw) return null;

    const parts = raw.split("/").map((p) => p.trim());
    const provincePart = parts[0];
    const districtPart = parts[1] || null;

    // Search in turkeyProvinces
    const prov = getProvinceByCode(provincePart) || (TURKEY_PROVINCES && TURKEY_PROVINCES.find(
      (p) =>
        p.name.toLocaleUpperCase("tr-TR") === provincePart.toLocaleUpperCase("tr-TR") ||
        provincePart.toLocaleUpperCase("tr-TR").includes(p.name.toLocaleUpperCase("tr-TR"))
    ));

    if (prov) {
      return buildLocationObject({
        provinceCode: prov.code,
        provinceName: prov.name,
        districtName: districtPart,
      });
    }
  }

  return null;
}

/**
 * Extracts normalized origin & destination coordinates for a load record safely.
 */
export function resolveLoadLocations(load) {
  if (!load) return { origin: null, destination: null };

  const origin = resolveLocationCoordinates(
    load.origin ||
    load.origin_location ||
    (load.origin_province_code ? { provinceCode: load.origin_province_code, districtId: load.origin_district_id } : null)
  );

  const destination = resolveLocationCoordinates(
    load.destination ||
    load.destination_location ||
    (load.destination_province_code ? { provinceCode: load.destination_province_code, districtId: load.destination_district_id } : null)
  );

  return { origin, destination };
}