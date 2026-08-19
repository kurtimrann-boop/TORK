// scripts/test-sprint14-industrial-ui.mjs
// Comprehensive Sprint 14 Test Suite for TORK Industrial Orange & UX 2.0

import fs from "fs";
import path from "path";
import assert from "assert";

console.log("================================================================================");
console.log("   TORK SPRINT 14: INDUSTRIAL ORANGE + PRODUCT UX 2.0 TEST SUITE");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${description}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

async function testAsync(description, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${description}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

const rootDir = process.cwd();

// --- TEST GROUP 1: Design Tokens & CSS Variables ---
console.log("--- 1. DESIGN TOKENS & INDUSTRIAL PALETTE ---");

test("globals.css defines TORK Orange tokens (#F5A400, #D98200)", () => {
  const css = fs.readFileSync(path.join(rootDir, "src/app/globals.css"), "utf8");
  assert(css.includes("--tork-orange: #F5A400;"), "Missing --tork-orange");
  assert(css.includes("--tork-orange-dark: #D98200;"), "Missing --tork-orange-dark");
  assert(css.includes("--tork-bg: #111827;"), "Missing --tork-bg");
  assert(css.includes("--tork-surface: #1F2937;"), "Missing --tork-surface");
  assert(css.includes("--tork-border: #374151;"), "Missing --tork-border");
  assert(css.includes("--tork-text: #F3F4F6;"), "Missing --tork-text");
  assert(css.includes("--tork-muted: #A0AEC0;"), "Missing --tork-muted");
});

test("globals.css defines Turkish license plate badge styles (.tork-plate-badge)", () => {
  const css = fs.readFileSync(path.join(rootDir, "src/app/globals.css"), "utf8");
  assert(css.includes(".tork-plate-badge"), "Missing .tork-plate-badge");
  assert(css.includes(".tork-plate-tr"), "Missing .tork-plate-tr");
  assert(css.includes(".tork-plate-text"), "Missing .tork-plate-text");
});

test("globals.css defines right drawer slide-over styles (.tork-drawer-right)", () => {
  const css = fs.readFileSync(path.join(rootDir, "src/app/globals.css"), "utf8");
  assert(css.includes(".tork-drawer-right"), "Missing .tork-drawer-right");
  assert(css.includes(".tork-drawer-overlay"), "Missing .tork-drawer-overlay");
});

test("globals.css defines button and toast styles in TORK Orange", () => {
  const css = fs.readFileSync(path.join(rootDir, "src/app/globals.css"), "utf8");
  assert(css.includes(".tork-btn-primary"), "Missing .tork-btn-primary");
  assert(css.includes(".tork-toast"), "Missing .tork-toast");
});

// --- TEST GROUP 2: Navigation & Topbar ---
console.log("\n--- 2. NAVIGATION & TOPBAR USER MENU ---");

test("Sidebar.jsx groups tabs into distinct logical sections", () => {
  const sidebar = fs.readFileSync(path.join(rootDir, "src/components/Sidebar.jsx"), "utf8");
  assert(sidebar.includes("YÜK BORSASI"), "Carrier section YÜK BORSASI missing");
  assert(sidebar.includes("OPERASYON"), "Section OPERASYON missing");
  assert(sidebar.includes("FİNANS"), "Section FİNANS missing");
});

test("Sidebar.jsx does NOT contain a direct logout button (moved to Topbar)", () => {
  const sidebar = fs.readFileSync(path.join(rootDir, "src/components/Sidebar.jsx"), "utf8");
  assert(!sidebar.includes("Çıkış Yap"), "Sidebar should not contain direct Çıkış Yap button");
});

test("Topbar.jsx includes right user profile dropdown with logout & profile link", () => {
  const topbar = fs.readFileSync(path.join(rootDir, "src/components/Topbar.jsx"), "utf8");
  assert(topbar.includes("isUserMenuOpen"), "Topbar missing isUserMenuOpen state");
  assert(topbar.includes("Profilim"), "Topbar dropdown missing Profilim link");
  assert(topbar.includes("Hesap Ayarları"), "Topbar dropdown missing Hesap Ayarları link");
  assert(topbar.includes("Çıkış Yap"), "Topbar dropdown missing Çıkış Yap action");
});

// --- TEST GROUP 3: Road Geometry Engine & Routing API ---
console.log("\n--- 3. ROAD GEOMETRY ENGINE & MAPPING ---");

test("roadGeometryService.js implements getRealRoadGeometry with waypoint corridors & caching", () => {
  const service = fs.readFileSync(path.join(rootDir, "src/utils/roadGeometryService.js"), "utf8");
  assert(service.includes("getRealRoadGeometry"), "Missing getRealRoadGeometry");
  assert(service.includes("roadGeometryCache"), "Missing geometry cache");
  assert(service.includes("HIGHWAY_WAYPOINTS"), "Missing highway waypoints corridor fallback");
  assert(service.includes("route_unavailable"), "Missing explicit route_unavailable fallback flag");
});

test("TorkMarketplaceMap.jsx renders real road geometry with Orange polylines", () => {
  const mapComp = fs.readFileSync(path.join(rootDir, "src/components/TorkMarketplaceMap.jsx"), "utf8");
  assert(mapComp.includes("getRealRoadGeometry"), "Missing getRealRoadGeometry integration");
  assert(mapComp.includes("#F5A400"), "Polylines should use TORK Orange #F5A400");
  assert(mapComp.includes("Karayolu Geometrisi"), "Missing route status indicator");
});

test("TorkMap.jsx renders route geometry with dual-layer glow polylines in Orange", () => {
  const torkMap = fs.readFileSync(path.join(rootDir, "src/components/TorkMap.jsx"), "utf8");
  assert(torkMap.includes("getRealRoadGeometry"), "Missing getRealRoadGeometry in TorkMap");
  assert(torkMap.includes("#F5A400"), "Polyline color should be #F5A400");
});

// --- TEST GROUP 4: Carrier Marketplace & Slide-Over Drawer ---
console.log("\n--- 4. CARRIER MARKETPLACE & RIGHT DRAWER ---");

test("CarrierMarketplace.jsx includes Return Load filter option (Dönüş Yükü)", () => {
  const mp = fs.readFileSync(path.join(rootDir, "src/components/CarrierMarketplace.jsx"), "utf8");
  assert(mp.includes("returnLoadOnly"), "Missing returnLoadOnly filter state");
  assert(mp.includes("Dönüş Yükü"), "Missing Dönüş Yükü filter UI");
});

test("CarrierMarketplace.jsx implements slide-over Right Drawer with ESC key support", () => {
  const mp = fs.readFileSync(path.join(rootDir, "src/components/CarrierMarketplace.jsx"), "utf8");
  assert(mp.includes("tork-drawer-right"), "Missing tork-drawer-right class");
  assert(mp.includes("tork-drawer-overlay"), "Missing tork-drawer-overlay class");
  assert(mp.includes("Escape"), "Missing ESC key listener for drawer");
});

test("CarrierMarketplace.jsx provides mobile sticky action bar with [Teklif Ver]", () => {
  const mp = fs.readFileSync(path.join(rootDir, "src/components/CarrierMarketplace.jsx"), "utf8");
  assert(mp.includes("Hızlı Teklif Ver"), "Missing mobile sticky quick bid button");
});

// --- TEST GROUP 5: Bidding, Pricing & Trust Profile ---
console.log("\n--- 5. BIDDING, PRICING & TRUST PROFILE ---");

test("CarrierSmartBiddingWidget.jsx uses TORK Orange accents & clear profit margins", () => {
  const widget = fs.readFileSync(path.join(rootDir, "src/components/CarrierSmartBiddingWidget.jsx"), "utf8");
  assert(widget.includes("#F5A400"), "Widget should use TORK Orange");
  assert(widget.includes("Net Kâr"), "Missing Net Kâr label");
});

test("PricingEngineCard.jsx provides itemized cost breakdown (Fuel, Toll, Driver, Maintenance)", () => {
  const pricing = fs.readFileSync(path.join(rootDir, "src/components/PricingEngineCard.jsx"), "utf8");
  assert(pricing.includes("Yakıt Maliyeti"), "Missing Yakıt Maliyeti in breakdown");
  assert(pricing.includes("Otoyol & Köprü (HGS)"), "Missing Otoyol & Köprü in breakdown");
  assert(pricing.includes("Sürücü / Personel"), "Missing Sürücü in breakdown");
  assert(pricing.includes("Bakım & Amortisman"), "Missing Bakım in breakdown");
});

test("UserProfileManager.jsx renders Turkish plate badges with [TR] prefix", () => {
  const profile = fs.readFileSync(path.join(rootDir, "src/components/UserProfileManager.jsx"), "utf8");
  assert(profile.includes("tork-plate-badge"), "Missing tork-plate-badge in profile");
  assert(profile.includes("tork-plate-tr"), "Missing tork-plate-tr in profile");
});

// --- TEST GROUP 6: Shipper Bid Comparison Matrix ---
console.log("\n--- 6. SHIPPER BID COMPARISON MATRIX ---");

test("page.js supports Bid Comparison Matrix View toggle and table", () => {
  const page = fs.readFileSync(path.join(rootDir, "src/app/page.js"), "utf8");
  assert(page.includes("bidViewMode"), "Missing bidViewMode state in page.js");
  assert(page.includes("Matris Görünümü"), "Missing Matris Görünümü button");
  assert(page.includes("Trust Skoru"), "Missing Trust Skoru column in matrix");
  assert(page.includes("Yetersiz Veri"), "Missing Yetersiz Veri fallback for unrated carriers");
});

// --- TEST GROUP 7: Control Tower & Wallet UX ---
console.log("\n--- 7. CONTROL TOWER & WALLET UX ---");

test("ControlTower.jsx includes Top Urgent Action Required banner & human-readable audit feed", () => {
  const ct = fs.readFileSync(path.join(rootDir, "src/components/ControlTower.jsx"), "utf8");
  assert(ct.includes("ACİL MÜDAHALE GEREKTİREN OPERASYONLAR"), "Missing Urgent Action Required banner");
  assert(ct.includes("formatAuditEvent"), "Missing human-readable formatAuditEvent helper");
  assert(ct.includes("Finansal Bütünlük"), "Missing Finansal Bütünlük tab");
});

test("CarrierWallet.jsx renders Available, Pending, and Disputed balance cards in TORK Orange & semantic colors", () => {
  const wallet = fs.readFileSync(path.join(rootDir, "src/components/CarrierWallet.jsx"), "utf8");
  assert(wallet.includes("KULLANILABİLİR BAKİYE"), "Missing Kullanılabilir Bakiye");
  assert(wallet.includes("BEKLEYEN HAKEDİŞLER"), "Missing Bekleyen Hakedişler");
  assert(wallet.includes("#F5A400"), "Wallet should use TORK Orange");
});

test("DashboardOperationsHub.jsx provides prominent CTAs and clean typography", () => {
  const hub = fs.readFileSync(path.join(rootDir, "src/components/DashboardOperationsHub.jsx"), "utf8");
  assert(hub.includes("+ Yeni Yük İlanı"), "Missing Yeni Yük İlanı CTA");
  assert(hub.includes("Açık Yükleri Gör"), "Missing Açık Yükleri Gör CTA");
  assert(hub.includes("#F5A400"), "Hub should use TORK Orange");
});

// --- TEST GROUP 8: Road Geometry Algorithm Verification ---
console.log("\n--- 8. ROAD GEOMETRY ALGORITHM INTEGRATION TEST ---");

import { getRealRoadGeometry } from "../src/utils/roadGeometryService.js";

await testAsync("getRealRoadGeometry produces curved road coordinates for Istanbul -> Ankara (corridor test)", async () => {
  const origin = { lat: 41.0082, lng: 28.9784, name: "İstanbul" };
  const destination = { lat: 39.9334, lng: 32.8597, name: "Ankara" };
  const geo = await getRealRoadGeometry(origin, destination);
  assert(geo, "Geometry should not be null");
  assert(geo.geometry && Array.isArray(geo.geometry), "Geometry should have geometry array");
  assert(geo.geometry.length >= 3, `Expected at least 3 road waypoints, got ${geo.geometry.length}`);
  assert(geo.distanceKm > 400 && geo.distanceKm < 550, `Expected distance ~450km, got ${geo.distanceKm}`);
});

await testAsync("getRealRoadGeometry produces curved road coordinates for Izmir -> Bursa (corridor test)", async () => {
  const origin = { lat: 38.4237, lng: 27.1428, name: "İzmir" };
  const destination = { lat: 40.1885, lng: 29.0610, name: "Bursa" };
  const geo = await getRealRoadGeometry(origin, destination);
  assert(geo, "Geometry should not be null");
  assert(geo.geometry && Array.isArray(geo.geometry), "Geometry should have geometry array");
  assert(geo.geometry.length >= 3, `Expected at least 3 road waypoints, got ${geo.geometry.length}`);
});

await testAsync("getRealRoadGeometry produces curved road coordinates for Mersin -> Istanbul (corridor test)", async () => {
  const origin = { lat: 36.8121, lng: 34.6415, name: "Mersin" };
  const destination = { lat: 41.0082, lng: 28.9784, name: "İstanbul" };
  const geo = await getRealRoadGeometry(origin, destination);
  assert(geo, "Geometry should not be null");
  assert(geo.geometry && Array.isArray(geo.geometry), "Geometry should have geometry array");
  assert(geo.geometry.length >= 3, `Expected at least 3 road waypoints, got ${geo.geometry.length}`);
});

console.log("\n================================================================================");
console.log(`   SPRINT 14 TEST SUMMARY: ${passed} PASSED / ${failed} FAILED`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}
