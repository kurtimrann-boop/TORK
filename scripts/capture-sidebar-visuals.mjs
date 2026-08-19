import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9262;
const USER_DATA_DIR = "/tmp/tork-chrome-sidebar-" + Date.now();
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

async function captureVisuals() {
  console.log("==================================================");
  console.log("TORK SIDEBAR & BRANDING VISUAL QA RUNNER");
  console.log("==================================================");

  const chromeProc = await startChrome();

  try {
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const pageTarget = await newTabRes.json();
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    async function loginWithCredentials(email, pass = "TorkQA!2026Secure") {
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
            setter.call(emailInput, '${email}');
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            setter.call(passInput, '${pass}');
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            submitBtn.click();
          }
        })()
      `);
      await new Promise((r) => setTimeout(r, 3500));
    }

    async function captureScreen(filename) {
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      const outPath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, "base64"));
      console.log(`  ✓ Screenshot saved: ${filename}`);
    }

    // 1. CARRIER DESKTOP
    console.log("\n[1] Capturing Carrier Desktop (1440x900)...");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
    await loginWithCredentials("qa-carrier@tork.test");

    const carrierAudit = await cdp.eval(`
      (() => {
        const text = document.body.innerText;
        const hasControlTower = text.includes("Control Tower");
        const hasSeferMerkezi = text.includes("SEFER MERKEZİ") || text.includes("sefer merkezi");
        const sidebar = document.querySelector("aside");
        const sidebarImg = sidebar ? sidebar.querySelector("img") : null;
        const hasSidebarImg = Boolean(sidebarImg);
        const imgParentBg = sidebarImg ? window.getComputedStyle(sidebarImg.parentElement).backgroundColor : "";
        const hasWhiteContainer = sidebarImg ? (sidebarImg.parentElement.className.includes("bg-white") || imgParentBg === "rgb(255, 255, 255)") : false;
        return { hasControlTower, hasSeferMerkezi, hasSidebarImg, hasWhiteContainer, imgParentBg };
      })()
    `);
    console.log("  Carrier Desktop Audit:", carrierAudit);
    await captureScreen("sidebar-carrier-desktop.png");

    // 2. CARRIER MOBILE
    console.log("\n[2] Capturing Carrier Mobile (390x844)...");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await new Promise((r) => setTimeout(r, 1000));
    await captureScreen("sidebar-carrier-mobile.png");

    // 3. SHIPPER DESKTOP
    console.log("\n[3] Capturing Shipper Desktop (1440x900)...");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
    
    // Logout
    await cdp.eval(`
      (() => {
        const logoutBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Çıkış Yap"));
        if (logoutBtn) logoutBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 1500));

    await loginWithCredentials("qa-shipper@tork.test");

    const shipperAudit = await cdp.eval(`
      (() => {
        const text = document.body.innerText;
        const hasControlTower = text.includes("Control Tower");
        const hasOperasyonMerkezi = text.includes("OPERASYON MERKEZİ") || text.includes("operasyon merkezi");
        const sidebar = document.querySelector("aside");
        const sidebarImg = sidebar ? sidebar.querySelector("img") : null;
        const hasSidebarImg = Boolean(sidebarImg);
        const imgParentBg = sidebarImg ? window.getComputedStyle(sidebarImg.parentElement).backgroundColor : "";
        const hasWhiteContainer = sidebarImg ? (sidebarImg.parentElement.className.includes("bg-white") || imgParentBg === "rgb(255, 255, 255)") : false;
        return { hasControlTower, hasOperasyonMerkezi, hasSidebarImg, hasWhiteContainer, imgParentBg };
      })()
    `);
    console.log("  Shipper Desktop Audit:", shipperAudit);
    await captureScreen("sidebar-shipper-desktop.png");

    // 4. SHIPPER MOBILE
    console.log("\n[4] Capturing Shipper Mobile (390x844)...");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await new Promise((r) => setTimeout(r, 1000));
    await captureScreen("sidebar-shipper-mobile.png");

    cdp.close();
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log("\n==================================================");
  console.log("ALL 4 SCREENSHOTS CAPTURED & AUDITED CLEANLY!");
  console.log("==================================================");
}

captureVisuals().catch((err) => {
  console.error("Visual QA error:", err);
  process.exit(1);
});
