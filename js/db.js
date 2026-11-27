// Firestore data access. Money is always stored as integer kobo.
//
//  users/{uid}                      { name, email, groupId, createdAt }
//  groups/{groupId}                 { name, adminUid, memberUids[], createdAt }
//  groups/{groupId}/members/{id}    { name, uid|null, isGuest, joinedAt }      (id = uid for registered users)
//  groups/{groupId}/expenses/{id}   { name, totalKobo, createdBy, billDate, dueDate|null, description,
//                                     participants[], shares{memberId: kobo}, createdAt }
//  groups/{groupId}/payments/{id}   { fromMemberId, toMemberId, amountKobo, paymentDate, method, note,
//                                     createdBy, createdAt }
import {
  doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot,
  query, orderBy, writeBatch, arrayUnion, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

/* ---------- users ---------- */
export async function createUserProfile(uid, { name, email }) {
  await setDoc(doc(db, "users", uid), { name, email, groupId: null, createdAt: serverTimestamp() });
}
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/* ---------- groups ---------- */
/** Creator becomes the administrator (the user who created the group link). */
export async function createGroup(uid, userName, groupName) {
  const groupRef = doc(collection(db, "groups"));
  const batch = writeBatch(db);
  batch.set(groupRef, { name: groupName, adminUid: uid, memberUids: [uid], createdAt: serverTimestamp() });
  batch.set(doc(db, "groups", groupRef.id, "members", uid), {
    name: userName, uid, isGuest: false, joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, "users", uid), { groupId: groupRef.id });
  await batch.commit();
  return groupRef.id;
}

/** Join through a group link/code. Throws if the group does not exist. */
export async function joinGroup(uid, userName, groupId) {
  const batch = writeBatch(db);
  batch.update(doc(db, "groups", groupId), { memberUids: arrayUnion(uid) });
  batch.set(doc(db, "groups", groupId, "members", uid), {
    name: userName, uid, isGuest: false, joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, "users", uid), { groupId });
  await batch.commit();
}

/** Add a name-only person (no account) so they can share a bill. */
export async function addGuestMember(groupId, name) {
  const ref = await addDoc(collection(db, "groups", groupId, "members"), {
    name, uid: null, isGuest: true, joinedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Live listeners for the whole group. Returns one unsubscribe function. */
export function subscribeToGroup(groupId, handlers) {
  const g = (...p) => collection(db, "groups", groupId, ...p);
  const ms = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAtMs: d.data().createdAt?.toMillis?.() ?? Date.now() }));
  const unsubs = [
    onSnapshot(doc(db, "groups", groupId), (s) => handlers.group(s.exists() ? { id: s.id, ...s.data() } : null), handlers.error),
    onSnapshot(query(g("members"), orderBy("joinedAt")), (s) => handlers.members(ms(s)), handlers.error),
    onSnapshot(g("expenses"), (s) => handlers.expenses(ms(s)), handlers.error),
    onSnapshot(g("payments"), (s) => handlers.payments(ms(s)), handlers.error),
  ];
  return () => unsubs.forEach((u) => u());
}

/* ---------- expenses ---------- */
export const addExpense = (groupId, data) =>
  addDoc(collection(db, "groups", groupId, "expenses"), { ...data, createdAt: serverTimestamp() });

export const updateExpense = (groupId, id, data) =>
  updateDoc(doc(db, "groups", groupId, "expenses", id), { ...data, updatedAt: serverTimestamp() });

export const deleteExpense = (groupId, id) => deleteDoc(doc(db, "groups", groupId, "expenses", id));

/* ---------- payments (recorded only - there is no payment gateway) ---------- */
export const addPayment = (groupId, data) =>
  addDoc(collection(db, "groups", groupId, "payments"), { ...data, createdAt: serverTimestamp() });

export const deletePayment = (groupId, id) => deleteDoc(doc(db, "groups", groupId, "payments", id));
