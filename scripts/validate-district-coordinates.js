import { TURKEY_DISTRICTS } from "../src/data/turkeyDistricts.js";
import { TURKEY_DISTRICT_COORDINATES } from "../src/data/turkeyDistrictCoordinates.js";

function validateDistrictCoordinates() {
  console.log("District Coordinate Validation");
  console.log("------------------------------");

  const districtMap = new Map();
  let totalDistricts = 0;
  let missingCoordinates = 0;
  let invalidCoordinates = 0;
  let duplicates = 0;
  let orphanCoordinates = 0;
  let outOfRange = 0;

  const districtNames = new Set();
  TURKEY_DISTRICTS.forEach((p) => {
    p.d.forEach((d) => {
      districtNames.add(p.code + "|" + d.toLocaleUpperCase("tr-TR"));
    });
  });

  for (const record of TURKEY_DISTRICT_COORDINATES) {
    if (!record.districtId || !record.districtName || !record.provinceCode) {
      invalidCoordinates++;
      console.log(`  INVALID record: ${JSON.stringify(record)}`);
      continue;
    }

    const key = record.provinceCode + "|" + record.districtName.toLocaleUpperCase("tr-TR");
    if (!districtNames.has(key)) {
      orphanCoordinates++;
      console.log(`  ORPHAN coordinate: ${record.districtId} (${record.districtName})`);
    }

    if (districtMap.has(record.districtId)) {
      duplicates++;
      console.log(`  DUPLICATE districtId: ${record.districtId}`);
    }

    const lat = Number(record.latitude);
    const lng = Number(record.longitude);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      invalidCoordinates++;
      outOfRange++;
      console.log(`  OUT-OF-RANGE: ${record.districtId} (${record.districtName}) lat=${lat} lng=${lng}`);
      continue;
    }

    districtMap.set(record.districtId, record);
    totalDistricts++;
  }

  const districtCountFromProvinces = TURKEY_DISTRICTS.reduce((sum, p) => sum + p.d.length, 0);
  const missingCount = districtCountFromProvinces - totalDistricts;

  console.log(`Districts: ${totalDistricts}/${districtCountFromProvinces}`);
  console.log(`Missing: ${missingCount}`);
  console.log(`Invalid: ${invalidCoordinates}`);
  console.log(`Duplicates: ${duplicates}`);
  console.log(`Orphan coordinates: ${orphanCoordinates}`);
  console.log(`Out-of-range: ${outOfRange}`);

  if (missingCount > 0 || invalidCoordinates > 0 || duplicates > 0) {
    console.log("\nValidation FAILED");
    process.exit(1);
  } else {
    console.log("\nValidation PASSED");
    process.exit(0);
  }
}

validateDistrictCoordinates();
