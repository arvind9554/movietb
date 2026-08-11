import { db, auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Global Variable to track edit mode state
let currentEditingId = null;

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

// Protected Dashboard / Movie Actions
const addMovieForm = document.getElementById('add-movie-form');
if (addMovieForm) {
  
  // Protect page (If not logged in, redirect to login page)
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    } else {
      loadAdminMoviesList();
    }
  });

  // Add OR Update Movie Form Submission Action
  addMovieForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = addMovieForm.querySelector('button[type="submit"]');

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
    };

    try {
      if (currentEditingId) {
        // UPDATE MODE
        const movieRef = doc(db, "movies", currentEditingId);
        await updateDoc(movieRef, movieData);
        alert("Movie Updated Successfully!");
        
        currentEditingId = null;
        if (submitBtn) submitBtn.innerText = "Publish Movie";
      } else {
        // ADD NEW MODE
        movieData.views = 0;
        movieData.createdAt = serverTimestamp();
        
        await addDoc(collection(db, "movies"), movieData);
        alert("Movie Published Successfully!");
      }

      addMovieForm.reset();
      loadAdminMoviesList(); // Refresh list after saving
    } catch (error) {
      alert("Error saving movie: " + error.message);
    }
  });
}

// Function to fetch and display uploaded movies with Edit/Delete options
async function loadAdminMoviesList() {
  const listContainer = document.getElementById('admin-movies-list');
  if (!listContainer) return;

  try {
    const querySnapshot = await getDocs(collection(db, "movies"));
    listContainer.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const movie = docSnap.data();
      const movieId = docSnap.id;

      const item = document.createElement('div');
      item.className = 'admin-movie-item';
      item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #333; margin-bottom: 8px;";
      
      item.innerHTML = `
        <div>
          <strong>${movie.title}</strong> (${movie.year}) - <em>${movie.category}</em>
        </div>
        <div>
          <button class="edit-btn" data-id="${movieId}" style="padding: 5px 10px; margin-right: 5px; cursor: pointer; background: #007bff; color: #fff; border: none; border-radius: 4px;">Edit</button>
          <button class="delete-btn" data-id="${movieId}" style="padding: 5px 10px; cursor: pointer; background: #dc3545; color: #fff; border: none; border-radius: 4px;">Delete</button>
        </div>
      `;

      listContainer.appendChild(item);
    });

    // Attach Click Events for Edit
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => editMovie(e.target.dataset.id));
    });

    // Attach Click Events for Delete
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => deleteMovie(e.target.dataset.id));
    });

  } catch (error) {
    console.error("Error loading movie list:", error);
  }
}

// Function to populate form with existing movie data
async function editMovie(id) {
  try {
    const docRef = doc(db, "movies", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      document.getElementById('title').value = data.title || '';
      document.getElementById('category').value = data.category || '';
      document.getElementById('language').value = data.language || '';
      document.getElementById('year').value = data.year || '';
      document.getElementById('format').value = data.format || '';
      document.getElementById('director').value = data.director || '';
      document.getElementById('starCast').value = data.starCast || '';
      document.getElementById('posterUrl').value = data.posterUrl || '';
      document.getElementById('embedUrl').value = data.embedUrl || '';
      document.getElementById('summary').value = data.summary || '';

      currentEditingId = id;

      const submitBtn = document.querySelector('#add-movie-form button[type="submit"]');
      if (submitBtn) submitBtn.innerText = "Update Movie";

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (error) {
    alert("Error loading movie details: " + error.message);
  }
}

// Function to Delete Movie
async function deleteMovie(id) {
  if (confirm("Are you sure you want to delete this movie?")) {
    try {
      await deleteDoc(doc(db, "movies", id));
      alert("Movie deleted successfully!");
      loadAdminMoviesList();
    } catch (error) {
      alert("Error deleting movie: " + error.message);
    }
  }
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