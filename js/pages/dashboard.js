import { requireSession, onData, showContent, $ } from "../session.js";
import { formatNaira, relativeDay } from "../calc.js";
import { esc, initial, iconForExpense } from "../ui.js";
import { label, plainName, myId, timeAgo } from "../state.js";
import { openDrawer, shareInvite } from "../drawer.js";

const state = await requireSession();
let showEveryone = false;

function draw() {
  const me = myId();
  const bal = state.ledger.balanceOf(me);
  $("bal-amount").textContent = formatNaira(Math.abs(bal));
  $("bal-caption").textContent = bal > 0 ? "You are owed overall" : bal < 0 ? "You owe overall" : "You're all settled up";

  const pairs = state.ledger.pairNet
    .filter((p) => showEveryone || p.from === me || p.to === me)
    .sort((a, b) => b.amount - a.amount);
  $("pairs").innerHTML = pairs.length
    ? pairs.map((p) => `
        <a class="row-btn" href="record-payment.html?from=${p.from}&to=${p.to}&amount=${p.amount}">
          <span class="avatar">${esc(initial(plainName(p.from)))}</span>
          <span class="grow">${esc(label(p.from))} → ${esc(label(p.to))}: <b>${formatNaira(p.amount)}</b></span>
        </a>`).join("")
    : `<p class="empty">Nobody owes anything yet.</p>`;
  $("toggle").textContent = showEveryone ? "Show only me" : "Show everyone";

  const recent = [...state.expenses]
    .sort((a, b) => (b.billDate + b.createdAtMs).localeCompare(a.billDate + a.createdAtMs))
    .slice(0, 3);
  $("recent").innerHTML = recent.length
    ? recent.map((e) => `
        <a class="row-btn" href="expense-detail.html?id=${e.id}">
          <span class="tile">${iconForExpense(e.name)}</span>
          <span class="grow"><b class="semi">${esc(e.name)} — ${formatNaira(e.totalKobo)}</b> • ${esc(relativeDay(e.billDate))}<br>
          <small class="muted">- split ${e.participants.length} ways</small></span>
        </a>`).join("")
    : `<p class="empty">No expenses yet. Tap “Add expense” to log your first bill.</p>`;
  $("all").classList.toggle("hidden", state.expenses.length <= 3);
  $("footnote").textContent = `• Updated ${timeAgo(state.lastUpdateMs)} • ${state.members.length} members •`;
}

$("menu").onclick = openDrawer;
$("invite").onclick = shareInvite;
$("toggle").onclick = () => { showEveryone = !showEveryone; draw(); };
onData(draw);
draw();
showContent();
