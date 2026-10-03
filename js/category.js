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

  // Raw parameter normalized (e.g., "hollywood-english" -> "hollywood english")
  const targetSlug = rawCategory.toLowerCase().replace(/-/g, ' ').trim();

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

      let isMatch = false;

      // 🎬 1. HOLLYWOOD / ENGLISH SECTION
      if (targetSlug.includes('hollywood') || targetSlug.includes('english')) {
        const isHollywoodOrEnglish = cat.includes('hollywood') || 
                                     tags.includes('hollywood') || 
                                     title.includes('hollywood') || 
                                     lang.includes('english');

        // Exclude Indian regional movies unless explicitly tagged Hollywood
        const isIndianContent = cat.includes('bollywood') || cat.includes('bhojpuri') || 
                                lang.includes('bhojpuri') || cat.includes('south') || 
                                (lang.includes('hindi') && !cat.includes('hollywood'));

        if (isHollywoodOrEnglish && !isIndianContent) {
          isMatch = true;
        }
      } 
      // 🎬 2. BOLLYWOOD / HINDI MOVIES SECTION
      else if (targetSlug.includes('bollywood') || targetSlug.includes('hindi')) {
        const isBollywoodOrHindi = cat.includes('bollywood') || lang.includes('hindi') || cat.includes('hindi');
        const isOther = cat.includes('bhojpuri') || cat.includes('hollywood') || lang.includes('bhojpuri');

        if (isBollywoodOrHindi && !isOther) {
          isMatch = true;
        }
      } 
      // 🎬 3. BHOJPURI MOVIES SECTION
      else if (targetSlug.includes('bhojpuri')) {
        if (cat.includes('bhojpuri') || lang.includes('bhojpuri') || tags.includes('bhojpuri')) {
          isMatch = true;
        }
      } 
      // 📺 4. STORY TV / SERIALS SECTION
      else if (targetSlug.includes('story') || targetSlug.includes('tv') || targetSlug.includes('serial')) {
        if (cat.includes('story') || cat.includes('serial') || type.includes('story') || tags.includes('story')) {
          isMatch = true;
        }
      } 
      // 🍿 5. WEB SERIES SECTION
      else if (targetSlug.includes('series') || targetSlug.includes('webseries')) {
        if (cat.includes('series') || type.includes('series') || title.includes('season') || title.includes('episode')) {
          isMatch = true;
        }
      } 
      // 🎯 6. GENERAL DEFAULT MATCH (For other custom categories)
      else {
        const cleanKeyword = targetSlug.replace(/\bmovies\b/g, '').trim();
        isMatch = combinedText.includes(cleanKeyword);
      }

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