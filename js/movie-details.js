import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');
const PLAYER_DEBUG = urlParams.get('playerDebug') === '1';
const PLAYER_DIAGNOSTIC = urlParams.get('playerDiagnostic') === '1';

const categoryNames = {
  'latest-trailers': 'Latest Trailers',
  'hollywood-english': 'Hollywood (English)',
  'south-dubbed-movies': 'Bollywood Movies',
  'classic-cinema': 'Hollywood Hindi',
  'movie-reviews': 'Web Series',
  'story-tv': 'Story TV',
  'bhojpuri-movies': 'Bhojpuri Movies',
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
      if (PLAYER_DIAGNOSTIC) {
        embedUrl = `${baseUrl}?autoplay=1&controls=1&rel=0&playsinline=1`;
      } else {
        embedUrl = `${baseUrl}?autoplay=0&rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1&fs=0&iv_load_policy=3`;
      }
    }

    const playerHtml = PLAYER_DIAGNOSTIC
      ? `
      <div class="player-container player-diagnostic">
        <div class="video-responsive">
          <iframe
            id="yt-diagnostic-iframe"
            src="${embedUrl}"
            title="${movie.title}"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen="true"
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
          ></iframe>
        </div>
      </div>
      <p class="loading" style="margin-top:12px;font-size:0.85rem;color:#888;">
        Diagnostic mode: bare YouTube iframe only. Use YouTube&apos;s native fullscreen. Check console for dimension logs.
      </p>
    `
      : `
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
    `;

    wrapper.innerHTML = `
      ${playerHtml}

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

    if (PLAYER_DIAGNOSTIC) {
      initDiagnosticPlayer();
    } else {
      initVideoPlayer();
    }

    if (PLAYER_DEBUG || PLAYER_DIAGNOSTIC) {
      initPlayerDimensionLogging();
    }

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

  function clearFullscreenInlineStyles() {
    playerContainer.style.removeProperty('width');
    playerContainer.style.removeProperty('height');
    playerContainer.style.removeProperty('top');
    playerContainer.style.removeProperty('left');
    playerContainer.style.removeProperty('right');
    playerContainer.style.removeProperty('bottom');
  }

  function syncFullscreenLayout() {
    if (!isPlayerFullscreen()) return;

    requestAnimationFrame(() => {
      if (isNativeFullscreen()) {
        clearFullscreenInlineStyles();
        return;
      }

      const vp = window.visualViewport;

      if (vp) {
        playerContainer.style.setProperty('width', `${vp.width}px`);
        playerContainer.style.setProperty('height', `${vp.height}px`);
        playerContainer.style.setProperty('top', `${vp.offsetTop}px`);
        playerContainer.style.setProperty('left', `${vp.offsetLeft}px`);
        playerContainer.style.setProperty('right', 'auto');
        playerContainer.style.setProperty('bottom', 'auto');
      } else {
        clearFullscreenInlineStyles();
      }
    });
  }

  function setFullscreenPageState(active) {
    document.body.classList.toggle('player-fullscreen-active', active);
    document.documentElement.classList.toggle('player-fullscreen-active', active);
    document.documentElement.style.overflow = active ? 'hidden' : '';
  }

  function cleanupFullscreen() {
    usingNativeFullscreen = false;
    playerContainer.classList.remove('is-player-fullscreen');
    setFullscreenPageState(false);
    clearFullscreenInlineStyles();
    updateButtonState();
  }

  function enterFullscreen() {
    window.scrollTo(0, 0);

    playerContainer.classList.add('is-player-fullscreen');
    setFullscreenPageState(true);

    updateButtonState();
    syncFullscreenLayout();

    requestNativeFullscreen()
      .then(() => {
        usingNativeFullscreen = true;
        syncFullscreenLayout();
        return lockLandscape();
      })
      .catch(() => {
        lockLandscape().finally(syncFullscreenLayout);
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
        setFullscreenPageState(true);
        syncFullscreenLayout();
      } else if (usingNativeFullscreen) {
        cleanupFullscreen();
        unlockOrientation();
      }
      updateButtonState();
    });
  });

  let layoutSyncFrame = null;
  function scheduleLayoutSync() {
    if (layoutSyncFrame !== null) return;
    layoutSyncFrame = requestAnimationFrame(() => {
      layoutSyncFrame = null;
      syncFullscreenLayout();
    });
  }

  window.addEventListener('orientationchange', () => {
    scheduleLayoutSync();
    setTimeout(scheduleLayoutSync, 150);
  });
  window.addEventListener('resize', scheduleLayoutSync);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleLayoutSync);
    window.visualViewport.addEventListener('scroll', scheduleLayoutSync);
  }

  updateButtonState();
}

function logPlayerDimensions(label) {
  const playerContainer = document.querySelector('.player-container');
  const videoResponsive = document.querySelector('.video-responsive');
  const iframe = document.querySelector('.video-responsive iframe');

  const vp = window.visualViewport;

  const row = (name, el) => {
    if (!el) return { element: name, missing: true };
    const rect = el.getBoundingClientRect();
    return {
      element: name,
      rect_x: Math.round(rect.x),
      rect_y: Math.round(rect.y),
      rect_width: Math.round(rect.width),
      rect_height: Math.round(rect.height),
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight
    };
  };

  const viewport = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    visualViewport_width: vp ? Math.round(vp.width) : null,
    visualViewport_height: vp ? Math.round(vp.height) : null,
    visualViewport_offsetTop: vp ? Math.round(vp.offsetTop) : null,
    orientation: window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait'
  };

  const layoutFillsViewport =
    playerContainer &&
    iframe &&
    Math.abs(playerContainer.getBoundingClientRect().y) <= 1 &&
    Math.abs(iframe.getBoundingClientRect().y) <= 1 &&
    Math.abs(playerContainer.getBoundingClientRect().width - window.innerWidth) <= 2 &&
    Math.abs(playerContainer.getBoundingClientRect().height - window.innerHeight) <= 2;

  console.group(`[PlayerDebug] ${label}`);
  console.log('viewport', viewport);
  console.table([
    row('playerContainer', playerContainer),
    row('videoResponsive', videoResponsive),
    row('iframe', iframe)
  ]);
  console.log('document.fullscreenElement', document.fullscreenElement);
  console.log('layoutFillsViewport', layoutFillsViewport);
  if (layoutFillsViewport) {
    console.info(
      'If a black/title band is still visible, it is rendered INSIDE the cross-origin YouTube iframe — not from our page layout.'
    );
  } else {
    console.warn('Layout gap detected in OUR page — inspect rect_y and heights above.');
  }
  console.groupEnd();
}

function initPlayerDimensionLogging() {
  const log = (label) => {
    requestAnimationFrame(() => {
      setTimeout(() => logPlayerDimensions(label), 100);
    });
  };

  log('initial');

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach((eventName) => {
    document.addEventListener(eventName, () => log(`fullscreenchange → ${document.fullscreenElement ? 'entered' : 'exited'}`));
  });

  window.addEventListener('orientationchange', () => log('orientationchange'));
  window.addEventListener('resize', () => log('resize'));

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => log('visualViewport.resize'));
  }
}

function initDiagnosticPlayer() {
  console.info('[PlayerDiagnostic] Bare YouTube iframe — no custom fullscreen UI. Use YouTube native fullscreen to compare.');
  const iframe = document.getElementById('yt-diagnostic-iframe');
  if (iframe) {
    iframe.addEventListener('load', () => logPlayerDimensions('diagnostic iframe loaded'));
  }
}

loadMovieDetails();

// Reliable YouTube Iframe Progress Tracking
function initYouTubeTracking() {
    // 1. Ensure YouTube API Script is attached
    if (!window.YT) {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // 2. Poll for Iframe and attach player directly
    var trackerInterval = setInterval(function () {
        var iframe = document.querySelector('iframe[src*="youtube.com"]');
        if (iframe && window.YT && window.YT.Player) {
            clearInterval(trackerInterval);

            // Ensure JS API parameter
            var src = iframe.getAttribute('src');
            if (src && src.indexOf('enablejsapi=1') === -1) {
                iframe.setAttribute('src', src + (src.indexOf('?') === -1 ? '?' : '&') + 'enablejsapi=1');
            }

            var trackedPoints = { 25: false, 50: false, 75: false };
            var progressCheckTimer = null;

            new YT.Player(iframe, {
                events: {
                    'onStateChange': function (event) {
                        var player = event.target;

                        // Video Started
                        if (event.data === YT.PlayerState.PLAYING) {
                            if (typeof gtag === 'function' && !player.hasTrackedStart) {
                                gtag('event', 'video_start', {
                                    'video_title': document.title,
                                    'video_provider': 'youtube'
                                });
                                player.hasTrackedStart = true;
                            }

                            // Track progress every second
                            if (!progressCheckTimer) {
                                progressCheckTimer = setInterval(function () {
                                    var duration = player.getDuration();
                                    var currentTime = player.getCurrentTime();
                                    if (duration > 0) {
                                        var percent = Math.floor((currentTime / duration) * 100);
                                        [25, 50, 75].forEach(function (pt) {
                                            if (percent >= pt && !trackedPoints[pt]) {
                                                trackedPoints[pt] = true;
                                                if (typeof gtag === 'function') {
                                                    gtag('event', 'video_progress', {
                                                        'video_percent': pt,
                                                        'video_title': document.title
                                                    });
                                                }
                                            }
                                        });
                                    }
                                }, 1000);
                            }
                        } else {
                            if (progressCheckTimer) {
                                clearInterval(progressCheckTimer);
                                progressCheckTimer = null;
                            }
                        }

                        // Video Complete
                        if (event.data === YT.PlayerState.ENDED) {
                            if (typeof gtag === 'function') {
                                gtag('event', 'video_complete', {
                                    'video_title': document.title,
                                    'video_provider': 'youtube'
                                });
                            }
                        }
                    }
                }
            });
        }
    }, 500);
}

document.addEventListener('DOMContentLoaded', initYouTubeTracking);