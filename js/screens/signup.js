import { icons } from "../ui.js";
import { signUp, friendlyAuthError } from "../auth.js";

const pwField = (id, label, placeholder) => `
  <div class="field"><label for="${id}">${label}</label>
    <div class="input-wrap">${icons.lock}<input id="${id}" type="password" autocomplete="new-password" placeholder="${placeholder}" required />
      <button type="button" class="eye" data-eye="${id}" aria-label="Show password">${icons.eye}</button></div></div>`;

export function render(root, ctx) {
  root.innerHTML = `
    <form class="auth center" novalidate>
      <h1 class="title">Create Account</h1>
      <p class="subtitle" style="font-weight:600">Bill Splitting Calculator</p>
      <div class="divider">Join to start splitting bills</div>
      <div class="field"><label for="name">Full name</label>
        <div class="input-wrap">${icons.user}<input id="name" autocomplete="name" placeholder="Jane Doe" required maxlength="100" /></div></div>
      <div class="field"><label for="email">Email</label>
        <div class="input-wrap">${icons.mail}<input id="email" type="email" autocomplete="email" placeholder="jane@example.com" required /></div></div>
      ${pwField("pw", "Password", "At least 8 characters")}
      ${pwField("pw2", "Confirm password", "Re-enter password")}
      <p class="hint">Password must be at least 8 characters</p>
      <div class="error" id="err" role="alert"></div>
      <button class="btn" type="submit" id="submit">Create account</button>
      <p>Already have an account? <button type="button" class="link" id="login">Login</button></p>
      <p class="hint">By creating an account you agree to Terms &amp; Privacy</p>
    </form>`;
  const $ = (s) => root.querySelector(s);
  $("#login").onclick = () => ctx.go("login");
  root.querySelectorAll("[data-eye]").forEach((b) => {
    b.onclick = () => {
      const input = $("#" + b.dataset.eye);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      b.innerHTML = show ? icons.eyeOff : icons.eye;
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
    };
  });
  $("form").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#name").value.trim();
    const email = $("#email").value.trim();
    const pw = $("#pw").value;
    const err = (m) => { $("#err").textContent = m; };
    if (!name) return err("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return err("Enter a valid email address.");
    if (pw.length < 8) return err("Password must be at least 8 characters.");
    if (pw !== $("#pw2").value) return err("Passwords don't match.");
    err("");
    $("#submit").disabled = true;
    try {
      await signUp(name, email, pw);
    } catch (e2) {
      err(friendlyAuthError(e2));
      $("#submit").disabled = false;
    }
  };
}
