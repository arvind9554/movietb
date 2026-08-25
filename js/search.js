import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard } from './main.js';

const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get('q');

async function performSearch() {
  const container = document.getElementById('search-results-grid');
  const heading = document.getElementById('search-query-heading');

  if (!container) return;

  if (heading) {
    heading.innerText = searchQuery ? `Search Results for: "${searchQuery}"` : 'Search Results';
  }

  try {
    const snapshot = await getDocs(collection(db, "movies"));
    const allMovies = [];
    
    snapshot.forEach((doc) => {
      const movieData = doc.data();
      if (movieData && movieData.title) {
        allMovies.push({ id: doc.id, ...movieData });
      }
    });

    if (!searchQuery || !searchQuery.trim()) {
      showFallback(container, allMovies, "Please enter a search term. Showing latest movies:");
      return;
    }

    const rawQuery = searchQuery.toLowerCase().trim();

    // 1. Detect Intent Filters
    const has2026 = rawQuery.includes('2026');
    const isMovieOnly = rawQuery.includes('movie') || rawQuery.includes('film');
    const isSeriesOnly = rawQuery.includes('web series') || rawQuery.includes('series');
    const isBhojpuri = rawQuery.includes('bhojpuri');
    const isHindi = rawQuery.includes('hindi');
    const isHollywood = rawQuery.includes('hollywood') || rawQuery.includes('english');

    // Remove stop words to extract actual content keywords
    const keywords = rawQuery
      .replace(/\b(movie|movies|film|films|ki|sabse|all|in|show|code|full)\b/g, '')
      .trim()
      .split(/\s+/)
      .filter(k => k.length > 0);

    // 2. Score & Filter Movies Accurately
    let scoredMovies = [];

    allMovies.forEach((movie) => {
      const title = String(movie.title || '').toLowerCase();
      const cat = String(movie.category || '').toLowerCase();
      const lang = String(movie.language || '').toLowerCase();
      const year = String(movie.releaseYear || movie.year || '');
      const type = String(movie.type || '').toLowerCase(); // 'movie' or 'series'

      let score = 0;

      // Strict Exclusion Check: Agar user ne Bhojpuri search nahi kiya, par movie Bhojpuri hai to reject karo
      if (!isBhojpuri && (lang.includes('bhojpuri') || cat.includes('bhojpuri'))) {
        return;
      }

      // Strict Type Check: Movie vs Web Series
      if (isMovieOnly && (cat.includes('series') || cat.includes('show') || type.includes('series'))) {
        return;
      }
      if (isSeriesOnly && !cat.includes('series') && !type.includes('series')) {
        return;
      }

      // Year Match Check (2026)
      if (has2026) {
        if (year.includes('2026') || title.includes('2026')) {
          score += 10;
        } else {
          // Agar 2026 search kiya hai aur movie 2026 ki nahi hai to reject karo
          return;
        }
      }

      // Language Check
      if (isHindi) {
        if (lang.includes('hindi') || cat.includes('hindi') || lang.includes('dubbed') || cat.includes('dubbed')) {
          score += 5;
        } else {
          return; // Skip non-Hindi content
        }
      }

      if (isHollywood) {
        if (lang.includes('english') || cat.includes('hollywood')) {
          score += 5;
        }
      }

      // Dynamic Keyword Score
      keywords.forEach((word) => {
        if (title.includes(word)) score += 5;
        if (cat.includes(word)) score += 3;
        if (lang.includes(word)) score += 2;
      });

      if (score > 0) {
        scoredMovies.push({ movie, score });
      }
    });

    // Score ke mutabiq Sort karo (Sabse relevant top par)
    scoredMovies.sort((a, b) => b.score - a.score);
    const matchedMovies = scoredMovies.map(item => item.movie);

    // 3. Render Results or Fallback
    if (matchedMovies.length > 0) {
      renderMoviesList(container, matchedMovies);
    } else {
      showFallback(container, allMovies, `No exact movies match "${searchQuery}". Here are top recommended movies:`);
    }

  } catch (error) {
    console.error("Search error:", error);
    container.innerHTML = `<p class="loading">Something went wrong while searching.</p>`;
  }
}

function renderMoviesList(container, movies) {
  let html = '';
  movies.forEach((movie) => {
    html += createMovieCard(movie, movie.id);
  });
  container.innerHTML = html;
}

function showFallback(container, allMovies, message) {
  const fallbackMovies = allMovies.slice(0, 8);
  let html = `
    <div style="grid-column: 1 / -1; margin-bottom: 12px; color: #b3b3b3;">
      <p>${message}</p>
    </div>
  `;
  fallbackMovies.forEach((movie) => {
    html += createMovieCard(movie, movie.id);
  });
  container.innerHTML = html;
}

performSearch();