import { spawn } from "child_process";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9277;
const USER_DATA_DIR = "/tmp/tork-chrome-diag-" + Date.now();
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
    this.networkErrors = [];
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
        } else if (msg.method === "Network.loadingFailed") {
          this.networkErrors.push(msg.params);
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
  console.log("Starting Next.js dev server on port 3000...");
  const nextServer = spawn("npx", ["next", "dev", "-p", "3000"], {
    cwd: "/Users/basquiat/Desktop/TORK",
    env: { ...process.env, PORT: "3000" },
  });

  nextServer.stdout.on("data", (d) => {
    const s = d.toString();
    if (s.includes("Ready in") || s.includes("started server on") || s.includes("Compiled") || s.includes("error") || s.includes("Error")) {
      console.log(`[Next.js Server]: ${s.trim()}`);
    }
  });

  nextServer.stderr.on("data", (d) => {
    console.error(`[Next.js Server STDERR]: ${d.toString().trim()}`);
  });

  // Wait for server to be ready
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch("http://127.0.0.1:3000/");
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!serverReady) {
    console.error("Next.js dev server failed to respond on port 3000 within 20s");
    nextServer.kill();
    process.exit(1);
  }

  console.log("Next.js dev server is responsive. Launching Headless Chrome...");
  const chromeProc = await startChrome();

  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(LOCAL_URL)}`, { method: "PUT" });
  const target = await res.json();
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();

  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("Network.enable");

  console.log("Navigating to http://localhost:3000 in browser...");
  await client.send("Page.navigate", { url: LOCAL_URL });

  // Wait 4 seconds for hydration / script execution
  await new Promise((r) => setTimeout(r, 4000));

  console.log("\n================ DIAGNOSTIC REPORT ================");
  console.log("Console API Logs:", client.consoleLogs.length);
  for (const log of client.consoleLogs) {
    console.log(`  [${log.type.toUpperCase()}]:`, ...log.args);
  }

  console.log("\nUncaught Runtime Exceptions:", client.exceptions.length);
  for (const ex of client.exceptions) {
    console.log(`  EXCEPTION: ${ex.text}`);
    if (ex.exception) {
      console.log(`    Message: ${ex.exception.description}`);
    }
  }

  console.log("\nNetwork Failed Requests:", client.networkErrors.length);
  for (const net of client.networkErrors) {
    console.log(`  FAILED: ${net.requestId} - ${net.errorText}`);
  }

  // Get Document Title and Body Text preview
  const evalRes = await client.send("Runtime.evaluate", {
    expression: "({ title: document.title, bodyLength: document.body.innerText.length, bodyPreview: document.body.innerText.substring(0, 200) })",
    returnByValue: true,
  });
  console.log("\nPage State:", evalRes.result?.value);
  console.log("===================================================\n");

  chromeProc.kill();
  nextServer.kill();
  process.exit(0);
}

main().catch((e) => {
  console.error("Diagnostic script error:", e);
  process.exit(1);
});
