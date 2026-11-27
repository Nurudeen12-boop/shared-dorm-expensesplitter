// Record Payment. Payments are only recorded - there is no payment gateway.
// Optional prefill from the dashboard: record-payment.html?from=ID&to=ID&amount=KOBO
import { requireSession, redirect, showContent, $ } from "../session.js";
import { toKobo, formatNaira, todayISO } from "../calc.js";
import { esc, toast } from "../ui.js";
import { myId } from "../state.js";
import { addPayment } from "../db.js";

const MAX_KOBO = 9_999_999_999;

const state = await requireSession();
const me = myId();
const params = new URLSearchParams(location.search);
const isMember = (id) => state.members.some((m) => m.id === id);
const others = state.members.filter((m) => m.id !== me);
const from = isMember(params.get("from")) ? params.get("from") : others[0]?.id || me;
const to = isMember(params.get("to")) ? params.get("to") : me;
const prefill = Number(params.get("amount"));

const options = (selectedId) => state.members
  .map((m) => `<option value="${m.id}" ${m.id === selectedId ? "selected" : ""}>${esc(m.name)}${m.id === me ? " (me)" : ""}</option>`).join("");
$("from").innerHTML = options(from);
$("to").innerHTML = options(to);
if (prefill > 0) $("amount").value = formatNaira(prefill);
$("date").value = todayISO();
$("date").max = todayISO();
$("amount").onblur = () => { const k = toKobo($("amount").value); if (k) $("amount").value = formatNaira(k); };

$("payment-form").onsubmit = async (e) => {
  e.preventDefault();
  const err = (m) => { $("err").textContent = m; };
  const fromId = $("from").value, toId = $("to").value;
  const amount = toKobo($("amount").value);
  const date = $("date").value;
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
  $("save").disabled = true;
  try {
    await addPayment(state.profile.groupId, {
      fromMemberId: fromId, toMemberId: toId, amountKobo: amount, paymentDate: date,
      method: document.querySelector('input[name="method"]:checked').value,
      note: $("note").value.trim(), createdBy: me,
    });
    redirect("dashboard.html");
  } catch (x) {
    console.error(x);
    err("Couldn't save. Check your connection and try again.");
    $("save").disabled = false;
  }
};

showContent("payment-form");
