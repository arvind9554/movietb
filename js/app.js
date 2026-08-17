import { db } from './firebase-config.js';
import { collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard, getYouTubeId } from './main.js';

function normalizeEmbedUrl(url) {
  if (!url) return '';
  let embedUrl = url.trim();
  if (embedUrl.includes('watch?v=')) {
    embedUrl = embedUrl.replace('watch?v=', 'embed/');
  }
  if (embedUrl.includes('youtu.be/')) {
    embedUrl = embedUrl.replace('youtu.be/', 'www.youtube.com/embed/');
  }
  return embedUrl;
}

function buildHeroEmbedUrl(videoId) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    loop: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    playlist: videoId,
    iv_load_policy: '3',
    disablekb: '1',
    fs: '0',
    showinfo: '0'
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
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

async function loadHeroBackgroundTrailer() {
  const hero = document.getElementById('hero');
  const videoBg = document.getElementById('hero-video-bg');
  if (!hero || !videoBg) return;

  try {
    const q = query(
      collection(db, 'movies'),
      where('category', '==', 'latest-trailers')
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return;

    const latestDoc = [...querySnapshot.docs].sort(
      (a, b) => getDocTimestampMs(b) - getDocTimestampMs(a)
    )[0];

    const movie = latestDoc.data();
    const videoId = getYouTubeId(normalizeEmbedUrl(movie.embedUrl || movie.trailerUrl || ''));
    if (!videoId) return;

    const iframe = document.createElement('iframe');
    iframe.src = buildHeroEmbedUrl(videoId);
    iframe.title = `${movie.title || 'Latest trailer'} background`;
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    iframe.setAttribute('tabindex', '-1');
    iframe.loading = 'lazy';

    videoBg.appendChild(iframe);
    hero.classList.add('hero-has-video');
  } catch (error) {
    console.error('Hero background trailer unavailable:', error);
  }
}

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

    } catch (error) {
      console.error(`Error loading ${catId}:`, error);
      gridContainer.innerHTML = `<p class="loading">Failed to load content.</p>`;
    }
  }
}

loadHomepageMovies();
loadHeroBackgroundTrailer();