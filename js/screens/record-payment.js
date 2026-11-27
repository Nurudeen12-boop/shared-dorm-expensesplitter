// Record Payment. Payments are only recorded - there is no payment gateway.
import { toKobo, formatNaira, todayISO } from "../calc.js";
import { icons, esc } from "../ui.js";
import { myId } from "../state.js";
import { addPayment } from "../db.js";
import { toast } from "../ui.js";

const METHODS = ["Cash", "Bank transfer", "Other"];
const MAX_KOBO = 9_999_999_999;

export function render(root, ctx, args) {
  const { state } = ctx;
  const me = myId();
  const others = state.members.filter((m) => m.id !== me);
  // Optional prefill from the dashboard: #/payment/<fromId>/<toId>/<amountKobo>
  const [pFrom, pTo, pAmt] = args;
  const valid = (id) => state.members.some((m) => m.id === id);
  const from = valid(pFrom) ? pFrom : others[0]?.id || me;
  const to = valid(pTo) ? pTo : me;
  const opts = (sel) => state.members.map((m) => `<option value="${m.id}" ${m.id === sel ? "selected" : ""}>${esc(m.name)}${m.id === me ? " (me)" : ""}</option>`).join("");

  root.className = "app sketch";
  root.innerHTML = `
    <form novalidate>
      <h1 class="page-title modal"><span>Record Payment</span><button type="button" class="back" id="close" aria-label="Close">${icons.close}</button></h1>
      <p class="center-text">Mark payment between members</p>
      <div class="field"><label for="from">Payer (who paid)</label><div class="white-input"><select id="from">${opts(from)}</select></div></div>
      <div class="field"><label for="to">To (recipient)</label><div class="white-input"><select id="to">${opts(to)}</select></div></div>
      <div class="field"><label for="amount">Amount</label><div class="white-input"><input id="amount" inputmode="decimal" autocomplete="off" placeholder="₦0.00" value="${pAmt && +pAmt > 0 ? formatNaira(+pAmt) : ""}" style="padding-right:14px" /></div></div>
      <div class="field"><label for="date">Date</label><div class="white-input"><input id="date" type="date" value="${todayISO()}" max="${todayISO()}" /></div></div>
      <p>Payment method</p>
      <div class="radios" role="radiogroup" aria-label="Payment method">
        ${METHODS.map((m, i) => `<label class="radio"><input type="radio" name="method" value="${m}" ${i === 0 ? "checked" : ""} /><span class="dot">${icons.check}</span>${m}</label>`).join("")}
      </div>
      <div class="field"><label for="note">Note (optional)</label><div class="white-input"><input id="note" maxlength="140" placeholder="e.g. Paid for dinner split" style="padding-right:14px" /></div></div>
      <div class="error" id="err" role="alert"></div>
      <button class="btn" type="submit" id="save">Confirm payment</button>
      <p class="foot">* Updates balances and settles the oldest unpaid expenses first *</p>
      <p class="foot">* Payments are recorded to history *</p>
    </form>`;
  const $ = (s) => root.querySelector(s);
  $("#close").onclick = () => (history.length > 1 ? history.back() : ctx.go("dashboard"));
  $("#amount").onblur = () => { const k = toKobo($("#amount").value); if (k) $("#amount").value = formatNaira(k); };

  $("form").onsubmit = async (e) => {
    e.preventDefault();
    const err = (m) => { $("#err").textContent = m; };
    const fromId = $("#from").value, toId = $("#to").value;
    const amount = toKobo($("#amount").value);
    const date = $("#date").value;
    if (fromId === toId) return err("Payer and recipient must be different people.");
    if (!amount || amount <= 0) return err("Enter a valid amount, like 25 or 25.50.");
    if (amount > MAX_KOBO) return err("That amount is too large.");
    if (!date) return err("Pick the payment date.");
    const owed = state.ledger.pairNet.find((p) => p.from === fromId && p.to === toId)?.amount || 0;
    if (amount > owed) {
      const who = state.members.find((m) => m.id === fromId)?.name;
      const ok = confirm(`${who} currently owes ${formatNaira(owed)} to this person. Record ${formatNaira(amount)} anyway? The extra will show as a balance in the other direction.`);
      if (!ok) return;
    }
    err("");
    $("#save").disabled = true;
    try {
      await addPayment(state.profile.groupId, {
        fromMemberId: fromId, toMemberId: toId, amountKobo: amount, paymentDate: date,
        method: root.querySelector('input[name="method"]:checked').value,
        note: $("#note").value.trim(), createdBy: me,
      });
      toast("Payment recorded");
      ctx.go("dashboard");
    } catch (x) {
      console.error(x);
      err("Couldn't save. Check your connection and try again.");
      $("#save").disabled = false;
    }
  };
}
