import { db, auth } from './firebase-config.js';
import { getYouTubeId } from './main.js';
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

const CATEGORY_LABELS = {
  'latest-trailers': 'Latest Trailers',
  'hollywood-english': 'Hollywood (English)',
  'south-dubbed-movies': 'South Dubbed',
  'classic-cinema': 'Hollywood (Hindi)',
  'movie-reviews': 'Web Series',
  'story-tv': 'Story TV',
  'bhojpuri-movies': 'Bhojpuri Movies',
};

const PLACEHOLDER_POSTER = 'https://via.placeholder.com/300x450?text=MovieTB';

let moviesCache = [];
let moviesFetchPromise = null;
let currentEditingId = null;
let deleteTargetId = null;

const adminPage = document.body.dataset.adminPage || '';

// ─── Toast ───────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function consumeStoredToast() {
  try {
    const raw = sessionStorage.getItem('adminToast');
    if (!raw) return;
    sessionStorage.removeItem('adminToast');
    const { message, type } = JSON.parse(raw);
    if (message) showToast(message, type || 'success');
  } catch (_) { /* ignore */ }
}

function storeToast(message, type = 'success') {
  sessionStorage.setItem('adminToast', JSON.stringify({ message, type }));
}

// ─── YouTube / Poster helpers ────────────────────────────────────────────────
function normalizeYouTubeEmbedUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  const id = getYouTubeId(trimmed);
  return id ? `https://www.youtube.com/embed/${id}` : trimmed;
}

function resolvePosterUrl(movie) {
  const poster = (movie.posterUrl || '').trim();
  if (poster) return poster;
  const ytId = getYouTubeId(normalizeYouTubeEmbedUrl(movie.embedUrl || ''));
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return PLACEHOLDER_POSTER;
}

function formatCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category || '—';
}

function getCreatedTime(movie) {
  if (movie.createdAt?.toMillis) return movie.createdAt.toMillis();
  if (movie.createdAt?.seconds) return movie.createdAt.seconds * 1000;
  return 0;
}

function formatDate(movie) {
  const ms = getCreatedTime(movie);
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Movie data cache ────────────────────────────────────────────────────────
function invalidateMoviesCache() {
  moviesCache = [];
  moviesFetchPromise = null;
}

async function fetchAllMovies(force = false) {
  if (!force && moviesCache.length) return moviesCache;
  if (moviesFetchPromise && !force) return moviesFetchPromise;

  moviesFetchPromise = (async () => {
    const snap = await getDocs(collection(db, 'movies'));
    moviesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return moviesCache;
  })();

  try {
    return await moviesFetchPromise;
  } catch (err) {
    moviesFetchPromise = null;
    throw err;
  }
}

// ─── Sidebar (mobile) ────────────────────────────────────────────────────────
function initSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-sidebar-overlay');
  const toggle = document.getElementById('admin-menu-toggle');
  if (!sidebar || !toggle) return;

  const close = () => {
    sidebar.classList.remove('open');
    overlay?.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  const open = () => {
    sidebar.classList.add('open');
    overlay?.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
  };

  toggle.addEventListener('click', () => {
    sidebar.classList.contains('open') ? close() : open();
  });
  overlay?.addEventListener('click', close);
}

// ─── Auth guard ──────────────────────────────────────────────────────────────
function protectPage(onReady) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
    } else if (onReady) {
      onReady(user);
    }
  });
}

// ─── Login ───────────────────────────────────────────────────────────────────
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('admin-email')?.value.trim();
    const password = document.getElementById('admin-password')?.value;

    if (!email || !password) {
      showToast('Please enter email and password.', 'error');
      return;
    }

    loginBtn.disabled = true;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'dashboard.html';
    } catch (_) {
      showToast('Login failed. Check your credentials.', 'error');
      loginBtn.disabled = false;
    }
  });

  document.getElementById('admin-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });
}

// ─── Logout ──────────────────────────────────────────────────────────────────
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      invalidateMoviesCache();
      window.location.href = 'login.html';
    });
  });
}

// ─── Dashboard stats ─────────────────────────────────────────────────────────
function updateStats(movies) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };

  set('stat-total', movies.length);
  set('stat-trailers', movies.filter(m => m.category === 'latest-trailers').length);
  set('stat-south', movies.filter(m => m.category === 'south-dubbed-movies').length);
  set('stat-hollywood', movies.filter(m => m.category === 'classic-cinema').length);
  set('stat-webseries', movies.filter(m => m.category === 'movie-reviews').length);
}

// ─── Filter / sort ───────────────────────────────────────────────────────────
function populateFilterOptions(movies) {
  const langSelect = document.getElementById('filter-language');
  const yearSelect = document.getElementById('filter-year');
  const formatSelect = document.getElementById('filter-format');
  if (!langSelect || !yearSelect || !formatSelect) return;

  const langs = [...new Set(movies.map(m => (m.language || '').trim()).filter(Boolean))].sort();
  const years = [...new Set(movies.map(m => m.year).filter(Boolean))].sort((a, b) => b - a);
  const formats = [...new Set(movies.map(m => (m.format || '').trim()).filter(Boolean))].sort();

  langSelect.innerHTML = '<option value="">All Languages</option>' +
    langs.map(l => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join('');
  yearSelect.innerHTML = '<option value="">All Years</option>' +
    years.map(y => `<option value="${y}">${y}</option>`).join('');
  formatSelect.innerHTML = '<option value="">All Formats</option>' +
    formats.map(f => `<option value="${escapeAttr(f)}">${escapeHtml(f)}</option>`).join('');
}

function getFilteredMovies(movies) {
  const search = (document.getElementById('movie-search')?.value || '').trim().toLowerCase();
  const category = document.getElementById('filter-category')?.value || '';
  const language = document.getElementById('filter-language')?.value || '';
  const year = document.getElementById('filter-year')?.value || '';
  const format = document.getElementById('filter-format')?.value || '';
  const sort = document.getElementById('movie-sort')?.value || 'newest';

  let result = movies.filter(m => {
    if (search && !(m.title || '').toLowerCase().includes(search)) return false;
    if (category && m.category !== category) return false;
    if (language && (m.language || '') !== language) return false;
    if (year && String(m.year) !== year) return false;
    if (format && (m.format || '') !== format) return false;
    return true;
  });

  result = [...result];
  switch (sort) {
    case 'oldest':
      result.sort((a, b) => getCreatedTime(a) - getCreatedTime(b) || (a.title || '').localeCompare(b.title || ''));
      break;
    case 'az':
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'za':
      result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      break;
    default:
      result.sort((a, b) => getCreatedTime(b) - getCreatedTime(a) || (a.title || '').localeCompare(b.title || ''));
  }
  return result;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

// ─── Movie row HTML ───────────────────────────────────────────────────────────
function buildMovieRow(movie, { compact = false } = {}) {
  const poster = resolvePosterUrl(movie);
  const dateStr = formatDate(movie);
  const meta = [
    formatCategoryLabel(movie.category),
    movie.year || '—',
    movie.language || '—',
    movie.format || '—'
  ].join(' · ');

  const dateHtml = dateStr ? `<span>${escapeHtml(dateStr)}</span>` : '';

  return `
    <article class="admin-movie-row" data-id="${escapeAttr(movie.id)}">
      <img class="admin-movie-poster" src="${escapeAttr(poster)}" alt="" loading="lazy"
        onerror="this.onerror=null;this.src='${PLACEHOLDER_POSTER}'">
      <div class="admin-movie-info">
        <h3>${escapeHtml(movie.title || 'Untitled')}</h3>
        <div class="admin-movie-meta">${escapeHtml(meta)}${dateHtml ? ' · ' + dateHtml : ''}</div>
      </div>
      <div class="admin-movie-actions">
        <button type="button" class="admin-btn admin-btn-ghost admin-btn-sm" data-action="preview" data-id="${escapeAttr(movie.id)}" aria-label="Preview ${escapeAttr(movie.title || 'movie')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview
        </button>
        <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" data-action="edit" data-id="${escapeAttr(movie.id)}" aria-label="Edit ${escapeAttr(movie.title || 'movie')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-action="delete" data-id="${escapeAttr(movie.id)}" data-title="${escapeAttr(movie.title || 'Untitled')}" aria-label="Delete ${escapeAttr(movie.title || 'movie')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Delete
        </button>
      </div>
    </article>
  `;
}

function renderEmptyState(container, message = 'No movies found', sub = 'Add your first movie to get started.') {
  container.innerHTML = `
    <div class="admin-empty">
      <h3>${escapeHtml(message)}</h3>
      <p style="margin-bottom:16px;">${escapeHtml(sub)}</p>
      <a href="add-movie.html" class="admin-btn admin-btn-primary">+ Add Movie</a>
    </div>
  `;
}

function renderSkeletonList(container, count = 4) {
  container.innerHTML = Array(count).fill('<div class="admin-skeleton"></div>').join('');
}

function renderMovieLists(movies) {
  const listContainer = document.getElementById('admin-movies-list');
  const recentContainer = document.getElementById('recent-movies-list');
  if (!listContainer) return;

  updateStats(movies);
  populateFilterOptions(movies);

  const filtered = getFilteredMovies(movies);
  if (filtered.length === 0) {
    renderEmptyState(listContainer);
  } else {
    listContainer.innerHTML = filtered.map(m => buildMovieRow(m)).join('');
  }

  if (recentContainer) {
    const recent = [...movies]
      .sort((a, b) => getCreatedTime(b) - getCreatedTime(a))
      .slice(0, 5);

    if (recent.length === 0) {
      renderEmptyState(recentContainer);
    } else {
      recentContainer.innerHTML = recent.map(m => buildMovieRow(m)).join('');
    }
  }
}

// ─── Preview modal ───────────────────────────────────────────────────────────
function openPreviewModal(movieId) {
  const movie = moviesCache.find(m => m.id === movieId);
  if (!movie) return;

  const modal = document.getElementById('preview-modal');
  const body = document.getElementById('preview-modal-body');
  if (!modal || !body) return;

  const poster = resolvePosterUrl(movie);
  const embed = normalizeYouTubeEmbedUrl(movie.embedUrl || '');
  const videoHtml = embed
    ? `<div class="admin-preview-video"><iframe src="${escapeAttr(embed)}" title="Video preview" allowfullscreen loading="lazy"></iframe></div>`
    : '';

  body.innerHTML = `
    <div class="admin-preview-grid">
      <img class="admin-preview-poster" src="${escapeAttr(poster)}" alt="${escapeAttr(movie.title || '')}"
        onerror="this.onerror=null;this.src='${PLACEHOLDER_POSTER}'">
      <div class="admin-preview-details">
        <p><strong>Title:</strong> ${escapeHtml(movie.title || '—')}</p>
        <p><strong>Year:</strong> ${escapeHtml(movie.year || '—')}</p>
        <p><strong>Language:</strong> ${escapeHtml(movie.language || '—')}</p>
        <p><strong>Category:</strong> ${escapeHtml(formatCategoryLabel(movie.category))}</p>
        <p><strong>Format:</strong> ${escapeHtml(movie.format || '—')}</p>
        <p><strong>Director:</strong> ${escapeHtml(movie.director || '—')}</p>
        <p><strong>Star Cast:</strong> ${escapeHtml(movie.starCast || '—')}</p>
        <p><strong>Summary:</strong> ${escapeHtml(movie.summary || '—')}</p>
        <a href="../movie.html?id=${escapeAttr(movie.id)}" target="_blank" rel="noopener" class="admin-btn admin-btn-secondary admin-btn-sm" style="margin-top:8px;display:inline-flex;">Open public page ↗</a>
      </div>
    </div>
    ${videoHtml}
  `;

  modal.classList.add('open');
  document.getElementById('preview-modal-close')?.focus();
}

function closePreviewModal() {
  document.getElementById('preview-modal')?.classList.remove('open');
  const body = document.getElementById('preview-modal-body');
  if (body) body.innerHTML = '';
}

// ─── Delete modal ────────────────────────────────────────────────────────────
function openDeleteModal(id, title) {
  deleteTargetId = id;
  const titleEl = document.getElementById('delete-movie-title');
  if (titleEl) titleEl.textContent = title || 'Untitled';
  document.getElementById('delete-modal')?.classList.add('open');
}

function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('delete-modal')?.classList.remove('open');
}

async function confirmDeleteMovie() {
  if (!deleteTargetId) return;

  const id = deleteTargetId;
  closeDeleteModal();

  try {
    await deleteDoc(doc(db, 'movies', id));
    invalidateMoviesCache();
    showToast('Movie deleted successfully.');
    await loadDashboard();
  } catch (_) {
    showToast('Something went wrong.', 'error');
  }
}

// ─── Dashboard init ──────────────────────────────────────────────────────────
async function loadDashboard() {
  const listContainer = document.getElementById('admin-movies-list');
  const errorEl = document.getElementById('dashboard-error');
  if (!listContainer) return;

  renderSkeletonList(listContainer, 5);
  const recentContainer = document.getElementById('recent-movies-list');
  if (recentContainer) renderSkeletonList(recentContainer, 3);

  try {
    const movies = await fetchAllMovies();
    if (errorEl) errorEl.style.display = 'none';
    renderMovieLists(movies);
  } catch (_) {
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.textContent = 'Unable to load movie data. Please try again.';
    }
    listContainer.innerHTML = '';
    if (recentContainer) recentContainer.innerHTML = '';
  }
}

function initDashboardToolbar() {
  const toolbarIds = ['movie-search', 'filter-category', 'filter-language', 'filter-year', 'filter-format', 'movie-sort'];
  toolbarIds.forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      renderMovieLists(moviesCache);
    });
    document.getElementById(id)?.addEventListener('change', () => {
      renderMovieLists(moviesCache);
    });
  });

  const urlFilter = new URLSearchParams(window.location.search).get('filter');
  if (urlFilter) {
    const catSelect = document.getElementById('filter-category');
    if (catSelect) catSelect.value = urlFilter;
  }
}

function initMovieListDelegation() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id) return;

    if (action === 'edit') {
      window.location.href = `add-movie.html?edit=${encodeURIComponent(id)}`;
    } else if (action === 'delete') {
      openDeleteModal(id, btn.dataset.title || 'Untitled');
    } else if (action === 'preview') {
      openPreviewModal(id);
    }
  });
}

function initModals() {
  document.getElementById('preview-modal-close')?.addEventListener('click', closePreviewModal);
  document.getElementById('preview-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'preview-modal') closePreviewModal();
  });
  document.getElementById('delete-cancel-btn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('delete-confirm-btn')?.addEventListener('click', confirmDeleteMovie);
  document.getElementById('delete-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') closeDeleteModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePreviewModal();
      closeDeleteModal();
    }
  });
}

function initDashboardPage() {
  initSidebar();
  initDashboardToolbar();
  initMovieListDelegation();
  initModals();
  consumeStoredToast();
  protectPage((user) => {
    showAdminEmail(user);
    loadDashboard();
  });
}

function showAdminEmail(user) {
  const el = document.getElementById('admin-user-email');
  if (el && user?.email) el.textContent = user.email;
}

// ─── Add / Edit movie form ───────────────────────────────────────────────────
function updatePosterPreview() {
  const img = document.getElementById('poster-preview-img');
  const posterInput = document.getElementById('posterUrl');
  const embedInput = document.getElementById('embedUrl');
  if (!img) return;

  const posterUrl = (posterInput?.value || '').trim();
  let src = posterUrl;

  if (!src) {
    const ytId = getYouTubeId(normalizeYouTubeEmbedUrl((embedInput?.value || '').trim()));
    if (ytId) src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }

  if (!src) src = PLACEHOLDER_POSTER;
  img.src = src;
  img.onerror = () => {
    img.onerror = null;
    img.src = PLACEHOLDER_POSTER;
  };
}

async function loadMovieForEdit(id) {
  try {
    const docRef = doc(db, 'movies', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      showToast('Movie not found.', 'error');
      return;
    }

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
    updatePosterPreview();

    const submitBtn = document.getElementById('submit-movie-btn');
    if (submitBtn) submitBtn.textContent = 'Update Movie';

    const pageTitle = document.getElementById('form-page-title');
    const cardTitle = document.getElementById('form-card-title');
    if (pageTitle) pageTitle.textContent = 'Edit Movie';
    if (cardTitle) cardTitle.textContent = 'Update Movie';
  } catch (_) {
    showToast('Something went wrong.', 'error');
  }
}

function initAddMoviePage() {
  initSidebar();

  const addMovieForm = document.getElementById('add-movie-form');
  if (!addMovieForm) return;

  protectPage(async () => {
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (editId) await loadMovieForEdit(editId);
    else updatePosterPreview();
  });

  document.getElementById('posterUrl')?.addEventListener('input', updatePosterPreview);
  document.getElementById('embedUrl')?.addEventListener('input', updatePosterPreview);

  addMovieForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-movie-btn');
    if (submitBtn) submitBtn.disabled = true;

    const rawEmbed = document.getElementById('embedUrl').value.trim();
    const movieData = {
      title: document.getElementById('title').value.trim(),
      category: document.getElementById('category').value,
      language: document.getElementById('language').value.trim(),
      year: Number(document.getElementById('year').value),
      format: document.getElementById('format').value.trim(),
      director: document.getElementById('director').value.trim(),
      starCast: document.getElementById('starCast').value.trim(),
      posterUrl: document.getElementById('posterUrl').value.trim(),
      embedUrl: normalizeYouTubeEmbedUrl(rawEmbed),
      summary: document.getElementById('summary').value.trim(),
    };

    try {
      if (currentEditingId) {
        await updateDoc(doc(db, 'movies', currentEditingId), movieData);
        invalidateMoviesCache();
        storeToast('Movie updated successfully.');
      } else {
        movieData.views = 0;
        movieData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'movies'), movieData);
        invalidateMoviesCache();
        storeToast('Movie published successfully.');
      }

      window.location.href = 'dashboard.html';
    } catch (_) {
      showToast('Something went wrong.', 'error');
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

// ─── Boot ────────────────────────────────────────────────────────────────────
if (adminPage === 'dashboard') {
  initDashboardPage();
} else if (adminPage === 'add-movie') {
  initAddMoviePage();
}
