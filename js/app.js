import { db } from './firebase-config.js';
import { collection, getDocs, query, where, limit, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard } from './main.js';

/* =========================================================
   HERO CAROUSEL
   Reads from the dedicated "heroSlides" Firestore collection
   (managed at admin/hero-banner.html) - NOT from movie/trailer
   data. Exactly what's uploaded there is what shows here, up
   to 5 slides, in the order added. If that collection is empty,
   the original plain "Welcome to MovieTB" markup stays as-is.
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
    const q = query(collection(db, 'heroSlides'), orderBy('order', 'asc'), limit(5));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return; // fallback markup stays as-is

    const slides = querySnapshot.docs.map((docSnap) => docSnap.data());

    let activeIndex = 0;
    let rotateTimer = null;

    function renderSlide(index) {
      const slide = slides[index];

      hero.classList.add('hero-enhanced');
      posterBg.style.backgroundImage = `url('${slide.imageUrl}')`;

      badgeEl.textContent = index === 0 ? '↗ #1 TRENDING' : `↗ TRENDING #${index + 1}`;
      titleEl.textContent = slide.title || 'MovieTB';

      const metaParts = [slide.year, slide.format, slide.language].filter(Boolean);
      metaEl.innerHTML = metaParts
        .map((part) => `<span class="hero-meta-pill">${part}</span>`)
        .join('');

      taglineEl.textContent = slide.tagline || 'Experience the latest release in stunning quality.';

      const targetUrl = (slide.linkUrl || '').trim();
      if (targetUrl) {
        playBtn.href = targetUrl;
        detailsBtn.href = targetUrl;
        ctaEl.style.display = 'flex';
      } else {
        ctaEl.style.display = 'none';
      }

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
  // Wait a frame so the browser has laid out the freshly-inserted cards
  // before we measure scrollWidth/clientWidth (fixes boundary state being
  // wrong - e.g. "next" looking enabled - right after cards first load).
  requestAnimationFrame(updateArrowState);
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