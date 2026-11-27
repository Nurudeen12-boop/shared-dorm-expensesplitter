// Smoke test: every screen renders without throwing, and the numbers on screen match the ledger.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
register("./stub-loader.mjs", import.meta.url);

const stub = () => {
  const fn = function () {};
  return new Proxy(fn, {
    get: (t, p) => {
      if (p === Symbol.toPrimitive) return () => "";
      if (p === "then") return undefined;
      if (["value", "textContent", "innerHTML", "className", "id"].includes(p)) return t[p] ?? "";
      if (["checked", "disabled"].includes(p)) return !!t[p];
      if (p === "dataset") return {};
      return t[p] ?? (() => stub());
    },
    set: (t, p, v) => { t[p] = v; return true; },
    apply: () => stub(),
  });
};
const store = {};
globalThis.document = { getElementById: () => stub(), createElement: () => stub(), body: { appendChild() {} }, addEventListener() {} };
globalThis.window = { scrollTo() {}, prompt() {}, addEventListener() {} };
globalThis.location = { hash: "#/dashboard", origin: "https://x.app", pathname: "/", search: "" };
globalThis.history = { replaceState() {}, back() {}, length: 2 };
globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
globalThis.confirm = () => true;

const { state, recompute } = await import("../js/state.js");
const makeRoot = () => ({ innerHTML: "", className: "", querySelector: () => stub(), querySelectorAll: () => [] });
const makeCtx = () => ({ state, onData: null, go() {}, groupChosen() {} });

// Scenario from the Dashboard mock-up
state.user = { uid: "tolu" };
state.profile = { name: "Tolu Ade", groupId: "g1" };
state.group = { id: "g1", name: "Room 12B", adminUid: "tolu" };
state.members = ["tolu:Tolu", "alex:Alex", "maya:Maya", "jamie:Jamie"].map((s) => ({ id: s.split(":")[0], name: s.split(":")[1] }));
state.expenses = [
  { id: "e1", name: "Dinner", totalKobo: 8000, createdBy: "tolu", billDate: "2026-11-24", createdAtMs: 2, participants: ["tolu", "alex", "maya", "jamie"], shares: { tolu: 2000, alex: 2000, maya: 2000, jamie: 2000 } },
  { id: "e2", name: "Groceries", totalKobo: 4500, createdBy: "maya", billDate: "2026-11-23", createdAtMs: 1, participants: ["maya", "tolu", "alex"], shares: { maya: 1500, tolu: 1500, alex: 1500 } },
];
state.payments = [{ id: "p1", fromMemberId: "alex", toMemberId: "tolu", amountKobo: 2000, paymentDate: "2026-11-25", method: "Cash", note: "", createdBy: "tolu", createdAtMs: 3 }];
recompute();

const screens = ["welcome", "login", "signup", "forgot", "group-setup", "dashboard", "history", "add-expense", "record-payment", "expense-detail"];
for (const name of screens) {
  test(`screen renders: ${name}`, async () => {
    const mod = await import(`../js/screens/${name}.js`);
    const root = makeRoot();
    mod.render(root, makeCtx(), name === "expense-detail" ? ["e1"] : []);
    assert.ok(root.innerHTML.length > 100, "rendered markup");
    assert.ok(!/undefined|NaN|\[object/.test(root.innerHTML), "no undefined/NaN leaks into the markup");
  });
}

test("dashboard shows the right balance and who-owes-whom", async () => {
  const { render } = await import("../js/screens/dashboard.js");
  const root = makeRoot();
  render(root, makeCtx());
  // Maya owes Tolu 20 (dinner) but Tolu owes Maya 15 (groceries) -> net 5; Jamie owes 20; Alex paid his 20 back -> Tolu is owed 25
  assert.match(root.innerHTML, /₦25\.00/);
  assert.match(root.innerHTML, /You are owed overall/);
  assert.match(root.innerHTML, /Maya → You|Jamie → You/);
});

test("history shows status badges and the summary line", async () => {
  const { render } = await import("../js/screens/history.js");
  const root = makeRoot();
  render(root, makeCtx());
  assert.match(root.innerHTML, /2 expenses • 2 unpaid • 0 settled/);
  assert.match(root.innerHTML, /Recorded payments/);
});
