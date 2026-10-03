import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard, renderSkeletonCards } from './main.js';

const urlParams = new URLSearchParams(window.location.search);
const rawCategory = urlParams.get('cat');

async function loadCategoryMovies() {
  const container = document.getElementById('category-results-grid') || document.querySelector('.movie-grid');
  const heading = document.querySelector('.page-heading');

  if (!container) return;

  // Show Skeleton Loader
  if (typeof renderSkeletonCards === 'function') {
    renderSkeletonCards(container, 8);
  }

  if (!rawCategory || !rawCategory.trim()) {
    container.innerHTML = `<p class="no-results" style="grid-column: 1 / -1; text-align: center;">No category specified.</p>`;
    return;
  }

  // Heading Format
  if (heading) {
    const formattedTitle = rawCategory
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    heading.innerText = formattedTitle;
  }

  // Normalize search terms: e.g., "bhojpuri-movies" -> ["bhojpuri"]
  // "story-tv" -> ["story", "tv"]
  const cleanCategory = rawCategory.toLowerCase().replace(/-/g, ' ').replace(/\bmovies\b/g, '').trim();
  const searchKeywords = cleanCategory.split(/\s+/).filter(k => k.length > 0);

  try {
    const snapshot = await getDocs(collection(db, "movies"));
    const matchedMovies = [];

    snapshot.forEach((doc) => {
      const movie = doc.data();
      if (!movie || !movie.title) return;

      const cat = String(movie.category || '').toLowerCase();
      const lang = String(movie.language || '').toLowerCase();
      const type = String(movie.type || '').toLowerCase();
      const title = String(movie.title || '').toLowerCase();
      const tags = Array.isArray(movie.tags) 
        ? movie.tags.join(' ').toLowerCase() 
        : String(movie.tags || '').toLowerCase();

      const combinedText = `${cat} ${type} ${lang} ${tags} ${title}`;

      // Check if any core keyword from URL parameter exists in movie metadata
      const isMatch = searchKeywords.some(keyword => combinedText.includes(keyword));

      if (isMatch) {
        matchedMovies.push({ id: doc.id, ...movie });
      }
    });

    if (matchedMovies.length > 0) {
      let html = '';
      matchedMovies.forEach((movie) => {
        html += createMovieCard(movie, movie.id);
      });
      container.innerHTML = html;
    } else {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 0; color: #b3b3b3;">
          <p>No content found in this category.</p>
        </div>
      `;
    }

  } catch (error) {
    console.error("Category fetch error:", error);
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 0; color: #ff4d4d;">
        <p>Error loading content. Please refresh the page.</p>
      </div>
    `;
  }
}

loadCategoryMovies();