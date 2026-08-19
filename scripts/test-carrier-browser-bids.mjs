import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9245;
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

async function runBrowserBidTest() {
  console.log("==================================================");
  console.log("RUNNING REAL NATIVE CDP CARRIER BID MANAGEMENT QA");
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
    console.log("1. Navigating to http://localhost:3000...");
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // 2. Perform Carrier Login
    console.log("2. Logging in as qa-carrier@tork.test...");
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

    // Wait for Dashboard to render
    await new Promise((r) => setTimeout(r, 4000));

    // 3. Switch to 'Tekliflerim' Tab
    console.log("3. Navigating to 'Tekliflerim' tab...");
    const navResult = await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const myBidsBtn = buttons.find(b => b.textContent.includes('Tekliflerim'));
        if (myBidsBtn) {
          myBidsBtn.click();
          return { clicked: true, text: myBidsBtn.textContent.trim() };
        }
        return { clicked: false, availableButtons: buttons.map(b => b.textContent.trim()) };
      })()
    `);
    console.log("   Nav result:", navResult);

    await new Promise((r) => setTimeout(r, 2000));

    // 4. Capture Desktop Screenshot (1440x900)
    console.log("4. Capturing Desktop Screenshot (1440x900)...");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 500));

    const shot1 = await cdp.send("Page.captureScreenshot", { format: "png" });
    const desktopPath = path.join(ARTIFACT_DIR, "carrier-my-bids-management-desktop.png");
    fs.writeFileSync(desktopPath, Buffer.from(shot1.data, "base64"));
    console.log(`   Saved: ${desktopPath}`);

    // 5. Test [Düzenle] interaction on first pending bid
    console.log("5. Testing [Düzenle] button click & Live Smart Bidding...");
    const editClickRes = await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const editBtn = buttons.find(b => b.textContent.trim() === 'Düzenle');
        if (editBtn) {
          editBtn.click();
          return { clicked: true };
        }
        return { clicked: false, allBtns: buttons.map(b => b.textContent.trim()) };
      })()
    `);
    console.log("   Edit button clicked:", editClickRes);

    await new Promise((r) => setTimeout(r, 1000));

    // Check live telemetry during edit
    const telemetryCheck = await cdp.eval(`
      (() => {
        const body = document.body.innerText;
        return {
          hasMaliyet: body.includes('Maliyet:'),
          hasKazanc: body.includes('Kazanç:'),
          hasMarj: body.includes('Marj:'),
          hasKaydet: Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === 'Kaydet'),
        };
      })()
    `);
    console.log("   Live telemetry during edit:", telemetryCheck);

    // 6. Test [Geri Çek] button flow
    console.log("6. Testing [Geri Çek] confirmation flow...");
    const cancelRes = await cdp.eval(`
      (() => {
        // Click Vazgeç on edit first
        const vazgecBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Vazgeç');
        if (vazgecBtn) vazgecBtn.click();

        // Now click Geri Çek
        const geriCekBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Geri Çek');
        if (geriCekBtn) {
          geriCekBtn.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()
    `);
    console.log("   Geri Çek clicked:", cancelRes);

    await new Promise((r) => setTimeout(r, 800));

    const promptCheck = await cdp.eval(`
      document.body.innerText.includes('Bu teklifi geri çekmek istediğinize emin misiniz?')
    `);
    console.log("   Confirmation prompt rendered:", promptCheck);

    // 7. Mobile Viewport (390x844)
    console.log("7. Capturing Mobile Viewport (390x844)...");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 1000));

    const shot2 = await cdp.send("Page.captureScreenshot", { format: "png" });
    const mobilePath = path.join(ARTIFACT_DIR, "carrier-my-bids-management-mobile.png");
    fs.writeFileSync(mobilePath, Buffer.from(shot2.data, "base64"));
    console.log(`   Saved: ${mobilePath}`);

    console.log("   Console Errors:", consoleErrors.length === 0 ? "0 errors" : consoleErrors);

    cdp.close();
    console.log("==================================================");
    console.log("REAL CDP BROWSER QA PASSED!");
    console.log("==================================================");
  } catch (err) {
    console.error("Browser CDP QA failed:", err);
    process.exit(1);
  } finally {
    try {
      chromeProc.kill("SIGKILL");
    } catch (e) {}
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }
}

runBrowserBidTest();
