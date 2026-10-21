import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import * as mainModule from './main.js';

const { createMovieCard } = mainModule;
// Safety: agar main.js abhi purani ho (createPosterCard nahi hai) to page nahi tootega,
// bas New Releases purane cards me dikhengi aur console me warning aayegi.
const createPosterCard = mainModule.createPosterCard || mainModule.createMovieCard;
const applyPosterGrid = mainModule.applyPosterGrid || (() => {});

if (!mainModule.createPosterCard) {
  console.warn('[MovieTB] js/main.js purani hai (createPosterCard nahi mila). ' +
    'Naya main.js upload karo, tab New Releases poster cards me dikhengi.');
}

const urlParams = new URLSearchParams(window.location.search);
const catParam = urlParams.get('cat');

const headingMap = {
  'latest-trailers': 'Latest Trailers',
  'new-releases': 'New Releases',
  'hollywood-english': 'Hollywood (English)',
  'south-dubbed-movies': 'Bollywood Movies',
  'classic-cinema': 'Hollywood (Hindi)',
  'movie-reviews': 'Web Series',
  'story-tv': 'Story TV',
  'bhojpuri-movies': 'Bhojpuri Movies',
};

// Sirf in categories me portrait poster cards dikhenge
const POSTER_CATEGORIES = ['new-releases'];

function getCreatedMs(docSnap) {
  const createdAt = docSnap.data().createdAt;
  if (createdAt && typeof createdAt.toMillis === 'function') return createdAt.toMillis();
  if (createdAt && createdAt.seconds) return createdAt.seconds * 1000;
  return 0;
}

async function loadCategoryMovies() {
  const container = document.getElementById('category-movies-grid');
  const heading = document.getElementById('category-heading');

  if (!catParam || !headingMap[catParam]) {
    window.location.href = 'index.html';
    return;
  }

  heading.innerText = headingMap[catParam];
  document.getElementById('cat-page-title').innerText = `${headingMap[catParam]} - MovieTB`;

  const usePosterCards = POSTER_CATEGORIES.includes(catParam);

  try {
    const q = query(collection(db, "movies"), where("category", "==", catParam));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      container.innerHTML = `<p class="loading">No movies found in this category.</p>`;
      return;
    }

    let docs = snapshot.docs;

    if (usePosterCards) {
      // New Releases: sabse nayi movie sabse pehle, aur lambe poster cards
      docs = docs.slice().sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
      applyPosterGrid(container);
    }

    container.innerHTML = docs
      .map((docSnap) => (usePosterCards
        ? createPosterCard(docSnap.data(), docSnap.id)
        : createMovieCard(docSnap.data(), docSnap.id)))
      .join('');

  } catch (error) {
    console.error("Error fetching category:", error);
    container.innerHTML = `<p class="loading">Unable to load movies. Please refresh.</p>`;
  }
}

loadCategoryMovies();