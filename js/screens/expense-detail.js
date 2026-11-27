// NEW screen (not in the Figma file): the History screen says "Tap an entry to view details".
import { formatNaira, formatDate } from "../calc.js";
import { icons, esc, initial } from "../ui.js";
import { myId, label, plainName } from "../state.js";
import { deleteExpense } from "../db.js";
import { toast } from "../ui.js";

export function render(root, ctx, args) {
  const { state } = ctx;
  const draw = () => {
    const e = state.expenses.find((x) => x.id === args[0]);
    if (!e) { toast("That expense no longer exists."); return ctx.go("history"); }
    const me = myId();
    const status = state.ledger.expenseStatus[e.id];
    const rows = state.ledger.shareRows.filter((r) => r.expenseId === e.id);
    const settled = status?.settled ?? true;

    root.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" id="back" aria-label="Go back">${icons.back}</button>
        <h1>Expense</h1><span></span>
      </header>
      <section class="card">
        <p class="muted">${esc(formatDate(e.billDate))}</p>
        <h2 style="margin:4px 0">${esc(e.name)}</h2>
        <div class="detail-total">${formatNaira(e.totalKobo)}</div>
        <p style="margin:8px 0 12px">Paid by <b>${esc(label(e.createdBy))}</b> • split ${e.participants.length} ways</p>
        <span class="badge" style="width:fit-content">${settled ? icons.settled + "Settled" : icons.alert + "Unpaid"}</span>
      </section>
      <section class="card">
        <h2>Shares</h2>
        ${e.participants.map((id) => {
          const share = e.shares[id] ?? 0;
          const r = rows.find((x) => x.debtor === id);
          const note = id === e.createdBy ? "Paid the bill" : r && r.paid >= r.owed ? "Paid" : r && r.paid > 0 ? `Paid ${formatNaira(r.paid)} so far` : "Not paid yet";
          return `<div class="row"><span class="avatar">${esc(initial(plainName(id)))}</span>
            <span class="grow">${esc(label(id))}<br><small class="muted">${note}</small></span><b>${formatNaira(share)}</b></div>`;
        }).join("")}
      </section>
      ${e.createdBy === me ? `<div class="btn-row"><button class="btn" id="edit">Edit</button><button class="btn danger" id="del">Delete</button></div>` : `<p class="footnote">Only ${esc(label(e.createdBy))} can edit this expense.</p>`}`;

    const $ = (s) => root.querySelector(s);
    $("#back").onclick = () => ctx.go("history");
    $("#edit")?.addEventListener("click", () => ctx.go(`add/${e.id}`));
    $("#del")?.addEventListener("click", async () => {
      if (!confirm(`Delete “${e.name}”? Balances will be recalculated.`)) return;
      try { await deleteExpense(state.profile.groupId, e.id); toast("Expense deleted"); ctx.go("history"); }
      catch { toast("Couldn't delete. Try again."); }
    });
  };
  ctx.onData = draw;
  draw();
}
