import { redirectIfSignedIn, $ } from "../session.js";
import { sendReset, friendlyAuthError } from "../auth.js";

redirectIfSignedIn();

$("forgot-form").onsubmit = async (e) => {
  e.preventDefault();
  const email = $("email").value.trim();
  $("err").textContent = "";
  $("ok").textContent = "";
  if (!/^\S+@\S+\.\S+$/.test(email)) { $("err").textContent = "Enter a valid email address."; return; }
  $("submit").disabled = true;
  try {
    await sendReset(email);
    $("ok").textContent = "If an account exists for that email, a reset link is on its way.";
  } catch (x) {
    $("err").textContent = friendlyAuthError(x);
  }
  $("submit").disabled = false;
};
