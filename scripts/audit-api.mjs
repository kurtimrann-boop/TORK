const LOCAL_URL = "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

export async function runApiAudit() {
  console.log("\n==================================================");
  console.log("AUDIT SECTION 3: API ROUTES A TO Z");
  console.log("==================================================");

  // 1. GET /api/fuel
  try {
    const res = await fetch(`${LOCAL_URL}/api/fuel`);
    const data = await res.json();
    assert(res.status === 200 && data.success === true, "GET /api/fuel returns 200 with fuel index");
    assert(data.prices !== undefined, "Fuel prices field returned in response");
  } catch (e) {
    assert(false, `GET /api/fuel failed: ${e.message}`);
  }

  // 2. GET /api/fuel/city
  try {
    const res = await fetch(`${LOCAL_URL}/api/fuel/city?city=istanbul`);
    const data = await res.json();
    assert(res.status === 200 && data.success === true, "GET /api/fuel/city?city=istanbul returns 200");
  } catch (e) {
    assert(false, `GET /api/fuel/city failed: ${e.message}`);
  }

  // 3. POST /api/pricing/estimate
  try {
    const res = await fetch(`${LOCAL_URL}/api/pricing/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distanceKm: 730, durationMinutes: 525, vehicleType: "TIR" }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, "POST /api/pricing/estimate valid payload returns 200");
    assert(data.pricing?.totals?.totalOperatingCost > 0, "Pricing contains total operating cost");
  } catch (e) {
    assert(false, `POST /api/pricing/estimate failed: ${e.message}`);
  }

  // POST /api/pricing/estimate (Invalid payload)
  try {
    const res = await fetch(`${LOCAL_URL}/api/pricing/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distanceKm: -50 }),
    });
    assert(res.status === 400, "POST /api/pricing/estimate invalid distanceKm returns 400 Bad Request");
  } catch (e) {
    assert(false, `POST /api/pricing/estimate invalid payload test failed: ${e.message}`);
  }

  // 4. POST /api/pricing/carrier-estimate
  try {
    const res = await fetch(`${LOCAL_URL}/api/pricing/carrier-estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distanceKm: 730, durationMinutes: 525, vehicleType: "TIR", bidAmount: 42000 }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, "POST /api/pricing/carrier-estimate returns 200");
    assert(data.analytics?.estimatedProfit > 0, "Carrier estimate contains positive profit");
  } catch (e) {
    assert(false, `POST /api/pricing/carrier-estimate failed: ${e.message}`);
  }

  // 5. POST /api/routes
  try {
    const res = await fetch(`${LOCAL_URL}/api/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: { lat: 41.0082, lng: 39.7268 }, // Trabzon
        destination: { lat: 39.9334, lng: 32.8597 }, // Ankara
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, "POST /api/routes returns 200 with route calculation");
    assert(data.distanceKm > 700, "Calculated route distance is realistic (~740km)");
  } catch (e) {
    assert(false, `POST /api/routes failed: ${e.message}`);
  }

  // 6. POST /api/ai/analyze
  try {
    const res = await fetch(`${LOCAL_URL}/api/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "shipper",
        inputParams: { distanceKm: 730, durationMinutes: 525, vehicleType: "TIR" },
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, "POST /api/ai/analyze returns 200 structured intelligence");
    assert(data.ai && typeof data.ai.summary === "string", "Analysis contains valid summary string");
  } catch (e) {
    assert(false, `POST /api/ai/analyze failed: ${e.message}`);
  }

  // 7. PATCH /api/bids/[id] (Missing carrierId -> 401/400)
  try {
    const res = await fetch(`${LOCAL_URL}/api/bids/fake-bid-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 42000 }),
    });
    assert(res.status === 401 || res.status === 400, "PATCH /api/bids/[id] without carrierId rejected with 401/400");
  } catch (e) {
    assert(false, `PATCH /api/bids/[id] auth check failed: ${e.message}`);
  }

  // 8. POST /api/transports/create (Valid params check)
  try {
    const res = await fetch(`${LOCAL_URL}/api/transports/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loadId: "load-123",
        bidId: "bid-456",
        carrierId: "carrier-789",
        shipperId: "shipper-012",
        bidAmount: 40000,
        vehicleType: "TIR",
        distanceKm: 730,
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, "POST /api/transports/create returns 200 with transport & estimateSnapshot");
    assert(data.estimateSnapshot?.total_operating_cost > 0, "Immutable estimate snapshot generated");
  } catch (e) {
    assert(false, `POST /api/transports/create failed: ${e.message}`);
  }

  // 9. POST /api/transports/[id]/actuals
  try {
    const res = await fetch(`${LOCAL_URL}/api/transports/tr-test-123/actuals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bidAmount: 40000,
        fuelLiters: 235,
        fuelPricePerLiter: 42.5,
        driverCost: 8500,
        tollCost: 1200,
      }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, "POST /api/transports/[id]/actuals returns 200 with variance");
    assert(data.totalActualCost > 0, "Total actual cost computed");
    assert(data.actualProfit !== null, "Actual profit computed");
  } catch (e) {
    assert(false, `POST /api/transports/[id]/actuals failed: ${e.message}`);
  }

  console.log(`API AUDIT SUMMARY: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}

if (process.argv[1].endsWith("audit-api.mjs")) {
  runApiAudit().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
