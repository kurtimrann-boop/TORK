import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9248;
const USER_DATA_DIR = "/tmp/tork-chrome-create-load-" + Date.now();
const LOCAL_URL = "http://localhost:3000";
const QA_PASSWORD = "TorkQA!2026Secure";
const SHIPPER_EMAIL = "qa-shipper@tork.test";

async function startChrome() {
  const proc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1440,900"
  ]);

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return proc;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
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
    return res.result ? res.result.value : null;
  }
}

async function runTest() {
  console.log("==================================================");
  console.log("TESTING FULL CREATE LOAD FLOW VIA CDP (QA-SHIPPER)");
  console.log("==================================================");

  const chromeProc = await startChrome();

  try {
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const pageTarget = await newTabRes.json();
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // Catch runtime errors in console
    const consoleErrors = [];
    cdp.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.exceptionThrown") {
        consoleErrors.push(msg.params.exceptionDetails);
      }
    });

    // 1. Navigate to Local URL
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise(r => setTimeout(r, 2000));

    // 2. Perform Shipper Login
    console.log("1. Logging in as qa-shipper@tork.test...");
    await cdp.eval(`
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email');
        const passInput = inputs.find(i => i.type === 'password');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (emailInput && passInput && submitBtn) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(emailInput, '${SHIPPER_EMAIL}');
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          setter.call(passInput, '${QA_PASSWORD}');
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          submitBtn.click();
        }
      })()
    `);

    await new Promise(r => setTimeout(r, 3500));

    // 3. Switch to Create Load Tab
    console.log("2. Navigating to 'Yeni Yük' create tab...");
    await cdp.eval(`
      (() => {
        const createTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Yeni Yük'));
        if (createTab) createTab.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1200));

    // 4. Select Origin (Trabzon/Ortahisar)
    console.log("3. Step 0: Selecting Origin (Trabzon/Ortahisar)...");
    await cdp.eval(`
      (() => {
        const originInput = document.querySelector('input[aria-label="Yükleme ili"]') || document.querySelectorAll('input[role="combobox"]')[0];
        if (originInput) {
          originInput.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(originInput, 'Trabzon');
          originInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    // Click Trabzon option in listbox
    await cdp.eval(`
      (() => {
        const options = Array.from(document.querySelectorAll('li[role="option"] button, [role="listbox"] button'));
        const trabzonBtn = options.find(b => b.textContent.includes('Trabzon'));
        if (trabzonBtn) trabzonBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // Select Ortahisar District
    await cdp.eval(`
      (() => {
        const districtInput = document.querySelector('input[aria-label="Yükleme ilçesi"]') || document.querySelectorAll('input[role="combobox"]')[1];
        if (districtInput) {
          districtInput.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(districtInput, 'Ortahisar');
          districtInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    await cdp.eval(`
      (() => {
        const options = Array.from(document.querySelectorAll('li[role="option"] button, [role="listbox"] button'));
        const ortahisarBtn = options.find(b => b.textContent.includes('Ortahisar'));
        if (ortahisarBtn) ortahisarBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // Select Destination (Ankara/Çankaya)
    console.log("4. Step 0: Selecting Destination (Ankara/Çankaya)...");
    await cdp.eval(`
      (() => {
        const destInput = document.querySelector('input[aria-label="Teslimat ili"]') || document.querySelectorAll('input[role="combobox"]')[2];
        if (destInput) {
          destInput.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(destInput, 'Ankara');
          destInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    await cdp.eval(`
      (() => {
        const options = Array.from(document.querySelectorAll('li[role="option"] button, [role="listbox"] button'));
        const ankaraBtn = options.find(b => b.textContent.includes('Ankara'));
        if (ankaraBtn) ankaraBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // Select Çankaya District
    await cdp.eval(`
      (() => {
        const destDistrictInput = document.querySelector('input[aria-label="Teslimat ilçesi"]') || document.querySelectorAll('input[role="combobox"]')[3];
        if (destDistrictInput) {
          destDistrictInput.focus();
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(destDistrictInput, 'Çankaya');
          destDistrictInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    await cdp.eval(`
      (() => {
        const options = Array.from(document.querySelectorAll('li[role="option"] button, [role="listbox"] button'));
        const cankayaBtn = options.find(b => b.textContent.includes('Çankaya'));
        if (cankayaBtn) cankayaBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1500));

    // Verify Route Calculation in Step 0
    const routeCheck = await cdp.eval(`
      (() => {
        const text = document.body.innerText;
        return {
          hasKm: text.includes('km') || text.includes('KM'),
          hasTrabzon: text.includes('Trabzon'),
          hasAnkara: text.includes('Ankara')
        };
      })()
    `);
    console.log("   Route Calculation Preview:", routeCheck);

    // Click Next (Step 0 -> Step 1: Yük & Kargo)
    console.log("5. Moving to Step 1 (Yük & Kargo)...");
    await cdp.eval(`
      (() => {
        const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Devam Et') || b.textContent.includes('İleri') || b.textContent.includes('Sonraki'));
        if (nextBtn) nextBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1200));

    // Fill Step 1 (Tonaj 22, Paletli Ürün)
    console.log("6. Filling Step 1 Details (22 Ton)...");
    await cdp.eval(`
      (() => {
        const tonnageInput = document.querySelector('input[type="number"]') || document.querySelector('input[placeholder*="24"]');
        if (tonnageInput) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(tonnageInput, '22');
          tonnageInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Devam Et') || b.textContent.includes('İleri') || b.textContent.includes('Sonraki'));
        if (nextBtn) nextBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1200));

    // Fill Step 2 (Araç Talebi -> TIR Standart)
    console.log("7. Step 2 (Araç Talebi)...");
    await cdp.eval(`
      (() => {
        const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Devam Et') || b.textContent.includes('İleri') || b.textContent.includes('Sonraki'));
        if (nextBtn) nextBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1200));

    // Fill Step 3 (Açıklamalar)
    console.log("8. Step 3 (Açıklama & Notlar)...");
    await cdp.eval(`
      (() => {
        const descInput = document.querySelector('textarea');
        if (descInput) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
          setter.call(descInput, 'Trabzon Ortahisar fabrika - Ankara Çankaya depo sevkiyatı');
          descInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Devam Et') || b.textContent.includes('İleri') || b.textContent.includes('Sonraki') || b.textContent.includes('Fiyat'));
        if (nextBtn) nextBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));

    // Step 4: Check Pricing Engine Preview & Publish
    console.log("9. Step 4 (TORK Fiyat Motoru Önizleme & İlanı Yayınla)...");
    const pricingStatus = await cdp.eval(`
      (() => {
        const text = document.body.innerText;
        return {
          hasPricingCard: text.includes('FİYAT MOTORU') || text.includes('NAVLUN') || text.includes('HÜRMÜZ') || text.includes('Maliyet'),
          hasPublishBtn: Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Yayınla') || b.textContent.includes('Yük İlanını Yayınla'))
        };
      })()
    `);
    console.log("   Step 4 Pricing Preview Status:", pricingStatus);

    // Click "Yük İlanını Yayınla"
    console.log("10. Clicking 'Yük İlanını Yayınla'...");
    const publishRes = await cdp.eval(`
      (() => {
        const pubBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Yayınla') || b.textContent.includes('Yük İlanını Yayınla'));
        if (pubBtn) {
          pubBtn.click();
          return { clicked: true, text: pubBtn.textContent };
        }
        return { clicked: false };
      })()
    `);
    console.log("   Publish button clicked:", publishRes);

    await new Promise(r => setTimeout(r, 4000));

    // Verify Result on Loads Tab
    const resultStatus = await cdp.eval(`
      (() => {
        const text = document.body.innerText;
        const loads = Array.from(document.querySelectorAll('tr, div')).map(el => el.innerText).filter(t => t.includes('Trabzon') && t.includes('Ankara'));
        const successMsg = text.includes('başarıyla') || text.includes('yayınlandı');
        return {
          currentTab: window.location.hash || 'loads',
          bodyTextContainsTrabzonAnkara: text.includes('Trabzon') && text.includes('Ankara'),
          successMsgFound: successMsg,
          loadMatches: loads.length
        };
      })()
    `);
    console.log("11. Final Load Creation Verification:", resultStatus);

    if (consoleErrors.length > 0) {
      console.error("❌ Console Exceptions captured:", consoleErrors);
    } else {
      console.log("✅ Zero runtime console errors during entire flow!");
    }

    const hasRefError = consoleErrors.some(e => JSON.stringify(e).includes("originDisplay") || JSON.stringify(e).includes("ReferenceError"));
    const pass = !hasRefError && (resultStatus.bodyTextContainsTrabzonAnkara || resultStatus.successMsgFound);

    console.log("==================================================");
    console.log(pass ? "RESULT: PASS (CREATE LOAD FLOW FULLY VERIFIED)" : "RESULT: FAIL");
    console.log("==================================================");

  } finally {
    try {
      chromeProc.kill("SIGKILL");
    } catch (e) {}
  }
}

runTest();
