import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const packageRoot = resolve(process.argv[2] ?? "node_modules/braces");
const braces = require(`${packageRoot}/index.js`);
const depthError = { name: "SyntaxError", message: "Brace nesting exceeds maximum depth (256)" };

assert.deepEqual(braces.expand("src/{app,lib}/{a,b}.js"), [
  "src/app/a.js",
  "src/app/b.js",
  "src/lib/a.js",
  "src/lib/b.js",
]);
assert.equal(braces.compile("src/{app,{lib,test}}/{1..3}.js"), "src/(app|(lib|test))/([1-3]).js");
assert.deepEqual(braces.expand("v{01..03}"), ["v01", "v02", "v03"]);
assert.equal(braces.stringify(braces.parse("a/{b,c}/d")), "a/{b,c}/d");
assert.deepEqual(braces.expand("\\{literal\\}"), ["{literal}"]);
assert.deepEqual(braces.expand('"{literal}"'), ["{literal}"]);
const nestedBraces = "{".repeat(256) + "x" + "}".repeat(256);
assert.equal(braces.compile(nestedBraces), nestedBraces);
assert.deepEqual(braces.expand(nestedBraces), [nestedBraces]);
assert.equal(
  braces.compile("(".repeat(256) + "x" + ")".repeat(256)),
  "(".repeat(256) + "x" + ")".repeat(256),
);

for (const [open, close] of [
  ["{", "}"],
  ["(", ")"],
  ["{(", ")}"],
]) {
  const pattern = open.repeat(4000 / open.length) + "x" + close.repeat(4000 / close.length);
  for (const operation of [braces, braces.parse, braces.compile, braces.expand, braces.stringify]) {
    assert.throws(
      () => operation(pattern, { maxDepth: Infinity, maxLength: Infinity }),
      depthError,
    );
  }
  assert.throws(() => braces.parse(open.repeat(4000 / open.length)), depthError);
}

let deepAst = { type: "text", value: "x" };
for (let i = 0; i < 5000; i++) deepAst = { type: "paren", nodes: [deepAst] };
const cyclicAst = { type: "root", nodes: [] };
cyclicAst.nodes.push(cyclicAst);
for (const ast of [deepAst, cyclicAst]) {
  for (const operation of [braces.compile, braces.expand, braces.stringify]) {
    assert.throws(() => operation(ast, { maxDepth: Infinity }), depthError);
  }
}

console.log(`Verified bounded braces recursion: ${packageRoot}`);
