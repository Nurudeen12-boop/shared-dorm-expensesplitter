// Expense details: expense-detail.html?id=EXPENSE_ID
import { requireSession, onData, redirect, showContent, $ } from "../session.js";
import { formatNaira, formatDate } from "../calc.js";
import { icons, esc, initial, toast } from "../ui.js";
import { myId, label, plainName } from "../state.js";
import { deleteExpense } from "../db.js";

const state = await requireSession();
const id = new URLSearchParams(location.search).get("id");

function draw() {
  const e = state.expenses.find((x) => x.id === id);
  if (!e) {
    toast("That expense no longer exists.");
    redirect("history.html");
    return;
  }
  const me = myId();
  const rows = state.ledger.shareRows.filter((r) => r.expenseId === e.id);
  const settled = state.ledger.expenseStatus[e.id]?.settled ?? true;

  $("e-date").textContent = formatDate(e.billDate);
  $("e-name").textContent = e.name;
  $("e-total").textContent = formatNaira(e.totalKobo);
  $("e-paidby").innerHTML = `Paid by <b>${esc(label(e.createdBy))}</b> • split ${e.participants.length} ways`;
  $("e-badge").innerHTML = settled ? icons.settled + "Settled" : icons.alert + "Unpaid";

  $("shares").innerHTML = e.participants.map((pid) => {
    const share = e.shares[pid] ?? 0;
    const r = rows.find((x) => x.debtor === pid);
    const note = pid === e.createdBy ? "Paid the bill"
      : r && r.paid >= r.owed ? "Paid"
      : r && r.paid > 0 ? `Paid ${formatNaira(r.paid)} so far` : "Not paid yet";
    return `<div class="row"><span class="avatar">${esc(initial(plainName(pid)))}</span>
      <span class="grow">${esc(label(pid))}<br><small class="muted">${note}</small></span><b>${formatNaira(share)}</b></div>`;
  }).join("");

  $("actions").innerHTML = e.createdBy === me
    ? `<div class="btn-row"><a class="btn" href="add-expense.html?id=${e.id}">Edit</a><button class="btn danger" id="del" type="button">Delete</button></div>`
    : `<p class="footnote">Only ${esc(label(e.createdBy))} can edit this expense.</p>`;
  $("del")?.addEventListener("click", async () => {
    if (!confirm(`Delete “${e.name}”? Balances will be recalculated.`)) return;
    try { await deleteExpense(state.profile.groupId, e.id); redirect("history.html"); }
    catch { toast("Couldn't delete. Try again."); }
  });
}

onData(draw);
draw();
showContent();
