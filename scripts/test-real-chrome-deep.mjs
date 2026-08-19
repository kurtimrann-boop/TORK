import { spawn } from "child_process";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9294;
const USER_DATA_DIR = "/tmp/tork-chrome-deep-" + Date.now();
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
    this.networkResponses = [];
    this.failedRequests = [];
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
          this.networkResponses.push({
            url: msg.params.response.url,
            status: msg.params.response.status,
            mimeType: msg.params.response.mimeType,
          });
        } else if (msg.method === "Network.loadingFailed") {
          this.failedRequests.push(msg.params);
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

async function run() {
  console.log("Testing live Chrome session against running Next.js server...");
  const chrome = await startChrome();

  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
    const target = await res.json();
    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");

    console.log("Navigating to http://localhost:3000/ ...");
    await cdp.send("Page.navigate", { url: "http://localhost:3000/" });
    await new Promise((r) => setTimeout(r, 3000));

    console.log("\n--- ASSET & CHUNK LOAD AUDIT ---");
    console.log(`Total Responses received: ${cdp.networkResponses.length}`);
    const chunkResponses = cdp.networkResponses.filter((r) => r.url.includes("/_next/static/"));
    console.log(`Next.js Static Chunks loaded: ${chunkResponses.length}`);
    for (const chunk of chunkResponses) {
      console.log(`  [HTTP ${chunk.status}] ${chunk.url.split("/").pop()} (${chunk.mimeType})`);
    }

    const failedChunks = chunkResponses.filter((r) => r.status !== 200 && r.status !== 304);
    if (failedChunks.length > 0) {
      console.error("FAILED CHUNKS FOUND:", failedChunks);
    } else {
      console.log("✓ ALL Next.js static chunks loaded with HTTP 200 / 304!");
    }

    console.log("\n--- CONSOLE LOGS & EXCEPTIONS ---");
    console.log(`Exceptions: ${cdp.exceptions.length}`);
    for (const ex of cdp.exceptions) {
      console.error("EXCEPTION:", ex);
    }
    console.log(`Console Logs: ${cdp.consoleLogs.length}`);
    for (const log of cdp.consoleLogs) {
      console.log(`  [${log.type.toUpperCase()}] ${log.text}`);
    }

    console.log("\n--- PAGE DOM & REACT ROOT STATE ---");
    const rootState = await cdp.eval(`
      (() => {
        const body = document.body;
        const root = document.getElementById('__next') || document.querySelector('body > div');
        return {
          title: document.title,
          bodyHtmlLength: body.innerHTML.length,
          bodyTextLength: body.innerText.length,
          hasInteractiveElements: Boolean(document.querySelector('button, input, a')),
          buttonCount: document.querySelectorAll('button').length,
          inputCount: document.querySelectorAll('input').length,
          h1Text: document.querySelector('h1')?.innerText || 'No H1',
        };
      })()
    `);
    console.log("DOM State:", rootState);

    console.log("\n--- TESTING 127.0.0.1:3000/ ---");
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:3000/" });
    await new Promise((r) => setTimeout(r, 2000));
    const ipState = await cdp.eval("({ title: document.title, buttons: document.querySelectorAll('button').length })");
    console.log("127.0.0.1 State:", ipState);

  } finally {
    chrome.kill();
  }
}

run().catch((e) => {
  console.error("Deep test error:", e);
  process.exit(1);
});
