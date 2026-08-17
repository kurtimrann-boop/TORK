import { TURKEY_PROVINCES } from "../src/data/turkeyProvinces.js";
import { TURKEY_DISTRICTS } from "../src/data/turkeyDistricts.js";

function validateDistricts() {
  console.log("Turkey District Validation");
  console.log("--------------------------");

  const provinceCodes = new Set(TURKEY_PROVINCES.map((p) => p.code));
  const districtMap = new Map();
  let totalDistricts = 0;
  let missingProvinces = 0;
  let duplicateDistricts = 0;
  let emptyNames = 0;
  let invalidRecords = 0;

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

    const districtSet = new Set();
    for (const district of province.d) {
      if (!district || typeof district !== "string" || district.trim().length === 0) {
        emptyNames++;
        continue;
      }

      const trimmed = district.trim();
      if (districtSet.has(trimmed)) {
        duplicateDistricts++;
        console.log(`  DUPLICATE in ${province.code}: ${trimmed}`);
      } else {
        districtSet.add(trimmed);
      }
    }

    districtMap.set(province.code, districtSet);
    totalDistricts += districtSet.size;
  }

  const missingProvincesList = TURKEY_PROVINCES.filter((p) => !districtMap.has(p.code));
  missingProvinces = missingProvincesList.length;

  console.log(`Provinces: ${TURKEY_DISTRICTS.length}/${TURKEY_PROVINCES.length}`);
  console.log(`Districts: ${totalDistricts}`);
  console.log(`Missing provinces: ${missingProvinces}`);
  console.log(`Duplicate districts: ${duplicateDistricts}`);
  console.log(`Empty names: ${emptyNames}`);
  console.log(`Invalid records: ${invalidRecords}`);

  if (missingProvinces > 0) {
    console.log("Missing province codes:", missingProvincesList.map((p) => p.code).join(", "));
  }

  if (duplicateDistricts > 0 || emptyNames > 0 || invalidRecords > 0) {
    console.log("\nValidation FAILED");
    process.exit(1);
  } else {
    console.log("\nValidation PASSED");
    process.exit(0);
  }
}

validateDistricts();
