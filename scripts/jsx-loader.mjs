// Lets Node run the website's source as it is, for scripts/smoke-render.mjs: finds files without their
// extension, turns JSX into plain JavaScript, answers import.meta.env, and ignores .css files.
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const fe = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "frontend");
const require = createRequire(path.join(fe, "package.json"));
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const EXT = ["", ".js", ".jsx", "/index.js", "/index.jsx"];

export async function resolve(specifier, context, next) {
  if (/\.css$/.test(specifier)) return { url: "data:text/javascript,export default {}", shortCircuit: true };
  if ((specifier.startsWith(".") || specifier.startsWith("/")) && context.parentURL?.startsWith("file:")) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    for (const e of EXT) {
      const file = base + e;
      if (existsSync(file) && statSync(file).isFile()) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}

const jsxName = (n) => (t.isJSXIdentifier(n) ? (/^[a-z]/.test(n.name) ? t.stringLiteral(n.name) : t.identifier(n.name)) : t.isJSXMemberExpression(n) ? t.memberExpression(jsxName(n.object), t.identifier(n.property.name)) : t.stringLiteral(n.name));

function text(value) {
  const lines = value.split(/\r\n|\n|\r/);
  const out = lines.map((l, i) => {
    let s = l.replace(/\t/g, " ");
    if (i !== 0) s = s.replace(/^ +/, "");
    if (i !== lines.length - 1) s = s.replace(/ +$/, "");
    return s;
  }).filter(Boolean).join(" ");
  return out;
}

function toJs(code, file) {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
  const create = t.memberExpression(t.identifier("__React"), t.identifier("createElement"));
  const children = (list) =>
    list.flatMap((c) => {
      if (t.isJSXText(c)) { const s = text(c.value); return s ? [t.stringLiteral(s)] : []; }
      if (t.isJSXExpressionContainer(c)) return t.isJSXEmptyExpression(c.expression) ? [] : [c.expression];
      if (t.isJSXSpreadChild(c)) return [c.expression];
      return [c];
    });
  traverse(ast, {
    JSXElement: { exit(p) {
      const { openingElement: o, children: kids } = p.node;
      const props = o.attributes.map((a) => t.isJSXSpreadAttribute(a) ? t.spreadElement(a.argument)
        : t.objectProperty(/^[A-Za-z_$][\w$]*$/.test(a.name.name) ? t.identifier(a.name.name) : t.stringLiteral(a.name.name),
            a.value === null ? t.booleanLiteral(true) : t.isJSXExpressionContainer(a.value) ? a.value.expression : a.value));
      p.replaceWith(t.callExpression(create, [jsxName(o.name), props.length ? t.objectExpression(props) : t.nullLiteral(), ...children(kids)]));
    } },
    JSXFragment: { exit(p) {
      p.replaceWith(t.callExpression(create, [t.memberExpression(t.identifier("__React"), t.identifier("Fragment")), t.nullLiteral(), ...children(p.node.children)]));
    } },
  });
  let out = generate(ast).code;
  out = `import __React from "react";\n${out}`;
  return out.replace(/import\.meta\.env/g, '({ VITE_MOCK_AUTH: "false", VITE_API_URL: "/api", DEV: false })');
}

export async function load(url, context, next) {
  if (url.startsWith("file:") && /\/frontend\/src\/.*\.jsx?$/.test(url)) {
    const file = fileURLToPath(url);
    return { format: "module", shortCircuit: true, source: toJs(readFileSync(file, "utf8"), file) };
  }
  return next(url, context);
}
