import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');

const titleEl = document.getElementById('dl-title');
const metaEl = document.getElementById('dl-meta');
const posterEl = document.getElementById('dl-poster');
const timerEl = document.getElementById('timer-box');
const btnDownload = document.getElementById('btn-download');

let targetWorkerUrl = "";

async function initDownloadPage() {
  if (!movieId) {
    titleEl.textContent = "Invalid Movie Link";
    timerEl.style.display = "none";
    return;
  }

  try {
    const movieRef = doc(db, "movies", movieId);
    const snap = await getDoc(movieRef);

    if (snap.exists()) {
      const data = snap.data();
      const msgId = data.telegramMsgId || data.messageId || data.msgId;

      titleEl.textContent = data.title || "Movie Download";
      metaEl.textContent = `${data.year || ''} ${data.quality ? '• ' + data.quality : ''} ${data.language ? '• ' + data.language : ''}`;
      
      if (data.posterUrl) {
        posterEl.src = data.posterUrl;
        posterEl.style.display = "inline-block";
      }

      // Cloudflare Worker URL set karein
      if (msgId) {
        targetWorkerUrl = `https://dry-credit-08ff.arvindkp9336.workers.dev?id=${encodeURIComponent(msgId)}`;
      } else {
        targetWorkerUrl = "#";
      }

      startTimer(12);
    } else {
      titleEl.textContent = "Movie Not Found";
      timerEl.style.display = "none";
    }
  } catch (err) {
    console.error("Error loading download page:", err);
    titleEl.textContent = "Error Loading File";
  }
}

function startTimer(seconds) {
  let timeLeft = seconds;
  timerEl.textContent = timeLeft;

  const interval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(interval);
      timerEl.style.display = "none";
      btnDownload.disabled = false;
      btnDownload.textContent = "⚡ Download / Fast Stream";
      
      btnDownload.addEventListener('click', () => {
        if (targetWorkerUrl && targetWorkerUrl !== "#") {
          window.location.href = targetWorkerUrl;
        } else {
          alert("Download link currently unavailable.");
        }
      });
    }
  }, 1000);
}

initDownloadPage();