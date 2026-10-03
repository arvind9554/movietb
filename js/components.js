// Header Component
const headerHTML = `
<header class="main-header">
  <div class="header-container">
    <div class="brand-logo">
      <a href="index.html">Movie<span>TB</span></a>
    </div>
    <div class="search-bar-container">
      <input type="text" placeholder="Search movies, trailers..." id="search-input">
      <button id="search-btn">Search</button>
    </div>
    <nav class="nav-links">
      <a href="index.html">Home</a>
      <a href="blog.html">Blog</a>
      <a href="about.html">About</a>
    </nav>
  </div>
</header>
`;

// Footer Component
const footerHTML = `
<footer class="main-footer">
  <div class="footer-container">
    <div class="footer-brand">
      <h3>Movie<span>TB</span></h3>
      <p>Your destination for official trailers, movies and web series.</p>
    </div>
    <div class="footer-links">
      <h4>QUICK LINKS</h4>
      <a href="index.html">Home</a>
      <a href="blog.html">Blog</a>
      <a href="about.html">About</a>
    </div>
    <div class="footer-legal">
      <h4>LEGAL</h4>
      <a href="dmca.html">DMCA Disclaimer</a>
      <a href="privacy.html">Privacy Policy</a>
    </div>
  </div>
  <div class="footer-bottom">
    <p>© 2026 MovieTB. All rights reserved.</p>
    <p>Developer : Arvind Kumar Pandey</p>
  </div>
</footer>
`;

// Render Header & Footer Dynamically
document.addEventListener("DOMContentLoaded", () => {
    const headerPlaceholder = document.getElementById("header-placeholder");
    const footerPlaceholder = document.getElementById("footer-placeholder");

    if (headerPlaceholder) headerPlaceholder.innerHTML = headerHTML;
    if (footerPlaceholder) footerPlaceholder.innerHTML = footerHTML;
});