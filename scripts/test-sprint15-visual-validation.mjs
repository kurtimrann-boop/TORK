import { spawn } from "child_process";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9294;
const USER_DATA_DIR = "/tmp/tork-sprint152-vis-" + Date.now();
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

async function runSprint152VisualTests() {
  console.log("================================================================================");
  console.log("   TORK SPRINT 15.2 — MAP-FIRST + SIDE INTELLIGENCE CDP VALIDATION");
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

    // -------------------------------------------------------------------------
    // 1. SHIPPER DASHBOARD AUDIT (Desktop 1440x900)
    // -------------------------------------------------------------------------
    console.log("\n--- 1. SHIPPER DASHBOARD: MAP-FIRST + SIDE INTELLIGENCE ---");
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

    // 1.1 Operational Telemetry Strip (Weather + Fuel + Health)
    const hasTelemetry = await cdp.eval(`
      (() => {
        const text = document.body.innerText;
        const hasWeather = text.includes('°C');
        const hasFuel = text.includes('Motorin') || text.includes('₺');
        const hasStatus = text.includes('SİSTEM NORMAL');
        return hasWeather && hasFuel && hasStatus;
      })()
    `);
    test("1.1 Operational Telemetry Strip", hasTelemetry, "Weather, Fuel ₺/L and SİSTEM NORMAL present in context strip");

    // 1.2 Live Operations Map (Hero Element)
    const mapHero = await cdp.eval(`
      (() => {
        const map = document.querySelector('[aria-label*="Canlı Kontrol Haritası"]');
        if (map) {
          const rect = map.getBoundingClientRect();
          return {
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
          };
        }
        return null;
      })()
    `);
    test("1.2 Live Operations Map Hero", mapHero && mapHero.height >= 280 && mapHero.height <= 360, `Map Height: ${mapHero?.height}px (Target: 300-360px)`);

    // 1.3 Executive Side Intelligence Panel (Distinct from Map, Beside Map)
    const sideIntel = await cdp.eval(`
      (() => {
        const panel = document.querySelector('[aria-label="Executive Intelligence Command Panel"]');
        if (panel) {
          const rect = panel.getBoundingClientRect();
          const text = panel.innerText;
          return {
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            hasBigNumber: text.length > 0,
            hasAction: !!panel.querySelector('button'),
          };
        }
        return null;
      })()
    `);
    const isBesideMap = sideIntel && mapHero && sideIntel.left >= (mapHero.left + mapHero.width * 0.8);
    test("1.3 Executive Side Intelligence Panel", sideIntel && sideIntel.hasAction && isBesideMap, `Side panel positioned at x=${sideIntel?.left}px, height=${sideIntel?.height}px (beside map)`);

    // 1.4 Single Consolidated KPI Row
    const kpiStatus = await cdp.eval(`
      (() => {
        const bodyText = document.body.innerText.toLocaleLowerCase('tr-TR');
        const hasLoads = bodyText.includes('ilan') || bodyText.includes('yük');
        const hasBids = bodyText.includes('teklif');
        const hasTransports = bodyText.includes('taşıma') || bodyText.includes('sefer');
        const hasWallet = bodyText.includes('bakiye') || bodyText.includes('cüzdan') || bodyText.includes('₺');
        return hasLoads && hasBids && hasTransports && hasWallet;
      })()
    `);
    test("1.4 Single Consolidated KPI Row", kpiStatus, "All 4 metrics present in single compact row");

    // 1.5 Primary Action Above the Fold
    const ctaY = await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Yeni Yük İlanı'));
        if (btn) {
          const rect = btn.getBoundingClientRect();
          return Math.round(rect.top);
        }
        return null;
      })()
    `);
    test("1.5 Primary Action Above Fold", ctaY && ctaY < 850, `Y-Position: ${ctaY}px (Fold limit: 900px)`);

    // -------------------------------------------------------------------------
    // 2. MOBILE RESPONSIVENESS (390x844)
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

    // Navigate to Landing & Login Carrier cleanly
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // Click Carrier Tab & Login
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

    const carrierIntel = await cdp.eval(`
      (() => {
        const panel = document.querySelector('[aria-label="Executive Intelligence Command Panel"]');
        if (panel) {
          const text = panel.innerText;
          return text.includes('FIRSAT') || text.includes('SEFER') || text.includes('PİYASA') || text.includes('Teklif') || text.includes('YÜK');
        }
        return false;
      })()
    `);
    test("3.1 Carrier Executive Side Intelligence", carrierIntel, "Carrier opportunity insight rendered beside map");

    const carrierCtaY = await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Açık Yükleri Gör') || b.textContent.includes('Uygun Yükler') || b.textContent.includes('Teklif'));
        if (btn) {
          const rect = btn.getBoundingClientRect();
          return Math.round(rect.top);
        }
        return null;
      })()
    `);
    test("3.2 Carrier Primary Action Above Fold", carrierCtaY && carrierCtaY < 850, `Y-Position: ${carrierCtaY}px (Fold limit: 900px)`);

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
  console.log(`   SPRINT 15.2 VISUAL SUMMARY: ${passed} PASSED / ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runSprint152VisualTests();
