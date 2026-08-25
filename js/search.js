import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard } from './main.js';

const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get('q');

async function performSearch() {
  const container = document.getElementById('search-results-grid');
  const heading = document.getElementById('search-query-heading');

  if (!container) {
    console.error("search-results-grid element not found in DOM");
    return;
  }

  if (heading) {
    heading.innerText = searchQuery ? `Search Results for: "${searchQuery}"` : 'Search Results';
  } else {
    console.warn("search-query-heading element not found in DOM");
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

    // 1. Direct Multi-Field Filtering
    let matchedMovies = allMovies.filter((movie) => {
      const titleMatch = movie.title && movie.title.toLowerCase().includes(cleanQuery);
      const castMatch = movie.starCast && movie.starCast.toLowerCase().includes(cleanQuery);
      const categoryMatch = movie.category && movie.category.toLowerCase().includes(cleanQuery);
      const langMatch = movie.language && movie.language.toLowerCase().includes(cleanQuery);
      const descMatch = movie.description && movie.description.toLowerCase().includes(cleanQuery);
      const yearMatch = movie.releaseYear && String(movie.releaseYear).includes(cleanQuery);
      const tagsMatch = movie.tags && Array.isArray(movie.tags) && movie.tags.some(tag => tag.toLowerCase().includes(cleanQuery));

      return titleMatch || castMatch || categoryMatch || langMatch || descMatch || yearMatch || tagsMatch;
    });

    // 2. Intent-Based Smart Filtering (If no direct match found)
    if (matchedMovies.length === 0) {
      const is2026 = cleanQuery.includes('2026');
      const isHollywood = cleanQuery.includes('hollywood') || cleanQuery.includes('english');
      const isBollywood = cleanQuery.includes('bollywood') || cleanQuery.includes('hindi');
      const isAwaited = cleanQuery.includes('awaited') || cleanQuery.includes('upcoming') || cleanQuery.includes('trailer');

      matchedMovies = allMovies.filter((movie) => {
        let isMatch = true;

        if (is2026) {
          const yearStr = String(movie.releaseYear || movie.year || '');
          isMatch = isMatch && (yearStr.includes('2026') || (movie.title && movie.title.includes('2026')));
        }

        if (isHollywood) {
          const langStr = String(movie.language || '').toLowerCase();
          const catStr = String(movie.category || '').toLowerCase();
          isMatch = isMatch && (langStr.includes('english') || catStr.includes('hollywood'));
        }

        if (isBollywood) {
          const langStr = String(movie.language || '').toLowerCase();
          const catStr = String(movie.category || '').toLowerCase();
          isMatch = isMatch && (langStr.includes('hindi') || catStr.includes('bollywood'));
        }

        if (isAwaited) {
          const catStr = String(movie.category || '').toLowerCase();
          isMatch = isMatch && (movie.isUpcoming || movie.isAwaited || catStr.includes('trailer') || catStr.includes('latest-trailers'));
        }

        return isMatch;
      });
    }

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

// Render direct search results
function renderMoviesList(container, movies) {
  let html = '';
  movies.forEach((movie) => {
    html += createMovieCard(movie, movie.id);
  });
  container.innerHTML = html;
}

// Fallback logic for empty results
function showFallback(container, allMovies, message) {
  const fallbackMovies = allMovies.slice(0, 8); // Top 8 movies
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