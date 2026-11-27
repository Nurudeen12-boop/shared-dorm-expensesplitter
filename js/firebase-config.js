// Firebase WEB APP config for the project "shared-dorm-expensesplitter".
// These values are safe to commit: they identify the project, they are not secrets.
// Access is protected by Firebase Authentication + firestore.rules, not by hiding this config.
export const firebaseConfig = {
  apiKey: "AIzaSyAwlJmihHZTZ5Jhl24kjc7dppJukA0Ipyc",
  authDomain: "shared-dorm-expensesplitter.firebaseapp.com",
  projectId: "shared-dorm-expensesplitter",
  storageBucket: "shared-dorm-expensesplitter.firebasestorage.app",
  messagingSenderId: "510137703102",
  appId: "1:510137703102:web:ab9ee4168a746c4fee9cef",
};

export const isConfigured = !Object.values(firebaseConfig).some((v) => String(v).startsWith("YOUR_"));
