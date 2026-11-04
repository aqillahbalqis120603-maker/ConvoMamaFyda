// ==========================================
// 1. TETAPAN GOOGLE APPS SCRIPT URL TASKA
// ==========================================
const GAS_URL = "https://script.google.com/macros/s/AKfycby_WVRm1Ruz3ryfscvJCs1VHqEZgCjmvZA-U-m3jDgpB1eR4EUYPGM1yoI9WN9NM5G6LQ/exec"; // Ganti dengan URL GAS baru anda

// DOM Elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('photoCanvas');
const frameOverlay = document.getElementById('frameOverlay');
const snapBtn = document.getElementById('snapBtn');
const studentNameInput = document.getElementById('studentName');
const bgMusic = document.getElementById('bgMusic');
const albumContainer = document.getElementById('albumContainer');

let cameraStream = null;

// ==========================================
// 2. NAVIGASI HALAMAN (PAGE FLOW)
// ==========================================

function goToPage1() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page1').classList.add('active');
  stopCamera();
}

function goToPage2() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page2').classList.add('active');
  stopCamera();

  if (bgMusic) {
    bgMusic.play().catch(err => {
      console.log("Auto-play disekat oleh pelayar web:", err);
    });
  }
}

function goToPage3() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page3').classList.add('active');
  initCamera();
}

function goToPage4() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page4').classList.add('active');
  stopCamera();
  loadAlbum();
}

// ==========================================
// 3. FUNGSI KAMERA & FRAME OVERLAY
// ==========================================

async function initCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: "user", // Guna kamera depan untuk murid/tetamu
        width: { ideal: 1280 },
        height: { ideal: 1920 }
      },
      audio: false
    });
    if (video) {
      video.srcObject = cameraStream;
    }
  } catch (err) {
    alert("Kebenaran akses kamera diperlukan untuk mengambil gambar.");
    console.error("Camera Access Error:", err);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

function changeFrame(frameName) {
  if (frameOverlay) {
    frameOverlay.src = 'assets/frames/' + frameName;
  }
}

// ==========================================
// 4. TANGKAP GAMBAR & MUAT NAIK
// ==========================================

if (snapBtn) {
  snapBtn.addEventListener('click', () => {
    if (!video || !video.srcObject) {
      alert("Kamera belum bersedia!");
      return;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 960;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (frameOverlay && frameOverlay.src && frameOverlay.complete) {
      const frameImg = new Image();
      frameImg.crossOrigin = "Anonymous";
      frameImg.src = frameOverlay.src;

      frameImg.onload = () => {
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
        const imageBase64 = canvas.toDataURL('image/png');
        uploadPhoto(imageBase64);
      };

      frameImg.onerror = () => {
        const imageBase64 = canvas.toDataURL('image/png');
        uploadPhoto(imageBase64);
      };
    } else {
      const imageBase64 = canvas.toDataURL('image/png');
      uploadPhoto(imageBase64);
    }
  });
}

async function uploadPhoto(base64Data) {
  if (snapBtn) snapBtn.disabled = true;

  const name = studentNameInput && studentNameInput.value.trim() !== "" 
    ? studentNameInput.value.trim() 
    : "Bintang Cilik";

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        image: base64Data,
        studentName: name
      })
    });

    const result = await response.json();

    if (result.status === "success") {
      alert("Hore! Gambar berjaya disimpan ke album konvo!");
      goToPage4();
    } else {
      alert("Ralat muat naik: " + result.message);
    }
  } catch (err) {
    console.error("Upload Error:", err);
    alert("Gagal memuat naik gambar. Sila semak sambungan internet.");
  } finally {
    if (snapBtn) snapBtn.disabled = false;
  }
}

// ==========================================
// 5. MEMUAT TURUN ALBUM DARI GOOGLE DRIVE
// ==========================================

async function loadAlbum() {
  if (!albumContainer) return;

  albumContainer.innerHTML = `
    <div class="empty-state">
      <div class="envelope-icon">🎈</div>
      <p>Memuat turun galeri gambar...</p>
    </div>
  `;

  try {
    const response = await fetch(GAS_URL);
    const result = await response.json();

    if (result.status === "success" && result.files && result.files.length > 0) {
      albumContainer.innerHTML = "";
      
      result.files.forEach(file => {
        const imgCard = document.createElement('div');
        imgCard.className = 'album-item';
        imgCard.innerHTML = `<img src="${file.url}" alt="${file.name}" loading="lazy">`;
        albumContainer.appendChild(imgCard);
      });
    } else {
      albumContainer.innerHTML = `
        <div class="empty-state">
          <div class="envelope-icon">🎈</div>
          <p>Belum ada gambar lagi — jom ambil gambar sekarang!</p>
        </div>
      `;
    }
  } catch (err) {
    console.error("Error loading album:", err);
    albumContainer.innerHTML = `
      <div class="empty-state">
        <p>Gagal memuat turun album. Sila cuba muat semula (↻).</p>
      </div>
    `;
  }
}