import { db } from './firebase-config.js';
import { collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import * as mainModule from './main.js';

// Namespace import: agar main.js abhi purani hai (createPosterCard nahi hai) tab
// bhi homepage nahi tootega, New Releases purane cards me dikh jaayenge.
const { createMovieCard, resolveHeroImage } = mainModule;
const createPosterCard = mainModule.createPosterCard || mainModule.createMovieCard;
const applyPosterGrid = mainModule.applyPosterGrid || (() => {});

// Purani main.js par chup-chaap purane cards dikhne se confusion hota hai,
// isliye console me saaf warning aati hai.
if (!mainModule.createPosterCard) {
  console.warn('[MovieTB] js/main.js purani hai (createPosterCard nahi mila). ' +
    'Naya main.js upload karo, tab New Releases poster cards me dikhengi.');
}

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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* =========================================================
   HERO CAROUSEL
   (Reverted to the "latest-trailers" movie-poster version per
   request - the heroSlides/admin experiment is on hold, not
   deleted. This is untouched from before that experiment.)
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

      hero.classList.add('hero-enhanced');

      resolveHeroImage(movie).then((bgUrl) => {
        if (slides[activeIndex] && slides[activeIndex].id === id) {
          // quotes escape: URL me " ho to CSS toot jaati hai
          posterBg.style.backgroundImage = `url("${String(bgUrl).replace(/"/g, '%22')}")`;
        }
      });

      badgeEl.textContent = '';
      badgeEl.style.display = 'none';
      titleEl.textContent = formatShortTitle(movie.title, 3);

      const metaParts = [movie.year, movie.format, movie.language].filter(Boolean);
      metaEl.innerHTML = metaParts
        .map((part) => `<span class="hero-meta-pill">${escapeHtml(part)}</span>`)
        .join('');

      taglineEl.textContent = '';

      const targetUrl = `movie.html?id=${encodeURIComponent(id)}`;
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
  // Wait a frame so the browser has laid out the freshly-inserted cards
  // before we measure scrollWidth/clientWidth (fixes boundary state being
  // wrong - e.g. "next" looking enabled - right after cards first load).
  requestAnimationFrame(updateArrowState);
}

/* =========================================================
   HOMEPAGE CATEGORY GRIDS

   Har category me ab:
     fetchLimit = Firestore se kitne docs laane hain
     show       = homepage par kitne cards dikhane hain
   Jab fetchLimit > show hota hai, docs ko createdAt se newest-first sort
   karke top `show` dikhaye jaate hain. (Pehle limit(4) bina sorting ke
   kisi bhi 4 docs ko laata tha, isliye nayi add ki hui New Release
   homepage par aane ki guarantee nahi thi.)

   New Releases ke liye 30 laakar newest 12 dikhate hain (poster cards).
   Kam/zyada dikhana ho to `show` badal do.
   ========================================================= */
const DEFAULT_LIMIT = 4;

const categories = [
  'latest-trailers',
  // poster: true -> portrait poster cards (main.js: createPosterCard). Desktop par 6 columns,
  // mobile par swipe wali row.
  { id: 'new-releases', gridId: 'new-releases-grid', fetchLimit: 30, show: 12, poster: true },
  'hollywood-english',
  'south-dubbed-movies',
  'classic-cinema',
  { id: 'movie-reviews', gridId: 'web-series-grid' },
  'story-tv',
  'bhojpuri-movies',
];

async function loadCategory(cat) {
  const cfg = typeof cat === 'string' ? { id: cat, gridId: `${cat}-grid` } : cat;
  const catId = cfg.id;
  const fetchLimit = cfg.fetchLimit || DEFAULT_LIMIT;
  const show = cfg.show || DEFAULT_LIMIT;

  const gridContainer = document.getElementById(cfg.gridId);
  if (!gridContainer) return;

  try {
    const q = query(collection(db, "movies"), where("category", "==", catId), limit(fetchLimit));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      gridContainer.innerHTML = `<p class="loading">No posts available in this section.</p>`;
      return;
    }

    let docs = querySnapshot.docs;
    if (fetchLimit > show) {
      docs = docs
        .slice()
        .sort((a, b) => getDocTimestampMs(b) - getDocTimestampMs(a))
        .slice(0, show);
    }

    if (cfg.poster) applyPosterGrid(gridContainer);

    gridContainer.innerHTML = docs
      .map((docSnap) => (cfg.poster
        ? createPosterCard(docSnap.data(), docSnap.id)
        : createMovieCard(docSnap.data(), docSnap.id)))
      .join('');

    if (catId === 'latest-trailers') {
      initTrailerArrows();
    }

  } catch (error) {
    console.error(`Error loading ${catId}:`, error);
    gridContainer.innerHTML = `<p class="loading">Failed to load content.</p>`;
  }
}

// Saari categories ek saath load hoti hain (pehle ek ke baad ek, jisse
// homepage dheere bharta tha).
async function loadHomepageMovies() {
  await Promise.all(categories.map(loadCategory));
}

function formatShortTitle(title, wordLimit = 3) {
  if (!title) return 'MovieTB';
  const words = title.trim().split(/\s+/);
  if (words.length > wordLimit) {
    return words.slice(0, wordLimit).join(' ') + '...';
  }
  return title;
}

loadHomepageMovies();
loadHeroCarousel();