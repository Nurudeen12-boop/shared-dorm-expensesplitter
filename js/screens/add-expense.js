// Add Expense (and edit mode). Equal split only, per the simplified requirements.
import { toKobo, formatNaira, splitEqual, todayISO } from "../calc.js";
import { icons, esc } from "../ui.js";
import { myId } from "../state.js";
import { addExpense, updateExpense, addGuestMember } from "../db.js";
import { toast } from "../ui.js";

const MAX_KOBO = 9_999_999_999; // DECIMAL(10,2) limit from the schema: ₦99,999,999.99

export function render(root, ctx, args) {
  const { state } = ctx;
  const me = myId();
  const editing = args[0] ? state.expenses.find((e) => e.id === args[0]) : null;
  if (args[0] && (!editing || editing.createdBy !== me)) {
    toast("Only the person who added an expense can edit it.");
    return ctx.go(editing ? `expense/${editing.id}` : "dashboard");
  }

  // People list: me first, then everyone else in join order
  let people = [...state.members].sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : 0)).map((m) => ({ id: m.id, name: m.name }));
  const selected = new Set(editing ? editing.participants : people.map((p) => p.id));

  root.className = "app sketch";
  root.innerHTML = `
    <form novalidate>
      <h1 class="page-title"><button type="button" class="back" id="back" aria-label="Go back">${icons.back}</button><span>${editing ? "Edit Expense" : "Add Expense"}</span></h1>
      <div class="field"><label for="name">Expense name</label>
        <div class="white-input"><input id="name" maxlength="100" placeholder="Dinner at Restaurant" value="${esc(editing?.name || "")}" />${icons.pencil.replace("<svg", '<svg class="pencil"')}</div></div>
      <div class="inline"><label for="amount">Total amount</label>
        <div class="white-input"><input id="amount" inputmode="decimal" autocomplete="off" placeholder="₦0.00" value="${editing ? formatNaira(editing.totalKobo) : ""}" style="padding-right:14px" /></div></div>
      <p>Split equally among</p>
      <div class="checks" id="people"></div>
      <div class="addperson"><span class="plus" aria-hidden="true">+</span>
        <input id="newperson" placeholder="+ Add person" maxlength="60" aria-label="Add a person by name" /><button type="button" id="addbtn">Add</button></div>
      <hr class="rule" />
      <div class="calc" id="calc" aria-live="polite"></div>
      <div class="note-box">* Equal split only • All members split equally</div>
      <div class="error" id="err" role="alert"></div>
      <button class="btn" type="submit" id="save">${editing ? "Save changes" : "Save Expense"}</button>
    </form>`;
  const $ = (s) => root.querySelector(s);

  function drawPeople() {
    $("#people").innerHTML = people.map((p) => `
      <label class="check"><input type="checkbox" value="${p.id}" ${selected.has(p.id) ? "checked" : ""} />
        <span class="box">${icons.check}</span>${esc(p.name)}${p.id === me ? ` (me) <span class="me">${icons.user}</span>` : ""}</label>`).join("");
    $("#people").querySelectorAll("input").forEach((cb) => (cb.onchange = () => { cb.checked ? selected.add(cb.value) : selected.delete(cb.value); drawCalc(); }));
  }

  function currentIds() { return people.map((p) => p.id).filter((id) => selected.has(id)); }

  function drawCalc() {
    const total = toKobo($("#amount").value);
    const ids = currentIds();
    if (!total || !ids.length) {
      $("#calc").innerHTML = `<p>Calculated equal shares:</p><p class="muted">Enter an amount and pick who is sharing.</p>`;
      return;
    }
    const vals = Object.values(splitEqual(total, ids));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    $("#calc").innerHTML = `
      <p>Calculated equal shares:</p>
      <p>${ids.length} people • ${formatNaira(total)} ÷ ${ids.length} ${lo === hi ? "=" : "≈"} ${formatNaira(lo)} each</p>
      <p class="owes">Each person owes: <u>${lo === hi ? formatNaira(lo) : `${formatNaira(lo)} – ${formatNaira(hi)}`}</u></p>
      ${lo === hi ? "" : `<p class="muted" style="font-size:1.05rem">The extra kobo is shared out so the shares add up to exactly ${formatNaira(total)}.</p>`}`;
  }

  async function addPerson() {
    const input = $("#newperson");
    const name = input.value.trim();
    if (!name) return;
    if (people.some((p) => p.name.toLowerCase() === name.toLowerCase())) { toast(`${name} is already in the list`); return; }
    $("#addbtn").disabled = true;
    try {
      const id = await addGuestMember(state.profile.groupId, name);
      people.push({ id, name });
      selected.add(id);
      input.value = "";
      drawPeople(); drawCalc();
    } catch (e) { console.error(e); toast("Couldn't add that person."); }
    $("#addbtn").disabled = false;
  }

  $("#back").onclick = () => history.back();
  $("#addbtn").onclick = addPerson;
  $("#newperson").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addPerson(); } };
  $("#amount").oninput = drawCalc;
  $("#amount").onblur = () => { const k = toKobo($("#amount").value); if (k) $("#amount").value = formatNaira(k); };

  $("form").onsubmit = async (e) => {
    e.preventDefault();
    const err = (m) => { $("#err").textContent = m; };
    const name = $("#name").value.trim();
    const total = toKobo($("#amount").value);
    const ids = currentIds();
    if (!name) return err("Enter an expense name.");
    if (!total || total <= 0) return err("Enter a valid amount, like 80 or 80.50.");
    if (total > MAX_KOBO) return err("That amount is too large.");
    if (!ids.some((id) => id !== me)) return err("Pick at least one other person to share with.");
    err("");
    $("#save").disabled = true;
    const data = { name, totalKobo: total, createdBy: me, participants: ids, shares: splitEqual(total, ids) };
    try {
      if (editing) {
        await updateExpense(state.profile.groupId, editing.id, data);
        toast("Changes saved");
        ctx.go(`expense/${editing.id}`);
      } else {
        await addExpense(state.profile.groupId, { ...data, billDate: todayISO(), dueDate: null, description: "" });
        toast("Expense saved");
        ctx.go("dashboard");
      }
    } catch (x) {
      console.error(x);
      err("Couldn't save. Check your connection and try again.");
      $("#save").disabled = false;
    }
  };

  drawPeople();
  drawCalc();
}
