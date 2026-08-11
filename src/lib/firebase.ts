import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCz-UxxDYECnXMbVjBElcqY1wfFjGBTGtQ",
  authDomain: "codfest-3f73d.firebaseapp.com",
  projectId: "codfest-3f73d",
  storageBucket: "codfest-3f73d.firebasestorage.app",
  messagingSenderId: "1071054678024",
  appId: "1:1071054678024:web:0009ca55b7df71aa6289bd",
  measurementId: "G-FDLRK8TC77",
};

// Prevent re-initialisation during hot-reloads in development
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
