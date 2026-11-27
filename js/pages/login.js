import { redirectIfSignedIn, redirect, $ } from "../session.js";
import { logIn, friendlyAuthError } from "../auth.js";
import { parseGroupId } from "../state.js";

redirectIfSignedIn();

const pending = sessionStorage.getItem("pendingJoin");
if (pending) {
  $("link").value = "Group link saved";
  $("link").readOnly = true;
  $("join-hint").classList.remove("hidden");
}

$("login-form").onsubmit = async (e) => {
  e.preventDefault();
  const email = $("email").value.trim();
  const password = $("pw").value;
  const link = $("link").value.trim();
  const err = (m) => { $("err").textContent = m; };
  err("");
  if (link && !pending) {
    const gid = parseGroupId(link);
    if (!gid) return err("That group link doesn't look right.");
    sessionStorage.setItem("pendingJoin", gid);
  }
  if (!email || !password) return err(link ? "Log in or sign up to join your group." : "Enter your email and password.");
  $("submit").disabled = true;
  try {
    await logIn(email, password);
    redirect("dashboard.html");
  } catch (x) {
    err(friendlyAuthError(x));
    $("submit").disabled = false;
  }
};
