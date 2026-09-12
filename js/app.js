import { db } from './firebase-config.js';
import { collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard, resolvePoster } from './main.js';

function getDocTimestampMs(docSnap) {
  const createdAt = docSnap.data().createdAt;
  if (createdAt && typeof createdAt.toMillis === 'function') {
    return createdAt.toMillis();
  }
  if (createdAt && createdAt.seconds) {
    return createdAt.seconds * 1000;
  }
  return 0;
}

/* =========================================================
   HERO CAROUSEL
   Builds a multi-slide hero (title, meta pills, tagline, Play
   Trailer / Details buttons, dots) from real "latest-trailers"
   Firestore documents - up to 7 slides, each showing the movie
   POSTER (no background video), auto-flipping every 5 seconds.
   No movie data is hardcoded - if Firestore has fewer movies
   you simply get fewer slides. If it's empty, the original
   plain "Welcome to MovieTB" markup stays exactly as-is.
   ========================================================= */
async function loadHeroCarousel() {
  const hero = document.getElementById('hero');
  const posterBg = document.getElementById('hero-poster-bg');
  const badgeEl = document.getElementById('hero-badge');
  const titleEl = document.getElementById('hero-title');
  const metaEl = document.getElementById('hero-meta');
  const taglineEl = document.getElementById('hero-tagline');
  const ctaEl = document.getElementById('hero-cta');
  const playBtn = document.getElementById('hero-play-btn');
  const detailsBtn = document.getElementById('hero-details-btn');
  const dotsEl = document.getElementById('hero-dots');

  if (!hero || !posterBg) return;

  try {
    const q = query(
      collection(db, 'movies'),
      where('category', '==', 'latest-trailers'),
      limit(7)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return; // fallback markup stays as-is

    const slides = querySnapshot.docs
      .slice()
      .sort((a, b) => getDocTimestampMs(b) - getDocTimestampMs(a))
      .map((docSnap) => ({ id: docSnap.id, movie: docSnap.data() }));

    let activeIndex = 0;
    let rotateTimer = null;

    function renderSlide(index) {
      const { id, movie } = slides[index];
      const { primary } = resolvePoster(movie);

      // Poster-only background - no autoplay video
      posterBg.style.backgroundImage = `url('${primary}')`;
      hero.classList.add('hero-enhanced');

      badgeEl.textContent = index === 0 ? '↗ #1 TRENDING' : `↗ TRENDING #${index + 1}`;
      titleEl.textContent = movie.title || 'MovieTB';

      const metaParts = [movie.year, movie.format, movie.language].filter(Boolean);
      metaEl.innerHTML = metaParts
        .map((part) => `<span class="hero-meta-pill">${part}</span>`)
        .join('');

      taglineEl.textContent = 'Experience the latest release in stunning quality.';

      const targetUrl = `redirect.html?target=movie.html?id=${id}`;
      playBtn.href = targetUrl;
      detailsBtn.href = targetUrl;
      ctaEl.style.display = 'flex';

      if (dotsEl) {
        [...dotsEl.children].forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      }
    }

    function resetRotation() {
      if (rotateTimer) clearInterval(rotateTimer);
      if (slides.length > 1) {
        rotateTimer = setInterval(() => {
          activeIndex = (activeIndex + 1) % slides.length;
          renderSlide(activeIndex);
        }, 5000);
      }
    }

    if (dotsEl && slides.length > 1) {
      dotsEl.innerHTML = slides
        .map((_, i) => `<button class="hero-dot" data-index="${i}" aria-label="Slide ${i + 1}"></button>`)
        .join('');

      dotsEl.querySelectorAll('.hero-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
          activeIndex = parseInt(dot.dataset.index, 10);
          renderSlide(activeIndex);
          resetRotation();
        });
      });
    }

    renderSlide(activeIndex);
    resetRotation();
  } catch (error) {
    console.error('Hero carousel unavailable:', error);
  }
}

/* =========================================================
   TRAILER CAROUSEL ARROWS
   Desktop/tablet: click arrows to scroll by one card width.
   Mobile: arrows are hidden via CSS, swipe is primary input.
   Only touches the trailers row - nothing else on the page.
   ========================================================= */
function initTrailerArrows() {
  const slider = document.getElementById('latest-trailers-grid');
  const prevBtn = document.getElementById('trailers-prev');
  const nextBtn = document.getElementById('trailers-next');
  if (!slider || !prevBtn || !nextBtn) return;

  function scrollByCard(direction) {
    const card = slider.querySelector('.movie-card');
    if (!card) return;
    const cardWidth = card.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(slider).columnGap || getComputedStyle(slider).gap) || 20;
    slider.scrollBy({ left: direction * (cardWidth + gap), behavior: 'smooth' });
  }

  function updateArrowState() {
    const maxScroll = slider.scrollWidth - slider.clientWidth - 2;
    prevBtn.classList.toggle('is-disabled', slider.scrollLeft <= 2);
    nextBtn.classList.toggle('is-disabled', maxScroll <= 0 || slider.scrollLeft >= maxScroll);
  }

  prevBtn.addEventListener('click', () => scrollByCard(-1));
  nextBtn.addEventListener('click', () => scrollByCard(1));
  slider.addEventListener('scroll', updateArrowState, { passive: true });
  window.addEventListener('resize', updateArrowState);
  updateArrowState();
}

/* =========================================================
   HOMEPAGE CATEGORY GRIDS
   Same data-fetching logic as before - untouched. Only addition
   is calling initTrailerArrows() once the trailer cards exist.
   ========================================================= */
const categories = [
  'latest-trailers',
  'hollywood-english',
  'south-dubbed-movies',
  'classic-cinema',
  { id: 'movie-reviews', gridId: 'web-series-grid' },
  'story-tv',
  'bhojpuri-movies',
];

async function loadHomepageMovies() {
  for (const cat of categories) {
    const catId = typeof cat === 'string' ? cat : cat.id;
    const gridContainer = document.getElementById(
      typeof cat === 'string' ? `${cat}-grid` : cat.gridId
    );
    if (!gridContainer) continue;

    try {
      const q = query(collection(db, "movies"), where("category", "==", catId), limit(4));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        gridContainer.innerHTML = `<p class="loading">No posts available in this section.</p>`;
        continue;
      }

      let html = '';
      querySnapshot.forEach((doc) => {
        html += createMovieCard(doc.data(), doc.id);
      });
      gridContainer.innerHTML = html;

      if (catId === 'latest-trailers') {
        initTrailerArrows();
      }

    } catch (error) {
      console.error(`Error loading ${catId}:`, error);
      gridContainer.innerHTML = `<p class="loading">Failed to load content.</p>`;
    }
  }
}

loadHomepageMovies();
loadHeroCarousel();