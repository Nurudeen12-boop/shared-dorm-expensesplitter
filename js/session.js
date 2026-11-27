// Shared by every page: sign-in check, group loading and redirects.
//   Public pages (login, signup, forgot, welcome):  redirectIfSignedIn()
//   Private pages (dashboard, history, ...):        const state = await requireSession()
import { isConfigured } from "./firebase-config.js";
import { state, recompute, resetGroup, parseGroupId } from "./state.js";
import { watchAuth } from "./auth.js";
import { getUserProfile, createUserProfile, subscribeToGroup, joinGroup } from "./db.js";
import { toast } from "./ui.js";

/** Navigate without leaving the redirecting page in the back-button history. */
export const redirect = (page) => location.replace(page);

// Invite links carry ?join=GROUPID - remember it until the person is signed in.
const joinParam = new URLSearchParams(location.search).get("join");
if (joinParam) {
  const gid = parseGroupId(joinParam);
  if (gid) sessionStorage.setItem("pendingJoin", gid);
  history.replaceState(null, "", location.pathname);
}

if (!isConfigured) {
  const banner = document.createElement("div");
  banner.className = "config-banner";
  banner.textContent = "Firebase isn't set up yet. Add your web app config to js/firebase-config.js (see the README, step 2).";
  document.body.prepend(banner);
}

const listeners = new Set();
/** Register a function that re-draws the page when live group data changes. */
export const onData = (fn) => listeners.add(fn);

async function loadProfile(user) {
  // Right after sign-up the profile document may not be written yet, so retry briefly.
  for (let i = 0; i < 6; i++) {
    const p = await getUserProfile(user.uid).catch(() => null);
    if (p) return p;
    await new Promise((r) => setTimeout(r, 400));
  }
  const name = user.displayName || user.email.split("@")[0];
  await createUserProfile(user.uid, { name, email: user.email });
  return { id: user.uid, name, email: user.email, groupId: null };
}

async function consumePendingJoin() {
  const pending = sessionStorage.getItem("pendingJoin");
  if (!pending) return;
  sessionStorage.removeItem("pendingJoin");
  if (state.profile.groupId) return;
  try {
    await joinGroup(state.user.uid, state.profile.name, pending);
    state.profile.groupId = pending;
    toast("You joined the group");
  } catch (err) {
    console.error(err);
    toast("That group link isn't valid.");
  }
}

let groupStarted = false;
function startGroup(groupId, onFirstLoad) {
  resetGroup();
  const mark = (key) => {
    state.loaded[key] = true;
    if (!["group", "members", "expenses", "payments"].every((k) => state.loaded[k])) return;
    recompute();
    if (!state.groupReady) {
      state.groupReady = true;
      onFirstLoad();
    } else {
      listeners.forEach((fn) => fn());
    }
  };
  state.unsub = subscribeToGroup(groupId, {
    group: (g) => { state.group = g; mark("group"); },
    members: (m) => { state.members = m; mark("members"); },
    expenses: (e) => { state.expenses = e; mark("expenses"); },
    payments: (p) => { state.payments = p; mark("payments"); },
    error: (err) => { console.error(err); toast("Couldn't load data. Check your connection."); },
  });
}

/**
 * Private pages. Resolves with the shared state once the user is signed in and the group data has loaded.
 * Signed-out users go to login.html; users without a group go to group-setup.html.
 * With { needGroup: false } (group-setup page) it resolves as soon as the user is known to have no group.
 */
export function requireSession({ needGroup = true } = {}) {
  if (!isConfigured) return new Promise(() => {});
  return new Promise((resolve) => {
    watchAuth(async (user) => {
      if (!user) return redirect("login.html");
      if (state.user?.uid !== user.uid || !state.profile) {
        state.user = user;
        state.profile = await loadProfile(user);
        await consumePendingJoin();
      }
      if (!state.profile.groupId) return needGroup ? redirect("group-setup.html") : resolve(state);
      if (!needGroup) return redirect("dashboard.html");
      if (!groupStarted) {
        groupStarted = true;
        startGroup(state.profile.groupId, () => resolve(state));
      }
    });
  });
}

/** Public pages: if someone is already signed in when the page opens, send them to the dashboard. */
export function redirectIfSignedIn() {
  if (!isConfigured) return;
  let unsub;
  unsub = watchAuth((user) => {
    unsub?.();
    if (user) redirect("dashboard.html");
  });
}

/** Reveal the page once data is ready. */
export function showContent(id = "content") {
  document.getElementById("loading")?.remove();
  document.getElementById(id)?.classList.remove("hidden");
}

export const $ = (id) => document.getElementById(id);
