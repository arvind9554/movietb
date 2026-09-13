import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const form = document.getElementById('new-release-form');
const listContainer = document.getElementById('new-release-list');

// 1. Fetch & Display Existing New Releases
async function loadNewReleases() {
  try {
    listContainer.innerHTML = '<p class="admin-subtext">Loading current New Releases…</p>';
    const q = query(collection(db, "movies"), where("category", "==", "new-releases"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      listContainer.innerHTML = '<p class="admin-subtext">No New Releases added yet.</p>';
      return;
    }

    let html = '';
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      html += `
        <div class="hero-slide-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <img src="${data.posterUrl}" alt="${data.title}" style="width: 50px; height: 70px; object-fit: cover; border-radius: 4px;">
            <div>
              <h4 style="margin: 0;">${data.title} (${data.year || '2026'})</h4>
              <small style="color: #aaa;">Stream URL: ${data.videoUrl}</small>
            </div>
          </div>
          <button class="btn-delete" data-id="${docSnap.id}" style="background: #ff4d4d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Delete</button>
        </div>
      `;
    });
    listContainer.innerHTML = html;

    // Attach Delete Listeners
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if(confirm("Are you sure you want to delete this movie?")) {
          await deleteDoc(doc(db, "movies", id));
          loadNewReleases();
        }
      });
    });

  } catch (error) {
    console.error("Error loading movies:", error);
    listContainer.innerHTML = `<p style="color: #ff4d4d;">Error loading releases: ${error.message}</p>`;
  }
}

// 2. Add New Movie to Firebase
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.innerText = "Adding Movie...";
    submitBtn.disabled = true;

    const movieData = {
      title: document.getElementById('nr-title').value.trim(),
      videoUrl: document.getElementById('nr-video-url').value.trim(),
      posterUrl: document.getElementById('nr-poster-url').value.trim(),
      year: document.getElementById('nr-year').value.trim() || "2026",
      quality: document.getElementById('nr-format').value.trim() || "1080p HD",
      language: document.getElementById('nr-language').value.trim() || "Hindi",
      telegramMsgId: document.getElementById('nr-telegram-msg-id').value.trim() || "",
      summary: document.getElementById('nr-summary').value.trim() || "",
      category: "new-releases", // Auto fixed category
      createdAt: new Date()
    };

    try {
      await addDoc(collection(db, "movies"), movieData);
      alert("🎉 Movie successfully added to New Releases!");
      form.reset();
      loadNewReleases(); // Refresh list
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("❌ Failed to add movie: " + error.message);
    } finally {
      submitBtn.innerText = "Add to New Releases";
      submitBtn.disabled = false;
    }
  });
}

// Load current releases on page load
loadNewReleases();