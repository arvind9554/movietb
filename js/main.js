import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
function getYouTubeId(embedUrl) {
  if (!embedUrl) return null;
  const match = embedUrl.match(/(?:embed\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Build best available poster + a safe fallback chain
function resolvePoster(movie) {
  const ytId = getYouTubeId(movie.embedUrl || movie.trailerUrl);
  
  // Prefer posterUrl if provided; otherwise fallback to YouTube HQ thumbnail
  const primary = (movie.posterUrl && movie.posterUrl.trim())
    ? movie.posterUrl.trim()
    : (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://via.placeholder.com/300x450?text=No+Poster');

  const fallback = ytId
    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    : 'https://via.placeholder.com/300x450?text=No+Poster';

  return { primary, fallback };
}

// Utility to create Movie HTML Card
export function createMovieCard(movie, id) {
  const { primary, fallback } = resolvePoster(movie);

  return `
    <div class="movie-card" onclick="window.location.href='movie.html?id=${id}'">
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
  { id: 'classic-cinema', containerId: 'classics-grid' },
  { id: 'movie-reviews', containerId: 'web-series-grid' } // Movie Reviews ki jagah Web Series
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

// Mobile menu toggle
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
  });
}

// Mobile: Categories dropdown open on tap (not hover)
const dropdown = document.querySelector('.dropdown');
if (dropdown) {
  const dropbtn = dropdown.querySelector('.dropbtn');
  dropbtn.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      dropdown.classList.toggle('mobile-open');
    }
  });
}