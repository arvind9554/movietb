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
        <button type="button" class="fullscreen-btn" aria-label="Toggle fullscreen">⛶</button>
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

    initVideoPlayer();

  } catch (error) {
    console.error("Error loading movie details:", error);
    wrapper.innerHTML = `<p class="loading">Error loading movie data.</p>`;
  }
}

function initVideoPlayer() {
  const playerContainer = document.querySelector('.player-container');
  const fsBtn = document.querySelector('.fullscreen-btn');

  if (!playerContainer || !fsBtn) return;

  let playerActive = false;

  function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  function isLandscape() {
    return window.matchMedia('(orientation: landscape)').matches;
  }

  function getFullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }

  function isPlayerFullscreen() {
    const el = getFullscreenElement();
    return el === playerContainer;
  }

  function requestPlayerFullscreen() {
    const el = playerContainer;
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
    return Promise.reject(new Error('Fullscreen not supported'));
  }

  function exitPlayerFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
    return Promise.resolve();
  }

  function updateLandscapeMode() {
    const mobile = isMobile();
    const landscape = isLandscape();
    const fullscreen = isPlayerFullscreen();
    const shouldExpand = mobile && landscape && (playerActive || fullscreen);

    playerContainer.classList.toggle('mobile-video-landscape', shouldExpand);
    document.body.classList.toggle('player-landscape-active', shouldExpand);

    if (shouldExpand || fullscreen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
  }

  function toggleFullscreen() {
    if (isPlayerFullscreen()) {
      exitPlayerFullscreen().catch(() => {});
      return;
    }

    playerActive = true;
    requestPlayerFullscreen().catch(() => {
      updateLandscapeMode();
    });
  }

  fsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFullscreen();
  });

  playerContainer.addEventListener('click', () => {
    playerActive = true;
    updateLandscapeMode();
  });

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (isPlayerFullscreen()) {
        playerActive = true;
      }
      updateLandscapeMode();
    });
  });

  window.addEventListener('orientationchange', () => {
    if (isMobile() && isLandscape()) {
      playerActive = true;
    }
    setTimeout(updateLandscapeMode, 150);
  });

  window.addEventListener('resize', updateLandscapeMode);

  updateLandscapeMode();
}

loadMovieDetails();