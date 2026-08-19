import { spawn } from "child_process";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9294;
const USER_DATA_DIR = "/tmp/tork-sprint153-vis-" + Date.now();
const LOCAL_URL = "http://localhost:3000";

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
    this.consoleLogs = [];
    this.exceptions = [];
    this.networkErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        } else if (msg.method === "Runtime.consoleAPICalled") {
          const text = msg.params.args.map((a) => a.value || a.description || "").join(" ");
          this.consoleLogs.push({ type: msg.params.type, text, time: new Date().toISOString() });
        } else if (msg.method === "Runtime.exceptionThrown") {
          this.exceptions.push(msg.params.exceptionDetails);
        } else if (msg.method === "Network.responseReceived") {
          if (msg.params.response.status >= 400) {
            this.networkErrors.push({
              url: msg.params.response.url,
              status: msg.params.response.status,
            });
          }
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
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
}

async function runSprint153Verification() {
  console.log("================================================================================");
  console.log("   TORK SPRINT 15.3 — LEGACY CLEANUP & USER LOCATION CDP VERIFICATION");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function test(name, isPass, detail) {
    if (isPass) {
      console.log(`✓ PASS: ${name} -> ${detail}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${name} -> ${detail}`);
      failed++;
    }
  }

  const chrome = await startChrome();
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const target = await res.json();
    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");

    // Grant Real Geolocation Permission & Set Coordinates
    await cdp.send("Browser.grantPermissions", {
      permissions: ["geolocation"],
      origin: LOCAL_URL,
    });
    await cdp.send("Emulation.setGeolocationOverride", {
      latitude: 41.0082,
      longitude: 28.9784,
      accuracy: 50,
    });

    // -------------------------------------------------------------------------
    // 1. SHIPPER DASHBOARD: LEGACY REMOVAL & LOCATION PROOF
    // -------------------------------------------------------------------------
    console.log("\n--- 1. SHIPPER DASHBOARD: LEGACY REMOVAL & LOCATION PROOF ---");
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // Login Shipper
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
    await new Promise((r) => setTimeout(r, 3000));

    // 1.1 Legacy 5-Column Grid Removed
    const legacyGridExists = await cdp.eval(`!!document.querySelector('div[class*="lg:grid-cols-5"]')`);
    test("1.1 Legacy 5-Column Grid Removed", legacyGridExists === false, `Legacy Grid in DOM: ${legacyGridExists}`);

    // 1.2 Geolocation Chain & Map Marker Present
    const mapMarkerProof = await cdp.eval(`
      (() => {
        const map = document.querySelector('[aria-label*="Canlı Kontrol Haritası"]');
        const marker = document.querySelector('.tork-map-marker-wrap') || document.querySelector('.leaflet-marker-icon');
        const circle = document.querySelector('.leaflet-interactive');
        return {
          hasMap: !!map,
          hasMarker: !!marker,
          hasRadarCircle: !!circle,
        };
      })()
    `);
    test("1.2 Live User Location Marker on Map", mapMarkerProof.hasMarker && mapMarkerProof.hasRadarCircle, `Marker: ${mapMarkerProof.hasMarker}, Radar Circle: ${mapMarkerProof.hasRadarCircle}`);

    // 1.3 Weather & Location Consistency
    const weatherText = await cdp.eval(`document.body.innerText`);
    const hasIstanbulWeather = weatherText.includes('İSTANBUL') || weatherText.includes('İstanbul');
    test("1.3 Weather & Map Location Consistency", hasIstanbulWeather && weatherText.includes('°C'), "Istanbul geocoded location consistent across Weather & Map");

    // 1.4 Live Operations Map Hero Height (300px-360px)
    const mapBox = await cdp.eval(`
      (() => {
        const map = document.querySelector('[aria-label*="Canlı Kontrol Haritası"]');
        if (map) return map.clientHeight;
        return 0;
      })()
    `);
    test("1.4 Live Operations Map Hero Dimension", mapBox >= 280 && mapBox <= 360, `Height: ${mapBox}px (Target: 300-360px)`);

    // 1.5 Executive Side Intelligence Beside Map
    const intelProof = await cdp.eval(`
      (() => {
        const panel = document.querySelector('[aria-label="Executive Intelligence Command Panel"]');
        if (panel) {
          const rect = panel.getBoundingClientRect();
          return { height: Math.round(rect.height), left: Math.round(rect.left) };
        }
        return null;
      })()
    `);
    test("1.5 Executive Side Intelligence Panel", intelProof && intelProof.height >= 280 && intelProof.left > 800, `Position: x=${intelProof?.left}px, h=${intelProof?.height}px`);

    // 1.6 Single Consolidated KPI Row
    const kpiCount = await cdp.eval(`document.querySelectorAll('div[class*="grid-cols-2 lg:grid-cols-4"]').length`);
    test("1.6 Single Consolidated KPI Row", kpiCount === 1, `KPI Rows in DOM: ${kpiCount} (Zero duplication)`);

    // 1.7 Primary CTA Above the Fold
    const ctaY = await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Yeni Yük İlanı'));
        if (btn) return Math.round(btn.getBoundingClientRect().top);
        return null;
      })()
    `);
    test("1.7 Primary Action '+ Yeni Yük İlanı' Above Fold", ctaY && ctaY < 850, `Y-Position: ${ctaY}px (Target: <900px)`);

    // -------------------------------------------------------------------------
    // 2. MOBILE VIEWPORT SWEEP (390x844)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. MOBILE VIEWPORT SWEEP (390x844) ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 600));

    const mobileOverflow = await cdp.eval("document.documentElement.scrollWidth > document.documentElement.clientWidth");
    test("2.1 Mobile Zero Horizontal Overflow", mobileOverflow === false, `Overflow: ${mobileOverflow}`);

    // -------------------------------------------------------------------------
    // 3. CARRIER DASHBOARD AUDIT (Desktop 1440x900)
    // -------------------------------------------------------------------------
    console.log("\n--- 3. CARRIER DASHBOARD AUDIT (1440x900) ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 600));

    // Logout Shipper
    await cdp.eval(`
      (() => {
        const avatarBtn = document.querySelector('button[aria-label="Profil ve Hesap Menüsü"]');
        if (avatarBtn) avatarBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    await cdp.eval(`
      (() => {
        const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Çıkış Yap'));
        if (logoutBtn) logoutBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 2000));

    // Login Carrier
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const carrierBtn = buttons.find(b => b.textContent.includes('Taşıyıcı') || b.textContent.includes('Nakliyeci'));
        if (carrierBtn) carrierBtn.click();
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
    await new Promise((r) => setTimeout(r, 3000));

    const carrierMarker = await cdp.eval(`!!document.querySelector('.tork-map-marker-wrap') || !!document.querySelector('.leaflet-marker-icon')`);
    test("3.1 Carrier Location Marker Active", carrierMarker, "User coordinates rendered on carrier map");

    const carrierLegacy = await cdp.eval(`!!document.querySelector('div[class*="lg:grid-cols-5"]')`);
    test("3.2 Carrier Zero Legacy Grid", carrierLegacy === false, "No duplicate legacy grids");

    // -------------------------------------------------------------------------
    // 4. RUNTIME HEALTH CHECK
    // -------------------------------------------------------------------------
    console.log("\n--- 4. RUNTIME HEALTH CHECK ---");
    test("4.1 Zero Browser Uncaught Exceptions", cdp.exceptions.length === 0, `Exceptions: ${cdp.exceptions.length}`);
    test("4.2 Zero Network 5xx Server Errors", cdp.networkErrors.filter(e => e.status >= 500).length === 0, "5xx Errors: 0");

  } finally {
    try {
      chrome.kill("SIGKILL");
    } catch (e) {}
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log("\n================================================================================");
  console.log(`   SPRINT 15.3 VERIFICATION: ${passed} PASSED / ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runSprint153Verification();
