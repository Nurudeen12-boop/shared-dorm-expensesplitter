// Slide-in navigation menu shared by the private pages.
import { state, isAdmin, inviteLink } from "./state.js";
import { logOut } from "./auth.js";
import { esc, toast } from "./ui.js";

export async function shareInvite() {
  const url = inviteLink();
  const text = `Join "${state.group?.name || "our dorm"}" on Bill Splitting Calculator`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Join my group", text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast("Group link copied");
  } catch (err) {
    if (err?.name === "AbortError") return;
    window.prompt("Copy this group link:", url);
  }
}

export function openDrawer() {
  const current = location.pathname.split("/").pop() || "index.html";
  const link = (page, text) => `<a href="${page}" ${current === page ? 'aria-current="page"' : ""}>${text}</a>`;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="scrim" data-close></div>
    <nav class="drawer" aria-label="Main menu">
      <h2>${esc(state.group?.name || "My group")}</h2>
      <p class="who">${esc(state.profile?.name || "")} · ${isAdmin() ? "Admin" : "Member"} · ${state.members.length} members</p>
      ${link("dashboard.html", "Dashboard")}
      ${link("history.html", "History")}
      ${link("add-expense.html", "Add expense")}
      ${link("record-payment.html", "Record payment")}
      <button class="nav" data-invite>Invite roommates</button>
      <div class="spacer"></div>
      <button class="nav" data-logout>Log out</button>
    </nav>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener("click", async (e) => {
    if (e.target.closest("[data-close]")) close();
    if (e.target.closest("[data-invite]")) { close(); shareInvite(); }
    if (e.target.closest("[data-logout]")) { await logOut(); location.replace("login.html"); }
  });
  document.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
  });
  wrap.querySelector(".drawer a, .drawer button").focus();
}
