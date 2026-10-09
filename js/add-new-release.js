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

const CATEGORY = 'New Releases';
const moviesCol = collection(db, 'movies');

/* =========================================================
   AUTH GUARD
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
    snapshot = await getDocs(query(moviesCol, where('category', '==', CATEGORY), orderBy('createdAt', 'desc')));
  } catch (err) {
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
        <div class="hero-slide-row" data-id="${movie.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #222; margin-bottom: 8px; border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${movie.posterUrl || ''}" alt="${movie.title || 'Poster'}" class="hero-slide-thumb" style="width: 40px; height: 55px; object-fit: cover; border-radius: 4px;" onerror="this.style.opacity='0.3'">
            <div class="hero-slide-info">
              <strong style="color: #fff; font-size: 0.95rem;">${movie.title || '(untitled)'}</strong>
              <div style="color: #aaa; font-size: 0.8rem;">${[movie.year, movie.format, movie.language].filter(Boolean).join(' • ') || 'No meta set'} | Msg ID: ${movie.telegramMsgId || 'N/A'}</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <a class="btn-logout" href="../movie.html?id=${movie.id}" target="_blank" style="text-decoration:none; padding: 6px 12px; font-size: 0.85rem;">View</a>
            <button type="button" class="btn-logout btn-delete-entry" data-id="${movie.id}" style="padding: 6px 12px; font-size: 0.85rem; background: #e50914;">Delete</button>
          </div>
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

    const title = document.getElementById('nr-title')?.value.trim() || '';
    const posterUrl = document.getElementById('nr-poster-url')?.value.trim() || '';
    const telegramMsgId = document.getElementById('nr-telegram-msg-id')?.value.trim() || '';

    if (!title || !posterUrl || !telegramMsgId) {
      alert('Title, Poster URL, and Telegram Post Link/Message ID are required.');
      return;
    }

    const submitBtn = form.querySelector('.btn-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding…';
    }

    try {
      await addDoc(moviesCol, {
        title,
        category: CATEGORY,
        isNewRelease: true,
        posterUrl,
        telegramMsgId,
        messageId: telegramMsgId,
        year: document.getElementById('nr-year')?.value.trim() || '2026',
        format: document.getElementById('nr-format')?.value.trim() || '1080p HD',
        language: document.getElementById('nr-language')?.value.trim() || 'Hindi',
        summary: document.getElementById('nr-summary')?.value.trim() || '',
        createdAt: serverTimestamp(),
      });

      form.reset();
      await loadEntries();
      alert('Movie added to New Releases successfully!');
    } catch (err) {
      console.error('Failed to add new release:', err);
      alert('Could not add this movie. Check console for details.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add to New Releases';
      }
    }
  });
}

loadEntries();