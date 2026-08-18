import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9231;
const USER_DATA_DIR = "/tmp/tork-chrome-nav-verify-" + Date.now();
const LOCAL_URL = "http://localhost:3000";
const QA_PASSWORD = "TorkQA!2026Secure";
const CARRIER_EMAIL = "qa-carrier@tork.test";
const SHIPPER_EMAIL = "qa-shipper@tork.test";
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

  async pressEscape() {
    await this.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    });
    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27,
    });
  }
}

async function loginUser(cdp, email, password) {
  console.log(`Logging in as ${email}...`);
  await cdp.send("Page.navigate", { url: LOCAL_URL });
  await new Promise(r => setTimeout(r, 2000));

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
        setter.call(passInput, '${password}');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        submitBtn.click();
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 3500));
}

async function runAudit() {
  console.log("==================================================");
  console.log("TORK COMPREHENSIVE NAVIGATION REGRESSION TEST SUITE");
  console.log("==================================================");

  const chromeProc = await startChrome();
  const summary = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    failures: []
  };

  function record(name, pass, detail = "") {
    summary.totalTests++;
    if (pass) {
      summary.passed++;
      console.log(`  ✓ PASS: ${name}`);
    } else {
      summary.failed++;
      summary.failures.push({ name, detail });
      console.log(`  ✗ FAIL: ${name} -> ${detail}`);
    }
  }

  try {
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const pageTarget = await newTabRes.json();
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    // =========================================================================
    // SECTION 1: CARRIER NAVIGATION AUDIT & KNOWN BUG VERIFICATION
    // =========================================================================
    console.log("\n>>> SECTION 1: CARRIER NAVIGATION & DETAIL TRAP TESTS");
    await loginUser(cdp, CARRIER_EMAIL, QA_PASSWORD);

    // 1.1 Carrier Tab Switches
    const carrierTabMap = {
      overview: "Genel Bakış",
      board: "Uygun Yükler",
      "my-bids": "Tekliflerim",
      transports: "Aktif Taşımalar",
      wallet: "Cüzdan",
      profile: "Profilim",
      settings: "Ayarlar"
    };

    for (const [tabId, label] of Object.entries(carrierTabMap)) {
      const switched = await cdp.eval(`
        (() => {
          const navButtons = Array.from(document.querySelectorAll('aside nav button'));
          const target = navButtons.find(b => b.textContent && b.textContent.includes('${label}'));
          if (target) { target.click(); return true; }
          return false;
        })()
      `);
      await new Promise(r => setTimeout(r, 400));
      const pageH1 = await cdp.eval(`document.querySelector('h1')?.textContent || ''`);
      record(`Carrier Tab: ${tabId} (${label})`, switched && pageH1.length > 0, `H1: ${pageH1}`);
    }

    // 1.2 KNOWN BUG: Board -> Load Detail -> Profile
    console.log("\n>>> Testing Known Bug Fix: Carrier Board -> Load Detail -> Profile");
    await cdp.eval(`
      (() => {
        const navButtons = Array.from(document.querySelectorAll('aside nav button'));
        const boardBtn = navButtons.find(b => b.textContent && b.textContent.includes('Uygun Yükler'));
        if (boardBtn) boardBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // Open first load detail
    await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Detayları İncele') || b.textContent.includes('İncele')));
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));
    await cdp.captureScreenshot("qa_carrier_load_detail_open.png");

    // Click "Profilim" in sidebar while in Load Detail
    await cdp.eval(`
      (() => {
        const navButtons = Array.from(document.querySelectorAll('aside nav button'));
        const profileBtn = navButtons.find(b => b.textContent && b.textContent.includes('Profilim'));
        if (profileBtn) profileBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));

    const carrierProfileState = await cdp.eval(`
      (() => {
        const h1 = document.querySelector('h1')?.textContent || '';
        const hasProfile = Array.from(document.querySelectorAll('h1, h2, div')).some(el => el.textContent && el.textContent.includes('Profil ve kurumsal bilgiler'));
        const hasDetail = Array.from(document.querySelectorAll('h2, h3, div')).some(el => el.textContent && (el.textContent.includes('Yük Detayları') || el.textContent.includes('Güzergah & Rota')));
        return { h1, hasProfile, hasDetail };
      })()
    `);

    record("Carrier: Board -> Load Detail -> Profile", carrierProfileState.hasProfile && !carrierProfileState.hasDetail, JSON.stringify(carrierProfileState));
    await cdp.captureScreenshot("qa_carrier_profile_success.png");

    // 1.3 Load Detail -> Wallet
    await cdp.eval(`
      (() => {
        const navButtons = Array.from(document.querySelectorAll('aside nav button'));
        const boardBtn = navButtons.find(b => b.textContent && b.textContent.includes('Uygun Yükler'));
        if (boardBtn) boardBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Detayları İncele') || b.textContent.includes('İncele')));
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    await cdp.eval(`
      (() => {
        const navButtons = Array.from(document.querySelectorAll('aside nav button'));
        const walletBtn = navButtons.find(b => b.textContent && b.textContent.includes('Cüzdan'));
        if (walletBtn) walletBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    const carrierWalletState = await cdp.eval(`
      (() => {
        const h1 = document.querySelector('h1')?.textContent || '';
        const hasWallet = Array.from(document.querySelectorAll('h1, div')).some(el => el.textContent && el.textContent.includes('Cüzdan') || el.textContent.includes('Mevcut Bakiye'));
        return { h1, hasWallet };
      })()
    `);
    record("Carrier: Board -> Load Detail -> Wallet", carrierWalletState.hasWallet, JSON.stringify(carrierWalletState));
    await cdp.captureScreenshot("qa_carrier_wallet_success.png");

    // 1.4 Load Detail -> Overview
    await cdp.eval(`
      (() => {
        const navButtons = Array.from(document.querySelectorAll('aside nav button'));
        const boardBtn = navButtons.find(b => b.textContent && b.textContent.includes('Uygun Yükler'));
        if (boardBtn) boardBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Detayları İncele') || b.textContent.includes('İncele')));
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    await cdp.eval(`
      (() => {
        const navButtons = Array.from(document.querySelectorAll('aside nav button'));
        const overviewBtn = navButtons.find(b => b.textContent && b.textContent.includes('Genel Bakış'));
        if (overviewBtn) overviewBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));
    const carrierOverviewState = await cdp.eval(`document.querySelector('h1')?.textContent || ''`);
    record("Carrier: Board -> Load Detail -> Overview", carrierOverviewState.includes("Genel Bakış"), `H1: ${carrierOverviewState}`);

    // =========================================================================
    // SECTION 2: TOPBAR AVATAR & DROPDOWN TESTS
    // =========================================================================
    console.log("\n>>> SECTION 2: TOPBAR AVATAR DROPDOWN TESTS");
    // Click Avatar
    await cdp.eval(`
      (() => {
        const avatarBtn = document.querySelector('header button[aria-label="Profil ve Hesap Menüsü"]');
        if (avatarBtn) avatarBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    const dropdownOpen = await cdp.eval(`
      (() => {
        const menu = Array.from(document.querySelectorAll('header div')).find(d => d.textContent && d.textContent.includes('Profilim') && d.textContent.includes('Çıkış Yap'));
        return !!menu;
      })()
    `);
    record("Topbar: Avatar Click opens dropdown", dropdownOpen);
    await cdp.captureScreenshot("qa_avatar_dropdown_open.png");

    // Click "Profilim" in Avatar dropdown
    await cdp.eval(`
      (() => {
        const profileBtn = Array.from(document.querySelectorAll('header div button')).find(b => b.textContent && b.textContent.includes('Profilim'));
        if (profileBtn) profileBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));
    const profileFromAvatarH1 = await cdp.eval(`document.querySelector('h1')?.textContent || ''`);
    record("Topbar: Avatar Dropdown -> 'Profilim' navigates to Profile", profileFromAvatarH1.includes("Profil"), `H1: ${profileFromAvatarH1}`);

    // Test Escape key closes Avatar dropdown
    await cdp.eval(`
      (() => {
        const avatarBtn = document.querySelector('header button[aria-label="Profil ve Hesap Menüsü"]');
        if (avatarBtn) avatarBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 400));
    await cdp.pressEscape();
    await new Promise(r => setTimeout(r, 400));
    const dropdownClosedAfterEsc = await cdp.eval(`
      (() => {
        const menu = Array.from(document.querySelectorAll('header div')).find(d => d.textContent && d.textContent.includes('Çıkış Yap') && d.className.includes('z-50'));
        return !menu;
      })()
    `);
    record("Topbar: Avatar Dropdown closed via Escape key", dropdownClosedAfterEsc);

    // =========================================================================
    // SECTION 3: SHIPPER NAVIGATION AUDIT
    // =========================================================================
    console.log("\n>>> SECTION 3: SHIPPER NAVIGATION & EMPTY BIDS TESTS");
    await loginUser(cdp, SHIPPER_EMAIL, QA_PASSWORD);

    // 3.1 Shipper Tab Switches
    const shipperTabMap = {
      overview: "Genel Bakış",
      loads: "İlanlarım",
      create: "Yeni Yük",
      bids: "Gelen Teklifler",
      wallet: "Cüzdan",
      profile: "Profilim",
      settings: "Ayarlar"
    };

    for (const [tabId, label] of Object.entries(shipperTabMap)) {
      const switched = await cdp.eval(`
        (() => {
          const navButtons = Array.from(document.querySelectorAll('aside nav button'));
          const target = navButtons.find(b => b.textContent && b.textContent.includes('${label}'));
          if (target) { target.click(); return true; }
          return false;
        })()
      `);
      await new Promise(r => setTimeout(r, 400));
      const pageH1 = await cdp.eval(`document.querySelector('h1')?.textContent || ''`);
      record(`Shipper Tab: ${tabId} (${label})`, switched && pageH1.length > 0, `H1: ${pageH1}`);
    }

    // 3.2 Shipper: Create Load Wizard Navigation
    await cdp.eval(`
      (() => {
        const navButtons = Array.from(document.querySelectorAll('aside nav button'));
        const createBtn = navButtons.find(b => b.textContent && b.textContent.includes('Yeni Yük'));
        if (createBtn) createBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));
    const createLoadH1 = await cdp.eval(`document.querySelector('h1')?.textContent || ''`);
    record("Shipper: 'Yeni Yük' wizard opens cleanly", createLoadH1.includes("Yeni Yük") || createLoadH1.includes("İlan"), `H1: ${createLoadH1}`);
    await cdp.captureScreenshot("qa_shipper_create_load.png");

    // =========================================================================
    // SECTION 4: MODALS (ESCAPE KEY & BACKDROP CLICK AUDIT)
    // =========================================================================
    console.log("\n>>> SECTION 4: MODALS ESCAPE & BACKDROP TESTS");
    // Test Delete Modal in Loads
    await cdp.eval(`
      (() => {
        const navButtons = Array.from(document.querySelectorAll('aside nav button'));
        const loadsBtn = navButtons.find(b => b.textContent && b.textContent.includes('İlanlarım'));
        if (loadsBtn) loadsBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    const deleteTriggered = await cdp.eval(`
      (() => {
        const delBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Sil'));
        if (delBtn) { delBtn.click(); return true; }
        return false;
      })()
    `);

    if (deleteTriggered) {
      await new Promise(r => setTimeout(r, 500));
      const deleteModalVisible = await cdp.eval(`
        (() => {
          return Array.from(document.querySelectorAll('h3')).some(h => h.textContent.includes('silmek istediğinize emin misiniz'));
        })()
      `);
      record("Delete Modal: Opened successfully", deleteModalVisible);

      // Dismiss via Escape
      await cdp.pressEscape();
      await new Promise(r => setTimeout(r, 500));
      const deleteModalDismissed = await cdp.eval(`
        (() => {
          return !Array.from(document.querySelectorAll('h3')).some(h => h.textContent.includes('silmek istediğinize emin misiniz'));
        })()
      `);
      record("Delete Modal: Dismissed via Escape key", deleteModalDismissed);
    }

    // =========================================================================
    // SECTION 5: MOBILE (390x844) NAVIGATION AUDIT
    // =========================================================================
    console.log("\n>>> SECTION 5: MOBILE (390x844) AUDIT");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 1000));

    // Test Mobile Dock tabs
    const mobileDockButtons = await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('nav[aria-label="Mobil alt menü"] button'));
        return buttons.map(b => b.textContent.trim());
      })()
    `);
    record("Mobile: Dock buttons loaded", mobileDockButtons.length >= 4, `Buttons: ${mobileDockButtons.join(', ')}`);

    // Test Mobile Avatar Menu -> Profile navigation
    await cdp.eval(`
      (() => {
        const avatarBtn = document.querySelector('header button[aria-label="Profil ve Hesap Menüsü"]');
        if (avatarBtn) avatarBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 600));
    await cdp.eval(`
      (() => {
        const profileBtn = Array.from(document.querySelectorAll('header div button')).find(b => b.textContent && b.textContent.includes('Profilim'));
        if (profileBtn) profileBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    const mobileProfileH1 = await cdp.eval(`document.querySelector('h1')?.textContent || ''`);
    record("Mobile: Access 'Profilim' via Topbar Avatar Menu", mobileProfileH1.includes("Profil"), `H1: ${mobileProfileH1}`);
    await cdp.captureScreenshot("qa_mobile_profile_via_avatar.png");

    // Horizontal overflow check on mobile
    const overflowCheck = await cdp.eval(`
      (() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()
    `);
    record("Mobile: Zero horizontal overflow (390px)", !overflowCheck.hasOverflow, `scroll: ${overflowCheck.scrollWidth}px, client: ${overflowCheck.clientWidth}px`);

  } finally {
    try {
      chromeProc.kill("SIGKILL");
    } catch (e) {}
  }

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${summary.totalTests} | PASSED: ${summary.passed} | FAILED: ${summary.failed}`);
  console.log("==================================================");

  if (summary.failed > 0) {
    console.log("\nFAILURES:");
    summary.failures.forEach(f => console.log(`  ✗ ${f.name}: ${f.detail}`));
    process.exit(1);
  } else {
    console.log("\nALL NAVIGATION REGRESSION TESTS PASSED 100%!");
  }
}

runAudit();
