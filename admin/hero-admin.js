import { db } from './firebase-config.js';
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const MAX_SLIDES = 5;
const slidesCol = collection(db, 'heroSlides');

/* =========================================================
   AUTH GUARD
   Assumes the same Firebase Auth setup as the rest of the
   admin panel (login.html / dashboard.html). If this project
   guards admin pages differently, send js/firebase-config.js
   and admin/add-movie.html and this can be matched exactly.
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
   LOAD + RENDER EXISTING SLIDES
   ========================================================= */
async function loadSlides() {
  const listEl = document.getElementById('hero-slides-list');
  const q = query(slidesCol, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);

  const slides = [];
  snapshot.forEach((docSnap) => slides.push({ id: docSnap.id, ...docSnap.data() }));

  if (!listEl) return slides;

  if (slides.length === 0) {
    listEl.innerHTML = `<p class="admin-subtext">No hero slides yet. Add up to ${MAX_SLIDES} below.</p>`;
  } else {
    listEl.innerHTML = slides
      .map((slide, i) => `
        <div class="hero-slide-row" data-id="${slide.id}">
          <img src="${slide.imageUrl}" alt="${slide.title || 'Hero slide'}" class="hero-slide-thumb"
               onerror="this.style.opacity='0.3'">
          <div class="hero-slide-info">
            <strong>${i + 1}. ${slide.title || '(untitled)'}</strong>
            <span>${[slide.year, slide.format, slide.language].filter(Boolean).join(' • ') || 'No meta set'}</span>
          </div>
          <button type="button" class="btn-logout btn-delete-slide" data-id="${slide.id}">Delete</button>
        </div>
      `)
      .join('');

    listEl.querySelectorAll('.btn-delete-slide').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this hero slide?')) return;
        btn.disabled = true;
        try {
          await deleteDoc(doc(db, 'heroSlides', btn.dataset.id));
          await loadSlides();
        } catch (err) {
          console.error('Failed to delete hero slide:', err);
          alert('Could not delete this slide. Check console for details.');
          btn.disabled = false;
        }
      });
    });
  }

  toggleFormAvailability(slides.length);
  return slides;
}

function toggleFormAvailability(count) {
  const form = document.getElementById('hero-slide-form');
  const limitMsg = document.getElementById('hero-slide-limit-msg');
  if (!form) return;

  const atLimit = count >= MAX_SLIDES;
  form.style.display = atLimit ? 'none' : '';
  if (limitMsg) limitMsg.style.display = atLimit ? 'block' : 'none';
}

/* =========================================================
   ADD NEW SLIDE
   ========================================================= */
const form = document.getElementById('hero-slide-form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentSlides = await loadSlides();
    if (currentSlides.length >= MAX_SLIDES) {
      alert(`Maximum ${MAX_SLIDES} hero slides allowed. Delete one first.`);
      return;
    }

    const imageUrl = document.getElementById('slide-image-url').value.trim();
    const title = document.getElementById('slide-title').value.trim();

    if (!imageUrl || !title) {
      alert('Image URL and Title are required.');
      return;
    }

    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding…';

    try {
      await addDoc(slidesCol, {
        imageUrl,
        title,
        year: document.getElementById('slide-year').value.trim(),
        format: document.getElementById('slide-format').value.trim(),
        language: document.getElementById('slide-language').value.trim(),
        linkUrl: document.getElementById('slide-link').value.trim(),
        tagline: document.getElementById('slide-tagline').value.trim(),
        order: currentSlides.length,
        createdAt: serverTimestamp(),
      });
      form.reset();
      await loadSlides();
    } catch (err) {
      console.error('Failed to add hero slide:', err);
      alert('Could not add this slide. Check console for details.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Hero Slide';
    }
  });
}

loadSlides();