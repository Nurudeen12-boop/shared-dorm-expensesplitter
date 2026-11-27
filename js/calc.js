// Pure calculation logic. No Firebase, no DOM - so it is easy to test.
// All money is handled as integer KOBO (1 naira = 100 kobo) to avoid
// floating-point errors (e.g. 0.1 + 0.2). Convert only at the screen edge.

/** "1,200.50" | "80" | "₦80.00" -> 120050 | 8000 | 8000. Returns null if invalid. */
export function toKobo(input) {
  if (input === null || input === undefined) return null;
  const cleaned = String(input).replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return parseInt(whole, 10) * 100 + parseInt((frac + "00").slice(0, 2), 10);
}

/** 8000 -> "₦80.00", 120050 -> "₦1,200.50" */
export function formatNaira(kobo) {
  const sign = kobo < 0 ? "-" : "";
  const abs = Math.abs(Math.round(kobo));
  const whole = Math.floor(abs / 100).toLocaleString("en-NG");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}₦${whole}.${frac}`;
}

/**
 * Equal split. The remainder (in kobo) is handed out one kobo at a time to the
 * first people in the list, so the shares always add up to the total exactly.
 * @returns {Object<string, number>} memberId -> kobo
 */
export function splitEqual(totalKobo, memberIds) {
  const n = memberIds.length;
  if (n === 0) return {};
  const base = Math.floor(totalKobo / n);
  const remainder = totalKobo - base * n;
  const shares = {};
  memberIds.forEach((id, i) => {
    shares[id] = base + (i < remainder ? 1 : 0);
  });
  return shares;
}

const sortKey = (e) => `${e.billDate || ""}|${String(e.createdAtMs || 0).padStart(15, "0")}`;

/**
 * Builds the full ledger from expenses + payments.
 *
 * Rules
 *  - The member who created an expense (createdBy) paid the bill up front.
 *  - Every other participant owes that person their share.
 *  - A payment (from -> to) reduces what `from` owes `to`. Payments are applied
 *    to the oldest shares first, so older expenses become "Settled" first.
 */
export function computeLedger(expenses, payments) {
  const ordered = [...expenses].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));

  // Group shares by debtor->creditor direction (oldest first)
  const byPair = new Map();
  for (const e of ordered) {
    for (const [debtor, owed] of Object.entries(e.shares || {})) {
      if (debtor === e.createdBy || owed <= 0) continue;
      const key = `${debtor}>${e.createdBy}`;
      if (!byPair.has(key)) byPair.set(key, []);
      byPair.get(key).push({ expenseId: e.id, debtor, creditor: e.createdBy, owed, paid: 0 });
    }
  }

  // Total payments per direction
  const paidTotals = new Map();
  for (const p of payments) {
    const key = `${p.fromMemberId}>${p.toMemberId}`;
    paidTotals.set(key, (paidTotals.get(key) || 0) + p.amountKobo);
  }

  // FIFO allocation of payments to shares
  const shareRows = [];
  for (const [key, rows] of byPair) {
    let remaining = paidTotals.get(key) || 0;
    for (const r of rows) {
      r.paid = Math.min(r.owed, remaining);
      remaining -= r.paid;
      shareRows.push(r);
    }
  }

  // Per-expense status
  const expenseStatus = {};
  for (const e of expenses) expenseStatus[e.id] = { settled: true, owed: 0, paid: 0 };
  for (const r of shareRows) {
    const s = expenseStatus[r.expenseId];
    s.owed += r.owed;
    s.paid += r.paid;
    s.settled = s.paid >= s.owed;
  }

  // Net balance per pair of people: positive => a owes b
  const gross = new Map();
  const add = (a, b, amt) => gross.set(`${a}>${b}`, (gross.get(`${a}>${b}`) || 0) + amt);
  for (const e of expenses) {
    for (const [debtor, owed] of Object.entries(e.shares || {})) {
      if (debtor !== e.createdBy) add(debtor, e.createdBy, owed);
    }
  }
  for (const p of payments) add(p.fromMemberId, p.toMemberId, -p.amountKobo);

  const seen = new Set();
  const pairNet = [];
  for (const key of gross.keys()) {
    const [a, b] = key.split(">");
    const id = [a, b].sort().join("|");
    if (seen.has(id)) continue;
    seen.add(id);
    const net = (gross.get(`${a}>${b}`) || 0) - (gross.get(`${b}>${a}`) || 0);
    if (net > 0) pairNet.push({ from: a, to: b, amount: net });
    else if (net < 0) pairNet.push({ from: b, to: a, amount: -net });
  }

  /** Positive => the member is owed money overall. Negative => the member owes. */
  const balanceOf = (memberId) =>
    pairNet.reduce((sum, p) => (p.to === memberId ? sum + p.amount : p.from === memberId ? sum - p.amount : sum), 0);

  return { shareRows, expenseStatus, pairNet, balanceOf };
}

/** What a given member sees on a history row. */
export function myPositionInExpense(expense, ledger, myId) {
  const rows = ledger.shareRows.filter((r) => r.expenseId === expense.id);
  if (expense.createdBy === myId) {
    const owedToMe = rows.reduce((s, r) => s + (r.owed - r.paid), 0);
    return { role: "payer", amount: owedToMe };
  }
  const mine = rows.find((r) => r.debtor === myId);
  if (mine) return { role: "owes", amount: mine.owed - mine.paid, share: mine.owed };
  return { role: "none", amount: 0 };
}

/** ISO date (YYYY-MM-DD) for today in the user's local time. */
export function todayISO(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "2024-10-12" -> "Oct 12, 2024" */
export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "Today" | "Yesterday" | "3 days ago" | "Oct 12, 2024" */
export function relativeDay(iso, now = new Date()) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const a = new Date(y, m - 1, d);
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((b - a) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return formatDate(iso);
}
