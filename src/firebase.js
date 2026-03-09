import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdJVC6jUE5hEQS0RWYSjY4-cuvjzeoZFc",
  authDomain: "tabungan-ber2-c147e.firebaseapp.com",
  projectId: "tabungan-ber2-c147e",
  storageBucket: "tabungan-ber2-c147e.firebasestorage.app",
  messagingSenderId: "721689212412",
  appId: "1:721689212412:web:4fd9b47dff17d9e1f42e79"
};

const app = initializeApp(firebaseConfig);

// Export auth, googleProvider, dan db
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);