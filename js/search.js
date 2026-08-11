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

  if (!searchQuery) {
    container.innerHTML = `<p class="loading">Please enter a search term.</p>`;
    return;
  }

  if (heading) {
    heading.innerText = `Search Results for: "${searchQuery}"`;
  } else {
    console.warn("search-query-heading element not found in DOM");
  }

  try {
    const snapshot = await getDocs(collection(db, "movies"));
    let resultsCount = 0;
    let html = '';

    snapshot.forEach((doc) => {
      const movie = doc.data();
      if (!movie.title) return;

      const titleMatch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
      const castMatch = movie.starCast && movie.starCast.toLowerCase().includes(searchQuery.toLowerCase());

      if (titleMatch || castMatch) {
        html += createMovieCard(movie, doc.id);
        resultsCount++;
      }
    });

    if (resultsCount === 0) {
      container.innerHTML = `<p class="loading">No movies match your search query.</p>`;
    } else {
      container.innerHTML = html;
    }

  } catch (error) {
    console.error("Search error:", error);
    container.innerHTML = `<p class="loading">Something went wrong while searching.</p>`;
  }
}

performSearch();