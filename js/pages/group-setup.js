// Create a group (you become the admin) or join one with a link.
import { requireSession, redirect, showContent, $ } from "../session.js";
import { createGroup, joinGroup } from "../db.js";
import { parseGroupId } from "../state.js";
import { logOut } from "../auth.js";

const state = await requireSession({ needGroup: false });
$("greeting").textContent = `Hi ${state.profile.name.split(" ")[0]}`;
showContent();

const err = (m) => { $("err").textContent = m; };
$("logout").onclick = async () => { await logOut(); redirect("login.html"); };

$("create-form").onsubmit = async (e) => {
  e.preventDefault();
  const name = $("gname").value.trim();
  if (!name) return err("Give your group a name.");
  err("");
  $("create-btn").disabled = true;
  try {
    await createGroup(state.user.uid, state.profile.name, name);
    redirect("dashboard.html");
  } catch (x) {
    console.error(x);
    err("Couldn't create the group. Try again.");
    $("create-btn").disabled = false;
  }
};

$("join-form").onsubmit = async (e) => {
  e.preventDefault();
  const gid = parseGroupId($("glink").value);
  if (!gid) return err("That group link doesn't look right.");
  err("");
  $("join-btn").disabled = true;
  try {
    await joinGroup(state.user.uid, state.profile.name, gid);
    redirect("dashboard.html");
  } catch (x) {
    console.error(x);
    err("Couldn't join. Check the link with your admin.");
    $("join-btn").disabled = false;
  }
};
