import { TURKEY_DISTRICTS } from "../src/data/turkeyDistricts.js";
import { TURKEY_DISTRICT_COORDINATES } from "../src/data/turkeyDistrictCoordinates.js";

function validateDistrictCoordinates() {
  console.log("District Coordinate Validation");
  console.log("------------------------------\n");

  const districtMap = new Map();
  let totalDistricts = 0;
  let invalidCoordinates = 0;
  let duplicateKeys = 0;
  let duplicateCoordValues = 0;
  let orphanCoordinates = 0;
  let outOfRange = 0;
  let missingSource = 0;
  let unverified = 0;

  const districtNames = new Set();
  TURKEY_DISTRICTS.forEach((p) => {
    p.d.forEach((d) => {
      districtNames.add(p.code + "|" + d.toLocaleUpperCase("tr-TR"));
    });
  });

  const coordPairs = new Map();

  for (const record of TURKEY_DISTRICT_COORDINATES) {
    if (!record.districtId || !record.districtName || !record.provinceCode) {
      invalidCoordinates++;
      console.log(`  INVALID record: ${JSON.stringify(record)}`);
      continue;
    }

    if (!record.source) {
      missingSource++;
      console.log(`  MISSING source: ${record.districtId} (${record.districtName})`);
    }

    if (!record.verified) {
      unverified++;
      console.log(`  UNVERIFIED coordinate: ${record.districtId} (${record.districtName})`);
    }

    const key = record.provinceCode + "|" + record.districtName.toLocaleUpperCase("tr-TR");
    if (!districtNames.has(key)) {
      orphanCoordinates++;
      console.log(`  ORPHAN coordinate: ${record.districtId} (${record.districtName})`);
    }

    if (districtMap.has(record.districtId)) {
      duplicateKeys++;
      console.log(`  DUPLICATE districtId: ${record.districtId}`);
    }

    const lat = Number(record.latitude);
    const lng = Number(record.longitude);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < 35.0 ||
      lat > 43.0 ||
      lng < 25.0 ||
      lng > 45.0
    ) {
      invalidCoordinates++;
      outOfRange++;
      console.log(`  OUT-OF-RANGE: ${record.districtId} (${record.districtName}) lat=${lat} lng=${lng}`);
      continue;
    }

    // Check duplicate (latitude, longitude) pairs across all districts
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (coordPairs.has(coordKey)) {
      duplicateCoordValues++;
      const existing = coordPairs.get(coordKey);
      console.log(`  DUPLICATE COORDINATE PAIR: [${record.provinceCode}] ${record.districtName} <=> [${existing.provinceCode}] ${existing.districtName} at (${coordKey})`);
    } else {
      coordPairs.set(coordKey, record);
    }

    districtMap.set(record.districtId, record);
    totalDistricts++;
  }

  const districtCountFromProvinces = TURKEY_DISTRICTS.reduce((sum, p) => sum + p.d.length, 0);
  const missingCount = districtCountFromProvinces - totalDistricts;

  console.log(`Coordinates: ${totalDistricts}/${districtCountFromProvinces}`);
  console.log(`Missing: ${missingCount}`);
  console.log(`Invalid: ${invalidCoordinates}`);
  console.log(`Duplicate keys: ${duplicateKeys}`);
  console.log(`Duplicate coordinate pairs: ${duplicateCoordValues}`);
  console.log(`Orphan coordinates: ${orphanCoordinates}`);
  console.log(`Out-of-range: ${outOfRange}`);
  console.log(`Missing source: ${missingSource}`);
  console.log(`Unverified: ${unverified}`);

  const passed =
    missingCount === 0 &&
    invalidCoordinates === 0 &&
    duplicateKeys === 0 &&
    duplicateCoordValues === 0 &&
    orphanCoordinates === 0 &&
    outOfRange === 0 &&
    missingSource === 0 &&
    unverified === 0 &&
    totalDistricts === 973;

  if (!passed) {
    console.log("\nValidation FAILED");
    process.exit(1);
  } else {
    console.log("\nValidation PASSED");
    process.exit(0);
  }
}

validateDistrictCoordinates();
