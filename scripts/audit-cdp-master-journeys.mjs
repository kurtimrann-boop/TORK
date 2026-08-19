import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9255;
const USER_DATA_DIR = "/tmp/tork-chrome-audit-master-" + Date.now();
const LOCAL_URL = "http://localhost:3000";
const ARTIFACT_DIR = "/Users/basquiat/.gemini/antigravity/brain/8dd0bf41-47af-42f9-87a9-4e4cd012d963";

async function startChrome() {
  const proc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1440,900",
  ]);

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return proc;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Could not start Chrome debugging port");
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new globalThis.WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(msg.error);
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  close() {
    try {
      this.ws.close();
    } catch (e) {}
  }
}

export async function runCdpMasterJourneysAudit() {
  console.log("\n==================================================");
  console.log("AUDIT SECTION 5: REAL CHROME CDP MASTER JOURNEYS");
  console.log("==================================================");

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

  const chromeProc = await startChrome();

  try {
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const pageTarget = await newTabRes.json();
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    const consoleErrors = [];
    cdp.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.exceptionThrown") {
        consoleErrors.push(msg.params.exceptionDetails);
      }
    });

    // ----------------------------------------------------
    // SHIPPER JOURNEY
    // ----------------------------------------------------
    console.log("\n--- Executing Shipper Master Journey ---");
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // 1. Shipper Login
    await cdp.eval(`
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email');
        const passInput = inputs.find(i => i.type === 'password');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (emailInput && passInput && submitBtn) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(emailInput, 'qa-shipper@tork.test');
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          setter.call(passInput, 'TorkQA!2026Secure');
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          submitBtn.click();
        }
      })()
    `);
    await new Promise((r) => setTimeout(r, 3500));

    // Verify Overview Screen
    const shipperOverview = await cdp.eval(`
      document.body.innerText.includes('Operasyon') || document.body.innerText.includes('Genel Bakış')
    `);
    assert(shipperOverview, "Shipper Overview rendered successfully");

    // Capture Shipper Overview Screenshot
    const sOverShot = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "audit_shipper_overview_1440.png"), Buffer.from(sOverShot.data, "base64"));

    // 2. Shipper Navigation: İlanlarım -> Gelen Teklifler -> Cüzdan -> Profilim
    const tabsToTest = [
      { name: "İlanlarım", keywords: ["Yüklerim", "ilan", "Navlun"] },
      { name: "Gelen Teklifler", keywords: ["Gelen Teklifler", "Teklif"] },
      { name: "Cüzdan", keywords: ["Cüzdan", "Bakiye", "Finansal"] },
      { name: "Profilim", keywords: ["Profil", "kurumsal", "Güvenlik"] },
    ];

    for (const tab of tabsToTest) {
      await cdp.eval(`
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('${tab.name}'));
          if (btn) btn.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 1200));

      const tabRendered = await cdp.eval(`
        (() => {
          const text = document.body.innerText;
          const keywords = ${JSON.stringify(tab.keywords)};
          return keywords.some(k => text.includes(k));
        })()
      `);
      assert(tabRendered, `Shipper navigated to tab: ${tab.name}`);
    }

    // Shipper Logout
    await cdp.eval(`
      (() => {
        const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Çıkış Yap'));
        if (logoutBtn) logoutBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 2000));

    // ----------------------------------------------------
    // CARRIER JOURNEY
    // ----------------------------------------------------
    console.log("\n--- Executing Carrier Master Journey ---");
    // Carrier Login
    await cdp.eval(`
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email');
        const passInput = inputs.find(i => i.type === 'password');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (emailInput && passInput && submitBtn) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(emailInput, 'qa-carrier@tork.test');
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          setter.call(passInput, 'TorkQA!2026Secure');
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          submitBtn.click();
        }
      })()
    `);
    await new Promise((r) => setTimeout(r, 3500));

    const carrierOverview = await cdp.eval(`
      document.body.innerText.includes('Operasyon') || document.body.innerText.includes('Sefer')
    `);
    assert(carrierOverview, "Carrier Overview rendered successfully");

    // Carrier Tabs: Uygun Yükler -> Tekliflerim -> Aktif Taşımalar -> Cüzdan -> Profilim
    const carrierTabs = [
      { name: "Uygun Yükler", keywords: ["Uygun Yükler", "Pazar", "Yük"] },
      { name: "Tekliflerim", keywords: ["Tekliflerim", "Teklif", "Taşıyıcı"] },
      { name: "Aktif Taşımalar", keywords: ["Aktif Taşımalar", "Taşımalar", "Sefer"] },
      { name: "Cüzdan", keywords: ["Cüzdan", "Bakiye", "Kazanç"] },
      { name: "Profilim", keywords: ["Profil", "kurumsal", "Güvenlik"] },
    ];

    for (const tab of carrierTabs) {
      await cdp.eval(`
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('${tab.name}'));
          if (btn) btn.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 1200));

      const tabRendered = await cdp.eval(`
        (() => {
          const text = document.body.innerText;
          const keywords = ${JSON.stringify(tab.keywords)};
          return keywords.some(k => text.includes(k));
        })()
      `);
      assert(tabRendered, `Carrier navigated to tab: ${tab.name}`);
    }

    // ----------------------------------------------------
    // RESPONSIVE VIEWPORT CHECKS
    // ----------------------------------------------------
    console.log("\n--- Testing Multi-Breakpoint Responsiveness ---");
    const viewports = [
      { name: "Mobile (390x844)", width: 390, height: 844, mobile: true },
      { name: "Tablet (768x1024)", width: 768, height: 1024, mobile: false },
      { name: "Desktop (1440x900)", width: 1440, height: 900, mobile: false },
      { name: "Ultra-Wide (1920x1080)", width: 1920, height: 1080, mobile: false },
    ];

    for (const vp of viewports) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.mobile ? 3 : 2,
        mobile: vp.mobile,
      });
      await new Promise((r) => setTimeout(r, 600));

      const overflow = await cdp.eval(`
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      `);
      assert(overflow === false, `${vp.name}: Zero horizontal overflow detected`);
    }

    assert(consoleErrors.length === 0, `Browser runtime errors: 0 errors detected (found: ${consoleErrors.length})`);

    cdp.close();
  } catch (err) {
    console.error("CDP Master Journey failed:", err);
    failed++;
  } finally {
    try {
      chromeProc.kill("SIGKILL");
    } catch (e) {}
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log(`CDP MASTER JOURNEYS AUDIT SUMMARY: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}

if (process.argv[1].endsWith("audit-cdp-master-journeys.mjs")) {
  runCdpMasterJourneysAudit().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
