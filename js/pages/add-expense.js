// Add Expense (and edit mode: add-expense.html?id=EXPENSE_ID). Equal split only.
import { requireSession, redirect, showContent, $ } from "../session.js";
import { toKobo, formatNaira, splitEqual, todayISO } from "../calc.js";
import { icons, esc, toast } from "../ui.js";
import { myId } from "../state.js";
import { addExpense, updateExpense, addGuestMember } from "../db.js";

const MAX_KOBO = 9_999_999_999; // DECIMAL(10,2) limit from the schema: ₦99,999,999.99

const state = await requireSession();
const me = myId();
const editId = new URLSearchParams(location.search).get("id");
const editing = editId ? state.expenses.find((e) => e.id === editId) : null;
if (editId && (!editing || editing.createdBy !== me)) {
  toast("Only the person who added an expense can edit it.");
  redirect(editing ? `expense-detail.html?id=${editId}` : "dashboard.html");
  await new Promise(() => {}); // stop here while the redirect happens
}

// People list: me first, then everyone else in join order
const people = [...state.members]
  .sort((a, b) => (a.id === me ? -1 : b.id === me ? 1 : 0))
  .map((m) => ({ id: m.id, name: m.name }));
const selected = new Set(editing ? editing.participants : people.map((p) => p.id));

if (editing) {
  $("page-title").textContent = "Edit Expense";
  $("save").textContent = "Save changes";
  $("back").href = `expense-detail.html?id=${editing.id}`;
  $("name").value = editing.name;
  $("amount").value = formatNaira(editing.totalKobo);
}

const currentIds = () => people.map((p) => p.id).filter((id) => selected.has(id));

function drawPeople() {
  $("people").innerHTML = people.map((p) => `
    <label class="check"><input type="checkbox" value="${p.id}" ${selected.has(p.id) ? "checked" : ""} />
      <span class="box">${icons.check}</span>${esc(p.name)}${p.id === me ? ` (me) <span class="me">${icons.user}</span>` : ""}</label>`).join("");
  $("people").querySelectorAll("input").forEach((cb) => {
    cb.onchange = () => { cb.checked ? selected.add(cb.value) : selected.delete(cb.value); drawCalc(); };
  });
}

function drawCalc() {
  const total = toKobo($("amount").value);
  const ids = currentIds();
  if (!total || !ids.length) {
    $("calc").innerHTML = `<p>Calculated equal shares:</p><p class="muted">Enter an amount and pick who is sharing.</p>`;
    return;
  }
  const vals = Object.values(splitEqual(total, ids));
  const lo = Math.min(...vals), hi = Math.max(...vals);
  $("calc").innerHTML = `
    <p>Calculated equal shares:</p>
    <p>${ids.length} people • ${formatNaira(total)} ÷ ${ids.length} ${lo === hi ? "=" : "≈"} ${formatNaira(lo)} each</p>
    <p class="owes">Each person owes: <u>${lo === hi ? formatNaira(lo) : `${formatNaira(lo)} – ${formatNaira(hi)}`}</u></p>
    ${lo === hi ? "" : `<p class="muted small-note">The extra kobo is shared out so the shares add up to exactly ${formatNaira(total)}.</p>`}`;
}

async function addPerson() {
  const name = $("newperson").value.trim();
  if (!name) return;
  if (people.some((p) => p.name.toLowerCase() === name.toLowerCase())) return toast(`${name} is already in the list`);
  $("addbtn").disabled = true;
  try {
    const id = await addGuestMember(state.profile.groupId, name);
    people.push({ id, name });
    selected.add(id);
    $("newperson").value = "";
    drawPeople();
    drawCalc();
  } catch (e) {
    console.error(e);
    toast("Couldn't add that person.");
  }
  $("addbtn").disabled = false;
}

$("addbtn").onclick = addPerson;
$("newperson").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addPerson(); } };
$("amount").oninput = drawCalc;
$("amount").onblur = () => { const k = toKobo($("amount").value); if (k) $("amount").value = formatNaira(k); };

$("expense-form").onsubmit = async (e) => {
  e.preventDefault();
  const err = (m) => { $("err").textContent = m; };
  const name = $("name").value.trim();
  const total = toKobo($("amount").value);
  const ids = currentIds();
  if (!name) return err("Enter an expense name.");
  if (!total || total <= 0) return err("Enter a valid amount, like 80 or 80.50.");
  if (total > MAX_KOBO) return err("That amount is too large.");
  if (!ids.some((id) => id !== me)) return err("Pick at least one other person to share with.");
  err("");
  $("save").disabled = true;
  const data = { name, totalKobo: total, createdBy: me, participants: ids, shares: splitEqual(total, ids) };
  try {
    if (editing) {
      await updateExpense(state.profile.groupId, editing.id, data);
      redirect(`expense-detail.html?id=${editing.id}`);
    } else {
      await addExpense(state.profile.groupId, { ...data, billDate: todayISO(), dueDate: null, description: "" });
      redirect("dashboard.html");
    }
  } catch (x) {
    console.error(x);
    err("Couldn't save. Check your connection and try again.");
    $("save").disabled = false;
  }
};

drawPeople();
drawCalc();
showContent("expense-form");
