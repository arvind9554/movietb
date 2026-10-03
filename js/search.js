import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard, renderSkeletonCards } from './main.js';

const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get('q');

async function performSearch() {
  const container = document.getElementById('search-results-grid');
  const heading = document.getElementById('search-query-heading');

  if (!container) return;

  if (heading) {
    heading.innerText = searchQuery ? `Search Results for: "${searchQuery}"` : 'Search Results';
  }

  // Show Skeleton Loader
  renderSkeletonCards(container, 8);

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
      showFallback(container, allMovies, "Please enter a search term. Showing latest content:", null);
      return;
    }

    const cleanQuery = searchQuery.toLowerCase().trim();

    // Intent Flags
    const isHollywoodTarget = cleanQuery.includes('hollywood');
    const isBollywoodTarget = cleanQuery.includes('bollywood');
    const isHindiTarget = cleanQuery.includes('hindi');
    const isBhojpuriTarget = cleanQuery.includes('bhojpuri');
    const isTrailerTarget = cleanQuery.includes('trailer') || cleanQuery.includes('teaser');
    const isStoryTvTarget = cleanQuery.includes('story') || cleanQuery.includes('tv') || cleanQuery.includes('serial');
    
    // Series & Episode Intent Detection
    const isSeriesTarget = cleanQuery.includes('series') || 
                           cleanQuery.includes('webseries') || 
                           cleanQuery.includes('web series') || 
                           cleanQuery.includes('episode') || 
                           cleanQuery.includes('ep') || 
                           cleanQuery.includes('season');

    const has2026 = cleanQuery.includes('2026');

    // Split words cleanly without removing valid search terms
    const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 0);

    let filteredMovies = [];

    allMovies.forEach((movie) => {
      const title = String(movie.title || '').toLowerCase();
      const cat = String(movie.category || '').toLowerCase();
      const lang = String(movie.language || '').toLowerCase();
      const year = String(movie.releaseYear || movie.year || movie.date || '').toLowerCase();
      const desc = String(movie.description || '').toLowerCase();
      const type = String(movie.type || '').toLowerCase();
      const tags = Array.isArray(movie.tags) ? movie.tags.join(' ').toLowerCase() : String(movie.tags || '').toLowerCase();

      const fullMovieText = `${title} ${cat} ${lang} ${year} ${desc} ${tags} ${type}`;

      // 🛑 STRICT EXCLUSIONS
      if (!isSeriesTarget && (cat.includes('series') || type.includes('series') || title.includes('season') || title.includes('s01') || title.includes('episode') || title.includes('ep '))) return;
      if (!isTrailerTarget && (cat.includes('trailer') || title.includes('trailer') || cat.includes('teaser'))) return;
      if (!isStoryTvTarget && !isSeriesTarget && (cat.includes('story tv') || cat.includes('story-tv') || cat.includes('serial'))) return;

      // Isolation Checks
      if (isHollywoodTarget) {
        const isHollywoodExplicit = cat.includes('hollywood') || tags.includes('hollywood') || title.includes('hollywood');
        const isEnglishLang = lang.includes('english') || cat.includes('english');
        const isIndianContent = cat.includes('bollywood') || cat.includes('south') || cat.includes('bhojpuri') ||
                                lang.includes('bhojpuri') || cat.includes('hindi movie');

        if (!isHollywoodExplicit && !isEnglishLang) return;
        if (isIndianContent && !isHollywoodExplicit) return;
      }

      if (!isBhojpuriTarget && (lang.includes('bhojpuri') || cat.includes('bhojpuri'))) return;

      let score = 0;

      // Exact query match anywhere (High Priority)
      if (fullMovieText.includes(cleanQuery)) score += 50;
      if (title.includes(cleanQuery)) score += 30; // Extra boost if matched in title

      // Keyword level matching
      let matchedWordCount = 0;
      queryWords.forEach((word) => {
        if (fullMovieText.includes(word)) {
          matchedWordCount++;
          if (title.includes(word)) score += 15;
          else score += 5;
        }
      });

      // Bonus if all query words exist in full text
      if (matchedWordCount === queryWords.length) {
        score += 25;
      }

      // Year Match
      if (has2026 && (year.includes('2026') || title.includes('2026') || cat.includes('2026') || tags.includes('2026'))) {
        score += 15;
      }

      // Language Match
      if (isHindiTarget && (lang.includes('hindi') || cat.includes('hindi') || fullMovieText.includes('hindi'))) {
        score += 10;
      }

      if (score > 0) {
        filteredMovies.push({ movie, score });
      }
    });

    filteredMovies.sort((a, b) => b.score - a.score);
    const matchedMovies = filteredMovies.map(item => item.movie);

    if (matchedMovies.length > 0) {
      renderMoviesList(container, matchedMovies);
    } else {
      const targetCategory = isSeriesTarget ? 'Series / Shows' : (isHollywoodTarget ? 'Hollywood' : (isHindiTarget || isBollywoodTarget ? 'Hindi' : 'Recommended'));
      showFallback(container, allMovies, `No exact matches for "${searchQuery}". Here are top ${targetCategory}:`, targetCategory);
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

function showFallback(container, allMovies, message, categoryType) {
  const fallbackMovies = allMovies.filter(movie => {
    const cat = String(movie.category || '').toLowerCase();
    const lang = String(movie.language || '').toLowerCase();
    const title = String(movie.title || '').toLowerCase();

    const isFormatOk = !cat.includes('trailer') && !cat.includes('story tv');
    if (!isFormatOk) return false;

    if (categoryType === 'Hollywood') {
      return cat.includes('hollywood') || title.includes('hollywood');
    } else if (categoryType === 'Hindi') {
      return lang.includes('hindi') || cat.includes('hindi') || cat.includes('bollywood');
    } else if (categoryType === 'Series / Shows') {
      return cat.includes('series') || title.includes('episode') || title.includes('season') || cat.includes('story tv');
    }
    return true;
  }).slice(0, 8);

  const finalMovies = fallbackMovies.length > 0 ? fallbackMovies : allMovies.slice(0, 8);

  let html = `
    <div style="grid-column: 1 / -1; margin-bottom: 12px; color: #b3b3b3;">
      <p>${message}</p>
    </div>
  `;
  finalMovies.forEach((movie) => {
    html += createMovieCard(movie, movie.id);
  });

  container.innerHTML = html;
}

performSearch();