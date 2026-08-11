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

    const pageTitle = document.getElementById('movie-page-title');
    if (pageTitle) pageTitle.innerText = `${movie.title} - MovieTB`;

    let embedUrl = movie.embedUrl || movie.trailerUrl || '';
    if (embedUrl.includes('watch?v=')) {
      embedUrl = embedUrl.replace('watch?v=', 'embed/');
    }
    if (embedUrl.includes('youtu.be/')) {
      embedUrl = embedUrl.replace('youtu.be/', 'www.youtube.com/embed/');
    }

    if (embedUrl.includes('youtube.com/embed/')) {
      const baseUrl = embedUrl.split('?')[0];
      embedUrl = `${baseUrl}?autoplay=0&rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1&fs=0&iv_load_policy=3`;
    }

    wrapper.innerHTML = `
      <div class="player-container">
        <div class="video-responsive">
          <iframe
            src="${embedUrl}"
            title="${movie.title}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowfullscreen="true"
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
          ></iframe>
        </div>
        <div class="player-controls" aria-hidden="false">
          <button type="button" class="fullscreen-btn" aria-label="Enter fullscreen" title="Fullscreen">
            <svg class="fs-icon fs-icon-enter" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
            <svg class="fs-icon fs-icon-exit" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
          </button>
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

  let orientationLocked = false;
  let usingNativeFullscreen = false;

  function getFullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }

  function isNativeFullscreen() {
    const el = getFullscreenElement();
    return el === playerContainer;
  }

  function isPlayerFullscreen() {
    return playerContainer.classList.contains('is-player-fullscreen') || isNativeFullscreen();
  }

  function requestNativeFullscreen() {
    const el = playerContainer;
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
    return Promise.reject(new Error('Fullscreen not supported'));
  }

  function exitNativeFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
    return Promise.resolve();
  }

  function lockLandscape() {
    if (!screen.orientation || typeof screen.orientation.lock !== 'function') {
      return Promise.resolve();
    }
    return screen.orientation.lock('landscape').then(() => {
      orientationLocked = true;
    }).catch(() => {});
  }

  function unlockOrientation() {
    if (!orientationLocked) return;
    if (screen.orientation && typeof screen.orientation.unlock === 'function') {
      try {
        screen.orientation.unlock();
      } catch (_) {}
    }
    orientationLocked = false;
  }

  function updateButtonState() {
    const active = isPlayerFullscreen();
    fsBtn.classList.toggle('is-fullscreen', active);
    fsBtn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    fsBtn.setAttribute('title', active ? 'Exit fullscreen' : 'Fullscreen');
  }

  function cleanupFullscreen() {
    usingNativeFullscreen = false;
    playerContainer.classList.remove('is-player-fullscreen');
    document.body.classList.remove('player-fullscreen-active');
    document.documentElement.style.overflow = '';
    updateButtonState();
  }

  function enterFullscreen() {
    playerContainer.classList.add('is-player-fullscreen');
    document.body.classList.add('player-fullscreen-active');
    document.documentElement.style.overflow = 'hidden';

    updateButtonState();

    requestNativeFullscreen()
      .then(() => {
        usingNativeFullscreen = true;
        return lockLandscape();
      })
      .catch(() => {
        lockLandscape();
      });
  }

  function exitFullscreen() {
    unlockOrientation();

    if (isNativeFullscreen()) {
      exitNativeFullscreen().catch(() => {}).finally(cleanupFullscreen);
    } else {
      cleanupFullscreen();
    }
  }

  function toggleFullscreen() {
    if (isPlayerFullscreen()) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }

  fsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFullscreen();
  });

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (isNativeFullscreen()) {
        usingNativeFullscreen = true;
        playerContainer.classList.add('is-player-fullscreen');
        document.body.classList.add('player-fullscreen-active');
        document.documentElement.style.overflow = 'hidden';
      } else if (usingNativeFullscreen) {
        cleanupFullscreen();
        unlockOrientation();
      }
      updateButtonState();
    });
  });

  updateButtonState();
}

loadMovieDetails();
