import fs from "fs";
import path from "path";
import * as acorn from "acorn";

const BROWSER_GLOBALS = new Set([
  "window",
  "document",
  "console",
  "Math",
  "performance",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "Object",
  "Array",
  "String",
  "Number",
  "Boolean",
  "Set",
  "Map",
  "WeakMap",
  "WeakSet",
  "Promise",
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "Float32Array",
  "Float64Array",
  "Int8Array",
  "Int16Array",
  "Int32Array",
  "Uint8Array",
  "Uint16Array",
  "Uint32Array",
  "Uint8ClampedArray",
  "AudioContext",
  "webkitAudioContext",
  "OfflineAudioContext",
  "URLSearchParams",
  "location",
  "navigator",
  "screen",
  "history",
  "CustomEvent",
  "Event",
  "MutationObserver",
  "IntersectionObserver",
  "JSON",
  "Date",
  "RegExp",
  "Infinity",
  "NaN",
  "undefined",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "encodeURIComponent",
  "decodeURIComponent",
  "fetch",
  "URL",
  "Blob",
  "File",
  "FileReader",
  "ImageData",
  "Image",
  "Audio",
  "CanvasRenderingContext2D",
  "WebGLRenderingContext",
  "WebGL2RenderingContext",
]);

function getScopeBindings(node, bindings = new Set()) {
  if (!node) return bindings;
  if (node.type === "VariableDeclaration") {
    for (const decl of node.declarations) {
      if (decl.id.type === "Identifier") bindings.add(decl.id.name);
      else if (decl.id.type === "ObjectPattern") {
        for (const prop of decl.id.properties) {
          if (prop.value?.type === "Identifier") bindings.add(prop.value.name);
          else if (prop.key?.type === "Identifier") bindings.add(prop.key.name);
        }
      } else if (decl.id.type === "ArrayPattern") {
        for (const elem of decl.id.elements) {
          if (elem?.type === "Identifier") bindings.add(elem.name);
        }
      }
    }
  } else if (node.type === "FunctionDeclaration") {
    if (node.id) bindings.add(node.id.name);
  } else if (node.type === "ClassDeclaration") {
    if (node.id) bindings.add(node.id.name);
  } else if (node.type === "ImportDeclaration") {
    for (const spec of node.specifiers) {
      bindings.add(spec.local.name);
    }
  }
  return bindings;
}

const files = fs.readdirSync("src").filter((f) => f.endsWith(".js"));

for (const file of files) {
  const code = fs.readFileSync(path.join("src", file), "utf-8");
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module" });
  } catch (err) {
    console.error(`Syntax error in ${file}:`, err.message);
    continue;
  }

  // Collect top-level bindings
  const topBindings = new Set();
  for (const stmt of ast.body) {
    getScopeBindings(stmt, topBindings);
  }

  // Find all identifier references
  const undeclared = new Set();

  function walk(node, scope = new Set()) {
    if (!node) return;
    const currentScope = new Set(scope);

    if (
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression"
    ) {
      for (const param of node.params) {
        if (param.type === "Identifier") currentScope.add(param.name);
        else if (param.type === "AssignmentPattern" && param.left.type === "Identifier")
          currentScope.add(param.left.name);
        else if (param.type === "RestElement" && param.argument.type === "Identifier")
          currentScope.add(param.argument.name);
        else if (param.type === "ObjectPattern") {
          for (const prop of param.properties) {
            if (prop.value?.type === "Identifier") currentScope.add(prop.value.name);
          }
        }
      }
      if (node.id && node.type === "FunctionExpression") currentScope.add(node.id.name);
    } else if (node.type === "CatchClause") {
      if (node.param?.type === "Identifier") currentScope.add(node.param.name);
    } else if (
      node.type === "ForStatement" ||
      node.type === "ForInStatement" ||
      node.type === "ForOfStatement"
    ) {
      if (node.init?.type === "VariableDeclaration" || node.left?.type === "VariableDeclaration") {
        getScopeBindings(node.init || node.left, currentScope);
      }
    } else if (node.type === "BlockStatement") {
      for (const stmt of node.body) {
        if (stmt.type === "VariableDeclaration" && stmt.kind !== "var") {
          getScopeBindings(stmt, currentScope);
        } else if (stmt.type === "FunctionDeclaration") {
          currentScope.add(stmt.id.name);
        }
      }
    }

    if (node.type === "VariableDeclaration" && node.kind === "var") {
      getScopeBindings(node, topBindings);
    }

    if (node.type === "Identifier") {
      const name = node.name;
      if (!currentScope.has(name) && !topBindings.has(name) && !BROWSER_GLOBALS.has(name)) {
        undeclared.add(name);
      }
    }

    // Traverse children
    for (const key of Object.keys(node)) {
      if (key === "property" && !node.computed && node.type === "MemberExpression") continue;
      if (key === "key" && !node.computed && node.type === "Property") continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c.type === "string") walk(c, currentScope);
        }
      } else if (child && typeof child.type === "string") {
        walk(child, currentScope);
      }
    }
  }

  for (const stmt of ast.body) {
    walk(stmt);
  }

  // Filter out any bindings that were added to topBindings later (due to hoisting)
  const realUndeclared = [...undeclared].filter((name) => !topBindings.has(name));
  if (realUndeclared.length > 0) {
    console.log(`[${file}] Undeclared identifiers:`, realUndeclared);
  }
}
console.log("AST analysis complete.");
