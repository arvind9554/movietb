import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard, renderSkeletonCards } from './main.js';

const urlParams = new URLSearchParams(window.location.search);
const selectedCategory = urlParams.get('cat');

async function loadCategoryMovies() {
  const container = document.getElementById('category-results-grid') || document.querySelector('.movie-grid');
  const heading = document.querySelector('.page-heading');

  if (!container) return;

  // Render Skeleton Loader
  if (typeof renderSkeletonCards === 'function') {
    renderSkeletonCards(container, 8);
  }

  if (!selectedCategory) {
    container.innerHTML = `<p class="no-results">No category specified.</p>`;
    return;
  }

  // Clean and normalize the incoming URL slug (e.g. "bhojpuri-movies" -> "bhojpuri")
  const normalizedCategory = selectedCategory
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\bmovies\b/g, '')
    .trim();

  if (heading) {
    const formattedTitle = selectedCategory
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    heading.innerText = formattedTitle;
  }

  try {
    const snapshot = await getDocs(collection(db, "movies"));
    const matchedMovies = [];

    snapshot.forEach((doc) => {
      const movie = doc.data();
      if (!movie || !movie.title) return;

      const cat = String(movie.category || '').toLowerCase();
      const lang = String(movie.language || '').toLowerCase();
      const tags = Array.isArray(movie.tags) 
        ? movie.tags.join(' ').toLowerCase() 
        : String(movie.tags || '').toLowerCase();

      // Flexible category matching rule
      const isMatch = cat.includes(normalizedCategory) || 
                      lang.includes(normalizedCategory) || 
                      tags.includes(normalizedCategory);

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
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 0;">
          <p style="color: #b3b3b3;">No movies found in this category.</p>
        </div>
      `;
    }

  } catch (error) {
    console.error("Category fetch error:", error);
    container.innerHTML = `<p class="loading">Network error. Please check your connection and reload.</p>`;
  }
}

loadCategoryMovies();