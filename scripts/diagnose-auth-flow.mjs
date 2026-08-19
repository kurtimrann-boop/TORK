import { spawn } from "child_process";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9278;
const USER_DATA_DIR = "/tmp/tork-chrome-auth-" + Date.now();
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
          this.consoleLogs.push({
            type: msg.params.type,
            args: msg.params.args.map((a) => a.value || a.description),
          });
        } else if (msg.method === "Runtime.exceptionThrown") {
          this.exceptions.push(msg.params.exceptionDetails);
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
}

async function main() {
  const nextServer = spawn("npx", ["next", "dev", "-p", "3000"], {
    cwd: "/Users/basquiat/Desktop/TORK",
    env: { ...process.env, PORT: "3000" },
  });

  // Wait for server
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch("http://127.0.0.1:3000/");
      if (res.status === 200) break;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }

  const chromeProc = await startChrome();
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
  const target = await res.json();
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();

  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("Page.navigate", { url: LOCAL_URL });
  await new Promise((r) => setTimeout(r, 3000));

  console.log("Looking for Demo Login buttons...");
  const clickDemoCarrier = await client.send("Runtime.evaluate", {
    expression: `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const demoCarrierBtn = buttons.find(b => b.innerText.includes('Demo Taşıyıcı') || b.innerText.includes('Taşıyıcı Girişi') || b.innerText.includes('Taşıyıcı'));
        if (demoCarrierBtn) {
          demoCarrierBtn.click();
          return { clicked: true, text: demoCarrierBtn.innerText };
        }
        return { clicked: false, allButtons: buttons.map(b => b.innerText) };
      })()
    `,
    returnByValue: true,
  });

  console.log("Demo Carrier Button Click:", clickDemoCarrier.result?.value);
  await new Promise((r) => setTimeout(r, 3000));

  console.log("Exceptions after Carrier login attempt:", client.exceptions.length);
  for (const ex of client.exceptions) {
    console.log("  EXCEPTION:", ex.text, ex.exception?.description);
  }

  const pageAfterAuth = await client.send("Runtime.evaluate", {
    expression: "({ bodyLength: document.body.innerText.length, preview: document.body.innerText.substring(0, 300) })",
    returnByValue: true,
  });
  console.log("Page Content after auth attempt:", pageAfterAuth.result?.value);

  chromeProc.kill();
  nextServer.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error("Auth diagnosis error:", e);
  process.exit(1);
});
