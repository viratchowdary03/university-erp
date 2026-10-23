// One command to start both halves:   npm run dev
// It starts the API (port 5000) and the website (port 5173) side by side and stops both on Ctrl+C.
// They stay two programs on purpose: the website is what the browser loads, the API is what it talks to.
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const windows = process.platform === "win32";

// Puts a label in front of every complete line, so the two programs' messages can be told apart
function labelled(tag, out) {
  let pending = "";
  const write = (line) => out.write(`${tag}${line}\n`);
  const onData = (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop();
    lines.forEach(write);
  };
  onData.flush = () => { if (pending) write(pending); pending = ""; };
  return onData;
}

const children = [];
let stopping = false;

function start(name, dir, color) {
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  // one command string (no argument list), so it works the same on Windows, macOS and Linux
  const child = spawn("npm run dev", { cwd: path.join(root, dir), shell: true, env: process.env });
  const out = labelled(tag, process.stdout);
  const err = labelled(tag, process.stderr);
  child.stdout.setEncoding("utf8").on("data", out);
  child.stderr.setEncoding("utf8").on("data", err);
  child.on("exit", (code) => {
    out.flush();
    err.flush();
    if (!stopping) {
      console.log(`${tag}stopped (code ${code}). Stopping the other program too.`);
      stop();
    }
  });
  children.push(child);
}

function stop() {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (!c.pid) continue;
    // on Windows the shell must be stopped together with everything it started
    if (windows) spawnSync("taskkill", ["/pid", String(c.pid), "/t", "/f"], { stdio: "ignore" });
    else c.kill("SIGTERM");
  }
  setTimeout(() => process.exit(0), 800);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

start("api", "backend", 36);
start("web", "frontend", 35);
console.log("Starting the API on http://localhost:5000 and the website on http://localhost:5173 ...");
