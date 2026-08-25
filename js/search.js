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

    const cleanQuery = searchQuery.toLowerCase().trim();

    // Query Intents
    const has2026 = cleanQuery.includes('2026');
    const isHindiTarget = cleanQuery.includes('hindi') || cleanQuery.includes('bollywood') || cleanQuery.includes('dubbed');
    const isHollywoodTarget = cleanQuery.includes('hollywood') || cleanQuery.includes('english');
    const isBhojpuriTarget = cleanQuery.includes('bhojpuri');
    const isStoryTvTarget = cleanQuery.includes('story') || cleanQuery.includes('tv') || cleanQuery.includes('serial');

    // Split words for dynamic search
    const queryWords = cleanQuery
      .replace(/\b(movie|movies|film|films|ki|sabse|all|in|show|code|full)\b/g, '')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0);

    let scoredMovies = [];

    allMovies.forEach((movie) => {
      const title = String(movie.title || '').toLowerCase();
      const cat = String(movie.category || '').toLowerCase();
      const lang = String(movie.language || '').toLowerCase();
      const year = String(movie.releaseYear || movie.year || movie.date || '').toLowerCase();
      const desc = String(movie.description || '').toLowerCase();
      const tags = Array.isArray(movie.tags) ? movie.tags.join(' ').toLowerCase() : String(movie.tags || '').toLowerCase();

      // Combined search text for this movie
      const fullMovieText = `${title} ${cat} ${lang} ${year} ${desc} ${tags}`;

      // 1. Exclude Unwanted Content (Story TV & Bhojpuri) unless explicitly searched
      if (!isStoryTvTarget && (cat.includes('story tv') || cat.includes('story-tv') || cat.includes('tv show') || cat.includes('serial'))) {
        return;
      }
      if (!isBhojpuriTarget && (lang.includes('bhojpuri') || cat.includes('bhojpuri'))) {
        return;
      }

      let score = 0;

      // 2. Exact Query Phrase Match (High Score)
      if (fullMovieText.includes(cleanQuery)) {
        score += 20;
      }

      // 3. Year Filter Check (2026)
      if (has2026) {
        if (year.includes('2026') || title.includes('2026') || cat.includes('2026') || tags.includes('2026')) {
          score += 15;
        } else {
          // If user explicitly asked for 2026, lower non-2026 movies score
          score -= 10;
        }
      }

      // 4. Hindi & Dubbed Flexible Checking
      if (isHindiTarget) {
        if (lang.includes('hindi') || cat.includes('hindi') || cat.includes('bollywood') || 
            lang.includes('dubbed') || cat.includes('dubbed') || fullMovieText.includes('hindi')) {
          score += 10;
        }
      }

      // 5. Hollywood Checking
      if (isHollywoodTarget) {
        if (lang.includes('english') || cat.includes('hollywood') || fullMovieText.includes('hollywood')) {
          score += 10;
        }
      }

      // 6. Keyword Breakdown Match Score
      queryWords.forEach((word) => {
        if (title.includes(word)) score += 5;
        if (cat.includes(word)) score += 3;
        if (lang.includes(word)) score += 3;
        if (tags.includes(word)) score += 2;
      });

      if (score > 0) {
        scoredMovies.push({ movie, score });
      }
    });

    // Highest score movies will come first
    scoredMovies.sort((a, b) => b.score - a.score);
    const matchedMovies = scoredMovies.map(item => item.movie);

    // 7. Render Results or Fallback
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