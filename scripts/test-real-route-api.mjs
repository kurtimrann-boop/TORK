// scripts/test-real-route-api.mjs
// Test real route API with 3 Turkish freight corridors

import { getRealRoadGeometry } from "../src/utils/roadGeometryService.js";

console.log("================================================================================");
console.log("   TORK REAL ROUTE API TEST");
console.log("================================================================================\n");

const routes = [
  {
    name: "İstanbul → Ankara",
    origin: { lat: 41.0082, lng: 28.9784, name: "İstanbul" },
    destination: { lat: 39.9334, lng: 32.8597, name: "Ankara" },
    expectedDistanceMin: 400,
    expectedDistanceMax: 550,
  },
  {
    name: "İzmir → Bursa",
    origin: { lat: 38.4237, lng: 27.1428, name: "İzmir" },
    destination: { lat: 40.1885, lng: 29.0610, name: "Bursa" },
    expectedDistanceMin: 300,
    expectedDistanceMax: 450,
  },
  {
    name: "Mersin → İstanbul",
    origin: { lat: 36.8121, lng: 34.6415, name: "Mersin" },
    destination: { lat: 41.0082, lng: 28.9784, name: "İstanbul" },
    expectedDistanceMin: 500,
    expectedDistanceMax: 1100,
  },
];

let passed = 0;
let failed = 0;

for (const route of routes) {
  console.log(`\n--- Testing: ${route.name} ---`);
  
  try {
    const result = await getRealRoadGeometry(route.origin, route.destination);
    
    console.log(`  Route Status: ${result.routeStatus || 'unknown'}`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Geometry Points: ${result.geometry?.length || 0}`);
    console.log(`  Distance: ${result.distanceKm} km`);
    console.log(`  Duration: ${result.durationText || 'N/A'}`);
    
    // Validations
    const errors = [];
    
    if (!result.success) {
      errors.push("success should be true");
    }
    
    if (!result.geometry || !Array.isArray(result.geometry)) {
      errors.push("geometry should be an array");
    } else if (result.geometry.length <= 2) {
      errors.push(`geometry should have > 2 points, got ${result.geometry.length}`);
    }
    
    if (!result.distanceKm || result.distanceKm <= 0) {
      errors.push("distanceKm should be > 0");
    } else if (result.distanceKm < route.expectedDistanceMin || result.distanceKm > route.expectedDistanceMax) {
      errors.push(`distanceKm ${result.distanceKm} outside expected range ${route.expectedDistanceMin}-${route.expectedDistanceMax}`);
    }
    
    if (!result.durationText || result.durationText === "") {
      errors.push("durationText should not be empty");
    }
    
    if (errors.length > 0) {
      console.log(`  ✗ FAIL:`);
      errors.forEach(err => console.log(`    - ${err}`));
      failed++;
    } else {
      console.log(`  ✓ PASS`);
      passed++;
    }
    
  } catch (error) {
    console.log(`  ✗ FAIL: ${error.message}`);
    failed++;
  }
}

console.log("\n================================================================================");
console.log(`   REAL ROUTE API TEST SUMMARY: ${passed} PASSED / ${failed} FAILED`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}
