// Authentication (Firebase Authentication). Passwords are NEVER stored in our database.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./firebase.js";
import { createUserProfile } from "./db.js";

const FRIENDLY = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/invalid-login-credentials": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/weak-password": "Password must be at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed": "No internet connection. Check your network and try again.",
};
export const friendlyAuthError = (err) => FRIENDLY[err?.code] || "Something went wrong. Please try again.";

export async function signUp(fullName, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: fullName });
  await createUserProfile(cred.user.uid, { name: fullName, email });
  return cred.user;
}

export const logIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const sendReset = (email) => sendPasswordResetEmail(auth, email);
export const logOut = () => signOut(auth);
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
