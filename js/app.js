// App shell: auth state, group subscription and hash routing.
import { isConfigured } from "./firebase-config.js";
import { state, recompute, resetGroup, parseGroupId } from "./state.js";
import { watchAuth } from "./auth.js";
import { getUserProfile, createUserProfile, subscribeToGroup, joinGroup } from "./db.js";
import { toast, esc } from "./ui.js";

const root = document.getElementById("app");
const PUBLIC = new Set(["welcome", "login", "signup", "forgot"]);
const PRIVATE = new Set(["dashboard", "history", "add", "payment", "expense", "group-setup"]);
const screens = {
  welcome: () => import("./screens/welcome.js"),
  login: () => import("./screens/login.js"),
  signup: () => import("./screens/signup.js"),
  forgot: () => import("./screens/forgot.js"),
  "group-setup": () => import("./screens/group-setup.js"),
  dashboard: () => import("./screens/dashboard.js"),
  history: () => import("./screens/history.js"),
  add: () => import("./screens/add-expense.js"),
  payment: () => import("./screens/record-payment.js"),
  expense: () => import("./screens/expense-detail.js"),
};

export const ctx = {
  state,
  root,
  onData: null, // a screen sets this to re-draw itself when live data changes
  go(path) {
    if (location.hash === `#/${path}`) route();
    else location.hash = `#/${path}`;
  },
  /** Called after creating or joining a group. */
  async groupChosen(groupId) {
    state.profile.groupId = groupId;
    startGroup(groupId);
    ctx.go("dashboard");
  },
};

/* ----- invite links: ?join=GROUPID ----- */
const joinParam = new URLSearchParams(location.search).get("join");
if (joinParam) {
  const gid = parseGroupId(joinParam);
  if (gid) sessionStorage.setItem("pendingJoin", gid);
  history.replaceState(null, "", location.pathname + location.hash);
}

/* ----- routing ----- */
function showLoading(text = "Loading…") {
  ctx.onData = null;
  root.className = "app";
  root.innerHTML = `<div class="loading">${esc(text)}</div>`;
}

async function route() {
  if (!state.authReady) return showLoading();
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  let name = parts[0] || "";
  let args = parts.slice(1);

  if (!state.user) {
    if (!PUBLIC.has(name)) {
      name = sessionStorage.getItem("pendingJoin") ? "login" : "welcome";
      args = [];
    }
  } else if (!state.profile?.groupId) {
    name = "group-setup";
    args = [];
  } else if (!state.groupReady) {
    return showLoading();
  } else if (!PRIVATE.has(name) || name === "group-setup") {
    name = "dashboard";
    args = [];
  }

  if (location.hash !== `#/${[name, ...args].join("/")}`) {
    history.replaceState(null, "", `#/${[name, ...args].join("/")}`);
  }
  ctx.onData = null;
  root.className = "app";
  window.scrollTo(0, 0);
  const mod = await screens[name]();
  mod.render(root, ctx, args);
}
window.addEventListener("hashchange", route);

/* ----- group data ----- */
function startGroup(groupId) {
  resetGroup();
  const mark = (key) => {
    state.loaded[key] = true;
    if (!["group", "members", "expenses", "payments"].every((k) => state.loaded[k])) return;
    recompute();
    if (!state.groupReady) {
      state.groupReady = true;
      route();
    } else {
      ctx.onData?.();
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

/* ----- auth ----- */
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

async function onAuth(user) {
  resetGroup();
  state.user = user;
  state.profile = null;
  if (user) {
    state.profile = await loadProfile(user);
    const pending = sessionStorage.getItem("pendingJoin");
    if (pending && !state.profile.groupId) {
      try {
        await joinGroup(user.uid, state.profile.name, pending);
        state.profile.groupId = pending;
        toast("You joined the group");
      } catch (err) {
        console.error(err);
        toast("That group link isn't valid.");
      }
    }
    sessionStorage.removeItem("pendingJoin");
    if (state.profile.groupId) startGroup(state.profile.groupId);
  }
  state.authReady = true;
  if (!user || !state.profile.groupId) route();
}

if (!isConfigured) {
  root.innerHTML = `<div class="auth center"><h1 class="title">Almost there</h1>
    <p class="subtitle">Add your Firebase web app config to <b>js/firebase-config.js</b>, then reload.</p>
    <p class="hint">See the README, step 2.</p></div>`;
} else {
  showLoading();
  watchAuth(onAuth);
}
