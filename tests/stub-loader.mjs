// Test-only: replaces the Firebase CDN imports with no-op stubs so screens can run in Node.
const NAMES = ["initializeApp","getAuth","getFirestore","doc","setDoc","getDoc","addDoc","updateDoc","deleteDoc","collection",
  "onSnapshot","query","orderBy","writeBatch","arrayUnion","serverTimestamp","createUserWithEmailAndPassword",
  "signInWithEmailAndPassword","sendPasswordResetEmail","signOut","updateProfile","onAuthStateChanged"];
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("https://")) return { url: specifier, shortCircuit: true };
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.startsWith("https://")) {
    return { format: "module", shortCircuit: true, source: NAMES.map((n) => `export const ${n} = () => ({});`).join("\n") };
  }
  return next(url, context);
}
