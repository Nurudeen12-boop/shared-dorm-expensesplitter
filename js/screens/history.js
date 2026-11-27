import { formatNaira, formatDate, myPositionInExpense } from "../calc.js";
import { icons, esc } from "../ui.js";
import { label, myId } from "../state.js";
import { openDrawer } from "./drawer.js";
import { deletePayment } from "../db.js";
import { toast } from "../ui.js";

let filter = "all";      // all | unpaid | settled
let sort = "recent";     // recent | oldest | highest
let panelOpen = true;

export function render(root, ctx) {
  const { state } = ctx;
  const draw = () => {
    const me = myId();
    const ledger = state.ledger;
    const rows = state.expenses.map((e) => ({ e, settled: ledger.expenseStatus[e.id]?.settled ?? true, pos: myPositionInExpense(e, ledger, me) }));
    const unpaid = rows.filter((r) => !r.settled).length;
    let list = rows.filter((r) => filter === "all" || (filter === "unpaid" ? !r.settled : r.settled));
    const key = (r) => r.e.billDate + String(r.e.createdAtMs).padStart(15, "0");
    list.sort((a, b) =>
      sort === "highest" ? b.e.totalKobo - a.e.totalKobo : sort === "oldest" ? key(a).localeCompare(key(b)) : key(b).localeCompare(key(a)));
    const payments = [...state.payments].sort((a, b) => (b.paymentDate + b.createdAtMs).localeCompare(a.paymentDate + a.createdAtMs));

    const line = (r) => {
      const { role, amount, share } = r.pos;
      if (role === "payer") return amount > 0 ? `You're owed: ${formatNaira(amount)}` : "You paid · fully repaid";
      if (role === "owes") return amount > 0 ? `You owe: ${formatNaira(amount)}` : `Your share: ${formatNaira(share)} · paid`;
      return "You're not part of this one";
    };

    root.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" id="menu" aria-label="Open menu">${icons.menu}</button>
        <span></span><span></span>
      </header>
      <div class="history-head">
        <h1>History</h1>
        <button class="chip" id="filterBtn" aria-expanded="${panelOpen}">${icons.filter} Filter</button>
      </div>
      <div id="panel" class="${panelOpen ? "" : "hidden"}">
        <p style="font-weight:600">Filters:</p>
        <div class="chips" role="group" aria-label="Filter expenses">
          ${[["all", "All"], ["unpaid", "Unpaid"], ["settled", "Settled"]]
            .map(([k, t]) => `<button class="chip ${filter === k ? "on" : "off"}" data-f="${k}" aria-pressed="${filter === k}">${filter === k ? icons.info : ""}${t}</button>`).join("")}
        </div>
        <label class="sortline">Sort:
          <select id="sort" aria-label="Sort expenses">
            <option value="recent" ${sort === "recent" ? "selected" : ""}>Most recent</option>
            <option value="oldest" ${sort === "oldest" ? "selected" : ""}>Oldest first</option>
            <option value="highest" ${sort === "highest" ? "selected" : ""}>Highest amount</option>
          </select>
        </label>
      </div>

      <h2 class="section-title">Past Expenses</h2>
      ${list.length ? list.map((r) => `
        <button class="hist-item" data-open="${r.e.id}">
          <span class="tile">₦</span>
          <span class="meta"><b>${esc(r.e.name)} • ${esc(formatDate(r.e.billDate))}</b>
            <small>Total: ${formatNaira(r.e.totalKobo)} • ${r.e.participants.length} ways • ${line(r)}</small></span>
          <span class="badge">${r.settled ? icons.settled + "Settled" : icons.alert + "Unpaid"}</span>
        </button>`).join("")
        : `<p class="empty">${rows.length ? "No expenses match this filter." : "No expenses yet. Add one from the dashboard."}</p>`}

      <span class="summary-pill">${rows.length} expenses • ${unpaid} unpaid • ${rows.length - unpaid} settled</span>
      <p class="footnote">Tap an entry to view details</p>

      ${payments.length ? `<h2 class="section-title" style="margin-top:26px">Recorded payments</h2>
        <div class="card">${payments.map((p) => `
          <div class="row">
            <span class="grow">${esc(label(p.fromMemberId))} paid ${esc(label(p.toMemberId))} <b>${formatNaira(p.amountKobo)}</b><br>
              <small class="muted">${esc(formatDate(p.paymentDate))} • ${esc(p.method || "Other")}${p.note ? " • " + esc(p.note) : ""}</small></span>
            ${p.createdBy === me ? `<button class="link small" data-undo="${p.id}">Undo</button>` : ""}
          </div>`).join("")}</div>` : ""}`;

    const $ = (s) => root.querySelector(s);
    $("#menu").onclick = () => openDrawer(ctx);
    $("#filterBtn").onclick = () => { panelOpen = !panelOpen; draw(); };
    $("#sort").onchange = (e) => { sort = e.target.value; draw(); };
    root.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { filter = b.dataset.f; draw(); }));
    root.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => ctx.go(`expense/${b.dataset.open}`)));
    root.querySelectorAll("[data-undo]").forEach((b) => (b.onclick = async () => {
      if (!confirm("Undo this payment? Balances will be recalculated.")) return;
      try { await deletePayment(state.profile.groupId, b.dataset.undo); toast("Payment removed"); }
      catch { toast("Couldn't remove the payment."); }
    }));
  };
  ctx.onData = draw;
  draw();
}
