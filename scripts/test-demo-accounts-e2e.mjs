import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9268;
const USER_DATA_DIR = "/tmp/tork-chrome-demo-" + Date.now();
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

async function runDemoE2E() {
  console.log("==================================================");
  console.log("TORK DEMO ACCOUNTS E2E BROWSER LOGIN / LOGOUT AUDIT");
  console.log("==================================================");

  const chromeProc = await startChrome();

  try {
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const pageTarget = await newTabRes.json();
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

    // ==========================================
    // 1. SHIPPER DEMO LOGIN
    // ==========================================
    console.log("\n[1] Testing SHIPPER Demo Login (demo.shipper@tork.local)...");
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // Fill Shipper Credentials
    const shipperLoginSubmit = await cdp.eval(`
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email');
        const passInput = inputs.find(i => i.type === 'password');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (emailInput && passInput && submitBtn) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(emailInput, 'demo.shipper@tork.local');
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          setter.call(passInput, 'TorkDemo2026!S');
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          submitBtn.click();
          return true;
        }
        return false;
      })()
    `);
    assert(shipperLoginSubmit, "Shipper credentials entered and form submitted");

    // Wait for Shipper Dashboard
    await new Promise((r) => setTimeout(r, 3500));

    const shipperDashboardState = await cdp.eval(`
      (() => {
        const bodyText = document.body.innerText;
        const hasOperasyonMerkezi = bodyText.includes('OPERASYON MERKEZİ');
        const hasCanliOperasyon = bodyText.includes('canlı operasyon merkezi');
        const hasIlanlarim = bodyText.includes('İlanlarım');
        const hasYeniYuk = bodyText.includes('Yeni Yük');
        const hasSidebarLogo = Boolean(document.querySelector('aside img[src*="tork-logo"]'));
        const userBadge = bodyText.includes('Tork Demo Shipper');

        return {
          hasOperasyonMerkezi,
          hasCanliOperasyon,
          hasIlanlarim,
          hasYeniYuk,
          hasSidebarLogo,
          userBadge,
          bodySnippet: bodyText.slice(0, 300)
        };
      })()
    `);

    assert(shipperDashboardState.hasOperasyonMerkezi, "Shipper sidebar displays 'OPERASYON MERKEZİ'");
    assert(shipperDashboardState.hasCanliOperasyon, "Shipper topbar displays 'canlı operasyon merkezi'");
    assert(shipperDashboardState.hasIlanlarim, "Shipper navigation contains 'İlanlarım'");
    assert(shipperDashboardState.hasYeniYuk, "Shipper navigation contains 'Yeni Yük'");
    assert(shipperDashboardState.hasSidebarLogo, "Sidebar renders TORK brand logo");

    const shotShipper = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "demo-shipper-dashboard.png"), Buffer.from(shotShipper.data, "base64"));
    console.log("  ✓ Saved demo-shipper-dashboard.png");

    // Test Shipper Logout
    console.log("\n[1.1] Testing Shipper Logout Flow...");
    const shipperLogout = await cdp.eval(`
      (() => {
        const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Çıkış Yap'));
        if (logoutBtn) {
          logoutBtn.click();
          return true;
        }
        return false;
      })()
    `);
    assert(shipperLogout, "Shipper clicked 'Çıkış Yap' button");
    await new Promise((r) => setTimeout(r, 2000));

    const loggedOutState1 = await cdp.eval(`
      (() => {
        const emailInput = document.querySelector('input[type="email"]');
        const submitBtn = document.querySelector('button[type="submit"]');
        const isAuthScreen = Boolean(emailInput && submitBtn && document.body.innerText.includes('Operasyon Merkezine Gir'));
        return isAuthScreen;
      })()
    `);
    assert(loggedOutState1, "Returned cleanly to Landing / Login screen after Shipper logout");

    // ==========================================
    // 2. CARRIER DEMO LOGIN
    // ==========================================
    console.log("\n[2] Testing CARRIER Demo Login (demo.carrier@tork.local)...");

    // Fill Carrier Credentials
    const carrierLoginSubmit = await cdp.eval(`
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email');
        const passInput = inputs.find(i => i.type === 'password');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (emailInput && passInput && submitBtn) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(emailInput, 'demo.carrier@tork.local');
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          setter.call(passInput, 'TorkDemo2026!C');
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          submitBtn.click();
          return true;
        }
        return false;
      })()
    `);
    assert(carrierLoginSubmit, "Carrier credentials entered and form submitted");

    // Wait for Carrier Dashboard
    await new Promise((r) => setTimeout(r, 3500));

    const carrierDashboardState = await cdp.eval(`
      (() => {
        const bodyText = document.body.innerText;
        const hasSeferMerkezi = bodyText.includes('SEFER MERKEZİ');
        const hasCanliSefer = bodyText.includes('canlı sefer merkezi');
        const hasUygunYukler = bodyText.includes('Uygun Yükler');
        const hasTekliflerim = bodyText.includes('Tekliflerim');
        const hasAktifTasimalar = bodyText.includes('Aktif Taşımalar');
        const hasSidebarLogo = Boolean(document.querySelector('aside img[src*="tork-logo"]'));
        const userBadge = bodyText.includes('Tork Demo Carrier');

        return {
          hasSeferMerkezi,
          hasCanliSefer,
          hasUygunYukler,
          hasTekliflerim,
          hasAktifTasimalar,
          hasSidebarLogo,
          userBadge,
          bodySnippet: bodyText.slice(0, 300)
        };
      })()
    `);

    assert(carrierDashboardState.hasSeferMerkezi, "Carrier sidebar displays 'SEFER MERKEZİ'");
    assert(carrierDashboardState.hasCanliSefer, "Carrier topbar displays 'canlı sefer merkezi'");
    assert(carrierDashboardState.hasUygunYukler, "Carrier navigation contains 'Uygun Yükler'");
    assert(carrierDashboardState.hasTekliflerim, "Carrier navigation contains 'Tekliflerim'");
    assert(carrierDashboardState.hasAktifTasimalar, "Carrier navigation contains 'Aktif Taşımalar'");
    assert(carrierDashboardState.hasSidebarLogo, "Sidebar renders TORK brand logo");

    const shotCarrier = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "demo-carrier-dashboard.png"), Buffer.from(shotCarrier.data, "base64"));
    console.log("  ✓ Saved demo-carrier-dashboard.png");

    // Test Carrier Logout
    console.log("\n[2.1] Testing Carrier Logout Flow...");
    const carrierLogout = await cdp.eval(`
      (() => {
        const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Çıkış Yap'));
        if (logoutBtn) {
          logoutBtn.click();
          return true;
        }
        return false;
      })()
    `);
    assert(carrierLogout, "Carrier clicked 'Çıkış Yap' button");
    await new Promise((r) => setTimeout(r, 2000));

    const loggedOutState2 = await cdp.eval(`
      (() => {
        const emailInput = document.querySelector('input[type="email"]');
        const submitBtn = document.querySelector('button[type="submit"]');
        const isAuthScreen = Boolean(emailInput && submitBtn && document.body.innerText.includes('Operasyon Merkezine Gir'));
        return isAuthScreen;
      })()
    `);
    assert(loggedOutState2, "Returned cleanly to Landing / Login screen after Carrier logout");

    cdp.close();
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log("\n==================================================");
  console.log(`DEMO ACCOUNTS E2E AUDIT: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runDemoE2E().catch((err) => {
  console.error("Demo E2E runner error:", err);
  process.exit(1);
});
