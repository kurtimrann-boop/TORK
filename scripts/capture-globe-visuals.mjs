import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9236;
const USER_DATA_DIR = "/tmp/tork-chrome-logo-globe-" + Date.now();
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

  async captureScreenshot(filename) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const filePath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`  📸 Saved screenshot: ${filename}`);
    return filePath;
  }
}

async function captureLogoGlobe() {
  console.log("==================================================");
  console.log("CAPTURING TORK LOGO + GLOBE DENSITY VISUALS");
  console.log("==================================================");

  const chromeProc = await startChrome();

  try {
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const pageTarget = await newTabRes.json();
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // Navigate to landing/auth page
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise(r => setTimeout(r, 2500));

    // 1. Desktop Screenshot (1440x900)
    await cdp.captureScreenshot("auth-logo-globe-desktop.png");

    // 2. Mobile Screenshot (390x844)
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 1500));
    await cdp.captureScreenshot("auth-logo-globe-mobile.png");

    // Verify logo and canvas
    const check = await cdp.eval(`
      (() => {
        const logoImgs = Array.from(document.querySelectorAll('img')).filter(i => i.src.includes('tork-logo.png'));
        const canvas = document.querySelector('canvas');
        return {
          logoCount: logoImgs.length,
          canvasExists: !!canvas,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()
    `);
    console.log("  Audit Status:", check);

  } finally {
    try {
      chromeProc.kill("SIGKILL");
    } catch (e) {}
  }
}

captureLogoGlobe();
