// Slide-in navigation menu.
import { state, isAdmin, inviteLink } from "../state.js";
import { logOut } from "../auth.js";
import { esc, toast } from "../ui.js";

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

export function openDrawer(ctx) {
  const current = location.hash.replace(/^#\/?/, "").split("/")[0];
  const link = (path, text) => `<a href="#/${path}" ${current === path ? 'aria-current="page"' : ""}>${text}</a>`;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="scrim" data-close></div>
    <nav class="drawer" aria-label="Main menu">
      <h2>${esc(state.group?.name || "My group")}</h2>
      <p class="who">${esc(state.profile?.name || "")} · ${isAdmin() ? "Admin" : "Member"} · ${state.members.length} members</p>
      ${link("dashboard", "Dashboard")}
      ${link("history", "History")}
      ${link("add", "Add expense")}
      ${link("payment", "Record payment")}
      <button class="nav" data-invite>Invite roommates</button>
      <div class="spacer"></div>
      <button class="nav" data-logout>Log out</button>
    </nav>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener("click", async (e) => {
    if (e.target.closest("[data-close], a")) close();
    if (e.target.closest("[data-invite]")) { close(); shareInvite(); }
    if (e.target.closest("[data-logout]")) { close(); await logOut(); location.hash = "#/login"; }
  });
  document.addEventListener("keydown", function esc_(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc_); }
  });
  wrap.querySelector(".drawer a, .drawer button").focus();
}
