import { redirectIfSignedIn, redirect, $ } from "../session.js";
import { signUp, friendlyAuthError } from "../auth.js";
import { icons } from "../ui.js";

redirectIfSignedIn();

document.querySelectorAll("[data-eye]").forEach((b) => {
  b.onclick = () => {
    const input = $(b.dataset.eye);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    b.innerHTML = show ? icons.eyeOff : icons.eye;
    b.setAttribute("aria-label", show ? "Hide password" : "Show password");
  };
});

$("signup-form").onsubmit = async (e) => {
  e.preventDefault();
  const name = $("name").value.trim();
  const email = $("email").value.trim();
  const pw = $("pw").value;
  const err = (m) => { $("err").textContent = m; };
  if (!name) return err("Enter your full name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return err("Enter a valid email address.");
  if (pw.length < 8) return err("Password must be at least 8 characters.");
  if (pw !== $("pw2").value) return err("Passwords don't match.");
  err("");
  $("submit").disabled = true;
  try {
    await signUp(name, email, pw); // waits until the profile is saved before leaving the page
    redirect("dashboard.html");
  } catch (x) {
    err(friendlyAuthError(x));
    $("submit").disabled = false;
  }
};
