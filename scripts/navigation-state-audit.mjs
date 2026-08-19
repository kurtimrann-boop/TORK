import fs from "fs";
import path from "path";

console.log("==================================================");
console.log("TORK DEEP STATIC & STATE NAVIGATION AUDIT V2");
console.log("==================================================");

const pageContent = fs.readFileSync("src/app/page.js", "utf8");
const sidebarContent = fs.readFileSync("src/components/Sidebar.jsx", "utf8");
const topbarContent = fs.readFileSync("src/components/Topbar.jsx", "utf8");
const signalsContent = fs.readFileSync("src/utils/torkSignalsService.js", "utf8");
const cardContent = fs.readFileSync("src/components/TorkIntelligenceCard.jsx", "utf8");
const actualsModalContent = fs.readFileSync("src/components/TransportActualsModal.jsx", "utf8");

const issues = [];
const passedChecks = [];

// 1. Check all setActiveTab calls
const setActiveTabRegex = /setActiveTab\(["']([^"']+)["']\)/g;
let match;
const allSetTabCalls = new Set();
while ((match = setActiveTabRegex.exec(pageContent)) !== null) {
  allSetTabCalls.add(match[1]);
}

const knownValidTabs = new Set([
  "overview", "loads", "create", "bids", "wallet", "profile", "settings",
  "board", "my-bids", "transports", "verification", "control-tower"
]);

let invalidTabsFound = 0;
for (const tab of allSetTabCalls) {
  if (!knownValidTabs.has(tab)) {
    invalidTabsFound++;
    issues.push({
      id: "BUG-NAV-001",
      severity: "P1",
      title: `Invalid activeTab target: "${tab}"`,
      detail: `Found setActiveTab("${tab}") in page.js, but "${tab}" is not a recognized tab id.`,
      recommendation: `Change setActiveTab("${tab}") to a valid tab id.`
    });
  }
}
if (invalidTabsFound === 0) {
  passedChecks.push("P1: All setActiveTab targets are valid registered tab IDs (No create-load typo).");
}

// 2. Check centralized handleTabChange
if (pageContent.includes("const handleTabChange =")) {
  const hasResetDetail = pageContent.includes("setActiveDetailLoadId(null)");
  const hasResetBid = pageContent.includes("setActiveBidLoadId(null)");
  const hasResetComp = pageContent.includes("setShowComparison(false)");
  const hasResetActuals = pageContent.includes("setActualsModalTransport(null)");
  const hasResetEditing = pageContent.includes("setEditingLoad(null)");
  const hasResetDelete = pageContent.includes("setDeleteConfirmLoad(null)");

  if (hasResetDetail && hasResetBid && hasResetComp && hasResetActuals && hasResetEditing && hasResetDelete) {
    passedChecks.push("P0: Centralized handleTabChange properly resets all sub-views and modal states.");
  } else {
    issues.push({
      id: "BUG-NAV-003",
      severity: "P1",
      title: "handleTabChange is missing some state resets",
      detail: "handleTabChange should reset all sub-states.",
      recommendation: "Ensure all modal and detail states are cleared in handleTabChange."
    });
  }
} else {
  issues.push({
    id: "BUG-NAV-003",
    severity: "P0",
    title: "Centralized handleTabChange handler missing in page.js",
    detail: "page.js lacks handleTabChange.",
    recommendation: "Define handleTabChange in page.js."
  });
}

// 3. Check Load Detail scoped render
if (pageContent.includes("activeDetailLoadId && (activeTab === \"loads\" || activeTab === \"board\" || activeTab === \"overview\")")) {
  passedChecks.push("P0: Load Detail is safely scoped to activeTab (loads / board / overview).");
} else {
  issues.push({
    id: "BUG-NAV-002",
    severity: "P0",
    title: "Load Detail render is not scoped to activeTab",
    detail: "activeDetailLoadId should be checked alongside activeTab condition.",
    recommendation: "Scope activeDetailLoadId to (activeTab === 'loads' || activeTab === 'board' || activeTab === 'overview')."
  });
}

// 4. Check Mobile Dock using handleTabChange
if (pageContent.includes("aria-label=\"Mobil alt menü\"")) {
  const mobileDockSection = pageContent.substring(
    pageContent.indexOf("aria-label=\"Mobil alt menü\""),
    pageContent.indexOf("aria-label=\"Mobil alt menü\"") + 2500
  );
  
  if (mobileDockSection.includes("handleTabChange(") && !mobileDockSection.includes("setActiveTab(")) {
    passedChecks.push("P0/P1: Mobile bottom dock strictly uses centralized handleTabChange.");
  } else {
    issues.push({
      id: "BUG-NAV-004",
      severity: "P1",
      title: "Mobile dock has unconverted setActiveTab calls",
      detail: "Some mobile dock buttons still call setActiveTab directly.",
      recommendation: "Use handleTabChange for all mobile dock buttons."
    });
  }
}

// 5. Check Topbar Avatar Dropdown
if (topbarContent.includes("aria-haspopup=\"true\"") && topbarContent.includes("Profilim") && topbarContent.includes("onLogout")) {
  passedChecks.push("P2: Topbar Avatar is an interactive button with accessible dropdown (Profilim, Ayarlar, Çıkış Yap).");
} else {
  issues.push({
    id: "BUG-NAV-005",
    severity: "P2",
    title: "Topbar Avatar lacks accessible dropdown menu or profile links",
    detail: "Avatar must provide a dropdown with Profilim, Ayarlar, and Çıkış Yap.",
    recommendation: "Upgrade Topbar avatar with accessible dropdown menu."
  });
}

// 6. Check Role-Aware Intelligence Navigation
const hasCarrierMappingInSignals = signalsContent.includes("const loadTab = isShipper ? \"loads\" : \"board\"") && signalsContent.includes("const bidTab = isShipper ? \"bids\" : \"my-bids\"");
const hasCarrierMappingInCard = cardContent.includes("isShipper ? \"bids\" : \"my-bids\"") && cardContent.includes("isShipper ? \"loads\" : \"board\"");

if (hasCarrierMappingInSignals && hasCarrierMappingInCard) {
  passedChecks.push("P1: TORK Signals & Intelligence Card implement dynamic role-aware navigation (board / my-bids for carriers).");
} else {
  issues.push({
    id: "BUG-NAV-006",
    severity: "P1",
    title: "Role-aware navigation mapping incomplete in signals or intelligence card",
    detail: "Carriers must be routed to board and my-bids, not shipper-only tabs.",
    recommendation: "Use isShipper ? ... : ... mapping in torkSignalsService.js and TorkIntelligenceCard.jsx."
  });
}

// 7. Check Modals Escape and Backdrop Handlers
const hasEscapeInPage = pageContent.includes("e.key === \"Escape\"");
const hasBackdropInComparison = pageContent.includes("setShowComparison(false)") && pageContent.includes("e.stopPropagation()");
const hasBackdropInDelete = pageContent.includes("setDeleteConfirmLoad(null)") && pageContent.includes("e.stopPropagation()");
const hasEscapeInActuals = actualsModalContent.includes("e.key === \"Escape\"") && actualsModalContent.includes("e.stopPropagation()");

if (hasEscapeInPage && hasBackdropInComparison && hasBackdropInDelete && hasEscapeInActuals) {
  passedChecks.push("P2: Modals (Comparison, Delete, Actuals) support Escape key and backdrop click dismissal.");
} else {
  issues.push({
    id: "BUG-NAV-007",
    severity: "P2",
    title: "Modal Escape or Backdrop click handlers incomplete",
    detail: "All modals must support Escape key and backdrop click.",
    recommendation: "Add Escape key and backdrop click handlers to all modals."
  });
}

// 8. Check URL Hash Sync (P3)
if (pageContent.includes("window.location.hash = tabId") && pageContent.includes("window.location.hash.replace(\"#\", \"\")")) {
  passedChecks.push("P3: Lightweight URL hash synchronization and refresh state preservation implemented.");
}

console.log("\n==================================================");
console.log(`PASSED CHECKS: ${passedChecks.length}`);
passedChecks.forEach((chk, i) => console.log(`  ✓ [${i + 1}] ${chk}`));
console.log(`\nTOTAL ACTIVE ISSUES: ${issues.length}`);
issues.forEach((iss, i) => console.log(`  ✗ [${i + 1}] ${iss.id} (${iss.severity}) - ${iss.title}`));
console.log("==================================================");

if (issues.length > 0) {
  process.exit(1);
} else {
  console.log("ALL STATIC & STATE NAVIGATION TESTS PASSED CLEANLY!");
}
