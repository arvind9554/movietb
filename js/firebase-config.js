import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Aapka MovieTB Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDQ_mNJ2OemAGosnfmbsjK0IXFt8PB0Cc",
  authDomain: "movietb.firebaseapp.com",
  projectId: "movietb",
  storageBucket: "movietb.firebasestorage.app",
  messagingSenderId: "529957440803",
  appId: "1:529957440803:web:81ad2a22189e785f82d096",
  measurementId: "G-64FX9XCE18"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);