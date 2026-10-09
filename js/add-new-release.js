import { db } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const CATEGORY = 'new-releases';
const moviesCol = collection(db, 'movies');

/* =========================================================
   AUTH GUARD - same Firebase Auth pattern as the rest of the
   admin panel (login.html / dashboard.html).
   ========================================================= */
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
  }
});

const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.href = 'login.html';
    });
  });
}

/* =========================================================
   LOAD + RENDER EXISTING NEW RELEASES
   ========================================================= */
async function loadEntries() {
  const listEl = document.getElementById('new-release-list');

  let snapshot;
  try {
    // Prefer newest-first if createdAt exists on all docs
    snapshot = await getDocs(query(moviesCol, where('category', '==', CATEGORY), orderBy('createdAt', 'desc')));
  } catch (err) {
    // orderBy can fail if some older docs lack createdAt / no index yet - fall back to unordered
    snapshot = await getDocs(query(moviesCol, where('category', '==', CATEGORY)));
  }

  const entries = [];
  snapshot.forEach((docSnap) => entries.push({ id: docSnap.id, ...docSnap.data() }));

  if (!listEl) return entries;

  if (entries.length === 0) {
    listEl.innerHTML = `<p class="admin-subtext">No New Releases added yet. Add your first one below.</p>`;
  } else {
    listEl.innerHTML = entries
      .map((movie) => `
        <div class="hero-slide-row" data-id="${movie.id}">
          <img src="${movie.posterUrl || ''}" alt="${movie.title || 'Poster'}" class="hero-slide-thumb"
               onerror="this.style.opacity='0.3'">
          <div class="hero-slide-info">
            <strong>${movie.title || '(untitled)'}</strong>
            <span>${[movie.year, movie.format, movie.language].filter(Boolean).join(' • ') || 'No meta set'}</span>
          </div>
          <a class="btn-logout" href="movie.html?id=${movie.id}" target="_blank" style="text-decoration:none;">View</a>
          <button type="button" class="btn-logout btn-delete-entry" data-id="${movie.id}">Delete</button>
        </div>
      `)
      .join('');

    listEl.querySelectorAll('.btn-delete-entry').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this movie from New Releases?')) return;
        btn.disabled = true;
        try {
          await deleteDoc(doc(db, 'movies', btn.dataset.id));
          await loadEntries();
        } catch (err) {
          console.error('Failed to delete movie:', err);
          alert('Could not delete this entry. Check console for details.');
          btn.disabled = false;
        }
      });
    });
  }

  return entries;
}

/* =========================================================
   ADD NEW MOVIE
   ========================================================= */
const form = document.getElementById('new-release-form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('nr-title').value.trim();
    const videoUrl = document.getElementById('nr-video-url').value.trim();
    const posterUrl = document.getElementById('nr-poster-url').value.trim();

    if (!title || !videoUrl || !posterUrl) {
      alert('Title, Video URL and Poster URL are required.');
      return;
    }

    if (videoUrl.includes('[') || videoUrl.includes('](')) {
      alert('That looks like markdown formatting, e.g. "[text](url)". Paste just the raw URL instead.');
      return;
    }

    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding…';

    try {
      await addDoc(moviesCol, {
        title,
        category: CATEGORY,
        videoUrl,
        posterUrl,
        year: document.getElementById('nr-year').value.trim(),
        format: document.getElementById('nr-format').value.trim(),
        language: document.getElementById('nr-language').value.trim(),
        telegramMsgId: document.getElementById('nr-telegram-msg-id').value.trim(),
        summary: document.getElementById('nr-summary').value.trim(),
        createdAt: serverTimestamp(),
      });
      form.reset();
      await loadEntries();
    } catch (err) {
      console.error('Failed to add new release:', err);
      alert('Could not add this movie. Check console for details.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add to New Releases';
    }
  });
}

loadEntries();