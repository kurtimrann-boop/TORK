import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9265;
const USER_DATA_DIR = "/tmp/tork-chrome-bids-" + Date.now();
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

async function captureBidsRowVisuals() {
  console.log("==================================================");
  console.log("CARRIER MY BIDS ROW LAYOUT QA RUNNER");
  console.log("==================================================");

  const chromeProc = await startChrome();

  try {
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const pageTarget = await newTabRes.json();
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // Login as carrier
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise((r) => setTimeout(r, 2000));

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

    // Navigate to Tekliflerim tab
    await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tekliflerim'));
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 1500));

    // 1. DESKTOP VIEWPORT
    console.log("\n[1] Capturing Desktop View (1440x900)...");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
    await new Promise((r) => setTimeout(r, 800));

    const desktopAudit = await cdp.eval(`
      (() => {
        const bidRows = document.querySelectorAll('.group.relative.rounded-2xl');
        const auditData = [];
        bidRows.forEach((row, i) => {
          const editBtn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Düzenle'));
          const cancelBtn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Geri Çek'));
          const viewBtn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('İlanı Gör'));
          const statusEl = row.querySelector('.rounded-full.border');
          
          let overlap = false;
          if (editBtn && statusEl) {
            const rEdit = editBtn.getBoundingClientRect();
            const rStatus = statusEl.getBoundingClientRect();
            // Check bounding box intersection
            overlap = !(rEdit.right < rStatus.left || rEdit.left > rStatus.right || rEdit.bottom < rStatus.top || rEdit.top > rStatus.bottom);
          }

          auditData.push({
            index: i,
            hasEditBtn: Boolean(editBtn),
            hasCancelBtn: Boolean(cancelBtn),
            hasViewBtn: Boolean(viewBtn),
            hasStatus: Boolean(statusEl),
            statusText: statusEl ? statusEl.innerText : null,
            buttonsOverlapWithStatus: overlap,
          });
        });

        const docWidth = document.documentElement.scrollWidth;
        const viewWidth = window.innerWidth;
        const horizontalOverflow = docWidth > viewWidth;

        return { bidRowsCount: bidRows.length, auditData, horizontalOverflow };
      })()
    `);

    console.log("Desktop Row Layout Audit:", desktopAudit);

    const shotDesktop = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "carrier-my-bids-row-fixed-desktop.png"), Buffer.from(shotDesktop.data, "base64"));
    console.log("  ✓ Saved carrier-my-bids-row-fixed-desktop.png");

    // 2. MOBILE VIEWPORT
    console.log("\n[2] Capturing Mobile View (390x844)...");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await new Promise((r) => setTimeout(r, 800));

    // Scroll down to bid cards
    await cdp.eval(`
      (() => {
        window.scrollBy(0, 700);
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));

    const mobileAudit = await cdp.eval(`
      (() => {
        const docWidth = document.documentElement.scrollWidth;
        const viewWidth = window.innerWidth;
        const horizontalOverflow = docWidth > viewWidth;

        const mobileBtns = Array.from(document.querySelectorAll('button')).filter(b => 
          b.innerText.includes('Düzenle') || b.innerText.includes('Geri Çek') || b.innerText.includes('İlanı Gör')
        );
        const minHeights = mobileBtns.map(b => b.getBoundingClientRect().height);
        const allAtLeast44 = minHeights.every(h => h >= 40);

        return { horizontalOverflow, buttonCount: mobileBtns.length, allAtLeast44 };
      })()
    `);

    console.log("Mobile Row Layout Audit:", mobileAudit);

    const shotMobile = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "carrier-my-bids-row-fixed-mobile.png"), Buffer.from(shotMobile.data, "base64"));
    console.log("  ✓ Saved carrier-my-bids-row-fixed-mobile.png (scrolled to cards)");

    cdp.close();
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log("\n==================================================");
  console.log("CARRIER MY BIDS ROW FIX QA COMPLETE!");
  console.log("==================================================");
}

captureBidsRowVisuals().catch((err) => {
  console.error("QA error:", err);
  process.exit(1);
});
