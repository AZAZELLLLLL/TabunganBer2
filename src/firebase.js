import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJVC1uE5hEOSqRWYS1Y4-cvizcqZFc",
  authDomain: "tabungan-ber2-c147e.firebaseapp.com",
  projectId: "tabungan-ber2-c147e",
  storageBucket: "tabungan-ber2-c147e.firebasestorage.app",
  messagingSenderId: "72168921241​2",
  appId: "1:72168921241​2:web:4fd9b47dff17d9e1f42e79"
};

const app = initializeApp(firebaseConfig);

// Export auth, googleProvider, dan db
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);