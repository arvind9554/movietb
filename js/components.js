// Header Component
const headerHTML = `
  <header class="navbar">
    <div class="logo">
      <a href="index.html">Movie<span class="accent">TB</span></a>
    </div>
    <div class="search-box">
      <input type="text" id="search-input" placeholder="Search movies, trailers...">
      <button id="search-btn">Search</button>
    </div>
    <nav class="nav-links">
      <a href="index.html">Home</a>
      <a href="blog.html">Blog</a>
      <a href="about.html">About</a>
    </nav>
  </header>
`;

// Social Connect Section inside footerHTML
const footerHTML = `
  <footer class="site-footer">
    <div class="footer-glow" aria-hidden="true"></div>
    <div class="footer-main">
      <div class="footer-brand">
        <a href="index.html" class="footer-logo">Movie<span class="accent">TB</span></a>
        <span class="footer-accent-line" aria-hidden="true"></span>
        <p class="footer-tagline">Your destination for official trailers, movies and web series.</p>
      </div>
      <nav class="footer-col" aria-label="Footer quick links">
        <h3 class="footer-heading">Quick Links</h3>
        <ul class="footer-links-list">
          <li><a href="index.html">Home</a></li>
          <li><a href="blog.html">Blog</a></li>
          <li><a href="about.html">About</a></li>
        </ul>
      </nav>
      <nav class="footer-col" aria-label="Footer legal links">
        <h3 class="footer-heading">Legal</h3>
        <ul class="footer-links-list">
          <li><a href="dmca.html">DMCA Disclaimer</a></li>
          <li><a href="privacy-policy.html">Privacy Policy</a></li>
        </ul>
      </nav>
    </div>

    <p class="footer-legal">All content embedded legally from public domains / YouTube.</p>

    <div class="footer-divider" aria-hidden="true"></div>

    <!-- Social Connect Section with Classes and Links -->
    <div class="social-connect-section">
      <p class="social-heading">Follow Us / Connect With Us</p>
      <div class="social-icons">
        <a href="https://instagram.com/movietb_" class="social-btn instagram" target="_blank" rel="noopener" aria-label="Instagram">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </a>
        <a href="https://facebook.com/profile.php?id=61593529134134" class="social-btn facebook" target="_blank" rel="noopener" aria-label="Facebook">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.583 9 4.615V8z"/></svg>
        </a>
        <a href="https://t.me/movietbofficial" class="social-btn telegram" target="_blank" rel="noopener" aria-label="Telegram">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.128.832.941z"/></svg>
        </a>
      </div>
    </div>

    <div class="footer-bottom">
      <p class="footer-copy">&copy; 2026 MovieTB. All rights reserved.</p>
      <p class="developer-credit">Developer : Arvind Kumar Pandey</p>
    </div>
  </footer>
`;

// Helper Function for Search Redirect
function attachSearchEvents() {
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");

  const performSearch = () => {
    const query = searchInput ? searchInput.value.trim() : "";
    if (query) {
      window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }
  };

  if (searchBtn) {
    searchBtn.onclick = performSearch;
  }

  if (searchInput) {
    searchInput.onkeypress = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        performSearch();
      }
    };
  }
}

// Inject Placeholders and Bind Events
document.addEventListener("DOMContentLoaded", () => {
  const headerPlaceholder = document.getElementById("header-placeholder");
  const footerPlaceholder = document.getElementById("footer-placeholder");

  if (headerPlaceholder) {
    headerPlaceholder.innerHTML = headerHTML;
    attachSearchEvents(); // Search handlers ko HTML inject hone ke baad attach kiya gaya hai
  }
  
  if (footerPlaceholder) {
    footerPlaceholder.innerHTML = footerHTML;
  }
});