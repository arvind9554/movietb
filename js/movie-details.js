import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');

const categoryNames = {
  'latest-trailers': 'Latest Trailers',
  'south-dubbed-movies': 'Bollywood Movies',
  'classic-cinema': 'Hollywood Movies',
  'movie-reviews': 'Web Series'
};

async function loadMovieDetails() {
  const wrapper = document.getElementById('movie-content-wrapper');

  if (!wrapper) return;

  if (!movieId) {
    wrapper.innerHTML = `<p class="loading">Movie not found.</p>`;
    return;
  }

  try {
    const docRef = doc(db, "movies", movieId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      wrapper.innerHTML = `<p class="loading">Movie post does not exist.</p>`;
      return;
    }

    const movie = docSnap.data();

    // Set page title dynamically
    const pageTitle = document.getElementById('movie-page-title');
    if (pageTitle) pageTitle.innerText = `${movie.title} - MovieTB`;

    // Ensure YouTube embed link is properly formatted
    let embedUrl = movie.embedUrl || movie.trailerUrl || '';
    if (embedUrl.includes('watch?v=')) {
      embedUrl = embedUrl.replace('watch?v=', 'embed/');
    }
    if (embedUrl.includes('youtu.be/')) {
      embedUrl = embedUrl.replace('youtu.be/', 'www.youtube.com/embed/');
    }

    // Clean base URL and append stretch/fit parameters
    if (embedUrl.includes('youtube.com/embed/')) {
      const baseUrl = embedUrl.split('?')[0];
      embedUrl = `${baseUrl}?autoplay=0&rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1`;
    }

    wrapper.innerHTML = `
      <div class="player-container">
        <div class="video-responsive">
          <iframe
            src="${embedUrl}"
            title="${movie.title}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen="true"
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
          ></iframe>
        </div>
      </div>

      <div class="movie-info-card">
        <h1>${movie.title}</h1>

        <div class="movie-tags">
          <span class="tag">${movie.format || 'HD'}</span>
          <span>${movie.year || 'N/A'}</span>
          <span class="meta-dot"></span>
          <span>${movie.language || 'N/A'}</span>
          <span class="meta-dot"></span>
          <span>${categoryNames[movie.category] || movie.category || 'N/A'}</span>
        </div>

        <div class="info-grid">
          <div class="info-label">Director</div>
          <div class="info-value">${movie.director || 'N/A'}</div>

          <div class="info-label">Star Cast</div>
          <div class="info-value">${movie.starCast || 'N/A'}</div>
        </div>

        <div class="summary-box">
          ${movie.summary || 'No summary provided.'}
        </div>
      </div>
    `;

  } catch (error) {
    console.error("Error loading movie details:", error);
    wrapper.innerHTML = `<p class="loading">Error loading movie data.</p>`;
  }
}

loadMovieDetails();