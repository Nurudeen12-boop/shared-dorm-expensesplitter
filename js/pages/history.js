import { requireSession, onData, showContent, $ } from "../session.js";
import { formatNaira, formatDate, myPositionInExpense } from "../calc.js";
import { icons, esc, toast } from "../ui.js";
import { label, myId } from "../state.js";
import { openDrawer } from "../drawer.js";
import { deletePayment } from "../db.js";

const state = await requireSession();
let filter = "all";   // all | unpaid | settled
let sort = "recent";  // recent | oldest | highest

function draw() {
  const me = myId();
  const ledger = state.ledger;
  const rows = state.expenses.map((e) => ({
    e, settled: ledger.expenseStatus[e.id]?.settled ?? true, pos: myPositionInExpense(e, ledger, me),
  }));
  const unpaid = rows.filter((r) => !r.settled).length;
  const list = rows.filter((r) => filter === "all" || (filter === "unpaid" ? !r.settled : r.settled));
  const key = (r) => r.e.billDate + String(r.e.createdAtMs).padStart(15, "0");
  list.sort((a, b) =>
    sort === "highest" ? b.e.totalKobo - a.e.totalKobo : sort === "oldest" ? key(a).localeCompare(key(b)) : key(b).localeCompare(key(a)));

  const line = ({ role, amount, share }) => {
    if (role === "payer") return amount > 0 ? `You're owed: ${formatNaira(amount)}` : "You paid · fully repaid";
    if (role === "owes") return amount > 0 ? `You owe: ${formatNaira(amount)}` : `Your share: ${formatNaira(share)} · paid`;
    return "You're not part of this one";
  };

  $("list").innerHTML = list.length
    ? list.map((r) => `
        <a class="hist-item" href="expense-detail.html?id=${r.e.id}">
          <span class="tile">₦</span>
          <span class="meta"><b>${esc(r.e.name)} • ${esc(formatDate(r.e.billDate))}</b>
            <small>Total: ${formatNaira(r.e.totalKobo)} • ${r.e.participants.length} ways • ${line(r.pos)}</small></span>
          <span class="badge">${r.settled ? icons.settled + "Settled" : icons.alert + "Unpaid"}</span>
        </a>`).join("")
    : `<p class="empty">${rows.length ? "No expenses match this filter." : "No expenses yet. Add one from the dashboard."}</p>`;

  $("summary").textContent = `${rows.length} expenses • ${unpaid} unpaid • ${rows.length - unpaid} settled`;

  document.querySelectorAll("[data-f]").forEach((b) => {
    const on = b.dataset.f === filter;
    b.classList.toggle("on", on);
    b.classList.toggle("off", !on);
    b.setAttribute("aria-pressed", on);
  });

  const payments = [...state.payments].sort((a, b) => (b.paymentDate + b.createdAtMs).localeCompare(a.paymentDate + a.createdAtMs));
  $("payments-section").classList.toggle("hidden", !payments.length);
  $("payments").innerHTML = payments.map((p) => `
    <div class="row">
      <span class="grow">${esc(label(p.fromMemberId))} paid ${esc(label(p.toMemberId))} <b>${formatNaira(p.amountKobo)}</b><br>
        <small class="muted">${esc(formatDate(p.paymentDate))} • ${esc(p.method || "Other")}${p.note ? " • " + esc(p.note) : ""}</small></span>
      ${p.createdBy === me ? `<button class="link small" type="button" data-undo="${p.id}">Undo</button>` : ""}
    </div>`).join("");
}

$("menu").onclick = openDrawer;
$("filterBtn").onclick = () => {
  const open = $("panel").classList.toggle("hidden") === false;
  $("filterBtn").setAttribute("aria-expanded", open);
};
$("sort").onchange = (e) => { sort = e.target.value; draw(); };
document.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { filter = b.dataset.f; draw(); }));
$("payments").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-undo]");
  if (!btn || !confirm("Undo this payment? Balances will be recalculated.")) return;
  try { await deletePayment(state.profile.groupId, btn.dataset.undo); toast("Payment removed"); }
  catch { toast("Couldn't remove the payment."); }
});

onData(draw);
draw();
showContent();
