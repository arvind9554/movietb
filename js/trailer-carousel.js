/**
 * Trailer carousel — 2 cards on desktop, 1 + peek on mobile.
 * Supports arrow navigation, touch swipe, and keyboard focus.
 */

const CAROUSEL_GAP = 20;
const TRANSITION_MS = 400;

function getCardsPerStep(viewportWidth) {
  if (viewportWidth <= 1024) return 1;
  return 2;
}

function getCardWidthPx(viewportWidth) {
  if (viewportWidth <= 640) {
    return viewportWidth * 0.85;
  }
  if (viewportWidth <= 1024) {
    return viewportWidth * 0.62;
  }
  return (viewportWidth - CAROUSEL_GAP) / 2;
}

export function initTrailerCarousel(root) {
  if (!root) return null;

  const viewport = root.querySelector('.carousel-viewport');
  const track = root.querySelector('.carousel-track');
  const prevBtn = root.querySelector('.carousel-prev');
  const nextBtn = root.querySelector('.carousel-next');

  if (!viewport || !track) return null;

  const cards = () => Array.from(track.querySelectorAll('.trailer-card'));
  let index = 0;
  let isDragging = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;
  let dragStartTime = 0;

  function getMetrics() {
    const viewportWidth = viewport.clientWidth;
    const cardWidth = getCardWidthPx(viewportWidth);
    const step = getCardsPerStep(viewportWidth);
    const total = cards().length;
    const maxIndex = Math.max(0, total - step);

    return { viewportWidth, cardWidth, step, total, maxIndex };
  }

  function applyCardWidths() {
    const { cardWidth } = getMetrics();
    root.style.setProperty('--carousel-gap', `${CAROUSEL_GAP}px`);

    cards().forEach((card) => {
      card.style.flexBasis = `${cardWidth}px`;
      card.style.maxWidth = `${cardWidth}px`;
      card.style.minWidth = `${cardWidth}px`;
    });
  }

  function clampIndex(value) {
    const { maxIndex } = getMetrics();
    return Math.max(0, Math.min(value, maxIndex));
  }

  function getOffsetForIndex(idx) {
    const { cardWidth } = getMetrics();
    return idx * (cardWidth + CAROUSEL_GAP);
  }

  function setTransform(offset, animate = true) {
    if (!animate) {
      track.classList.add('is-dragging');
    } else {
      track.classList.remove('is-dragging');
    }
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    currentTranslate = offset;
    prevTranslate = offset;
  }

  function updateNavState() {
    const { maxIndex } = getMetrics();
    if (prevBtn) {
      prevBtn.disabled = index <= 0;
    }
    if (nextBtn) {
      nextBtn.disabled = index >= maxIndex || maxIndex === 0;
    }
  }

  function goTo(newIndex, animate = true) {
    index = clampIndex(newIndex);
    const offset = getOffsetForIndex(index);
    setTransform(offset, animate);
    updateNavState();
  }

  function goNext() {
    const { step } = getMetrics();
    goTo(index + step);
  }

  function goPrev() {
    const { step } = getMetrics();
    goTo(index - step);
  }

  function pointerDown(clientX) {
    isDragging = true;
    startX = clientX;
    dragStartTime = Date.now();
    track.classList.add('is-dragging');
  }

  function pointerMove(clientX) {
    if (!isDragging) return;
    const delta = clientX - startX;
    const offset = prevTranslate - delta;
    const { cardWidth, maxIndex } = getMetrics();
    const minOffset = 0;
    const maxOffset = getOffsetForIndex(maxIndex);
    const clamped = Math.max(minOffset, Math.min(offset, maxOffset));
    track.style.transform = `translate3d(${-clamped}px, 0, 0)`;
    currentTranslate = clamped;
  }

  function pointerUp(clientX) {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');

    const delta = clientX - startX;
    const elapsed = Date.now() - dragStartTime;
    const { step, cardWidth } = getMetrics();
    const threshold = cardWidth * 0.2;
    const velocity = Math.abs(delta) / Math.max(elapsed, 1);
    const slideUnit = cardWidth + CAROUSEL_GAP;

    let targetIndex = Math.round(currentTranslate / slideUnit);

    if (Math.abs(delta) > threshold || velocity > 0.4) {
      const currentIndex = Math.round(currentTranslate / slideUnit);
      if (delta < 0) {
        targetIndex = currentIndex + step;
      } else if (delta > 0) {
        targetIndex = currentIndex - step;
      }
    }

    if (step > 1) {
      targetIndex = Math.round(targetIndex / step) * step;
    }

    goTo(targetIndex);
  }

  function onResize() {
    applyCardWidths();
    goTo(index, false);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', goPrev);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', goNext);
  }

  viewport.addEventListener('touchstart', (e) => {
    pointerDown(e.touches[0].clientX);
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    pointerMove(e.touches[0].clientX);
  }, { passive: true });

  viewport.addEventListener('touchend', (e) => {
    const clientX = e.changedTouches[0]?.clientX ?? startX;
    pointerUp(clientX);
  });

  viewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    pointerDown(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    pointerMove(e.clientX);
  });

  window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    pointerUp(e.clientX);
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 150);
  });

  applyCardWidths();
  goTo(0, false);

  return { refresh: onResize, goTo };
}

document.addEventListener('trailer-carousel-ready', (event) => {
  const root = event.detail?.root || document.getElementById('trailer-carousel');
  initTrailerCarousel(root);
});
