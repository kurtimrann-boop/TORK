import { spawn } from "child_process";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9272;
const USER_DATA_DIR = "/tmp/tork-chrome-nav-" + Date.now();
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

async function loginUser(cdp, email, pass) {
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
  await new Promise((r) => setTimeout(r, 2500));
}

async function logoutUser(cdp) {
  await cdp.eval(`
    (() => {
      const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Çıkış Yap'));
      if (logoutBtn) logoutBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1500));
}

async function isDashboard(cdp, roleKeyword) {
  return await cdp.eval(`
    (() => {
      const body = document.body.innerText;
      return body.includes('${roleKeyword}') && !body.includes('Operasyon Merkezine Gir');
    })()
  `);
}

async function isAuthScreen(cdp) {
  return await cdp.eval(`
    (() => {
      const emailInput = document.querySelector('input[type="email"]');
      const submitBtn = document.querySelector('button[type="submit"]');
      return Boolean(emailInput && submitBtn && document.body.innerText.includes('Operasyon Merkezine Gir'));
    })()
  `);
}

async function runAuthNavAudit() {
  console.log("==================================================");
  console.log("TORK AUTH NAVIGATION & BROWSER BACK HARDENING AUDIT");
  console.log("==================================================");

  const chromeProc = await startChrome();

  try {
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const pageTarget = await newTabRes.json();
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // ==========================================
    // TEST 1: Shipper login -> Dashboard -> Browser Back
    // ==========================================
    console.log("\n[Test 1] Shipper login -> Dashboard -> Browser Back...");
    await cdp.send("Page.navigate", { url: LOCAL_URL });
    await new Promise((r) => setTimeout(r, 1500));
    await loginUser(cdp, "demo.shipper@tork.local", "TorkDemo2026!S");
    assert(await isDashboard(cdp, "OPERASYON MERKEZİ"), "Shipper successfully on dashboard");

    // Press Browser Back via history.back()
    await cdp.eval(`window.history.back()`);
    await new Promise((r) => setTimeout(r, 1000));
    assert(await isDashboard(cdp, "OPERASYON MERKEZİ"), "Shipper remains on authenticated dashboard after Browser Back");
    assert(!(await isAuthScreen(cdp)), "Shipper did NOT drop to public login screen on Back");

    // ==========================================
    // TEST 3: Shipper logout -> Browser Back
    // ==========================================
    console.log("\n[Test 3] Shipper logout -> Browser Back...");
    await logoutUser(cdp);
    assert(await isAuthScreen(cdp), "Shipper cleanly logged out to auth screen");

    await cdp.eval(`window.history.back()`);
    await new Promise((r) => setTimeout(r, 1000));
    assert(await isAuthScreen(cdp), "Unauthenticated user remains on auth screen after Browser Back");
    assert(!(await isDashboard(cdp, "OPERASYON MERKEZİ")), "Dashboard cannot be accessed after logout via Back");

    // ==========================================
    // TEST 2: Carrier login -> Dashboard -> Browser Back
    // ==========================================
    console.log("\n[Test 2] Carrier login -> Dashboard -> Browser Back...");
    await loginUser(cdp, "demo.carrier@tork.local", "TorkDemo2026!C");
    assert(await isDashboard(cdp, "SEFER MERKEZİ"), "Carrier successfully on dashboard");

    // Navigate to another tab and then Back
    await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tekliflerim'));
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 800));

    await cdp.eval(`window.history.back()`);
    await new Promise((r) => setTimeout(r, 1000));
    assert(await isDashboard(cdp, "SEFER MERKEZİ"), "Carrier remains on authenticated dashboard after Browser Back from tab");

    // ==========================================
    // TEST 5: Login -> refresh -> Back
    // ==========================================
    console.log("\n[Test 5] Carrier login -> Page Refresh -> Back...");
    await cdp.send("Page.reload");
    await new Promise((r) => setTimeout(r, 2000));
    assert(await isDashboard(cdp, "SEFER MERKEZİ"), "Session restored seamlessly after page refresh");

    await cdp.eval(`window.history.back()`);
    await new Promise((r) => setTimeout(r, 1000));
    assert(await isDashboard(cdp, "SEFER MERKEZİ"), "Remains on dashboard after refresh + Browser Back");

    // ==========================================
    // TEST 4: Carrier logout -> Browser Back
    // ==========================================
    console.log("\n[Test 4] Carrier logout -> Browser Back...");
    await logoutUser(cdp);
    assert(await isAuthScreen(cdp), "Carrier cleanly logged out to auth screen");

    await cdp.eval(`window.history.back()`);
    await new Promise((r) => setTimeout(r, 1000));
    assert(await isAuthScreen(cdp), "Remains on auth screen after logout + Browser Back");

    // ==========================================
    // TEST 6: Logout -> refresh -> Back
    // ==========================================
    console.log("\n[Test 6] Logout -> refresh -> Back...");
    await cdp.send("Page.reload");
    await new Promise((r) => setTimeout(r, 2000));
    assert(await isAuthScreen(cdp), "Remains on auth screen after refresh when logged out");

    await cdp.eval(`window.history.back()`);
    await new Promise((r) => setTimeout(r, 1000));
    assert(await isAuthScreen(cdp), "Remains on auth screen after logged out refresh + Back");

    cdp.close();
  } finally {
    chromeProc.kill();
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log("\n==================================================");
  console.log(`AUTH NAVIGATION AUDIT: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthNavAudit().catch((err) => {
  console.error("Auth nav audit error:", err);
  process.exit(1);
});
