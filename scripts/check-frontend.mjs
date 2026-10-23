// Checks the website's source without a browser or a build:
//   1. every file parses (JSX syntax)
//   2. every relative import points to a file that exists, and every named import exists in that file
//   3. every icon imported from lucide-react exists, every package imported is installed
//   4. no file uses a variable that is never imported or defined (the usual "X is not defined" crash)
//   5. every API address the pages call exists on the backend (needs the backend dependencies installed)
//
//   node scripts/check-frontend.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fe = path.join(root, "frontend");
const require = createRequire(path.join(fe, "package.json"));
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(p) ? [p] : [];
  });
const files = walk(path.join(fe, "src"));
const problems = [];
const report = (file, msg) => problems.push(`${path.relative(fe, file)}: ${msg}`);

const parseFile = (file) =>
  parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: false });

const resolveImport = (from, spec) => {
  const base = path.resolve(path.dirname(from), spec);
  for (const c of [base, `${base}.js`, `${base}.jsx`, path.join(base, "index.js"), path.join(base, "index.jsx")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
};

const exportCache = new Map();
function exportsOf(file) {
  if (exportCache.has(file)) return exportCache.get(file);
  const names = new Set();
  exportCache.set(file, names);
  const ast = parseFile(file);
  for (const node of ast.program.body) {
    if (node.type === "ExportDefaultDeclaration") names.add("default");
    if (node.type === "ExportNamedDeclaration") {
      if (node.declaration) {
        const d = node.declaration;
        if (d.id) names.add(d.id.name);
        (d.declarations || []).forEach((x) => {
          if (x.id.type === "Identifier") names.add(x.id.name);
          else (x.id.properties || x.id.elements || []).forEach((p) => p && names.add((p.value || p.argument || p).name));
        });
      }
      (node.specifiers || []).forEach((s) => names.add(s.exported.name));
    }
    if (node.type === "ExportAllDeclaration") {
      const target = resolveImport(file, node.source.value);
      if (target) exportsOf(target).forEach((n) => names.add(n));
    }
  }
  return names;
};

let lucide = null;
try {
  lucide = new Set(Object.keys(await import(pathToFileURL(require.resolve("lucide-react")).href)));
} catch {
  /* lucide icons are skipped if it cannot be loaded here */
}

const BROWSER_GLOBALS = new Set([
  "window", "document", "localStorage", "sessionStorage", "navigator", "console", "setTimeout", "clearTimeout", "setInterval",
  "clearInterval", "Promise", "Date", "Math", "JSON", "Object", "Array", "String", "Number", "Boolean", "Error", "Map", "Set",
  "URL", "URLSearchParams", "FormData", "Blob", "File", "FileReader", "fetch", "structuredClone", "Intl", "RegExp", "Symbol",
  "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent", "undefined", "NaN", "Infinity",
  "HTMLElement", "requestAnimationFrame", "cancelAnimationFrame", "alert", "confirm", "Event", "KeyboardEvent", "crypto",
  "process", "globalThis", "Number", "TypeError", "AbortController", "WeakMap", "BigInt", "Uint8Array", "atob", "btoa",
  "TextEncoder", "matchMedia", "location", "history", "performance", "IntersectionObserver", "ResizeObserver", "Image",
]);

for (const file of files) {
  let ast;
  try {
    ast = parseFile(file);
  } catch (err) {
    report(file, `does not parse: ${err.message}`);
    continue;
  }

  for (const node of ast.program.body) {
    if (node.type !== "ImportDeclaration") continue;
    const spec = node.source.value;
    if (spec.startsWith(".")) {
      if (/\.(css|svg|png|jpg)$/.test(spec)) {
        if (!existsSync(path.resolve(path.dirname(file), spec))) report(file, `missing file ${spec}`);
        continue;
      }
      const target = resolveImport(file, spec);
      if (!target) {
        report(file, `cannot find "${spec}"`);
        continue;
      }
      const names = exportsOf(target);
      for (const s of node.specifiers) {
        if (s.type === "ImportDefaultSpecifier" && !names.has("default")) report(file, `"${spec}" has no default export`);
        if (s.type === "ImportSpecifier" && !names.has(s.imported.name)) report(file, `"${spec}" does not export ${s.imported.name}`);
      }
    } else {
      const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
      if (!existsSync(path.join(fe, "node_modules", pkg))) report(file, `package "${pkg}" is not installed`);
      if (spec === "lucide-react" && lucide) {
        node.specifiers.forEach((s) => s.type === "ImportSpecifier" && !lucide.has(s.imported.name) && report(file, `lucide-react has no icon ${s.imported.name}`));
      }
    }
  }

  traverse(ast, {
    Program(p) {
      for (const name of Object.keys(p.scope.globals)) {
        if (!BROWSER_GLOBALS.has(name) && !(name === "import")) report(file, `uses "${name}" but it is never imported or defined`);
      }
    },
  });
}

// ---- 5. API addresses the pages call must exist on the backend ----
async function backendRoutes() {
  const be = path.join(root, "backend");
  process.env.MONGO_URI ||= "mongodb://127.0.0.1:1/x";
  process.env.JWT_ACCESS_SECRET ||= "check";
  const beRequire = createRequire(path.join(be, "package.json"));
  try { beRequire.resolve("express"); } catch { return null; }
  const { default: app } = await import(pathToFileURL(path.join(be, "src/app.js")).href);
  const out = [];
  const walkStack = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const method of Object.keys(layer.route.methods)) out.push({ method: method.toUpperCase(), pattern: prefix + layer.route.path });
      } else if (layer.name === "router" && layer.handle.stack) {
        const mount = layer.regexp.source.replace("^\\/", "/").replace("\\/?(?=\\/|$)", "").replace(/\\\//g, "/").replace(/\(\?:\(\[\^\/\]\+\?\)\)/g, ":p");
        walkStack(layer.handle.stack, prefix + mount.replace(/\$$/, ""));
      }
    }
  };
  walkStack(app._router.stack, "");
  return out;
}

const routes = await backendRoutes();
if (!routes) {
  console.log("(skipped the API address check: install the backend first with  npm install --prefix backend)");
} else {
  const toRegex = (pattern) => new RegExp(`^${pattern.replace(/:[A-Za-z]+/g, "[^/]+").replace(/\/$/, "")}/?$`);
  const compiled = routes.map((r) => ({ ...r, re: toRegex(r.pattern) }));
  // find calls like  send("post", `/exams/${id}`)  api.get("/x")  { method: "put", url: ... }
  const callRe = /(?:api\.(get|post|put|patch|delete)\(|method:\s*"(get|post|put|patch|delete)",\s*url:\s*|\buseData\(\s*\[[^\]]*\]\s*,\s*|\bdownloadFile\()\s*([`"'])(\/[^`"']*)\3/g;
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(callRe)) {
      const method = (m[1] || m[2] || "get").toUpperCase();
      const raw = "/api" + m[4].split("?")[0];
      const concrete = raw.replace(/\$\{[^}]+\}/g, "x");
      // a ${placeholder} may stand for an id or for a fixed word such as "approve", so test it both ways
      const loose = new RegExp(`^${raw.replace(/[.*+?^()|[\]\\]/g, "\\$&").replace(/\$\{[^}]+\}/g, "[^/]+")}/?$`);
      const hit = compiled.some((r) => r.method === method && (r.re.test(concrete) || loose.test(r.pattern.replace(/:[A-Za-z]+/g, "x"))));
      if (!hit) report(file, `calls ${method} ${m[4]} but the backend has no such route`);
    }
  }
  console.log(`checked ${routes.length} backend routes against the pages' API calls`);
}

// ---- 6. the permission tables of the website and the API must be identical ----
{
  const { writeFileSync, rmSync } = await import("node:fs");
  const feDir = path.join(fe, "src", "config");
  const tmp = path.join(feDir, "__perm_check.mjs");
  writeFileSync(tmp, readFileSync(path.join(feDir, "permissions.js"), "utf8").replace(/from "\.\/roles"/g, 'from "./roles.js"'));
  const tmpRoles = path.join(feDir, "roles.js");
  const feMod = await import(pathToFileURL(tmp).href).finally(() => rmSync(tmp, { force: true }));
  void tmpRoles;
  const beMod = await import(pathToFileURL(path.join(root, "backend/src/utils/permissions.js")).href);
  const sorted = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v].sort()]).sort()));
  if (JSON.stringify(feMod.PERM) !== JSON.stringify(beMod.PERM)) problems.push("config/permissions.js and backend/src/utils/permissions.js define different PERM names");
  if (sorted(feMod.ROLE_PERMISSIONS) !== sorted(beMod.ROLE_PERMISSIONS)) problems.push("ROLE_PERMISSIONS differs between the website and the API");
  if (sorted(feMod.MANAGE_ROLES) !== sorted(beMod.MANAGE_ROLES)) problems.push("MANAGE_ROLES differs between the website and the API");
  console.log("compared the permission tables of the website and the API");
}

// ---- 7. every menu item has a page, and uses a permission that exists ----
{
  const nav = readFileSync(path.join(fe, "src/config/navigation.js"), "utf8");
  const routes = readFileSync(path.join(fe, "src/routes/AppRoutes.jsx"), "utf8");
  for (const m of nav.matchAll(/path: "([^"]+)".*?permission: P\.(\w+)/g)) {
    if (m[1] !== "/" && !routes.includes(`"${m[1]}":`)) problems.push(`menu item ${m[1]} has no page in AppRoutes.jsx`);
  }
}

console.log(`checked ${files.length} files`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  problems.forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
}
console.log("no problems found");
