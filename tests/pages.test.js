// Static checks on the HTML pages: every file a page references exists, every id a page script
// looks up exists in the HTML, and every link between pages points at a real page.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pages = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("all 10 screens exist as their own HTML page", () => {
  const expected = ["index", "login", "signup", "forgot", "group-setup", "dashboard", "history", "add-expense", "record-payment", "expense-detail"];
  for (const name of expected) assert.ok(pages.includes(`${name}.html`), `${name}.html is missing`);
});

for (const page of pages) {
  test(`${page}: assets, ids and links are consistent`, () => {
    const html = read(page);
    assert.match(html, /<main class="app/, "has a <main> screen container");

    // CSS / script files exist
    const assets = [...html.matchAll(/(?:href|src)="((?:css|js)\/[^"]+)"/g)].map((m) => m[1]);
    assert.ok(assets.length >= 2);
    for (const a of assets) assert.ok(fs.existsSync(path.join(root, a)), `${page} references missing file ${a}`);

    // links to other pages exist
    for (const m of html.matchAll(/href="([\w-]+\.html)(?:\?[^"]*)?"/g))
      assert.ok(pages.includes(m[1]), `${page} links to missing page ${m[1]}`);

    // every id the page script reads exists in the HTML
    const script = html.match(/src="(js\/pages\/[^"]+)"/)[1];
    const js = read(script);
    // ids may also be created by the script itself (e.g. the Delete button on the details page)
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g), ...js.matchAll(/\sid="([^"$]+)"/g)].map((m) => m[1]));
    const used = [...js.matchAll(/\$\("([\w-]+)"\)/g)].map((m) => m[1]);
    for (const id of used) assert.ok(ids.has(id), `${script} uses #${id} but ${page} has no such id`);
    for (const m of js.matchAll(/showContent\("([\w-]+)"\)/g)) assert.ok(ids.has(m[1]), `${script}: showContent #${m[1]} missing`);
    // loading placeholder is removable on private pages
    if (js.includes("showContent")) assert.ok(ids.has("loading"), `${page} needs #loading`);
  });
}

test("no duplicate ids inside a page", () => {
  for (const page of pages) {
    const ids = [...read(page).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${page} has duplicate ids`);
  }
});

test("every module import in js/ resolves to a real file", () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(path.join(root, "js"))) {
    for (const m of fs.readFileSync(f, "utf8").matchAll(/from\s+"(\.[^"]+)"/g))
      assert.ok(fs.existsSync(path.resolve(path.dirname(f), m[1])), `${path.relative(root, f)} imports missing ${m[1]}`);
  }
});
