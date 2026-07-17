import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, push, set, get, child } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCY7ZC6Dvc6juPn9opMDNVY2JIjGDerYDM",
  authDomain: "yoga-7e131.firebaseapp.com",
  databaseURL: "https://yoga-7e131-default-rtdb.firebaseio.com",
  projectId: "yoga-7e131",
  storageBucket: "yoga-7e131.firebasestorage.app",
  messagingSenderId: "321557299484",
  appId: "1:321557299484:web:dd5b15cd0bbcdb62c1bad9",
  measurementId: "G-0WFLVN6Q9C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, ref, push, set, get, child, auth, storage };
