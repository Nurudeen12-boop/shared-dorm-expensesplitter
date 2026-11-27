import { test } from "node:test";
import assert from "node:assert/strict";
import { toKobo, formatNaira, splitEqual, computeLedger, myPositionInExpense, relativeDay } from "../js/calc.js";

test("toKobo parses valid amounts and rejects bad ones", () => {
  assert.equal(toKobo("80"), 8000);
  assert.equal(toKobo("80.5"), 8050);
  assert.equal(toKobo("₦1,200.50"), 120050);
  assert.equal(toKobo("0.1") + toKobo("0.2"), 30);
  assert.equal(toKobo("abc"), null);
  assert.equal(toKobo("12.345"), null);
  assert.equal(toKobo(""), null);
  assert.equal(toKobo("-5"), null);
});

test("formatNaira", () => {
  assert.equal(formatNaira(8000), "₦80.00");
  assert.equal(formatNaira(120050), "₦1,200.50");
  assert.equal(formatNaira(5), "₦0.05");
});

test("splitEqual: ₦80 among 4 = ₦20 each (the Add Expense screen)", () => {
  const s = splitEqual(8000, ["a", "b", "c", "d"]);
  assert.deepEqual(Object.values(s), [2000, 2000, 2000, 2000]);
});

test("splitEqual: remainder kobo is distributed and shares always sum to total", () => {
  const s = splitEqual(10000, ["a", "b", "c"]);
  assert.deepEqual(Object.values(s), [3334, 3333, 3333]);
  assert.equal(Object.values(s).reduce((x, y) => x + y, 0), 10000);
});

function dashboardScenario() {
  const expenses = [
    { id: "e1", name: "Dinner", createdBy: "tolu", billDate: "2024-10-10", createdAtMs: 1, shares: { tolu: 2500, alex: 2500, jamie: 3000 } },
    { id: "e2", name: "Groceries", createdBy: "maya", billDate: "2024-10-11", createdAtMs: 2, shares: { maya: 1250, tolu: 1250 } },
  ];
  return { expenses, payments: [] };
}

test("ledger: who owes whom and total balance (Dashboard screen)", () => {
  const { expenses, payments } = dashboardScenario();
  const l = computeLedger(expenses, payments);
  const find = (f, t) => l.pairNet.find((p) => p.from === f && p.to === t)?.amount;
  assert.equal(find("alex", "tolu"), 2500);
  assert.equal(find("jamie", "tolu"), 3000);
  assert.equal(find("tolu", "maya"), 1250);
  // 25 + 30 - 12.50 = 42.50 -> Tolu is OWED overall (the mock-up wrongly says "Tolu owes overall")
  assert.equal(l.balanceOf("tolu"), 4250);
  assert.equal(l.balanceOf("alex"), -2500);
});

test("ledger: a payment settles the oldest expense first", () => {
  const expenses = [
    { id: "old", createdBy: "tolu", billDate: "2024-10-01", createdAtMs: 1, shares: { tolu: 1000, alex: 1000 } },
    { id: "new", createdBy: "tolu", billDate: "2024-10-05", createdAtMs: 2, shares: { tolu: 1000, alex: 1000 } },
  ];
  const payments = [{ id: "p1", fromMemberId: "alex", toMemberId: "tolu", amountKobo: 1000 }];
  const l = computeLedger(expenses, payments);
  assert.equal(l.expenseStatus.old.settled, true);
  assert.equal(l.expenseStatus.new.settled, false);
  assert.equal(l.balanceOf("tolu"), 1000);
  assert.equal(myPositionInExpense(expenses[1], l, "alex").amount, 1000);
  assert.equal(myPositionInExpense(expenses[1], l, "tolu").role, "payer");
});

test("ledger: debts in opposite directions cancel out", () => {
  const expenses = [
    { id: "a", createdBy: "tolu", billDate: "2024-10-01", createdAtMs: 1, shares: { tolu: 500, alex: 500 } },
    { id: "b", createdBy: "alex", billDate: "2024-10-02", createdAtMs: 2, shares: { tolu: 800, alex: 800 } },
  ];
  const l = computeLedger(expenses, []);
  assert.equal(l.pairNet.length, 1);
  assert.deepEqual(l.pairNet[0], { from: "tolu", to: "alex", amount: 300 });
});

test("ledger: overpayment flips the balance instead of being lost", () => {
  const expenses = [{ id: "a", createdBy: "tolu", billDate: "2024-10-01", createdAtMs: 1, shares: { tolu: 500, alex: 500 } }];
  const l = computeLedger(expenses, [{ fromMemberId: "alex", toMemberId: "tolu", amountKobo: 700 }]);
  assert.equal(l.expenseStatus.a.settled, true);
  assert.deepEqual(l.pairNet[0], { from: "tolu", to: "alex", amount: 200 });
});

test("relativeDay", () => {
  const now = new Date(2024, 9, 13);
  assert.equal(relativeDay("2024-10-13", now), "Today");
  assert.equal(relativeDay("2024-10-12", now), "Yesterday");
  assert.equal(relativeDay("2024-10-10", now), "3 days ago");
  assert.equal(relativeDay("2024-09-01", now), "Sep 1, 2024");
});
