// =====================================================
// MovieTB - shared ad helper (Hilltop zone)
// Ad code sirf yahan badalna hai, baaki pages apne aap update ho jaayenge.
// =====================================================

// Hilltop panel se mila script URL (backslash \ nahi hona chahiye)
const AD_SRC =
  "https://unfoldedtrade.com/b.XYVysddfGTls0xY/WQcH/Ke/mJ9/uiZwUglPkjP/TPcU0XN_z/E/4aMOzOMEtnN/zWQ_3HMJTug_zzNkwr";

// Ad ke iframe ke andar ka HTML
const AD_DOC = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
  body > *, body div, body ins, body iframe, body video {
    max-width: 100% !important;
  }
</style>
</head>
<body>
<script type="text/javascript" src="${AD_SRC}" async referrerpolicy="no-referrer-when-downgrade"><\/script>
</body>
</html>`;

// Ad card ka HTML (blog grid ya article ke andar daalne ke liye)
export function adCardHTML() {
  return `
    <section class="blog-ad-card movietb-ad-placeholder" aria-label="Advertisement">
      <span class="movietb-ad-label">ADVERTISEMENT</span>
      <div class="movietb-ad-frame"></div>
    </section>`;
}

function loadAd(slot) {
  if (slot.querySelector("iframe")) return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("title", "Advertisement");
  // NOTE: sandbox attribute mat lagana, warna ad block ho jaata hai
  iframe.srcdoc = AD_DOC;
  slot.appendChild(iframe);
}

// Page par jitne ad cards hain unme ad load karta hai
// (screen ke paas aane par hi load hota hai, page fast rehta hai)
export function mountAds(root = document) {
  const slots = root.querySelectorAll(".blog-ad-card .movietb-ad-frame:not([data-ready])");
  if (!slots.length) return;

  if (!("IntersectionObserver" in window)) {
    slots.forEach((s) => { s.dataset.ready = "1"; loadAd(s); });
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          loadAd(e.target);
        }
      });
    },
    { rootMargin: "300px" }
  );

  slots.forEach((s) => {
    s.dataset.ready = "1";
    io.observe(s);
  });
}