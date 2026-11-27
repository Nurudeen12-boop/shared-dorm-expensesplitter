// NEW screen (not in the Figma file): every user needs a group before the dashboard makes sense.
import { createGroup, joinGroup } from "../db.js";
import { parseGroupId } from "../state.js";
import { logOut } from "../auth.js";
import { esc } from "../ui.js";

export function render(root, ctx) {
  const { state } = ctx;
  root.innerHTML = `
    <div class="auth center">
      <h1 class="title">Hi ${esc(state.profile.name.split(" ")[0])}</h1>
      <p class="subtitle">Start a group for your room, or join one with a link.</p>
      <form class="card" id="create" novalidate style="text-align:left">
        <h2>Create a group</h2>
        <div class="field"><label for="gname">Group name</label>
          <input class="plain-input" id="gname" placeholder="e.g. Room 12B" maxlength="60" /></div>
        <p class="hint" style="margin:10px 0">You become the admin and get a link to invite roommates.</p>
        <button class="btn" type="submit">Create group</button>
      </form>
      <form class="card" id="join" novalidate style="text-align:left">
        <h2>Join with a link</h2>
        <div class="field"><label for="glink">Group link</label>
          <input class="plain-input" id="glink" placeholder="Paste the group link" /></div>
        <button class="btn" type="submit" style="margin-top:12px">Join group</button>
      </form>
      <div class="error" id="err" role="alert"></div>
      <button class="link small" id="logout">Log out</button>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const err = (m) => { $("#err").textContent = m; };
  $("#logout").onclick = async () => { await logOut(); location.hash = "#/login"; };

  $("#create").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#gname").value.trim();
    if (!name) return err("Give your group a name.");
    err(""); e.submitter.disabled = true;
    try { ctx.groupChosen(await createGroup(state.user.uid, state.profile.name, name)); }
    catch (x) { console.error(x); err("Couldn't create the group. Try again."); e.submitter.disabled = false; }
  };
  $("#join").onsubmit = async (e) => {
    e.preventDefault();
    const gid = parseGroupId($("#glink").value);
    if (!gid) return err("That group link doesn't look right.");
    err(""); e.submitter.disabled = true;
    try { await joinGroup(state.user.uid, state.profile.name, gid); ctx.groupChosen(gid); }
    catch (x) { console.error(x); err("Couldn't join. Check the link with your admin."); e.submitter.disabled = false; }
  };
}
