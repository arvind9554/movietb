import { db } from './firebase-config.js';
import { collection, getDocs, query, where, getDocsFromCache, getDocsFromServer } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ===== Skeleton Shimmer Loading Cards Builder =====
export function renderSkeletonCards(container, count = 4) {
    if (!container) return;
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
          <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-info">
              <div class="skeleton-text-title"></div>
              <div class="skeleton-text-sub"></div>
            </div>
          </div>
        `;
    }
    container.innerHTML = html;
}

// ===== Google Analytics YouTube Auto-Tracking Fix =====
document.addEventListener("DOMContentLoaded", function () {
    function enableYouTubeApi() {
        var iframes = document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]');
        iframes.forEach(function (iframe) {
            var src = iframe.getAttribute('src');
            if (src && src.indexOf('enablejsapi=1') === -1) {
                var separator = src.indexOf('?') === -1 ? '?' : '&';
                iframe.setAttribute('src', src + separator + 'enablejsapi=1');
            }
        });
    }

    enableYouTubeApi();

    var observer = new MutationObserver(function () {
        enableYouTubeApi();
    });

    observer.observe(document.body, { childList: true, subtree: true });
});

// Search Redirection Logic
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

if (searchBtn && searchInput) {
  searchBtn.addEventListener('click', () => {
    const queryVal = searchInput.value.trim();
    if (queryVal.length > 0) {
      window.location.href = `search.html?q=${encodeURIComponent(queryVal)}`;
    }
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });
}

// Extract YouTube video ID from embed/watch/short URLs
export function getYouTubeId(embedUrl) {
  if (!embedUrl) return null;
  const match = embedUrl.match(/(?:embed\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Build best available poster + a safe fallback chain
export function resolvePoster(movie) {
  const ytId = getYouTubeId(movie.embedUrl || movie.trailerUrl);
  
  const primary = (movie.posterUrl && movie.posterUrl.trim())
    ? movie.posterUrl.trim()
    : (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://via.placeholder.com/300x450?text=No+Poster');

  const fallback = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : 'https://via.placeholder.com/300x450?text=No+Poster';

  return { primary, fallback };
}

// Highest-quality background image for the homepage HERO only.
export function resolveHeroImage(movie) {
  return new Promise((resolve) => {
    const heroUrl = ((movie.heroImageUrl || movie.bannerUrl || '') + '').trim();
    if (heroUrl) {
      resolve(heroUrl);
      return;
    }

    const poster = ((movie.posterUrl || '') + '').trim();
    if (poster) {
      resolve(poster);
      return;
    }

    const ytId = getYouTubeId(movie.embedUrl || movie.trailerUrl);
    if (!ytId) {
      resolve('https://via.placeholder.com/1280x720?text=MovieTB');
      return;
    }

    const maxres = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
    const hq = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

    const probe = new Image();
    probe.onload = () => {
      resolve(probe.naturalWidth > 200 ? maxres : hq);
    };
    probe.onerror = () => resolve(hq);
    probe.src = maxres;
  });
}

// Utility to create Movie HTML Card (Fixed Fallback Syntax Error)
export function createMovieCard(movie, id) {
    const { primary, fallback } = resolvePoster(movie);

    return `
    <div class="movie-card" onclick="window.location.href='movie.html?id=${id}'">
        <div class="poster-wrapper">
            <img 
              src="${primary}"
              alt="${movie.title}"
              loading="lazy"
              onerror="this.onerror=null;this.src='${fallback}';"
            />
            <span class="badge">${movie.format || 'HD'}</span>
        </div>
        <div class="card-details">
            <h3>${movie.title}</h3>
            <div class="card-meta">${movie.year || ''} ${movie.language || ''}</div>
        </div>
    </div>
    `;
}

// ===== Portrait Poster Card (2:3) - "Trending Now" style =====
// New Releases ke liye. Har card same size ka rehta hai, poster kisi bhi
// shape ka ho. CSS: style.css ka "Poster cards (New Releases)" block.
// Poster cards ki CSS yahin se inject hoti hai, taaki style.css update na hui ho
// tab bhi cards bina design ke (badi images) na dikhen. style.css me wahi block
// ho to koi dikkat nahi, rules same hain.
const POSTER_CARD_CSS = `
.poster-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 18px; margin-bottom: 20px; }
.poster-card { display: flex; flex-direction: column; min-width: 0; color: inherit; cursor: pointer; }
.poster-card-img {
  position: relative; aspect-ratio: 2 / 3; border-radius: 12px; overflow: hidden;
  background: linear-gradient(135deg, #1a1a1a, #0a0a0a); border: 1px solid #262626;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}
.poster-card-img img {
  width: 100%; height: 100%; object-fit: cover; object-position: center 20%;
  display: block; transition: transform 0.4s ease;
}
.poster-card:hover .poster-card-img { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-color: #3a3a3a; }
.poster-card:hover .poster-card-img img { transform: scale(1.05); }
.poster-card-badge {
  position: absolute; top: 8px; right: 8px; background: #e50914; color: #fff;
  padding: 3px 8px; font-size: 0.66rem; font-weight: 700; border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.45);
}
.poster-card-title {
  margin-top: 10px; font-size: 0.88rem; font-weight: 600; line-height: 1.35; color: #fff;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.poster-card-meta { margin-top: 3px; font-size: 0.75rem; color: #6b6b6b; }
@media (max-width: 1100px) { .poster-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (min-width: 761px) and (max-width: 1100px) {
  #new-releases-grid.poster-grid .poster-card:nth-child(n+5) { display: none; }
}
@media (max-width: 760px) {
  .poster-grid {
    display: flex; overflow-x: auto; gap: 12px; scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch; scrollbar-width: none; padding-bottom: 4px;
  }
  .poster-grid::-webkit-scrollbar { display: none; }
  .poster-grid .poster-card { flex: 0 0 140px; scroll-snap-align: start; }
}
`;

function ensurePosterStyles() {
    if (typeof document === 'undefined' || document.getElementById('poster-card-styles')) return;
    const el = document.createElement('style');
    el.id = 'poster-card-styles';
    el.textContent = POSTER_CARD_CSS;
    document.head.appendChild(el);
}

function escapeCardText(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function createPosterCard(movie, id) {
    ensurePosterStyles();
    const { primary, fallback } = resolvePoster(movie);
    const title = escapeCardText(movie.title || 'Untitled');
    const meta = [movie.year, movie.language].filter(Boolean).join(' · ');
    const badge = movie.format
        ? `<span class="poster-card-badge">${escapeCardText(movie.format)}</span>`
        : '';

    return `
    <a class="poster-card" href="movie.html?id=${encodeURIComponent(id)}" aria-label="Open ${title}">
        <div class="poster-card-img">
            <img
              src="${escapeCardText(primary)}"
              alt="${title}"
              loading="lazy"
              onerror="this.onerror=null;this.src='${fallback}';"
            />
            ${badge}
        </div>
        <h3 class="poster-card-title">${title}</h3>
        ${meta ? `<p class="poster-card-meta">${escapeCardText(meta)}</p>` : ''}
    </a>
    `;
}

// Container ko poster layout me badalta hai (purani movie-grid / home-row
// classes hata deta hai taaki unke purane rules na takraayein).
export function applyPosterGrid(container) {
    if (!container) return;
    ensurePosterStyles();
    container.classList.remove('movie-grid', 'home-row');
    container.classList.add('poster-grid');
}

// Load Home Page Categories Automatically with Timeout & Offline Fallback
const categories = [
  { id: 'latest-trailers', containerId: 'trailers-grid' },
  { id: 'south-dubbed-movies', containerId: 'south-dubbed-grid' },
  { id: 'classic-cinema', containerId: 'classics-grid' }
];

async function loadCategoryMovies() {
  for (const cat of categories) {
    const container = document.getElementById(cat.containerId);
    if (!container) continue;

    renderSkeletonCards(container, 4);

    try {
      const q = query(
        collection(db, "movies"),
        where("category", "==", cat.id)
      );

      // Timeout wrapper to prevent hanging when direct from Google search
      const fetchPromise = getDocs(q);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore timeout")), 7000)
      );

      let querySnapshot;
      try {
        querySnapshot = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err) {
        // Fallback to cache if network times out on direct entry
        try {
          querySnapshot = await getDocsFromCache(q);
        } catch (cacheErr) {
          throw err;
        }
      }

      if (querySnapshot.empty) {
        container.innerHTML = `<p class="loading">No posts available in this section.</p>`;
        continue;
      }

      container.innerHTML = '';

      querySnapshot.forEach((docSnap) => {
        const movie = docSnap.data();
        const movieId = docSnap.id;
        container.innerHTML += createMovieCard(movie, movieId);
      });

    } catch (error) {
      console.error(`Error loading ${cat.id}:`, error);
      container.innerHTML = `<p class="loading">Unable to load content. Please refresh.</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', loadCategoryMovies);

// ===== Left Sidebar (Categories) Toggle =====
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('categories-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarClose = document.getElementById('sidebar-close');

function openSidebar() {
  if (!sidebar || !sidebarOverlay || !menuToggle) return;
  sidebar.classList.add('active');
  sidebarOverlay.classList.add('active');
  menuToggle.classList.add('active');
}

function closeSidebar() {
  if (!sidebar || !sidebarOverlay || !menuToggle) return;
  sidebar.classList.remove('active');
  sidebarOverlay.classList.remove('active');
  menuToggle.classList.remove('active');
}

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    if (sidebar.classList.contains('active')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });
}

if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);