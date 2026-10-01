import { db } from './firebase-config.js';
import { doc, getDoc, collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getYouTubeId } from './main.js';

/*
  MOVIETB PREROLL + TELEGRAM CONFIG
  ---------------------------------
  IMPORTANT:
  - Pre-roll sirf Direct/Native video player ke liye hai.
  - YouTube iframe ke andar custom 30-sec ad inject nahi ki ja sakti.
  - PREROLL_AD_URL me apni direct MP4/WebM ad URL lagao.
*/

const PREROLL_AD_URL = 'https://smooth-survey.com/d.mpFEzddOGRNyvvZEGYUn/uemmM9/u/Z/UilwkOP-TJc/0MNozsMX0TMvzHMrtNNfzPQY3JMmz/QgzwNiwz';
// Example:
// const PREROLL_AD_URL = 'https://your-domain.com/ads/movietb-ad.mp4';

const PREROLL_DURATION = 30;
const PREROLL_SKIP_AFTER = 5;

// Apna actual Telegram channel URL yahan lagao
const TELEGRAM_CHANNEL_URL = 'https://t.me/movietb_official';

const PREROLL_SESSION_KEY_PREFIX = 'movietb-preroll-seen-';

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');
const PLAYER_DEBUG = urlParams.get('playerDebug') === '1';
const PLAYER_DIAGNOSTIC = urlParams.get('playerDiagnostic') === '1';

const categoryNames = {
  'latest-trailers': 'Latest Trailers',
  'new-releases': 'New Releases',
  'hollywood-english': 'Hollywood (English)',
  'south-dubbed-movies': 'Bollywood Movies',
  'classic-cinema': 'Hollywood (Hindi)',
  'movie-reviews': 'Web Series',
  'story-tv': 'Story TV',
  'bhojpuri-movies': 'Bhojpuri Movies',
};

/* =========================================================
   DIRECT / TELEGRAM VIDEO URL RESOLUTION
   Different admin forms / manual Firestore edits over time may
   have used different field names for the same idea. This checks
   all of them so the player works no matter which one your data
   actually has, instead of silently falling through to YouTube.

   Priority:
   1) movie.videoUrl / movie.streamUrl / movie.directVideoUrl /
      movie.directUrl - a complete, ready-to-play URL.
   2) movie.channelId + movie.messageId (or msgId/telegramMsgId)
      combined with a backend base URL, IF that base URL is also
      present on the doc (movie.streamBackendUrl / backendUrl).
      We never guess/hardcode a backend domain - a wrong guess
      would silently produce a broken (but non-empty) src, which
      is worse than falling back to the normal iframe path.
   ========================================================= */
function resolveDirectVideoUrl(movie) {
  const explicit = firstPresent(movie.videoUrl, movie.streamUrl, movie.directVideoUrl, movie.directUrl);
  if (explicit) return explicit;

  const base = firstPresent(movie.streamBackendUrl, movie.backendUrl);
  const channelId = firstPresent(movie.channelId);
  const messageId = firstPresent(movie.messageId, movie.msgId, movie.telegramMsgId);

  if (base && channelId && messageId) {
    return `${base.replace(/\/$/, '')}/stream/${encodeURIComponent(channelId)}/${encodeURIComponent(messageId)}`;
  }
  if (base && messageId) {
    return `${base.replace(/\/$/, '')}/stream/${encodeURIComponent(messageId)}`;
  }
  return '';
}

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

document.title = `${movie.title || 'Movie'} - MovieTB`;

// Line 74 ke theek baad paste karein:
if (typeof gtag === 'function') {
    gtag('event', 'page_view', {
        'page_title': movie.title || movie.name || document.title,
        'page_location': window.location.href,
        'movie_id': movieId
    });
}

    if (PLAYER_DEBUG) {
      console.log('[PlayerDebug] Movie data:', movie);
    }

    const pageTitle = document.getElementById('movie-page-title');
    if (pageTitle) pageTitle.innerText = `${movie.title} - MovieTB`;

    let embedUrl = movie.embedUrl || movie.trailerUrl || '';
    if (embedUrl.includes('watch?v=')) {
      embedUrl = embedUrl.replace('watch?v=', 'embed/');
    }
    if (embedUrl.includes('youtu.be/')) {
      embedUrl = embedUrl.replace('youtu.be/', 'www.youtube.com/embed/');
    }

    const isYouTube = embedUrl.includes('youtube.com/embed/');

    if (isYouTube) {
      const baseUrl = embedUrl.split('?')[0];
      if (PLAYER_DIAGNOSTIC) {
        embedUrl = `${baseUrl}?autoplay=1&controls=1&rel=0&playsinline=1`;
      } else {
        embedUrl = `${baseUrl}?autoplay=0&rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1&fs=0&iv_load_policy=3`;
      }
    }

    // Direct video / Telegram stream support (checks several possible field
    // names - see resolveDirectVideoUrl above) vs YouTube iframe
    const directVideoUrl = resolveDirectVideoUrl(movie);
    const embedLooksLikeFile = !isYouTube && /\.(mp4|webm|ogg|m3u8)(\?|#|$)/i.test(embedUrl);
    const useNativeVideo = Boolean(directVideoUrl) || embedLooksLikeFile;
    const videoSrc = directVideoUrl || embedUrl;

    if (PLAYER_DEBUG) {
      console.log('[PlayerDebug] isYouTube:', isYouTube, '| useNativeVideo:', useNativeVideo, '| videoSrc:', videoSrc);
    }

    let playerHtml;

    if (useNativeVideo) {
      // Plyr (custom branded player, loaded on demand below) takes over this
      // <video> element - no native `controls` attribute needed, and no
      // custom fullscreen button here since Plyr ships its own.
      playerHtml = `
  <div class="player-container movietb-native-player">

    <div class="video-responsive">

      <video
        src="${escapeHtml(videoSrc)}"
        poster="${escapeHtml(resolveRelatedPoster(movie))}"
        playsinline
        preload="metadata"
      ></video>

    </div>


    <!-- MovieTB Pre-roll Advertisement -->

    <div
      class="movietb-preroll-overlay"
      hidden
      aria-hidden="true"
    >

      <div class="movietb-preroll-panel">

        <div class="movietb-preroll-topline">

          <span class="movietb-preroll-badge">
            ADVERTISEMENT
          </span>

          <span class="movietb-preroll-countdown">
            Ad • 30s
          </span>

        </div>


        <video
          class="movietb-preroll-video"
          playsinline
          preload="metadata"
        ></video>


        <div class="movietb-preroll-bottom">

          <span class="movietb-preroll-copy">
            Your movie will start after the ad.
          </span>

          <button
            type="button"
            class="movietb-preroll-skip"
            hidden
          >
            Skip Ad
          </button>

        </div>

      </div>

    </div>

  </div>
`;
    } else if (PLAYER_DIAGNOSTIC) {
      playerHtml = `
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
      `;
    } else {
      playerHtml = `
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
    }

    wrapper.innerHTML = `
      ${playerHtml}
      ${buildMovieTbBelowPlayerHtml(movie, movieId)}
    `;

    if (useNativeVideo) {
      initCustomVideoPlayer();
      initNativeVideoTracking();
    } else if (PLAYER_DIAGNOSTIC) {
      initDiagnosticPlayer();
    } else {
      initVideoPlayer();
      // Note: YouTube analytics tracking is wired up once, globally, via the
      // DOMContentLoaded listener at the bottom of this file - it is NOT
      // called again here, to avoid double-firing video_start/progress events.
    }

/* =========================================================
   MOVIETB 30 SECOND PREROLL
   DIRECT / NATIVE VIDEO ONLY
   ========================================================= */

function prerollSessionKey(movieIdValue) {
  return `${PREROLL_SESSION_KEY_PREFIX}${movieIdValue || 'unknown'}`;
}

function hasSeenPreroll(movieIdValue) {
  try {
    return sessionStorage.getItem(
      prerollSessionKey(movieIdValue)
    ) === '1';
  } catch {
    return false;
  }
}

function markPrerollSeen(movieIdValue) {
  try {
    sessionStorage.setItem(
      prerollSessionKey(movieIdValue),
      '1'
    );
  } catch {
    // Ignore storage errors
  }
}


/* =========================================================
   PREROLL + TELEGRAM CSS
   ========================================================= */

function injectPrerollStyles() {

  if (document.getElementById('movietb-preroll-styles')) {
    return;
  }

  const style = document.createElement('style');

  style.id = 'movietb-preroll-styles';

  style.textContent = `

    /* ===============================
       NATIVE PLAYER
       =============================== */

    .movietb-native-player {
      position: relative;
      overflow: hidden;
    }


    /* ===============================
       PREROLL OVERLAY
       =============================== */

    .movietb-preroll-overlay {
      position: absolute;
      inset: 0;
      z-index: 999;
      display: flex;
      align-items: stretch;
      justify-content: center;
      background: #000;
    }

    .movietb-preroll-overlay[hidden] {
      display: none !important;
    }


    .movietb-preroll-panel {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #000;
    }


    /* ===============================
       TOP BAR
       =============================== */

    .movietb-preroll-topline {
      min-height: 38px;
      padding: 10px 14px;

      display: flex;
      align-items: center;
      justify-content: space-between;

      gap: 12px;

      background:
        linear-gradient(
          180deg,
          rgba(0,0,0,.95),
          rgba(0,0,0,.60)
        );

      color: #fff;

      font:
        600 12px/1.2
        Arial,
        sans-serif;
    }


    .movietb-preroll-badge {
      letter-spacing: .08em;
      opacity: .82;
    }


    .movietb-preroll-countdown {
      font-variant-numeric: tabular-nums;
    }


    /* ===============================
       AD VIDEO
       =============================== */

    .movietb-preroll-video {

      width: 100%;
      height: 100%;

      min-height: 0;

      flex:
        1 1 auto;

      display: block;

      object-fit: contain;

      background: #000;
    }


    /* ===============================
       BOTTOM BAR
       =============================== */

    .movietb-preroll-bottom {

      min-height: 48px;

      padding:
        9px
        12px;

      display: flex;

      align-items: center;

      justify-content: space-between;

      gap: 12px;

      background:
        linear-gradient(
          0deg,
          rgba(0,0,0,.96),
          rgba(0,0,0,.68)
        );

      color: #fff;

      font:
        500 12px/1.35
        Arial,
        sans-serif;
    }


    .movietb-preroll-copy {
      opacity: .8;
    }


    /* ===============================
       SKIP BUTTON
       =============================== */

    .movietb-preroll-skip {

      border:
        1px solid
        rgba(255,255,255,.32);

      border-radius: 999px;

      padding:
        8px
        13px;

      background:
        rgba(255,255,255,.10);

      color: #fff;

      font:
        700 12px/1
        Arial,
        sans-serif;

      cursor: pointer;

      transition:
        background .18s ease,
        transform .18s ease;
    }


    .movietb-preroll-skip:hover {

      background:
        rgba(255,255,255,.20);

      transform:
        translateY(-1px);
    }


    /* ===============================
       TELEGRAM BUTTON
       =============================== */

    .movietb-telegram-cta {

      margin:
        14px
        0
        18px;
    }


    .movietb-telegram-btn {

      display: flex;

      align-items: center;

      gap: 12px;

      width: 100%;

      box-sizing: border-box;

      padding:
        13px
        15px;

      border:
        1px solid
        rgba(255,255,255,.10);

      border-radius: 14px;

      background:
        linear-gradient(
          135deg,
          rgba(30,136,229,.18),
          rgba(90,70,255,.13)
        );

      color: #fff;

      text-decoration: none;

      box-shadow:
        0 10px 30px
        rgba(0,0,0,.18);

      transition:
        transform .18s ease,
        border-color .18s ease,
        background .18s ease;
    }


    .movietb-telegram-btn:hover {

      transform:
        translateY(-1px);

      border-color:
        rgba(67,169,255,.46);

      background:
        linear-gradient(
          135deg,
          rgba(30,136,229,.25),
          rgba(90,70,255,.19)
        );
    }


    .movietb-telegram-icon {

      width: 38px;
      height: 38px;

      flex:
        0 0 38px;

      display: grid;

      place-items: center;

      border-radius: 50%;

      background:
        #229ED9;

      color: #fff;

      font-size: 19px;
    }


    .movietb-telegram-btn strong {

      display: block;

      font:
        800 14px/1.2
        Arial,
        sans-serif;
    }


    .movietb-telegram-btn small {

      display: block;

      margin-top: 3px;

      color:
        rgba(255,255,255,.64);

      font:
        500 11px/1.3
        Arial,
        sans-serif;
    }


    .movietb-telegram-arrow {

      margin-left: auto;

      font-size: 20px;

      opacity: .72;
    }


    /* ===============================
       MOBILE
       =============================== */

    @media (max-width: 600px) {

      .movietb-preroll-topline {

        min-height: 32px;

        padding:
          8px
          10px;

        font-size: 10px;
      }


      .movietb-preroll-bottom {

        min-height: 42px;

        padding:
          7px
          9px;
      }


      .movietb-preroll-copy {
        font-size: 10px;
      }


      .movietb-preroll-skip {

        padding:
          7px
          10px;

        font-size: 10px;
      }


      .movietb-telegram-btn {

        padding: 12px;

        border-radius: 12px;
      }


      .movietb-telegram-icon {

        width: 34px;
        height: 34px;

        flex-basis: 34px;
      }
    }

  `;

  document.head.appendChild(style);
}


/* =========================================================
   INIT PREROLL
   ========================================================= */

function initMovieTbPreroll(movieIdValue) {

  // Ad URL nahi hai to preroll disabled
  if (!PREROLL_AD_URL) {
    return;
  }


  const container =
    document.querySelector(
      '.movietb-native-player'
    );


  if (!container) {
    return;
  }


  const movieVideo =
    container.querySelector(
      '.video-responsive video'
    );


  const overlay =
    container.querySelector(
      '.movietb-preroll-overlay'
    );


  const adVideo =
    container.querySelector(
      '.movietb-preroll-video'
    );


  const countdown =
    container.querySelector(
      '.movietb-preroll-countdown'
    );


  const skipBtn =
    container.querySelector(
      '.movietb-preroll-skip'
    );


  if (
    !movieVideo ||
    !overlay ||
    !adVideo ||
    !countdown ||
    !skipBtn
  ) {
    return;
  }


  // Same session me same movie par ad dobara nahi
  if (hasSeenPreroll(movieIdValue)) {
    return;
  }


  injectPrerollStyles();


  adVideo.src =
    PREROLL_AD_URL;

  adVideo.muted = false;

  adVideo.playsInline = true;

  adVideo.controls = false;


  let adStarted = false;

  let adFinished = false;

  let allowMoviePlay = false;

  let timer = null;

  let elapsed = 0;


  /* ===============================
     CLEANUP
     =============================== */

  function cleanup() {

    if (timer) {

      clearInterval(timer);

      timer = null;
    }


    overlay.hidden = true;

    overlay.setAttribute(
      'aria-hidden',
      'true'
    );


    adVideo.pause();

    adVideo.removeAttribute(
      'src'
    );

    adVideo.load();
  }


  /* ===============================
     FINISH AD
     =============================== */

  function finish() {

    if (adFinished) {
      return;
    }


    adFinished = true;


    markPrerollSeen(
      movieIdValue
    );


    cleanup();


    allowMoviePlay = true;


    movieVideo
      .play()
      .catch(() => {});
  }


  /* ===============================
     COUNTDOWN
     =============================== */

  function updateCountdown() {

    const remaining =
      Math.max(
        0,
        Math.ceil(
          PREROLL_DURATION -
          elapsed
        )
      );


    countdown.textContent =
      `Ad • ${remaining}s`;


    if (
      elapsed >=
      PREROLL_SKIP_AFTER
    ) {

      skipBtn.hidden = false;
    }
  }


  /* ===============================
     START AD
     =============================== */

  function startAd() {

    if (
      adStarted ||
      adFinished
    ) {
      return;
    }


    adStarted = true;

    elapsed = 0;

    skipBtn.hidden = true;


    overlay.hidden = false;

    overlay.setAttribute(
      'aria-hidden',
      'false'
    );


    updateCountdown();


    const playPromise =
      adVideo.play();


    if (
      playPromise &&
      typeof playPromise.catch ===
        'function'
    ) {

      playPromise.catch(() => {

        // Browser autoplay restriction
        adVideo.muted = true;

        adVideo
          .play()
          .catch(() => {});
      });
    }


    timer =
      setInterval(() => {

        elapsed += 1;

        updateCountdown();


        if (
          elapsed >=
          PREROLL_DURATION
        ) {

          finish();
        }

      }, 1000);
  }


  /* ===============================
     MOVIE PLAY INTERCEPT
     =============================== */

  movieVideo.addEventListener(
    'play',
    () => {

      if (
        allowMoviePlay ||
        adFinished
      ) {
        return;
      }


      movieVideo.pause();


      startAd();

    },
    {
      capture: true
    }
  );


  /* ===============================
     AD EVENTS
     =============================== */

  adVideo.addEventListener(
    'ended',
    finish
  );


  skipBtn.addEventListener(
    'click',
    finish
  );


  adVideo.addEventListener(
    'error',
    () => {

      console.warn(
        '[MovieTB] Pre-roll ad failed to load; starting movie.'
      );

      finish();
    }
  );
}

    initMovieTbBelowPlayer(movie, movieId);
  
    // Inject external Ad Provider script - but ONLY for the YouTube/iframe
    // path. This script auto-scans the page for <video> elements and turns
    // them into its own "outstream" ad player - which was harmless before
    // (YouTube path never had a real <video> tag), but for our new native
    // Telegram/direct-video player it hijacks the movie's own <video>,
    // covering real playback with a blank ad overlay. Skipping it here
    // keeps the movie playable; the below-player banner ad slot (the
    // .eas6a97888e37 <ins> tag) is unaffected either way since it's a
    // separate ad unit, not tied to this script specifically.
    if (!useNativeVideo && !document.querySelector('script[src*="ad-provider.js"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://a.magsrv.com/ad-provider.js';
      document.head.appendChild(script);
    }
    if (!useNativeVideo) {
      (window.AdProvider = window.AdProvider || []).push({ "serve": {} });
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

/* =========================================================
   PLYR — custom branded video player for direct video streams
   (your Telegram → Render → videoUrl/streamUrl pipeline).
   Loaded from Plyr's CDN on demand, only when a movie actually
   needs it - YouTube movies never touch this code path. Plyr
   ships its own fullscreen control, so it doesn't use
   initVideoPlayer().
   ========================================================= */
function ensurePlyrAssets() {
  if (window.__plyrAssetsPromise) return window.__plyrAssetsPromise;

  window.__plyrAssetsPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-plyr-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.plyr.io/3.7.8/plyr.css';
      link.setAttribute('data-plyr-css', '1');
      document.head.appendChild(link);
    }

    if (window.Plyr) {
      resolve(window.Plyr);
      return;
    }

    if (!document.querySelector('script[data-plyr-js]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.plyr.io/3.7.8/plyr.js';
      script.setAttribute('data-plyr-js', '1');
      script.onload = () => resolve(window.Plyr);
      script.onerror = () => reject(new Error('Failed to load Plyr from CDN'));
      document.head.appendChild(script);
    } else {
      const waitForPlyr = () => {
        if (window.Plyr) resolve(window.Plyr);
        else setTimeout(waitForPlyr, 50);
      };
      waitForPlyr();
    }
  });

  return window.__plyrAssetsPromise;
}

function initCustomVideoPlayer(streamUrl, posterUrl) {
    const video = document.querySelector('#player') || document.querySelector('video');

    if (!video) return;

    // 1. Direct video element parameters (Format/MIME error avoid karne ke liye)
    video.setAttribute('crossorigin', 'anonymous');
    if (streamUrl) {
        video.src = streamUrl;
        video.type = 'video/mp4';
    }

    // 2. Safely initialize Plyr player
    try {
        if (typeof Plyr !== 'undefined') {
            const player = new Plyr(video, {
                controls: [
                    'play-large', 'play', 'progress', 'current-time', 
                    'mute', 'volume', 'captions', 'settings', 'pip', 'fullscreen'
                ],
                settings: ['speed'],
                clickToPlay: true,
                resetOnEnd: false,
            });

            if (streamUrl) {
                player.source = {
                    type: 'video',
                    title: 'Movie',
                    poster: posterUrl || '',
                    sources: [
                        {
                            src: streamUrl,
                            type: 'video/mp4',
                        },
                    ],
                };
            }

            window.__movietbPlayer = player;
        } else {
            video.setAttribute('controls', '');
        }
    } catch (err) {
        console.error('Plyr initialization error, falling back to native controls:', err);
        video.setAttribute('controls', '');
    }
}

/* =========================================================
   NATIVE <video> ANALYTICS
   ========================================================= */
function initNativeVideoTracking() {
  const video = document.querySelector('.video-responsive video');
  if (!video) return;

  const trackedPoints = { 25: false, 50: false, 75: false };
  let hasTrackedStart = false;

  video.addEventListener('play', () => {
    if (!hasTrackedStart && typeof gtag === 'function') {
      gtag('event', 'video_start', {
        video_title: document.title,
        video_provider: 'direct'
      });
      hasTrackedStart = true;
    }
  });

  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const percent = Math.floor((video.currentTime / video.duration) * 100);
    [25, 50, 75].forEach((pt) => {
      if (percent >= pt && !trackedPoints[pt]) {
        trackedPoints[pt] = true;
        if (typeof gtag === 'function') {
          gtag('event', 'video_progress', {
            video_percent: pt,
            video_title: document.title
          });
        }
      }
    });
  });

  video.addEventListener('ended', () => {
    if (typeof gtag === 'function') {
      gtag('event', 'video_complete', {
        video_title: document.title,
        video_provider: 'direct'
      });
    }
  });

  video.addEventListener('error', () => {
    const err = video.error;
    console.error('[MovieTB] Video failed to load.', {
      src: video.currentSrc || video.src,
      code: err ? err.code : null,
      message: err ? err.message : null
    });
  });
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function firstPresent(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function reactionStorageKey(id) {
  return `movietb-reaction-${id}`;
}

function ratingSessionKey(id) {
  return `movietb-rated-session-${id}`;
}

function hashSeed(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getSocialBaseline(id) {
  const seed = hashSeed(id);
  const likeBuckets = [4600, 10000, 29000, 40000, 92000, 1100000];
  const likes = likeBuckets[seed % likeBuckets.length] + (seed % 37);
  const ratingCount = 284 + (seed % 2200);
  const averageTenths = 36 + (seed % 14);
  return {
    likes,
    ratingCount,
    ratingSum: (averageTenths / 10) * ratingCount
  };
}

function readReactionState(id) {
  const baseline = getSocialBaseline(id);
  try {
    const raw = localStorage.getItem(reactionStorageKey(id));
    const parsed = raw ? JSON.parse(raw) : {};
    const vote = parsed.vote === 'like' || parsed.vote === 'dislike' ? parsed.vote : '';
    const rating = Number(parsed.rating);
    return {
      vote,
      rating: Number.isFinite(rating) && rating >= 1 && rating <= 5 ? Math.round(rating) : 0,
      ratedThisSession: sessionStorage.getItem(ratingSessionKey(id)) === '1',
      baseline
    };
  } catch {
    return { vote: '', rating: 0, ratedThisSession: false, baseline };
  }
}

function writeReactionState(id, state) {
  try {
    localStorage.setItem(reactionStorageKey(id), JSON.stringify({
      vote: state.vote || '',
      rating: state.rating || 0
    }));
    if (state.ratedThisSession) {
      sessionStorage.setItem(ratingSessionKey(id), '1');
    }
  } catch {
    /* ignore quota / private mode */
  }
}

function getDisplayedLikeCount(state) {
  const offset = state.vote === 'like' ? 1 : (state.vote === 'dislike' ? -1 : 0);
  return Math.max(0, state.baseline.likes + offset);
}

function getRatingStats(state) {
  const baseCount = state.baseline.ratingCount;
  const baseSum = state.baseline.ratingSum;
  const hasUserRating = state.rating >= 1;
  const count = hasUserRating ? baseCount + 1 : baseCount;
  const sum = hasUserRating ? baseSum + state.rating : baseSum;
  const average = count > 0 ? sum / count : 0;
  return { count, average };
}

function formatCompactCount(count) {
  const n = Math.max(0, Number(count) || 0);
  const trim = (value) => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };
  if (n >= 1000000) return `${trim(n / 1000000)}M`;
  if (n >= 1000) return `${trim(n / 1000)}K`;
  return n.toLocaleString('en-US');
}

function formatRatingLabel(state) {
  return `${getRatingStats(state).average.toFixed(1)}/5`;
}

function formatRatingCount(state) {
  const { count } = getRatingStats(state);
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'Rating' : 'Ratings'}`;
}

function infoRow(label, value) {
  if (!value) return '';
  return `
    <div class="movietb-info-row">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function collectMovieInfoRows(movie) {
  const categoryLabel = categoryNames[movie.category] || firstPresent(movie.category);
  const summary = firstPresent(movie.summary, movie.description, movie.synopsis);
  const director = firstPresent(movie.director);
  const starCast = firstPresent(movie.starCast, movie.cast, movie.stars);
  const release = firstPresent(movie.releaseDate, movie.year, movie.releaseYear, movie.date);
  const language = firstPresent(movie.language);
  const format = firstPresent(movie.format);
  const genre = firstPresent(movie.genre);
  const duration = firstPresent(movie.duration, movie.runtime);

  return {
    summary,
    director,
    starCast,
    previewRows: [
      infoRow('Summary', summary),
      infoRow('Director', director),
      infoRow('Cast', starCast)
    ].join(''),
    expandedRows: [
      infoRow('Summary', summary),
      infoRow('Director', director),
      infoRow('Star Cast', starCast),
      infoRow('Category', categoryLabel),
      infoRow('Release', release),
      infoRow('Language', language),
      infoRow('Format', format),
      infoRow('Genre', genre),
      infoRow('Duration', duration)
    ].join('')
  };
}

function resolveRelatedPoster(movie) {
  const poster = firstPresent(movie.posterUrl, movie.thumbnail, movie.poster);
  if (poster) return poster;
  const ytId = getYouTubeId(movie.embedUrl || movie.trailerUrl || '');
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return 'assets/images/placeholder.jpg';
}

function shuffleOnce(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function buildMovieTbBelowPlayerHtml(movie, id) {
  const state = readReactionState(id);
  const info = collectMovieInfoRows(movie);
  const title = firstPresent(movie.title, 'Movie details');
  const hasInfo = Boolean(info.previewRows.trim() || info.expandedRows.trim());

  // New Banner Zone #7471833 Injection (Clean Dynamic Insertion)
  setTimeout(() => {
    const adFrame = document.getElementById('movietb-ad-frame');
    if (adFrame && !adFrame.querySelector('script')) {
      adFrame.innerHTML = ''; // Container clear

      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = "https://unfoldedtrade.com/b.XYVysddfGTls0xY/WQcH/Ke/mJ9/uiZwUglPkjP/TPcU0XN_z/E/4aMOzOMEtnN/zWQ_3HMJTug_zzNkwr";
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';

      adFrame.appendChild(s);
    }
  }, 300);

  return `
    <div class="movietb-below-player">
      <section class="movietb-reactions" aria-label="Movie reactions">
        <div class="movietb-vote-pill" role="group" aria-label="Like or dislike this movie">
          <button type="button" class="movietb-react-btn" data-vote="like" aria-label="Like this movie" aria-pressed="${state.vote === 'like'}">
            <span aria-hidden="true">👍</span>
            <span class="movietb-like-count">${formatCompactCount(getDisplayedLikeCount(state))}</span>
          </button>
          <span class="movietb-vote-divider" aria-hidden="true"></span>
          <button type="button" class="movietb-react-btn" data-vote="dislike" aria-label="Dislike this movie" aria-pressed="${state.vote === 'dislike'}">
            <span aria-hidden="true">👎</span>
          </button>
        </div>
        <div class="movietb-rating" aria-label="Movie rating">
          <div class="movietb-stars" role="group" aria-label="Rate this movie">
            ${[1, 2, 3, 4, 5].map((star) => `
              <button type="button" class="movietb-star" data-star="${star}" aria-label="Rate ${star} star${star > 1 ? 's' : ''}" aria-pressed="${state.rating >= star}">★</button>
            `).join('')}
          </div>
          <div class="movietb-rating-copy">
            <strong class="movietb-rating-score">${formatRatingLabel(state)}</strong>
            <span class="movietb-rating-count">${formatRatingCount(state)}</span>
          </div>
        </div>
      </section>


      
      <section class="movietb-movie-info" aria-label="Movie information">
        <div class="movietb-info-top">
          <h1 class="movietb-movie-title">${escapeHtml(title)}</h1>
          ${hasInfo ? `<button type="button" class="movietb-info-toggle" aria-expanded="false">View</button>` : ''}
        </div>
        ${hasInfo ? `
          <dl class="movietb-info-preview">${info.previewRows}</dl>
          <div class="movietb-info-expand-wrap">
            <dl class="movietb-info-expanded">${info.expandedRows}</dl>
          </div>
        ` : ''}
      </section>
     <section
  class="movietb-telegram-cta"
  aria-label="MovieTB Telegram channel"
>

  <a
    class="movietb-telegram-btn"
    href="${escapeHtml(TELEGRAM_CHANNEL_URL)}"
    target="_blank"
    rel="noopener noreferrer"
  >

    <span
      class="movietb-telegram-icon"
      aria-hidden="true"
    >
      ✈
    </span>


    <span>

      <strong>
        Join MovieTB on Telegram
      </strong>

      <small>
        Get new movie & trailer updates first
      </small>

    </span>


    <span
      class="movietb-telegram-arrow"
      aria-hidden="true"
    >
      →
    </span>

  </a>

</section>
      <section class="movietb-ad-placeholder" aria-label="Advertisement">
        <span class="movietb-ad-label">Advertisement</span>
        <div class="movietb-ad-frame" id="movietb-ad-frame">
          <!-- Banner Zone #7471833 will inject here -->
        </div>
      </section>

      <section class="movietb-related" aria-label="More from this category">
        <h2 class="movietb-related-heading">More From This Category</h2>
        <div class="movietb-related-grid" id="movietb-related-grid">
          <p class="movietb-related-status">Loading related titles...</p>
        </div>
      </section>
    </div>
  `;
}

function applyReactionUi(root, state) {
  root.querySelectorAll('.movietb-react-btn').forEach((btn) => {
    const active = btn.dataset.vote === state.vote;
    btn.classList.toggle('is-active', active);
    btn.classList.toggle('is-liked', btn.dataset.vote === 'like' && active);
    btn.classList.toggle('is-disliked', btn.dataset.vote === 'dislike' && active);
    btn.setAttribute('aria-pressed', String(active));
  });

  const likeCount = root.querySelector('.movietb-like-count');
  if (likeCount) {
    const exact = getDisplayedLikeCount(state);
    likeCount.textContent = formatCompactCount(exact);
    likeCount.title = exact.toLocaleString('en-US');
  }

  root.querySelectorAll('.movietb-star').forEach((btn) => {
    const star = Number(btn.dataset.star);
    const active = state.rating >= star;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  const score = root.querySelector('.movietb-rating-score');
  const count = root.querySelector('.movietb-rating-count');
  if (score) score.textContent = formatRatingLabel(state);
  if (count) count.textContent = formatRatingCount(state);
}

function initMovieTbBelowPlayer(movie, id) {
  const root = document.querySelector('.movietb-below-player');
  if (!root) return;

  const state = readReactionState(id);
  applyReactionUi(root, state);

  root.querySelectorAll('.movietb-react-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextVote = btn.dataset.vote;
      state.vote = state.vote === nextVote ? '' : nextVote;
      writeReactionState(id, state);
      applyReactionUi(root, state);
    });
  });

  root.querySelectorAll('.movietb-star').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.ratedThisSession || state.rating > 0) return;
      const star = Number(btn.dataset.star);
      if (!star) return;
      state.rating = star;
      state.ratedThisSession = true;
      writeReactionState(id, state);
      applyReactionUi(root, state);
      root.querySelector('.movietb-stars')?.classList.add('is-locked');
    });
  });

  if (state.ratedThisSession || state.rating > 0) {
    root.querySelector('.movietb-stars')?.classList.add('is-locked');
  }

  const toggle = root.querySelector('.movietb-info-toggle');
  const infoCard = root.querySelector('.movietb-movie-info');
  if (toggle && infoCard) {
    toggle.addEventListener('click', () => {
      const expanded = infoCard.classList.toggle('is-expanded');
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? 'Hide' : 'View';
    });
  }

  loadRelatedMovies(movie, id);
}

async function loadRelatedMovies(movie, currentId) {
  const grid = document.getElementById('movietb-related-grid');
  if (!grid) return;

  const category = firstPresent(movie.category);
  if (!category) {
    grid.innerHTML = `<p class="movietb-related-status">No related titles available.</p>`;
    return;
  }

  try {
    const q = query(
      collection(db, 'movies'),
      where('category', '==', category),
      limit(40)
    );
    const snapshot = await getDocs(q);
    const related = shuffleOnce(
      snapshot.docs.filter((item) => item.id !== currentId)
    ).slice(0, 10);

    if (!related.length) {
      grid.innerHTML = `<p class="movietb-related-status">No other titles in this category yet.</p>`;
      return;
    }

    grid.innerHTML = related.map((item) => {
      const data = item.data();
      const poster = resolveRelatedPoster(data);
      const title = firstPresent(data.title, 'Untitled');
      const meta = firstPresent(
        categoryNames[data.category] || data.category,
        data.year,
        data.language
      );
      const href = `movie.html?id=${encodeURIComponent(item.id)}`;

      return `
        <a class="movietb-related-card movietb-card" href="${href}" aria-label="Open ${escapeHtml(title)}">
          <div class="movietb-related-poster">
            <img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy"
              onerror="this.onerror=null;this.src='assets/images/placeholder.jpg';">
          </div>
          <h3>${escapeHtml(title)}</h3>
          ${meta ? `<p>${escapeHtml(meta)}</p>` : ''}
        </a>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading related movies:', error);
    grid.innerHTML = `<p class="movietb-related-status">Unable to load related titles.</p>`;
  }
}

// Reliable YouTube Iframe Progress Tracking
function initYouTubeTracking() {
  if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }

  var trackerInterval = setInterval(function () {
    var iframe = document.querySelector('iframe[src*="youtube.com"]');
    if (iframe && window.YT && window.YT.Player) {
      clearInterval(trackerInterval);

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

            if (event.data === YT.PlayerState.PLAYING) {
              if (typeof gtag === 'function' && !player.hasTrackedStart) {
                gtag('event', 'video_start', {
                  'video_title': document.title,
                  'video_provider': 'youtube'
                });
                player.hasTrackedStart = true;
              }

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
            } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
              if (progressCheckTimer) {
                clearInterval(progressCheckTimer);
                progressCheckTimer = null;
              }
              if (event.data === YT.PlayerState.ENDED && typeof gtag === 'function') {
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

// Global Event Listeners & Execution Entrypoint
document.addEventListener('DOMContentLoaded', initYouTubeTracking);
loadMovieDetails(); 