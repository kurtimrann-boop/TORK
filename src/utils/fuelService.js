/**
 * TORK Fuel Service Abstraction (Hürmüz Foundation Phase 1 & 2)
 * 
 * Handles National and City-Level Fuel Prices, caching, and normalizations.
 */

import { TURKEY_PROVINCES } from "../data/turkeyProvinces.js";

export const FUEL_TYPES = {
  DIESEL: "diesel",
  GASOLINE: "gasoline",
  LPG: "lpg",
};

/**
 * Resolves province from code (e.g. "06" or 6) or Turkish name ("Ankara")
 */
export function resolveProvince(input) {
  if (!input) return null;

  if (typeof input === "object" && input.code && input.name) {
    return { code: String(input.code).padStart(2, "0"), name: input.name };
  }

  const str = String(input).trim();
  const num = parseInt(str, 10);

  if (!isNaN(num) && num >= 1 && num <= 81) {
    const code = String(num).padStart(2, "0");
    const found = TURKEY_PROVINCES.find((p) => p.code === code);
    if (found) return { code: found.code, name: found.name };
  }

  const normalized = str.toLocaleLowerCase("tr-TR");
  const found = TURKEY_PROVINCES.find(
    (p) => p.name.toLocaleLowerCase("tr-TR") === normalized ||
           p.name.toLocaleLowerCase("tr-TR").includes(normalized) ||
           normalized.includes(p.name.toLocaleLowerCase("tr-TR"))
  );

  if (found) {
    return { code: found.code, name: found.name };
  }

  return null;
}

/**
 * Normalizes raw external national API response to TORK standard fuel price schema
 */
export function normalizeFuelPrices(rawPrices, source = "ucuzyakitbul") {
  if (!Array.isArray(rawPrices)) {
    throw new Error("Invalid fuel prices payload: expected an array");
  }

  const normalized = {
    gasoline: null,
    diesel: null,
    lpg: null,
  };

  let latestDate = null;

  for (const item of rawPrices) {
    const rawType = String(item.fuelType || "").trim().toLowerCase();
    const price = typeof item.price === "number" ? item.price : parseFloat(item.price);
    const date = item.date || new Date().toISOString();

    if (!Number.isFinite(price)) continue;

    if (!latestDate || new Date(date) > new Date(latestDate)) {
      latestDate = date;
    }

    if (rawType.includes("motorin") || rawType.includes("dizel") || rawType.includes("diesel")) {
      normalized.diesel = {
        price,
        label: "Motorin",
        date,
      };
    } else if (rawType.includes("benzin") || rawType.includes("gasoline") || rawType.includes("kurşunsuz")) {
      normalized.gasoline = {
        price,
        label: "Benzin",
        date,
      };
    } else if (rawType.includes("lpg") || rawType.includes("otogaz")) {
      normalized.lpg = {
        price,
        label: "LPG",
        date,
      };
    }
  }

  return {
    provider: source,
    updatedAt: latestDate || new Date().toISOString(),
    prices: normalized,
  };
}

/**
 * Normalizes city stations array or city price distribution to TORK standard city price schema
 */
export function normalizeCityStationPrices(stations, provinceInfo, source = "ucuzyakitbul") {
  if (!Array.isArray(stations) || stations.length === 0) {
    throw new Error("No stations available to calculate city prices");
  }

  const buckets = {
    diesel: [],
    gasoline: [],
    lpg: [],
  };

  let latestDate = null;

  for (const station of stations) {
    const prices = station.fuelPrices || [];
    for (const p of prices) {
      const type = String(p.fuelType || "").trim().toLowerCase();
      const price = typeof p.price === "number" ? p.price : parseFloat(p.price);
      const date = p.updatedAt || p.sourceValueChangedAt || null;

      if (!Number.isFinite(price) || price <= 0) continue;

      if (date && (!latestDate || new Date(date) > new Date(latestDate))) {
        latestDate = date;
      }

      if (type.includes("motorin") || type.includes("dizel") || type.includes("diesel")) {
        buckets.diesel.push(price);
      } else if (type.includes("benzin") || type.includes("gasoline") || type.includes("kurşunsuz")) {
        buckets.gasoline.push(price);
      } else if (type.includes("lpg") || type.includes("otogaz")) {
        buckets.lpg.push(price);
      }
    }
  }

  const computeStats = (arr, label) => {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avg = Math.round((sum / sorted.length) * 100) / 100;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return {
      price: avg,
      average: avg,
      min,
      max,
      count: sorted.length,
      label,
    };
  };

  return {
    provider: source,
    province: {
      code: provinceInfo.code,
      name: provinceInfo.name,
    },
    updatedAt: latestDate || new Date().toISOString(),
    stationCount: stations.length,
    prices: {
      diesel: computeStats(buckets.diesel, "Motorin"),
      gasoline: computeStats(buckets.gasoline, "Benzin"),
      lpg: computeStats(buckets.lpg, "LPG"),
    },
  };
}

/**
 * Client-side helper to fetch national fuel prices from TORK proxy endpoint
 */
export async function fetchNationalFuelPrices(bypassCache = false) {
  const url = bypassCache ? "/api/fuel?refresh=true" : "/api/fuel";
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Fuel API responded with HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !data.prices) {
    throw new Error(data.error || "Failed to parse national fuel prices");
  }

  return data;
}

/**
 * Client-side helper to fetch city-specific fuel prices from TORK proxy endpoint
 */
export async function fetchCityFuelPrices(provinceInput, bypassCache = false) {
  const resolved = resolveProvince(provinceInput);
  if (!resolved) {
    // If no province can be determined, fetch national
    return fetchNationalFuelPrices(bypassCache);
  }

  const params = new URLSearchParams({
    provinceCode: resolved.code,
    province: resolved.name,
  });
  if (bypassCache) params.append("refresh", "true");

  const response = await fetch(`/api/fuel/city?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`City fuel API responded with HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !data.prices) {
    throw new Error(data.error || "Failed to parse city fuel prices");
  }

  return data;
}
