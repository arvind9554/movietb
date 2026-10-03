import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createMovieCard } from './main.js';

const urlParams = new URLSearchParams(window.location.search);
const rawCatParam = urlParams.get('cat') || '';

// Clean parameter (spaces ko hyphen me normalize karein)
const catParam = rawCatParam.trim().toLowerCase().replace(/\s+/g, '-');

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

async function loadCategoryMovies() {
  const container = document.getElementById('category-movies-grid');
  const heading = document.getElementById('category-heading');

  // Agar URL me catParam missing ho toh redirect karein
  if (!catParam) {
    window.location.href = 'index.html';
    return;
  }

  // Heading set karein (Map me na hone par raw value ko capitalize karein)
  const titleText = headingMap[catParam] || catParam.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  if (heading) heading.innerText = titleText;
  const pageTitle = document.getElementById('cat-page-title');
  if (pageTitle) pageTitle.innerText = `${titleText} - MovieTB`;

  try {
    // Possible category values in DB
    const possibleCategories = [
      catParam,                             // "bhojpuri-movies"
      catParam.replace(/-/g, ' '),          // "bhojpuri movies"
      catParam.replace('-movies', ''),       // "bhojpuri"
      rawCatParam                           // original raw param
    ];

    // Array contains query for flexibility
    const q = query(collection(db, "movies"), where("category", "in", possibleCategories));
    let snapshot = await getDocs(q);

    // Fallback: Agar exact match na mile toh manual case-insensitive search
    if (snapshot.empty) {
      const allDocs = await getDocs(collection(db, "movies"));
      let html = '';
      let matchCount = 0;

      allDocs.forEach((doc) => {
        const data = doc.data();
        const docCat = (data.category || '').toLowerCase().trim();
        
        if (possibleCategories.includes(docCat) || docCat.includes(catParam.replace('-movies', ''))) {
          html += createMovieCard(data, doc.id);
          matchCount++;
        }
      });

      if (matchCount > 0 && container) {
        container.innerHTML = html;
      } else if (container) {
        container.innerHTML = `<p class="loading">No movies found in this category.</p>`;
      }
      return;
    }

    let html = '';
    snapshot.forEach((doc) => {
      html += createMovieCard(doc.data(), doc.id);
    });

    if (container) {
      container.innerHTML = html;
    }

  } catch (error) {
    console.error("Error fetching category:", error);
    if (container) {
      container.innerHTML = `<p class="loading">Error loading content. Please refresh.</p>`;
    }
  }
}

loadCategoryMovies();