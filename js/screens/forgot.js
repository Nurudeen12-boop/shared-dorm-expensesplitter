import { icons } from "../ui.js";
import { sendReset, friendlyAuthError } from "../auth.js";

export function render(root, ctx) {
  root.className = "app center";
  root.innerHTML = `
    <form class="auth" novalidate style="padding-top:60px">
      <h1 class="title">Forgot Password?</h1>
      <p class="subtitle">Bill Splitting Calculator</p>
      <p style="text-align:left;margin-top:22px;font-size:1.1rem;line-height:1.5">No worries. Enter your email and we'll send you a reset link to get back into your account.</p>
      <div class="field"><label for="email">Email</label>
        <div class="input-wrap">${icons.mail}<input id="email" type="email" autocomplete="email" placeholder="you@example.com" required /></div></div>
      <div class="error" id="err" role="alert"></div>
      <div class="success" id="ok" role="status"></div>
      <button class="btn" type="submit" id="submit">Reset password</button>
      <p><button type="button" class="link" id="back">← Back to login</button></p>
      <p class="hint">Check your inbox (and spam folder) for the reset link.</p>
    </form>`;
  const $ = (s) => root.querySelector(s);
  $("#back").onclick = () => ctx.go("login");
  $("form").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("#email").value.trim();
    $("#err").textContent = ""; $("#ok").textContent = "";
    if (!/^\S+@\S+\.\S+$/.test(email)) { $("#err").textContent = "Enter a valid email address."; return; }
    $("#submit").disabled = true;
    try {
      await sendReset(email);
      $("#ok").textContent = "If an account exists for that email, a reset link is on its way.";
    } catch (err) {
      $("#err").textContent = friendlyAuthError(err);
    }
    $("#submit").disabled = false;
  };
}
