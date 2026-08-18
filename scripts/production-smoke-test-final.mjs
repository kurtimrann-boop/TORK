const PROD_URL = "https://tork-flax.vercel.app";

async function smokeTest() {
  console.log("==================================================");
  console.log("PRODUCTION SMOKE TESTS — https://tork-flax.vercel.app");
  console.log("==================================================");

  let allPass = true;

  // 1. Root page
  try {
    const res = await fetch(PROD_URL);
    const text = await res.text();
    const pass = res.status === 200 && text.includes("TORK");
    console.log(`[1] GET / -> HTTP ${res.status}: ${pass ? "PASS" : "FAIL"}`);
    if (!pass) allPass = false;
  } catch (e) {
    console.log(`[1] GET / -> ERROR: ${e.message}`);
    allPass = false;
  }

  // 2. api/routes (POST)
  try {
    const res = await fetch(`${PROD_URL}/api/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: { lat: 41.0082, lng: 28.9784 },      // Istanbul
        destination: { lat: 39.9334, lng: 32.8597 }, // Ankara
        profile: "driving-hgv",
      }),
    });
    const data = await res.json();
    const pass = res.status === 200 && data.success && data.distanceKm > 0;
    console.log(`[2] POST /api/routes -> HTTP ${res.status}: ${pass ? "PASS" : "FAIL"} (${data.distanceKm} km, duration: ${data.durationText}, provider: ${data.provider})`);
    if (!pass) allPass = false;
  } catch (e) {
    console.log(`[2] POST /api/routes -> ERROR: ${e.message}`);
    allPass = false;
  }

  // 3. api/fuel (GET)
  try {
    const res = await fetch(`${PROD_URL}/api/fuel`);
    const data = await res.json();
    const dieselPrice = data.prices?.diesel?.price;
    const pass = res.status === 200 && data.success && dieselPrice > 0;
    console.log(`[3] GET /api/fuel -> HTTP ${res.status}: ${pass ? "PASS" : "FAIL"} (provider: ${data.provider}, diesel: ${dieselPrice} TL, gasoline: ${data.prices?.gasoline?.price} TL)`);
    if (!pass) allPass = false;
  } catch (e) {
    console.log(`[3] GET /api/fuel -> ERROR: ${e.message}`);
    allPass = false;
  }

  // 4. api/fuel/city (GET)
  try {
    const res = await fetch(`${PROD_URL}/api/fuel/city?city=Ankara`);
    const data = await res.json();
    const dieselPrice = data.prices?.diesel?.price;
    const pass = res.status === 200 && data.success && dieselPrice > 0;
    console.log(`[4] GET /api/fuel/city?city=Ankara -> HTTP ${res.status}: ${pass ? "PASS" : "FAIL"} (province: ${data.province?.name}, diesel: ${dieselPrice} TL, stations: ${data.stationCount})`);
    if (!pass) allPass = false;
  } catch (e) {
    console.log(`[4] GET /api/fuel/city -> ERROR: ${e.message}`);
    allPass = false;
  }

  // 5. api/pricing/estimate (POST)
  try {
    const res = await fetch(`${PROD_URL}/api/pricing/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: { lat: 41.0082, lng: 28.9784 },
        destination: { lat: 39.9334, lng: 32.8597 },
        distanceKm: 730,
        vehicleType: "TIR",
      }),
    });
    const data = await res.json();
    const operatingCost = data.pricing?.totals?.totalOperatingCost;
    const recommendedPrice = data.pricing?.pricingBands?.recommended?.price;
    const pass = res.status === 200 && data.success && operatingCost > 0;
    console.log(`[5] POST /api/pricing/estimate -> HTTP ${res.status}: ${pass ? "PASS" : "FAIL"} (totalOperatingCost: ${operatingCost} TL, recommended: ${recommendedPrice} TL)`);
    if (!pass) allPass = false;
  } catch (e) {
    console.log(`[5] POST /api/pricing/estimate -> ERROR: ${e.message}`);
    allPass = false;
  }

  // 6. api/pricing/carrier-estimate (POST)
  try {
    const res = await fetch(`${PROD_URL}/api/pricing/carrier-estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distanceKm: 730,
        vehicleType: "TIR",
      }),
    });
    const data = await res.json();
    const operatingCost = data.pricing?.totals?.totalOperatingCost;
    const pass = res.status === 200 && data.success && operatingCost > 0;
    console.log(`[6] POST /api/pricing/carrier-estimate -> HTTP ${res.status}: ${pass ? "PASS" : "FAIL"} (carrier operatingCost: ${operatingCost} TL)`);
    if (!pass) allPass = false;
  } catch (e) {
    console.log(`[6] POST /api/pricing/carrier-estimate -> ERROR: ${e.message}`);
    allPass = false;
  }

  // 7. api/ai/analyze (POST)
  try {
    const res = await fetch(`${PROD_URL}/api/ai/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "dashboard",
        context: {
          summary: { activeLoads: 2, pendingBids: 1, transportsCount: 0 },
        },
        audience: "shipper",
      }),
    });
    const data = await res.json();
    const pass = res.status === 200 && data.success && data.ai !== undefined;
    console.log(`[7] POST /api/ai/analyze -> HTTP ${res.status}: ${pass ? "PASS" : "FAIL"} (provider: ${data.ai?.provider})`);
    if (!pass) allPass = false;
  } catch (e) {
    console.log(`[7] POST /api/ai/analyze -> ERROR: ${e.message}`);
    allPass = false;
  }

  console.log("==================================================");
  console.log(`FINAL PRODUCTION SMOKE TEST RESULT: ${allPass ? "ALL 7 ENDPOINTS PASS (100%)" : "FAILED"}`);
  console.log("==================================================");

  if (!allPass) process.exit(1);
}

smokeTest();
