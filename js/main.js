import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ===== Adsterra Smartlink Overlay Logic =====
const ADSTERRA_SMARTLINK = "https://www.profitableratecpmnetwork.com/r2kjdk4pk?key=ac4d5c8ec2eb751cad50a433621feded"; // <-- अपना monetag Smartlink URL यहाँ डालें
let countdown;

window.triggerFullScreenAd = function(callback) {
    const modal = document.getElementById('adModal');
    const iframe = document.getElementById('adIframe');
    const timerText = document.getElementById('adTimer');
    const closeBtn = document.getElementById('closeAdBtn');
    
    if (!modal || !iframe) {
        if (callback) callback();
        return;
    }

    iframe.src = ADSTERRA_SMARTLINK;
    modal.style.display = 'flex';
    closeBtn.disabled = true;
    
    let timeLeft = 15;
    timerText.innerText = `Ad ends in ${timeLeft}s`;

    countdown = setInterval(() => {
        timeLeft--;
        timerText.innerText = `Ad ends in ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            timerText.innerText = "";
            closeBtn.disabled = false;
        }
    }, 1000);

    window.onAdClosedCallback = callback;
};

window.closeAdModal = function() {
    const modal = document.getElementById('adModal');
    const iframe = document.getElementById('adIframe');
    if (modal) modal.style.display = 'none';
    if (iframe) iframe.src = '';
    clearInterval(countdown);
    if (window.onAdClosedCallback) {
        window.onAdClosedCallback();
    }
};

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
function resolvePoster(movie) {
  const ytId = getYouTubeId(movie.embedUrl || movie.trailerUrl);
  
  const primary = (movie.posterUrl && movie.posterUrl.trim())
    ? movie.posterUrl.trim()
    : (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://via.placeholder.com/300x450?text=No+Poster');

  const fallback = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : 'https://via.placeholder.com/300x450?text=No+Poster';

  return { primary, fallback };
}

// Utility to create Movie HTML Card (Updated with Ad Trigger)
export function createMovieCard(movie, id) {
  const { primary, fallback } = resolvePoster(movie);

  return `
    <div class="movie-card" onclick="triggerFullScreenAd(() => window.location.href='movie.html?id=${id}')">
      <div class="poster-wrapper">
        <img
          src="${primary}"
          alt="${movie.title}"
          loading="lazy"
          onerror="this.onerror=null;this.src='${fallback}';this.onerror=function(){this.onerror=null;this.src='https://via.placeholder.com/300x450?text=No+Poster';}"
        >
        <span class="badge">${movie.format || 'HD'}</span>
      </div>
      <div class="card-details">
        <h3>${movie.title}</h3>
        <div class="card-meta">${movie.year || ''} • ${movie.language || ''}</div>
      </div>
    </div>
  `;
}

// Load Home Page Categories Automatically
const categories = [
  { id: 'latest-trailers', containerId: 'trailers-grid' },
  { id: 'south-dubbed-movies', containerId: 'south-dubbed-grid' },
  { id: 'classic-cinema', containerId: 'classics-grid' }
];

async function loadCategoryMovies() {
  for (const cat of categories) {
    const container = document.getElementById(cat.containerId);
    if (!container) continue;

    try {
      const q = query(
        collection(db, "movies"),
        where("category", "==", cat.id)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        container.innerHTML = `<p class="loading">No posts available in this section.</p>`;
        continue;
      }

      container.innerHTML = ''; // Clear loading text

      querySnapshot.forEach((docSnap) => {
        const movie = docSnap.data();
        const movieId = docSnap.id;
        container.innerHTML += createMovieCard(movie, movieId);
      });

    } catch (error) {
      console.error(`Error loading ${cat.id}:`, error);
      container.innerHTML = `<p class="loading">Error loading content.</p>`;
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