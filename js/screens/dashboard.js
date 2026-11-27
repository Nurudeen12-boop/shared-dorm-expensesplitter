import { formatNaira, relativeDay } from "../calc.js";
import { icons, esc, initial, iconForExpense } from "../ui.js";
import { label, plainName, myId, timeAgo } from "../state.js";
import { openDrawer, shareInvite } from "./drawer.js";

let showEveryone = false;

export function render(root, ctx) {
  const { state } = ctx;
  const draw = () => {
    const me = myId();
    const bal = state.ledger.balanceOf(me);
    const caption = bal > 0 ? "You are owed overall" : bal < 0 ? "You owe overall" : "You're all settled up";
    const pairs = state.ledger.pairNet
      .filter((p) => showEveryone || p.from === me || p.to === me)
      .sort((a, b) => b.amount - a.amount);
    const recent = [...state.expenses]
      .sort((a, b) => (b.billDate + b.createdAtMs).localeCompare(a.billDate + a.createdAtMs))
      .slice(0, 3);

    root.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" id="menu" aria-label="Open menu">${icons.menu}</button>
        <h1>Dashboard</h1>
        <button class="icon-btn" id="invite" aria-label="Invite roommates">${icons.share}</button>
      </header>

      <section class="card balance" aria-label="Total balance">
        <div class="label">Total Balance</div>
        <div class="amount">${formatNaira(Math.abs(bal))}</div>
        <div class="caption">${caption}</div>
        <div class="actions">
          <button class="btn small" id="add">+ Add expense</button>
          <button class="btn small" id="pay">Record payment</button>
        </div>
      </section>

      <section class="card" aria-label="Who owes whom">
        <h2>Who owes whom</h2>
        ${pairs.length
          ? pairs.map((p) => `
            <button class="hist-item" style="padding:6px 0;background:none;margin:0" data-pay="${p.from}|${p.to}|${p.amount}">
              <span class="avatar">${esc(initial(plainName(p.from)))}</span>
              <span class="grow" style="font-size:1.08rem">${esc(label(p.from))} → ${esc(label(p.to))}: <b>${formatNaira(p.amount)}</b></span>
            </button>`).join("")
          : `<p class="empty">Nobody owes anything yet.</p>`}
        <div class="linkrow"><button class="link small" id="toggle">${showEveryone ? "Show only me" : "Show everyone"}</button></div>
      </section>

      <section class="card" aria-label="Recent expenses">
        <h2>Recent expenses</h2>
        ${recent.length
          ? recent.map((e) => `
            <button class="hist-item" style="padding:6px 0;background:none;margin:0" data-open="${e.id}">
              <span class="tile">${iconForExpense(e.name)}</span>
              <span class="grow"><b style="font-weight:600">${esc(e.name)} — ${formatNaira(e.totalKobo)}</b> • ${esc(relativeDay(e.billDate))}<br>
              <small class="muted">- split ${e.participants.length} ways</small></span>
            </button>`).join("")
          : `<p class="empty">No expenses yet. Tap “Add expense” to log your first bill.</p>`}
        ${state.expenses.length > 3 ? `<div class="linkrow"><button class="link small" id="all">View all</button></div>` : ""}
      </section>

      <p class="footnote">• Updated ${timeAgo(state.lastUpdateMs)} • ${state.members.length} members •</p>`;

    const $ = (s) => root.querySelector(s);
    $("#menu").onclick = () => openDrawer(ctx);
    $("#invite").onclick = shareInvite;
    $("#add").onclick = () => ctx.go("add");
    $("#pay").onclick = () => ctx.go("payment");
    $("#toggle").onclick = () => { showEveryone = !showEveryone; draw(); };
    $("#all")?.addEventListener("click", () => ctx.go("history"));
    root.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => ctx.go(`expense/${b.dataset.open}`)));
    root.querySelectorAll("[data-pay]").forEach((b) => (b.onclick = () => ctx.go(`payment/${b.dataset.pay.replaceAll("|", "/")}`)));
  };
  ctx.onData = draw;
  draw();
}
