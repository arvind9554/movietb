import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard } from './main.js';

const urlParams = new URLSearchParams(window.location.search);
const catParam = urlParams.get('cat');

const headingMap = {
  'latest-trailers': 'Latest Trailers',
  'hollywood-english': 'Hollywood (English)',
  'south-dubbed-movies': 'Bollywood Movies',
  'classic-cinema': 'Hollywood Hindi',
  'movie-reviews': 'Web Series',
  'story-tv': 'Story TV',
  'bhojpuri-movies': 'Bhojpuri Movies',
};

async function loadCategoryMovies() {
  const container = document.getElementById('category-movies-grid');
  const heading = document.getElementById('category-heading');

  if (!catParam || !headingMap[catParam]) {
    window.location.href = 'index.html';
    return;
  }

  heading.innerText = headingMap[catParam];
  document.getElementById('cat-page-title').innerText = `${headingMap[catParam]} - MovieTB`;

  try {
    const q = query(collection(db, "movies"), where("category", "==", catParam));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      container.innerHTML = `<p class="loading">No movies found in this category.</p>`;
      return;
    }

    let html = '';
    snapshot.forEach((doc) => {
      html += createMovieCard(doc.data(), doc.id);
    });
    container.innerHTML = html;

  } catch (error) {
    console.error("Error fetching category:", error);
  }
}

loadCategoryMovies();