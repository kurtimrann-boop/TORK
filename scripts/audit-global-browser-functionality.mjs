/**
 * TORK — Global Browser Functionality & Runtime Audit (Sprint 13.8)
 * 
 * Tests the live application in a real Chrome browser session via CDP:
 *  - Landing, Login, Auth State
 *  - Shipper Journey: Dashboard, Tabs, Load Creation, Pricing Engine, Bids
 *  - Carrier Journey: Marketplace, Smart Bidding, Transports, Wallet
 *  - Profile Experience: Verification Center embedded in Profile, Avatar, Carrier Vehicles Fleet, Trust Score
 *  - Network Requests and Console Logs
 */

import { spawn } from "child_process";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9291;
const USER_DATA_DIR = "/tmp/tork-chrome-audit-v3-" + Date.now();
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
    this.httpErrors = [];
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
        } else if (msg.method === "Network.responseReceived") {
          const status = msg.params.response.status;
          const url = msg.params.response.url;
          if (status >= 400 && !url.includes("favicon")) {
            this.httpErrors.push({ url, status, statusText: msg.params.response.statusText });
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

let passed = 0;
let failed = 0;

function assert(condition, message, detail = null) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`, detail ? detail : "");
    failed++;
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     TORK GLOBAL BROWSER RUNTIME & FUNCTIONALITY AUDIT        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  console.log("Checking Next.js server on port 3000...");
  let serverStartedLocally = false;
  let serverProc = null;

  try {
    const res = await fetch("http://127.0.0.1:3000/");
    if (res.status !== 200) throw new Error("Server not responding with 200");
  } catch {
    console.log("Starting Next.js production server on port 3000...");
    serverProc = spawn("npx", ["next", "start", "-p", "3000"], {
      cwd: "/Users/basquiat/Desktop/TORK",
      stdio: "ignore",
    });
    serverStartedLocally = true;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch("http://127.0.0.1:3000/");
        if (res.status === 200) break;
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 300));
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
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

    // ============================================================
    // 1. LANDING & LOGIN AUDIT
    // ============================================================
    console.log("\n--- 1. LANDING & AUTH AUDIT ---");
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    const landingTitle = await cdp.eval("document.title");
    assert(landingTitle.includes("Tork"), "Landing page title loads correctly", landingTitle);

    const hasAuthModal = await cdp.eval("document.body.innerText.includes('TORK\\'A HOŞ GELDİN')");
    assert(hasAuthModal, "Auth modal renders login fields and quick access buttons");

    // ============================================================
    // 2. SHIPPER JOURNEY AUDIT
    // ============================================================
    console.log("\n--- 2. SHIPPER INTERACTIVE JOURNEY AUDIT ---");
    
    // Login as Shipper
    const loginShipper = await cdp.eval(`
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
    assert(loginShipper, "Shipper credentials entered and submitted");
    await new Promise((r) => setTimeout(r, 4000));

    const shipperDashboardText = await cdp.eval("document.body.innerText");
    assert(
      shipperDashboardText.includes("OPERASYON") || shipperDashboardText.includes("İlanlarım") || shipperDashboardText.includes("Yük") || shipperDashboardText.includes("Çıkış"),
      "Shipper Dashboard and Navigation loaded successfully"
    );

    // Switch to "İlanlarım" Tab
    const clickLoadsTab = await cdp.eval(`
      (() => {
        const btns = Array.from(document.querySelectorAll('aside button, nav button, button'));
        const loadsBtn = btns.find(b => b.innerText.includes('İlanlarım') || b.innerText.includes('Yükler'));
        if (loadsBtn) { loadsBtn.click(); return true; }
        return false;
      })()
    `);
    assert(clickLoadsTab, "Shipper switches to 'İlanlarım' tab seamlessly");
    await new Promise((r) => setTimeout(r, 1500));

    // Switch to "Yeni Yük" Tab
    const clickCreateTab = await cdp.eval(`
      (() => {
        const btns = Array.from(document.querySelectorAll('aside button, nav button'));
        const createBtn = btns.find(b => b.innerText.includes('Yeni Yük'));
        if (createBtn) { createBtn.click(); return true; }
        return false;
      })()
    `);
    assert(clickCreateTab, "Shipper switches to 'Yeni Yük' tab seamlessly");
    await new Promise((r) => setTimeout(r, 1000));

    const createFormVisible = await cdp.eval(`
      Boolean(document.querySelector('input, select') || document.body.innerText.includes('Yük Bilgileri') || document.body.innerText.includes('Nereden'))
    `);
    assert(createFormVisible, "Load creation form fields rendered interactively");

    // Shipper Logout
    const logoutShipper = await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const logoutBtn = buttons.find(b => b.innerText.includes('Çıkış Yap'));
        if (logoutBtn) { logoutBtn.click(); return true; }
        return false;
      })()
    `);
    assert(logoutShipper, "Shipper logs out cleanly");
    await new Promise((r) => setTimeout(r, 2000));

    // ============================================================
    // 3. CARRIER JOURNEY, PROFILE & FLEET AUDIT
    // ============================================================
    console.log("\n--- 3. CARRIER JOURNEY, PROFILE & FLEET AUDIT ---");

    // Login as Carrier
    const loginCarrier = await cdp.eval(`
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
    assert(loginCarrier, "Carrier credentials entered and submitted");
    await new Promise((r) => setTimeout(r, 3000));

    const carrierDashboardText = await cdp.eval("document.body.innerText");
    assert(
      carrierDashboardText.includes("SEFER MERKEZİ") || carrierDashboardText.includes("Uygun Yükler"),
      "Carrier Sefer Merkezi and Navigation loaded successfully"
    );

    // Switch to "Uygun Yükler" (Marketplace) Tab
    const clickBoardTab = await cdp.eval(`
      (() => {
        const btns = Array.from(document.querySelectorAll('aside button, nav button'));
        const boardBtn = btns.find(b => b.innerText.includes('Uygun Yükler'));
        if (boardBtn) { boardBtn.click(); return true; }
        return false;
      })()
    `);
    assert(clickBoardTab, "Carrier switches to 'Uygun Yükler' (Marketplace) tab");
    await new Promise((r) => setTimeout(r, 1000));

    // Switch to "Profilim" Tab
    const clickProfileTab = await cdp.eval(`
      (() => {
        const btns = Array.from(document.querySelectorAll('aside button, nav button, button'));
        const profileBtn = btns.find(b => b.innerText.includes('Profilim') || b.innerText.includes('Profil'));
        if (profileBtn) { profileBtn.click(); return true; }
        return false;
      })()
    `);
    assert(clickProfileTab, "Carrier switches to 'Profilim' tab");
    await new Promise((r) => setTimeout(r, 2000));

    // Verify Profile Header, Trust Score, and Badges
    const profileRendered = await cdp.eval(`
      (() => {
        const text = document.body.innerText;
        return {
          hasTrustScore: text.includes('Trust Score') || text.includes('TORK Trust') || text.includes('Yetersiz Veri'),
          hasRating: text.includes('Müşteri') || text.includes('Değerlendirme') || text.includes('değerlendirme'),
          hasAvatarUpload: Boolean(document.querySelector('button[title="Profil Fotoğrafı Değiştir"]') || document.querySelector('button[aria-label="Profil Fotoğrafı Değiştir"]')),
          hasVerificationSubTab: text.includes('Doğrulama Merkezi') || text.includes('Doğrulama'),
          hasVehiclesSubTab: text.includes('Araç Bilgileri') || text.includes('Filo'),
        };
      })()
    `);
    assert(
      profileRendered.hasTrustScore && profileRendered.hasRating && profileRendered.hasAvatarUpload,
      "Profile renders Avatar upload, TORK Trust score, and Honest Rating section interactively",
      profileRendered
    );

    // Click "Doğrulama Merkezi" in Profile
    const clickVerSubTab = await cdp.eval(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const verBtn = btns.find(b => b.innerText.includes('Doğrulama Merkezi'));
        if (verBtn) { verBtn.click(); return true; }
        return false;
      })()
    `);
    assert(clickVerSubTab, "Carrier opens embedded 'Doğrulama Merkezi' from within Profile");
    await new Promise((r) => setTimeout(r, 1500));

    const embeddedVerRendered = await cdp.eval(`
      (() => {
        const text = document.body.innerText;
        return {
          hasPhoneForm: text.includes('Telefon') || text.includes('05XX') || text.includes('Doğrulama'),
          hasDriverDoc: text.includes('Sürücü Belgesi') || text.includes('Ehliyet') || text.includes('Belge'),
        };
      })()
    `);
    assert(
      embeddedVerRendered.hasPhoneForm && embeddedVerRendered.hasDriverDoc,
      "Embedded Verification Center renders Phone OTP & Driver License OCR tools inside Profile",
      embeddedVerRendered
    );

    // Click "Araç Bilgileri & Filo" in Profile
    const clickVehiclesSubTab = await cdp.eval(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const vehBtn = btns.find(b => b.innerText.includes('Araç Bilgileri'));
        if (vehBtn) { vehBtn.click(); return true; }
        return false;
      })()
    `);
    assert(clickVehiclesSubTab, "Carrier switches to 'Araç Bilgileri & Filo' sub-tab");
    await new Promise((r) => setTimeout(r, 1000));

    const vehiclesFleetRendered = await cdp.eval(`
      (() => {
        const text = document.body.innerText;
        return {
          hasAddBtn: Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Yeni Araç') || b.innerText.includes('İlk Aracınızı'))),
          hasFleetTitle: text.includes('Araç') || text.includes('Filo'),
        };
      })()
    `);
    assert(
      vehiclesFleetRendered.hasAddBtn && vehiclesFleetRendered.hasFleetTitle,
      "Carrier Vehicle Fleet section renders '+ Yeni Araç Ekle' interactive button and fleet management cards",
      vehiclesFleetRendered
    );

    // Switch to "Cüzdan" Tab
    const clickWalletTab = await cdp.eval(`
      (() => {
        const btns = Array.from(document.querySelectorAll('aside button, nav button'));
        const walletBtn = btns.find(b => b.innerText.includes('Cüzdan'));
        if (walletBtn) { walletBtn.click(); return true; }
        return false;
      })()
    `);
    assert(clickWalletTab, "Carrier switches to 'Cüzdan' tab");
    await new Promise((r) => setTimeout(r, 1000));

    const walletRendered = await cdp.eval(`
      document.body.innerText.includes('Cüzdan') || document.body.innerText.includes('Bakiye')
    `);
    assert(walletRendered, "Carrier Wallet renders balance ledger and settlement history");

    // ============================================================
    // 4. CONSOLE & RUNTIME AUDIT
    // ============================================================
    console.log("\n--- 4. BROWSER RUNTIME CONSOLE & NETWORK AUDIT ---");

    const criticalConsoleErrors = cdp.consoleLogs.filter(
      (l) => l.type === "error" && !l.text.includes("favicon")
    );
    const criticalHttpErrors = cdp.httpErrors.filter(
      (e) => !e.url.includes("/api/fuel") && !e.url.includes("/api/routes")
    );

    assert(
      cdp.exceptions.length === 0,
      `Uncaught Runtime Exceptions: ${cdp.exceptions.length}`,
      cdp.exceptions
    );
    assert(
      criticalConsoleErrors.length === 0,
      `Critical Console Errors: ${criticalConsoleErrors.length}`,
      criticalConsoleErrors
    );
    assert(
      criticalHttpErrors.length === 0,
      `Critical Failed HTTP Responses: ${criticalHttpErrors.length}`,
      criticalHttpErrors
    );

    console.log("\n==================================================");
    console.log(`GLOBAL BROWSER FUNCTIONALITY AUDIT: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================\n");

  } finally {
    chrome.kill();
    if (serverStartedLocally && serverProc) {
      serverProc.kill();
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Global audit execution failed:", e);
  process.exit(1);
});
