import { spawn } from "child_process";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9294;
const USER_DATA_DIR = "/tmp/tork-diag-" + Date.now();
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
    this.networkRequests = [];
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
          this.consoleLogs.push({ type: msg.params.type, text });
        } else if (msg.method === "Runtime.exceptionThrown") {
          this.exceptions.push(msg.params.exceptionDetails);
        } else if (msg.method === "Network.requestWillBeSent") {
          this.networkRequests.push(msg.params.request.url);
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

async function runDiagnostics() {
  console.log("================================================================================");
  console.log("   TORK SPRINT 15.2 — COMPREHENSIVE LIVE UI & GEOLOCATION DIAGNOSTIC");
  console.log("================================================================================");

  const chrome = await startChrome();
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const target = await res.json();
    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");

    // Grant Geolocation Permission in CDP session
    await cdp.send("Browser.grantPermissions", {
      permissions: ["geolocation"],
      origin: LOCAL_URL,
    });
    await cdp.send("Emulation.setGeolocationOverride", {
      latitude: 41.0082,
      longitude: 28.9784,
      accuracy: 100,
    });

    console.log("\n--- 1. SHIPPER DASHBOARD LIVE RENDERING PROOF ---");
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

    // Inspect Elements in DOM
    const domProof = await cdp.eval(`
      (() => {
        const bodyText = document.body.innerText;
        const telemetry = document.querySelector('div[class*="border-y border-[#374151]"]');
        const intel = document.querySelector('[aria-label="Executive Intelligence Command Panel"]');
        const map = document.querySelector('[aria-label*="Canlı Kontrol Haritası"]');
        const kpiRow = document.querySelector('div[class*="grid-cols-2 lg:grid-cols-4"]');
        const primaryCta = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Yeni Yük İlanı'));
        const oldGrid = document.querySelector('div[class*="lg:grid-cols-5"]');

        const getBox = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
        };

        return {
          telemetryFound: !!telemetry,
          telemetryBox: getBox(telemetry),
          intelFound: !!intel,
          intelBox: getBox(intel),
          mapFound: !!map,
          mapBox: getBox(map),
          kpiFound: !!kpiRow,
          kpiBox: getBox(kpiRow),
          ctaFound: !!primaryCta,
          ctaBox: getBox(primaryCta),
          oldGridFound: !!oldGrid,
          oldGridBox: getBox(oldGrid),
          hasWeatherText: bodyText.includes('°C'),
          hasFuelText: bodyText.includes('MOTORİN') || bodyText.includes('Motorin'),
          hasSystemStatus: bodyText.includes('SİSTEM NORMAL'),
        };
      })()
    `);

    console.log("DOM Proof Results (Shipper):", JSON.stringify(domProof, null, 2));

    // Geolocation Chain Diagnosis
    console.log("\n--- 2. GEOLOCATION CHAIN TRACE ---");
    const geoDiag = await cdp.eval(`
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({ supported: false, error: 'navigator.geolocation unavailable' });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // Check if Leaflet map has marker
            const mapEl = document.querySelector('[aria-label*="Canlı Kontrol Haritası"]');
            const leafletMarkers = document.querySelectorAll('.leaflet-marker-icon');
            const radarCircle = document.querySelectorAll('.leaflet-interactive');

            resolve({
              supported: true,
              coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
              accuracy: pos.coords.accuracy,
              leafletMarkersCount: leafletMarkers.length,
              radarCirclesCount: radarCircle.length,
            });
          },
          (err) => {
            resolve({ supported: true, error: err.message, code: err.code });
          },
          { timeout: 5000 }
        );
      })
    `);

    console.log("Geolocation Diagnostic Results:", JSON.stringify(geoDiag, null, 2));

    // Check Carrier Dashboard Geometry
    console.log("\n--- 3. CARRIER DASHBOARD LIVE GEOMETRY ---");
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise((r) => setTimeout(r, 2000));

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

    const carrierDomProof = await cdp.eval(`
      (() => {
        const intel = document.querySelector('[aria-label="Executive Intelligence Command Panel"]');
        const map = document.querySelector('[aria-label*="Canlı Kontrol Haritası"]');
        const primaryCta = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Açık Yükleri Gör') || b.textContent.includes('Uygun Yükler'));
        const oldGrid = document.querySelector('div[class*="lg:grid-cols-5"]');

        const getBox = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
        };

        return {
          intelFound: !!intel,
          intelBox: getBox(intel),
          mapFound: !!map,
          mapBox: getBox(map),
          ctaFound: !!primaryCta,
          ctaBox: getBox(primaryCta),
          oldGridFound: !!oldGrid,
          oldGridBox: getBox(oldGrid),
        };
      })()
    `);

    console.log("DOM Proof Results (Carrier):", JSON.stringify(carrierDomProof, null, 2));

  } finally {
    try {
      chrome.kill("SIGKILL");
    } catch (e) {}
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }
}

runDiagnostics();
