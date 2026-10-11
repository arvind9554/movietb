import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* =========================================================
   New Releases admin
   Movies "movies" collection me hi save hoti hain (taaki movie.html?id=...
   aur baaki pages same data use kar sakein), bas in flags ke saath:
     category: 'new-releases'
     isNewRelease: true
     releaseType: 'gateway'
     messageId, channelId / channelUsername, telegramLink
   ========================================================= */

const PLACEHOLDER_POSTER = 'https://via.placeholder.com/300x450?text=MovieTB';

let releasesCache = [];
let editingId = null;

const $ = (id) => document.getElementById(id);

// ─── helpers ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Is page me toast container nahi hai, isliye khud bana lete hain
function showToast(message, type = 'success') {
  let box = $('nr-toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'nr-toast-box';
    box.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.textContent = message;
  t.style.cssText =
    'padding:12px 16px;border-radius:8px;color:#fff;font-size:14px;font-weight:600;' +
    'box-shadow:0 6px 18px rgba(0,0,0,.5);transition:opacity .3s;' +
    `background:${type === 'error' ? '#b91c1c' : '#15803d'};`;
  box.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

/**
 * Telegram input samajhta hai:
 *   "27"                              -> { messageId: 27 }
 *   "https://t.me/my_channel/27"      -> { messageId: 27, channelUsername: 'my_channel' }
 *   "https://t.me/c/1234567890/27"    -> { messageId: 27, channelId: '-1001234567890' }
 * Galat input par null deta hai.
 */
function parseTelegramInput(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const id = Number(raw);
    return id > 0 ? { messageId: id, channelId: '', channelUsername: '', telegramLink: '' } : null;
  }

  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');
    if (host !== 't.me' && host !== 'telegram.me') return null;

    const parts = u.pathname.split('/').filter(Boolean);
    const messageId = Number(parts[parts.length - 1]);
    if (!Number.isInteger(messageId) || messageId <= 0) return null;

    if (parts[0] === 'c' && parts.length >= 3) {
      return { messageId, channelId: `-100${parts[1]}`, channelUsername: '', telegramLink: raw };
    }
    if (parts.length >= 2) {
      return { messageId, channelId: '', channelUsername: parts[0], telegramLink: raw };
    }
  } catch (_) { /* invalid URL */ }

  return null;
}

function getCreatedTime(movie) {
  if (movie.createdAt?.toMillis) return movie.createdAt.toMillis();
  if (movie.createdAt?.seconds) return movie.createdAt.seconds * 1000;
  return 0;
}

// ─── list ───────────────────────────────────────────────────────────────────
async function loadReleases() {
  const list = $('new-release-list');
  if (!list) return;

  list.innerHTML = '<p class="admin-subtext">Loading current New Releases…</p>';

  try {
    // orderBy nahi lagaya (composite index na maange), sorting yahin kar rahe hain
    const snap = await getDocs(query(collection(db, 'movies'), where('isNewRelease', '==', true)));
    releasesCache = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => getCreatedTime(b) - getCreatedTime(a));

    renderReleases();
  } catch (err) {
    console.error('Load new releases failed:', err);
    list.innerHTML = '<p class="admin-subtext" style="color:#f87171;">Unable to load New Releases.</p>';
  }
}

function renderReleases() {
  const list = $('new-release-list');
  if (!list) return;

  if (!releasesCache.length) {
    list.innerHTML = '<p class="admin-subtext">Abhi koi New Release nahi hai. Neeche se add karo.</p>';
    return;
  }

  list.innerHTML = releasesCache.map((m) => {
    const poster = m.posterUrl || PLACEHOLDER_POSTER;
    const meta = [m.year, m.language, m.format].filter(Boolean).join(' · ') || '—';
    const tg = m.messageId ? `Msg ID: ${escapeHtml(m.messageId)}` : 'Msg ID: —';

    return `
      <div class="nr-row" data-id="${escapeHtml(m.id)}"
        style="display:flex;align-items:center;gap:12px;padding:10px;margin-bottom:10px;
               background:#1a1a1a;border:1px solid var(--border);border-radius:10px;">
        <img src="${escapeHtml(poster)}" alt="" loading="lazy"
          onerror="this.onerror=null;this.src='${PLACEHOLDER_POSTER}'"
          style="width:48px;height:68px;object-fit:cover;border-radius:6px;flex-shrink:0;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${escapeHtml(m.title || 'Untitled')}
          </div>
          <div style="font-size:12px;color:var(--text-muted);">${escapeHtml(meta)} · ${tg}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <a href="../movie.html?id=${encodeURIComponent(m.id)}" target="_blank" rel="noopener"
             class="btn-logout" style="padding:7px 12px;font-size:12px;">Open</a>
          <button type="button" class="btn-logout" data-nr-action="edit" data-id="${escapeHtml(m.id)}"
             style="padding:7px 12px;font-size:12px;">Edit</button>
          <button type="button" class="btn-logout" data-nr-action="delete" data-id="${escapeHtml(m.id)}"
             style="padding:7px 12px;font-size:12px;">Delete</button>
        </div>
      </div>`;
  }).join('');
}

// ─── form ───────────────────────────────────────────────────────────────────
function resetForm() {
  editingId = null;
  $('new-release-form')?.reset();

  const btn = document.querySelector('#new-release-form .btn-submit');
  if (btn) btn.textContent = 'Add to New Releases';
  $('nr-cancel-edit')?.remove();
}

function startEdit(id) {
  const m = releasesCache.find((x) => x.id === id);
  if (!m) return;

  editingId = id;
  $('nr-title').value = m.title || '';
  $('nr-poster-url').value = m.posterUrl || '';
  $('nr-telegram-msg-id').value = m.telegramLink || (m.messageId ? String(m.messageId) : '');
  $('nr-year').value = m.year || '';
  $('nr-format').value = m.format || '';
  $('nr-language').value = m.language || '';
  $('nr-summary').value = m.summary || '';

  const btn = document.querySelector('#new-release-form .btn-submit');
  if (btn) btn.textContent = 'Update New Release';

  if (!$('nr-cancel-edit') && btn) {
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.id = 'nr-cancel-edit';
    cancel.className = 'btn-logout';
    cancel.style.cssText = 'width:100%;margin-top:10px;padding:12px;';
    cancel.textContent = 'Cancel Edit';
    cancel.addEventListener('click', resetForm);
    btn.insertAdjacentElement('afterend', cancel);
  }

  $('new-release-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleDelete(id) {
  const m = releasesCache.find((x) => x.id === id);
  if (!m) return;
  if (!window.confirm(`"${m.title || 'Untitled'}" ko delete karna hai?`)) return;

  try {
    await deleteDoc(doc(db, 'movies', id));
    showToast('New Release delete ho gayi.');
    if (editingId === id) resetForm();
    await loadReleases();
  } catch (err) {
    console.error(err);
    showToast('Delete nahi ho paya. Dobara try karo.', 'error');
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  const submitBtn = document.querySelector('#new-release-form .btn-submit');
  const title = $('nr-title').value.trim();
  const posterUrl = $('nr-poster-url').value.trim();
  const tg = parseTelegramInput($('nr-telegram-msg-id').value);

  if (!title || !posterUrl) {
    showToast('Title aur Poster URL zaroori hain.', 'error');
    return;
  }
  if (!tg) {
    showToast('Telegram link ya Message ID galat hai. Example: 27 ya https://t.me/channel/27', 'error');
    return;
  }

  const yearRaw = $('nr-year').value.trim();
  const data = {
    title,
    posterUrl,
    category: 'new-releases',
    isNewRelease: true,
    releaseType: 'gateway',
    messageId: tg.messageId,
    channelId: tg.channelId,
    channelUsername: tg.channelUsername,
    telegramLink: tg.telegramLink,
    year: /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : yearRaw,
    format: $('nr-format').value.trim(),
    language: $('nr-language').value.trim(),
    summary: $('nr-summary').value.trim(),
  };

  if (submitBtn) submitBtn.disabled = true;

  try {
    if (editingId) {
      await updateDoc(doc(db, 'movies', editingId), data);
      showToast('New Release update ho gayi.');
    } else {
      await addDoc(collection(db, 'movies'), {
        ...data,
        views: 0,
        createdAt: serverTimestamp(),
      });
      showToast('New Release add ho gayi. Homepage par dikhegi.');
    }
    resetForm();
    await loadReleases();
  } catch (err) {
    console.error('Save failed:', err);
    showToast('Save nahi ho paya. Login/Firestore rules check karo.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ─── boot ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  loadReleases();
});

$('btn-logout')?.addEventListener('click', () => {
  signOut(auth).then(() => { window.location.href = 'login.html'; });
});

$('new-release-form')?.addEventListener('submit', handleSubmit);

$('new-release-list')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-nr-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.nrAction === 'edit') startEdit(id);
  else if (btn.dataset.nrAction === 'delete') handleDelete(id);
});