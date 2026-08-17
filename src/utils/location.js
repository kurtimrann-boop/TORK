import { TURKEY_PROVINCE_COORDINATES, getProvinceCoordinate } from "../data/turkeyProvinceCoordinates.js";
import { getProvinceByCode } from "../data/turkeyProvinces.js";
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