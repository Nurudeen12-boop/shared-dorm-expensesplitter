// Shared in-memory state for the signed-in session.
import { computeLedger } from "./calc.js";

export const state = {
  authReady: false,
  user: null,        // Firebase Auth user
  profile: null,     // users/{uid}
  groupReady: false, // all four group listeners have delivered data
  group: null,
  members: [],
  expenses: [],
  payments: [],
  ledger: null,
  loaded: {},
  lastUpdateMs: Date.now(),
  unsub: null,
};

export const myId = () => state.user?.uid;
export const memberById = (id) => state.members.find((m) => m.id === id);
/** Display name: "You" for the signed-in user. */
export const label = (id) => (id === myId() ? "You" : memberById(id)?.name || "Former member");
export const plainName = (id) => memberById(id)?.name || "Former member";
export const isAdmin = () => state.group?.adminUid === state.user?.uid;

export function recompute() {
  state.ledger = computeLedger(state.expenses, state.payments);
  state.lastUpdateMs = Date.now();
}

export function resetGroup() {
  state.unsub?.();
  Object.assign(state, { unsub: null, groupReady: false, group: null, members: [], expenses: [], payments: [], ledger: null, loaded: {} });
}

/** Invite links open the login page with the group code: https://site/login.html?join=GROUPID */
export const inviteLink = () =>
  `${location.origin}${location.pathname.replace(/[^/]*$/, "")}login.html?join=${state.profile?.groupId || ""}`;

/** Accepts a full invite link or the bare group code. Returns the group id or null. */
export function parseGroupId(input) {
  const text = String(input || "").trim();
  if (!text) return null;
  try {
    const id = new URL(text).searchParams.get("join");
    if (id) return id;
  } catch { /* not a URL */ }
  return /^[A-Za-z0-9]{15,30}$/.test(text) ? text : null;
}

export function timeAgo(ms, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}
