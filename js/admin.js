import { db, auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Login Action
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'add-movie.html';
    } catch (error) {
      alert("Login failed: " + error.message);
    }
  });
}

// Add Movie Form Submission Action
const addMovieForm = document.getElementById('add-movie-form');
if (addMovieForm) {
  
  // Protect page (If not logged in, redirect to login page)
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    }
  });

  addMovieForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const movieData = {
      title: document.getElementById('title').value.trim(),
      category: document.getElementById('category').value,
      language: document.getElementById('language').value.trim(),
      year: Number(document.getElementById('year').value),
      format: document.getElementById('format').value.trim(),
      director: document.getElementById('director').value.trim(),
      starCast: document.getElementById('starCast').value.trim(),
      posterUrl: document.getElementById('posterUrl').value.trim(),
      embedUrl: document.getElementById('embedUrl').value.trim(),
      summary: document.getElementById('summary').value.trim(),
      views: 0,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "movies"), movieData);
      alert("Movie Published Successfully!");
      addMovieForm.reset();
    } catch (error) {
      alert("Error adding movie: " + error.message);
    }
  });
}

// Logout Logic
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.href = 'login.html';
    });
  });
}