import { runAuthAudit } from "./audit-auth.mjs";
import { runPricingAudit } from "./audit-pricing.mjs";
import { runWeightFuelAudit } from "./audit-weight-fuel.mjs";
import { runApiAudit } from "./audit-api.mjs";
import { runTransportAudit } from "./audit-transport.mjs";
import { runCdpMasterJourneysAudit } from "./audit-cdp-master-journeys.mjs";

async function runFullSystemAudit() {
  console.log("================================================================================");
  console.log("TORK FULL A->Z SYSTEM FUNCTIONALITY & USER JOURNEY AUDIT RUNNER");
  console.log("================================================================================");

  const results = {
    auth: { tested: 0, passed: 0, failed: 0 },
    pricing: { tested: 0, passed: 0, failed: 0 },
    api: { tested: 0, passed: 0, failed: 0 },
    transport: { tested: 0, passed: 0, failed: 0 },
    cdpJourneys: { tested: 0, passed: 0, failed: 0 },
  };

  try {
    const authRes = await runAuthAudit();
    results.auth = { tested: authRes.passed + authRes.failed, passed: authRes.passed, failed: authRes.failed };

    const pricingRes = await runPricingAudit();
    results.pricing = { tested: pricingRes.passed + pricingRes.failed, passed: pricingRes.passed, failed: pricingRes.failed };

    await runWeightFuelAudit();

    const apiRes = await runApiAudit();
    results.api = { tested: apiRes.passed + apiRes.failed, passed: apiRes.passed, failed: apiRes.failed };

    const transportRes = await runTransportAudit();
    results.transport = { tested: transportRes.passed + transportRes.failed, passed: transportRes.passed, failed: transportRes.failed };

    const cdpRes = await runCdpMasterJourneysAudit();
    results.cdpJourneys = { tested: cdpRes.passed + cdpRes.failed, passed: cdpRes.passed, failed: cdpRes.failed };

    console.log("\n================================================================================");
    console.log("FULL AUDIT AGGREGATION COMPLETE");
    console.log("================================================================================");
    console.table(results);
  } catch (err) {
    console.error("Audit aggregation error:", err);
  }
}

runFullSystemAudit();
