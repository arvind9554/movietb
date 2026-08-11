import { db } from './firebase-config.js';
import { collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard } from './main.js';

const categories = [
  'latest-trailers',
  'south-dubbed-movies',
  'classic-cinema',
  'Web Series'
];

async function loadHomepageMovies() {
  for (const cat of categories) {
    const gridContainer = document.getElementById(`${cat}-grid`);
    if (!gridContainer) continue;

    try {
      const q = query(collection(db, "movies"), where("category", "==", cat), limit(4));
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
      console.error(`Error loading ${cat}:`, error);
      gridContainer.innerHTML = `<p class="loading">Failed to load content.</p>`;
    }
  }
}

loadHomepageMovies();