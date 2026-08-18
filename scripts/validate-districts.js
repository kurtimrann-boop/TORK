import { TURKEY_PROVINCES } from "../src/data/turkeyProvinces.js";
import { TURKEY_DISTRICTS } from "../src/data/turkeyDistricts.js";
import { TURKEY_DISTRICT_COORDINATES } from "../src/data/turkeyDistrictCoordinates.js";

const METROPOLITAN_PROVINCE_CODES = new Set([
  "01", "06", "07", "09", "10", "16", "20", "21", "25", "26",
  "27", "31", "33", "34", "35", "38", "41", "42", "44", "45",
  "46", "47", "48", "52", "54", "55", "59", "61", "63", "65"
]);

function validateDistricts() {
  console.log("Turkey District Validation");
  console.log("--------------------------\n");

  const provinceCodes = new Set(TURKEY_PROVINCES.map((p) => p.code));
  const districtMap = new Map();
  let totalDistricts = 0;
  let missingProvinces = 0;
  let duplicateDistricts = 0;
  let emptyNames = 0;
  let invalidRecords = 0;
  let metropolitanCenterViolations = 0;
  let nonMetropolitanMissingCenter = 0;

  for (const province of TURKEY_DISTRICTS) {
    if (!provinceCodes.has(province.code)) {
      invalidRecords++;
      console.log(`  INVALID province code: ${province.code} (${province.name})`);
    }

    if (!province.d || !Array.isArray(province.d)) {
      invalidRecords++;
      console.log(`  INVALID districts array for: ${province.code}`);
      continue;
    }

    const isMetro = METROPOLITAN_PROVINCE_CODES.has(province.code);
    const hasMerkez = province.d.some((d) => d.trim().toLocaleLowerCase("tr-TR") === "merkez");

    if (isMetro && hasMerkez) {
      metropolitanCenterViolations++;
      console.log(`  VIOLATION: Metropolitan province ${province.code} (${province.name}) has illegal 'Merkez' district.`);
    }

    if (!isMetro && !hasMerkez) {
      nonMetropolitanMissingCenter++;
      console.log(`  VIOLATION: Non-metropolitan province ${province.code} (${province.name}) is missing official 'Merkez' unit.`);
    }

    const districtSet = new Set();
    for (const district of province.d) {
      if (!district || typeof district !== "string" || district.trim().length === 0) {
        emptyNames++;
        continue;
      }

      const trimmed = district.trim();
      const norm = trimmed.toLocaleLowerCase("tr-TR");
      if (districtSet.has(norm)) {
        duplicateDistricts++;
        console.log(`  DUPLICATE in ${province.code}: ${trimmed}`);
      } else {
        districtSet.add(norm);
      }
    }

    districtMap.set(province.code, districtSet);
    totalDistricts += districtSet.size;
  }

  const missingProvincesList = TURKEY_PROVINCES.filter((p) => !districtMap.has(p.code));
  missingProvinces = missingProvincesList.length;

  console.log(`Provinces: ${TURKEY_DISTRICTS.length}/${TURKEY_PROVINCES.length}`);
  console.log(`Selection units: ${totalDistricts}/973`);
  console.log(`Metropolitan provinces: ${30 - metropolitanCenterViolations}/30`);
  console.log(`Non-metropolitan province centers: ${51 - nonMetropolitanMissingCenter}/51`);
  console.log(`Missing provinces: ${missingProvinces}`);
  console.log(`Duplicate districts: ${duplicateDistricts}`);
  console.log(`Empty names: ${emptyNames}`);
  console.log(`Invalid records: ${invalidRecords}`);

  // Coordinate check
  let coordinateMismatch = 0;
  if (TURKEY_DISTRICT_COORDINATES.length !== totalDistricts) {
    coordinateMismatch++;
    console.log(`  COORDINATES COUNT MISMATCH: ${TURKEY_DISTRICT_COORDINATES.length} coords vs ${totalDistricts} districts.`);
  }

  console.log(`Coordinates: ${TURKEY_DISTRICT_COORDINATES.length}/973`);

  const passed =
    missingProvinces === 0 &&
    duplicateDistricts === 0 &&
    emptyNames === 0 &&
    invalidRecords === 0 &&
    metropolitanCenterViolations === 0 &&
    nonMetropolitanMissingCenter === 0 &&
    totalDistricts === 973 &&
    coordinateMismatch === 0;

  if (!passed) {
    console.log("\nValidation FAILED");
    process.exit(1);
  } else {
    console.log("\nValidation PASSED");
    process.exit(0);
  }
}

validateDistricts();
