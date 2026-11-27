import { icons, logo, esc } from "../ui.js";
import { logIn, friendlyAuthError } from "../auth.js";
import { parseGroupId } from "../state.js";

export function render(root, ctx) {
  root.className = "app gradient center";
  const pending = sessionStorage.getItem("pendingJoin");
  root.innerHTML = `
    <form class="auth" novalidate>
      <h1 class="title underline" style="align-self:center">Welcome Back</h1>
      <p class="subtitle">Bill Splitting Calculator</p>
      ${logo}
      <h2 style="text-align:left;font-size:1.5rem;text-decoration:underline">Login</h2>
      <div class="field"><label for="email">Email</label>
        <div class="input-wrap">${icons.mail}<input id="email" type="email" autocomplete="email" placeholder="you@example.com" required /></div></div>
      <div class="field"><label for="pw">Password</label>
        <div class="input-wrap">${icons.lock}<input id="pw" type="password" autocomplete="current-password" placeholder="Your password" required /></div></div>
      <div class="linkrow"><button type="button" class="link small" id="forgot">Forgot Password?</button></div>
      <div class="error" id="err" role="alert"></div>
      <button class="btn" type="submit" id="submit">Login</button>
      <div class="divider">OR</div>
      <div class="field"><label for="link">Join via group link</label>
        <input class="plain-input" id="link" placeholder="Paste the group link" value="${esc(pending ? "Group link saved" : "")}" ${pending ? "readonly" : ""} /></div>
      ${pending ? '<p class="hint">Log in or sign up to join your group.</p>' : ""}
      <p>New here? <button type="button" class="link" id="signup">Sign up</button></p>
      <p class="tagline">• Quick · Fair · Easy •</p>
    </form>`;
  const $ = (s) => root.querySelector(s);
  $("#forgot").onclick = () => ctx.go("forgot");
  $("#signup").onclick = () => ctx.go("signup");
  $("form").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("#email").value.trim();
    const password = $("#pw").value;
    const link = $("#link").value.trim();
    $("#err").textContent = "";
    if (link && !pending) {
      const gid = parseGroupId(link);
      if (!gid) { $("#err").textContent = "That group link doesn't look right."; return; }
      sessionStorage.setItem("pendingJoin", gid);
    }
    if (!email || !password) {
      $("#err").textContent = link ? "Log in or sign up to join your group." : "Enter your email and password.";
      return;
    }
    $("#submit").disabled = true;
    try {
      await logIn(email, password); // app.js reacts to the auth change and opens the right screen
    } catch (err) {
      $("#err").textContent = friendlyAuthError(err);
      $("#submit").disabled = false;
    }
  };
}
