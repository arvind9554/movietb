// Header Component matching original MovieTB classes
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

// Footer Component matching original MovieTB layout
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
    <div class="footer-bottom">
      <p class="footer-copy">&copy; 2026 MovieTB. All rights reserved.</p>
      <p class="developer-credit">Developer : Arvind Kumar Pandey</p>
    </div>
  </footer>
`;

// Inject into HTML Placeholders
document.addEventListener("DOMContentLoaded", () => {
    const headerPlaceholder = document.getElementById("header-placeholder");
    const footerPlaceholder = document.getElementById("footer-placeholder");

    if (headerPlaceholder) headerPlaceholder.innerHTML = headerHTML;
    if (footerPlaceholder) footerPlaceholder.innerHTML = footerHTML;
});