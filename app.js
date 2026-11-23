// ==========================================
// 1. TETAPAN
// ==========================================
// PENTING: URL ini mesti dari Apps Script TASKA (bukan wedding).
// Lihat Code.gs untuk taska, deploy sebagai Web app, kemudian tampal URL baru di sini.
const GAS_URL = "https://script.google.com/macros/s/AKfycbz83iCVrDRn8yjMTTVpKDzvhw3N5xvN3GsuZ_FVJ4AHNxEEbWmqj26Ew_JXatzZAKaP/exec";

const SCHOOL = {
  name: "Taska Mama Fyda",
  motto: "Play to Learn",
  event: "Majlis Konvokesyen",
  year: "2026"
};
const DEFAULT_NAME = "Bintang Cilik";

// Saiz output gambar (nisbah 3:4, sama dengan preview kamera)
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1440;
const JPEG_QUALITY = 0.85;

// Kalau nak guna frame PNG sendiri (contoh dari Canva), isi di sini:
// { convo: "assets/frames/convo.png" }
const CUSTOM_FRAMES = {};

const LETTER_COLORS = ["#FF6B6B", "#FF9F43", "#FFC107", "#4CD97B", "#4DB8FF", "#A77BFF"];
const FONT = "'Fredoka', 'Comic Sans MS', sans-serif";
const FONT_WORD = "'Lilita One', 'Fredoka', 'Comic Sans MS', sans-serif";
// Warna tulisan TASKA / MAMA / FYDA seperti logo
const WM = { g: "#34B04F", r: "#F0302F", b: "#2F7BE8", outline: "#2B2B2B" };

// DOM Elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('photoCanvas');
const frameCanvas = document.getElementById('frameCanvas');
const snapBtn = document.getElementById('snapBtn');
const studentNameInput = document.getElementById('studentName');
const bgMusic = document.getElementById('bgMusic');
const musicBtn = document.getElementById('musicBtn');
const albumContainer = document.getElementById('albumContainer');
const uploadStatus = document.getElementById('uploadStatus');

let cameraStream = null;
let currentFacing = "user"; // kamera depan untuk murid
let isMirrored = false;
let isUploading = false;
let currentFrame = "convo";

// ==========================================
// 2. LUKISAN SVG (IKUT TEMA LOGO)
// ==========================================
const P = {
  brown: "#7A4A1E",
  coral: "#FF6B6B",
  coralD: "#E64A4A",
  sun: "#FFD54F",
  sky: "#5BC0EB",
  skyD: "#3B9AD9",
  pink: "#FF9EB5",
  mint: "#6FD9A0",
  purple: "#A77BFF"
};

const DEFS = `
  <radialGradient id="gSun" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#FFF59D"/><stop offset="1" stop-color="#FFCA28"/></radialGradient>
  <linearGradient id="gYel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF4A8"/><stop offset="1" stop-color="#FFD54F"/></linearGradient>
  <linearGradient id="gSkyBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CDEEFF"/><stop offset="1" stop-color="#8FD3F4"/></linearGradient>
  <linearGradient id="gPinkBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE0EC"/><stop offset="1" stop-color="#E3D6FF"/></linearGradient>
  <pattern id="pDots" width="60" height="60" patternUnits="userSpaceOnUse">
    <circle cx="15" cy="15" r="6" fill="#fff" opacity=".5"/><circle cx="45" cy="45" r="6" fill="#fff" opacity=".5"/>
  </pattern>
`;

// Laluan segi empat bulat
function rr(x, y, w, h, r) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

function starPts(cx, cy, r, inner = 0.5) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rad = i % 2 ? r * inner : r;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function starG(x, y, r, fill = P.sun, rot = 0, stroke = "#fff", sw = 10) {
  return `<g transform="rotate(${rot} ${x} ${y})"><polygon points="${starPts(x, y, r, 0.5)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/></g>`;
}

function sparkleG(x, y, r, fill = "#fff") {
  return `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`;
}

function heartG(x, y, s = 1, fill = P.coral) {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 8C-14 -4 -12 -16 -4 -16C0 -16 0 -12 0 -10C0 -12 0 -16 4 -16C12 -16 14 -4 0 8Z" fill="${fill}"/>`;
}

function daisyG(x, y, s = 1) {
  const petals = Array.from({ length: 8 }, (_, i) =>
    `<ellipse cx="0" cy="-7" rx="3.2" ry="6" transform="rotate(${i * 45})" fill="#fff"/>`
  ).join("");
  return `<g transform="translate(${x} ${y}) scale(${s})">${petals}<circle r="3.6" fill="#FFC107"/></g>`;
}

function cloudG(x, y, s = 1, fill = "#fff", outline = "#fff") {
  const shapes = `<circle cx="-42" cy="12" r="32"/><circle cx="0" cy="-8" r="46"/><circle cx="46" cy="10" r="34"/><rect x="-74" y="8" width="148" height="38" rx="19"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <g fill="${outline}" stroke="${outline}" stroke-width="12" stroke-linejoin="round">${shapes}</g>
    <g fill="${fill}">${shapes}</g>
  </g>`;
}

function capG(x, y, s = 1, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M-44 8L-44 44Q0 66 44 44L44 8Z" fill="#4B4780" stroke="#2F2B5C" stroke-width="6" stroke-linejoin="round"/>
    <path d="M0 -46L104 -8L0 30L-104 -8Z" fill="#5D59A0" stroke="#2F2B5C" stroke-width="6" stroke-linejoin="round"/>
    <path d="M0 -46L104 -8L0 30Z" fill="#fff" opacity=".12"/>
    <path d="M0 -8L82 -2L82 36" fill="none" stroke="#FFC107" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M82 32L74 62L90 62Z" fill="#FFC107" stroke="#D99A00" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="0" cy="-8" r="8" fill="#FFC107" stroke="#2F2B5C" stroke-width="4"/>
  </g>`;
}

// Rumah biru bumbung merah (seperti dalam logo)
function houseG(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="26" y="-92" width="14" height="30" fill="#E8262B" stroke="#A31517" stroke-width="4"/>
    <rect x="-45" y="-40" width="90" height="70" rx="4" fill="#4DB8F0" stroke="#2B6F9A" stroke-width="4"/>
    <path d="M-60 -34L0 -88L60 -34Z" fill="#E8262B" stroke="#A31517" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-30 30V-8Q-18 -22 -6 -8V30Z" fill="#2B4A63"/>
    <circle cx="22" cy="-6" r="13" fill="#fff" stroke="#2B6F9A" stroke-width="4"/>
    <path d="M22 -19V7M9 -6H35" stroke="#2B6F9A" stroke-width="3"/>
  </g>`;
}

// Matahari comel (seperti dalam logo)
function sunFaceG(x, y, s = 1, spin = false) {
  let rays = "";
  for (let i = 0; i < 12; i++) {
    rays += `<line x1="0" y1="-48" x2="0" y2="-64" stroke="#FFB300" stroke-width="9" stroke-linecap="round" transform="rotate(${i * 30})"/>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <g${spin ? ' class="rays"' : ''}>${rays}</g>
    <circle r="38" fill="url(#gSun)" stroke="#E8A317" stroke-width="3.5"/>
    <ellipse cx="-22" cy="10" rx="8" ry="5" fill="#FF9EB5" opacity=".85"/>
    <ellipse cx="22" cy="10" rx="8" ry="5" fill="#FF9EB5" opacity=".85"/>
    <ellipse cx="-12" cy="-4" rx="4.5" ry="6.5" fill="#4A2C12"/>
    <ellipse cx="12" cy="-4" rx="4.5" ry="6.5" fill="#4A2C12"/>
    <circle cx="-10.5" cy="-7" r="1.8" fill="#fff"/><circle cx="13.5" cy="-7" r="1.8" fill="#fff"/>
    <path d="M-9 8Q0 24 9 8Z" fill="#6B2D1F" stroke="#6B2D1F" stroke-width="2" stroke-linejoin="round"/>
  </g>`;
}

// Bukit hijau + rumah + bunga (hiasan latar halaman, 440x150)
function hillDecoG() {
  return `
    <path d="M0 150V92Q60 40 150 72T300 62T440 82V150Z" fill="#8FD35F"/>
    <path d="M0 150V116Q80 80 170 106T330 100T440 108V150Z" fill="#5FB548"/>
    ${houseG(372, 62, 0.5)}
    ${heartG(412, 14, 1.1, P.coral)}${heartG(428, 28, 0.7, P.pink)}
    ${daisyG(40, 112, 0.7)}${daisyG(120, 128, 0.6)}${daisyG(250, 122, 0.65)}${daisyG(330, 136, 0.6)}
  `;
}

// Konfeti yang ditabur (deterministik supaya bingkai sentiasa sama)
function confettiG(n, seed, zones) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const cols = [P.coral, P.sky, P.mint, P.purple, P.pink, "#fff"];
  let out = "";
  for (let i = 0; i < n; i++) {
    const z = zones[i % zones.length];
    const x = Math.round(z[0] + rnd() * z[2]);
    const y = Math.round(z[1] + rnd() * z[3]);
    const c = cols[i % cols.length];
    const r = Math.round(rnd() * 360);
    const k = i % 3;
    if (k === 0) out += `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`;
    else if (k === 1) out += `<rect x="${x - 8}" y="${y - 4}" width="16" height="8" rx="3" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`;
    else out += `<path d="M${x} ${y - 9}L${x + 9} ${y + 7}L${x - 9} ${y + 7}Z" fill="${c}" stroke="${c}" stroke-width="3" stroke-linejoin="round" transform="rotate(${r} ${x} ${y})"/>`;
  }
  return out;
}

// ---------- Maskot matahari berkopiah graduasi (untuk album kosong) ----------
function mascotSVG() {
  const rainbow = ["#FF6B6B", "#FF9F43", "#FFD54F", "#6FD9A0", "#4DB8FF", "#A77BFF"]
    .map((c, i) => {
      const r = 170 - i * 15;
      return `<path d="M${180 - r} 235A${r} ${r} 0 0 1 ${180 + r} 235" fill="none" stroke="${c}" stroke-width="15"/>`;
    }).join("");

  let rays = "";
  for (let i = 0; i < 12; i++) {
    rays += `<line x1="180" y1="${190 - 84}" x2="180" y2="${190 - 104}" stroke="#FFB300" stroke-width="14" stroke-linecap="round" transform="rotate(${i * 30} 180 190)"/>`;
  }

  return `<svg viewBox="0 0 360 320" xmlns="http://www.w3.org/2000/svg">
    ${rainbow}
    ${cloudG(44, 240, 0.85)}
    ${cloudG(316, 240, 0.85)}
    <g class="rays">${rays}</g>
    <g class="face">
      <circle cx="180" cy="190" r="68" fill="url(#gSun)" stroke="#E8A317" stroke-width="5"/>
      <ellipse cx="140" cy="208" rx="14" ry="9" fill="#FF9EB5" opacity=".85"/>
      <ellipse cx="220" cy="208" rx="14" ry="9" fill="#FF9EB5" opacity=".85"/>
      <ellipse cx="153" cy="190" rx="8" ry="11" fill="#4A2C12"/>
      <ellipse cx="207" cy="190" rx="8" ry="11" fill="#4A2C12"/>
      <circle cx="156" cy="185" r="3.2" fill="#fff"/>
      <circle cx="210" cy="185" r="3.2" fill="#fff"/>
      <path d="M164 207Q180 236 196 207Z" fill="#6B2D1F" stroke="#6B2D1F" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="180" cy="222" rx="7" ry="4" fill="#FF8FA3"/>
      ${capG(180, 128, 0.62, -8)}
    </g>
    ${starG(40, 92, 14, P.pink, -10, "#fff", 6)}
    ${starG(322, 104, 12, P.sky, 12, "#fff", 6)}
    ${sparkleG(80, 60, 10)}
    ${sparkleG(290, 58, 8)}
  </svg>`;
}

// ---------- Hiasan latar: matahari, awan, bintang, hati, bukit & rumah ----------
function buildDeco() {
  const el = document.getElementById('deco');
  if (!el) return;
  const cloud = c => `<svg class="cloud ${c}" viewBox="-95 -75 190 140">${cloudG(0, 0, 1, "#fff", "#fff")}</svg>`;
  const star = (c, col) => `<svg class="star ${c}" viewBox="-30 -30 60 60">${starG(0, 0, 18, col, 0, "#fff", 8)}</svg>`;
  const heart = (c, col) => `<svg class="heart ${c}" viewBox="-20 -20 40 40">${heartG(0, 0, 1.5, col)}</svg>`;
  el.innerHTML =
    `<svg class="sun" viewBox="-80 -80 160 160">${sunFaceG(0, 0, 1.2, true)}</svg>` +
    cloud("c1") + cloud("c2") + cloud("c3") +
    star("s1", P.coral) + star("s2", P.sky) + star("s3", P.pink) +
    heart("h1", P.coral) + heart("h2", P.pink) +
    `<svg class="hill" viewBox="0 0 440 150" preserveAspectRatio="xMidYMax slice">${hillDecoG()}</svg>`;
}

// Tajuk huruf berwarna-warni yang melantun
function buildRainbowText() {
  document.querySelectorAll('.rainbow').forEach(el => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((ch, i) =>
      ch === " "
        ? " "
        : `<span aria-hidden="true" style="color:${LETTER_COLORS[i % LETTER_COLORS.length]};--i:${i}">${ch}</span>`
    ).join("");
  });
}

// Kalau assets/logo.png tak dijumpai, paparkan tulisan gaya logo
function logoFallback(img) {
  const wrap = img.closest('.logo-wrap');
  if (!wrap) return;
  wrap.classList.add('fallback');
  wrap.innerHTML = `<div>
    <div class="wordmark"><span class="w-g">Taska</span> <span class="w-r">Mama</span> <span class="w-b">Fyda</span></div>
    <p class="rainbow">${SCHOOL.motto}</p>
  </div>`;
  buildRainbowText();
}

function buildArt() {
  const holder = document.createElement('div');
  holder.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${DEFS}</defs></svg>`;
  document.body.prepend(holder.firstChild);

  buildDeco();
  buildRainbowText();
}

// ==========================================
// 3. BINGKAI (FRAME) BERTEMA LOGO
// ==========================================
function frameSVG(key) {
  const outer = "M0 0H1080V1440H0Z";
  let body = "";

  // ---- Graduasi ----
  if (key === "convo") {
    const win = rr(100, 150, 880, 980, 70);
    body = `
      <path fill-rule="evenodd" fill="url(#gYel)" d="${outer} ${win}"/>
      <path fill-rule="evenodd" fill="url(#pDots)" d="${outer} ${win}"/>
      <path d="${rr(84, 134, 912, 1012, 86)}" fill="none" stroke="#F5B400" stroke-width="6"/>
      <path d="${win}" fill="none" stroke="#fff" stroke-width="22"/>
      ${confettiG(30, 11, [[150, 30, 780, 70], [18, 230, 54, 820], [1008, 230, 54, 820], [100, 1395, 880, 30]])}
      <rect x="140" y="1175" width="800" height="140" rx="42" fill="#fff" stroke="#F5B400" stroke-width="8"/>
      ${starG(112, 1245, 24, P.coral, -10, "#fff", 8)}
      ${starG(968, 1245, 24, P.sky, 10, "#fff", 8)}
      ${capG(150, 150, 0.85, -16)}
      ${capG(930, 150, 0.85, 16)}
      ${starG(540, 72, 38, P.sun, 0, "#fff", 12)}
      ${starG(330, 58, 22, P.pink, -8, "#fff", 9)}
      ${starG(750, 58, 22, P.sky, 8, "#fff", 9)}
      ${sparkleG(420, 96, 12)}${sparkleG(660, 96, 12)}
    `;
  }

  // ---- Pelangi (pelangi, matahari, awan, bukit & rumah) ----
  if (key === "rainbow") {
    const win = rr(100, 340, 880, 780, 60);
    const arcs = ["#FF6B6B", "#FF9F43", "#FFD54F", "#6FD9A0", "#4DB8FF", "#A77BFF"].map((c, i) => {
      const r = 380 - i * 26;
      return `<path d="M${540 - r} 340A${r} ${r} 0 0 1 ${540 + r} 340" fill="none" stroke="${c}" stroke-width="26"/>`;
    }).join("");
    body = `
      <path fill-rule="evenodd" fill="url(#gSkyBg)" d="${outer} ${win}"/>
      <path fill-rule="evenodd" fill="url(#pDots)" d="${outer} ${win}"/>
      ${arcs}
      <path d="M0 1260Q200 1180 420 1230T800 1215T1080 1240V1440H0Z" fill="#8FD35F"/>
      <path d="M0 1335Q250 1275 520 1325T1080 1315V1440H0Z" fill="#5FB548"/>
      <path d="${win}" fill="none" stroke="#fff" stroke-width="22"/>
      ${sunFaceG(150, 160, 1.5)}
      ${cloudG(170, 350, 1.15)}
      ${cloudG(910, 350, 1.15)}
      ${cloudG(905, 130, 0.6)}
      ${starG(48, 560, 20, P.sun, 0, "#fff", 8)}
      ${starG(1032, 700, 20, P.pink, 0, "#fff", 8)}
      ${starG(48, 900, 18, P.coral, 0, "#fff", 8)}
      ${starG(1032, 980, 18, P.sun, 0, "#fff", 8)}
      ${sparkleG(60, 740, 12)}${sparkleG(1022, 520, 12)}
      ${houseG(905, 1172, 0.95)}
      ${heartG(990, 1070, 1.8, P.coral)}${heartG(1020, 1110, 1.1, P.pink)}
      ${daisyG(80, 1335, 3)}${daisyG(230, 1395, 2.6)}${daisyG(945, 1398, 2.8)}${daisyG(1010, 1300, 2.4)}
      <rect x="150" y="1230" width="780" height="130" rx="65" fill="#fff" stroke="#4DB8FF" stroke-width="6"/>
    `;
  }

  // ---- Bintang ----
  if (key === "star") {
    const win = rr(90, 150, 900, 1000, 90);
    body = `
      <path fill-rule="evenodd" fill="url(#gPinkBg)" d="${outer} ${win}"/>
      <path fill-rule="evenodd" fill="url(#pDots)" d="${outer} ${win}"/>
      <path d="${win}" fill="none" stroke="#fff" stroke-width="22"/>
      <path d="${rr(74, 134, 932, 1032, 106)}" fill="none" stroke="#C9B3FF" stroke-width="5"/>
      ${starG(120, 76, 34, P.sun, -10, "#fff", 12)}
      ${starG(300, 62, 22, P.pink, 8, "#fff", 9)}
      ${starG(540, 82, 44, P.sun, 0, "#fff", 12)}
      ${starG(780, 62, 22, P.sky, -8, "#fff", 9)}
      ${starG(960, 76, 34, P.pink, 10, "#fff", 12)}
      ${starG(44, 360, 24, P.sky, 0, "#fff", 8)}
      ${starG(44, 640, 20, P.sun, 0, "#fff", 8)}
      ${starG(44, 940, 26, P.pink, 0, "#fff", 8)}
      ${starG(1036, 300, 22, P.sun, 0, "#fff", 8)}
      ${starG(1036, 600, 26, P.mint, 0, "#fff", 8)}
      ${starG(1036, 920, 22, P.sky, 0, "#fff", 8)}
      ${sparkleG(210, 110, 12)}${sparkleG(870, 110, 12)}${sparkleG(60, 500, 10)}${sparkleG(1020, 780, 10)}
      <rect x="150" y="1215" width="780" height="150" rx="75" fill="#fff" stroke="#C9B3FF" stroke-width="6"/>
      ${starG(100, 1290, 26, P.sun, -12, "#fff", 9)}
      ${starG(980, 1290, 26, P.pink, 12, "#fff", 9)}
    `;
  }

  // ---- Asli (ringkas) ----
  if (key === "asli") {
    body = `
      <rect x="22" y="22" width="1036" height="1396" rx="56" fill="none" stroke="#fff" stroke-width="16"/>
      <rect x="34" y="34" width="1012" height="1372" rx="46" fill="none" stroke="#FFD54F" stroke-width="4"/>
      ${starG(80, 84, 26, P.sun, -10, "#fff", 9)}
      ${starG(1000, 84, 26, P.pink, 10, "#fff", 9)}
      ${sparkleG(150, 70, 10)}${sparkleG(930, 70, 10)}
      <rect x="150" y="1300" width="780" height="110" rx="55" fill="#fff" opacity=".94" stroke="#FFD54F" stroke-width="6"/>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440"><defs>${DEFS}</defs>${body}</svg>`;
}

// Tulisan pada setiap bingkai: wordmark TASKA MAMA FYDA + baris kecil
function frameTextConfig(key) {
  const eventLine = `${SCHOOL.event} ${SCHOOL.year}`.toUpperCase();
  const cfg = {
    convo: {
      wm: { size: 96, y: 1280 },
      sub: { text: eventLine, size: 36, y: 1385, fill: P.brown, spacing: 6 }
    },
    rainbow: {
      wm: { size: 96, y: 1330 },
      sub: { text: SCHOOL.motto, size: 46, y: 1410, colors: LETTER_COLORS, spacing: 3, strokeW: 12, stroke: "#fff" }
    },
    star: {
      wm: { size: 96, y: 1322 },
      sub: { text: `BINTANG KONVO ${SCHOOL.year}`, size: 34, y: 1408, fill: "#8B5FD6", spacing: 7 }
    },
    asli: {
      wm: { size: 70, y: 1381 }
    }
  };
  return cfg[key];
}

const frameImgCache = {};
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadFrameImage(key) {
  if (!frameImgCache[key]) {
    const src = CUSTOM_FRAMES[key] || ("data:image/svg+xml;charset=utf-8," + encodeURIComponent(frameSVG(key)));
    frameImgCache[key] = await loadImage(src);
  }
  return frameImgCache[key];
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load("400 90px 'Lilita One'"),
      document.fonts.load("700 80px Fredoka"),
      document.fonts.load("600 34px Fredoka")
    ]);
  } catch (e) { /* guna fon gantian */ }
}

// Teks berjarak huruf; boleh warna berbeza setiap huruf dan garis tepi
function drawSpaced(ctx, text, cx, y, spacing, opts = {}) {
  const chars = [...text];
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    if (opts.strokeW) {
      ctx.lineWidth = opts.strokeW;
      ctx.strokeStyle = opts.stroke || "#fff";
      ctx.strokeText(c, x, y);
    }
    ctx.fillStyle = opts.colors ? opts.colors[i % opts.colors.length] : opts.fill;
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
}

// TASKA (hijau) MAMA (merah) FYDA (biru) berlukisan seperti dalam logo
function drawWordmark(ctx, y, size) {
  const words = SCHOOL.name.toUpperCase().split(" ");
  const cols = [WM.g, WM.r, WM.b];

  ctx.save();
  ctx.font = `${size}px ${FONT_WORD}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";

  const gap = size * 0.3;
  const widths = words.map(w => ctx.measureText(w).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  let x = (OUTPUT_WIDTH - total) / 2;

  words.forEach((w, i) => {
    ctx.lineWidth = size * 0.17;
    ctx.strokeStyle = WM.outline;
    ctx.strokeText(w, x, y);
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillText(w, x, y);
    x += widths[i] + gap;
  });

  ctx.restore();
}

function drawFrameText(ctx, key) {
  const t = frameTextConfig(key);
  if (!t) return;

  if (t.wm) drawWordmark(ctx, t.wm.y, t.wm.size);

  if (t.sub) {
    ctx.save();
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    ctx.font = `${t.sub.colors ? 700 : 600} ${t.sub.size}px ${FONT}`;
    drawSpaced(ctx, t.sub.text, OUTPUT_WIDTH / 2, t.sub.y, t.sub.spacing, t.sub);
    ctx.restore();
  }
}

function paintFrame(ctx, key, img) {
  ctx.drawImage(img, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  if (!CUSTOM_FRAMES[key]) drawFrameText(ctx, key);
}

let frameToken = 0;
async function changeFrame(key) {
  currentFrame = key;
  document.querySelectorAll('.frame-options button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.frame === key);
  });

  const token = ++frameToken;
  await ensureFonts();
  let img;
  try {
    img = await loadFrameImage(key);
  } catch (err) {
    console.warn("Bingkai gagal dimuatkan:", err);
    return;
  }
  if (token !== frameToken || !frameCanvas) return;

  const ctx = frameCanvas.getContext('2d');
  ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  paintFrame(ctx, key, img);
}

// ==========================================
// 4. NAVIGASI HALAMAN
// ==========================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.body.dataset.page = id;
  window.scrollTo(0, 0);
}

function goToPage1() {
  showPage('page1');
  stopCamera();
}

function goToPage2() {
  showPage('page2');
  stopCamera();
  if (bgMusic && bgMusic.paused && !musicStopped) {
    bgMusic.play().catch(err => console.log("Auto-play disekat oleh pelayar web:", err));
  }
}

function goToPage3() {
  showPage('page3');
  initCamera();
}

function goToPage4() {
  showPage('page4');
  stopCamera();
  loadAlbum();
}

// ==========================================
// 5. MUZIK
// ==========================================
let musicStopped = false; // true kalau pengguna sendiri tekan henti

function syncMusicButton() {
  if (!musicBtn) return;
  musicBtn.classList.toggle('playing', !!bgMusic && !bgMusic.paused);
}

function toggleMusic() {
  if (!bgMusic) return;
  if (bgMusic.paused) {
    musicStopped = false;
    bgMusic.play().catch(err => {
      console.log("Lagu tak dapat dimainkan:", err.name, err.message);
      if (err.name === "NotAllowedError") {
        toast("Tekan butang lagu sekali lagi ya 🎵");
      } else {
        toast("Fail lagu tidak dapat dibuka. Semak nama dan lokasi fail 🎵", 4500);
      }
    });
  } else {
    musicStopped = true;
    bgMusic.pause();
  }
}

if (bgMusic) {
  bgMusic.addEventListener('play', syncMusicButton);
  bgMusic.addEventListener('pause', syncMusicButton);
  bgMusic.addEventListener('error', () => {
    console.log("Ralat audio. Fail:", bgMusic.currentSrc);
  });
}

// ==========================================
// 6. TOAST, FLASH & KONFETI
// ==========================================
let toastTimer = null;
function toast(msg, ms = 2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function doFlash() {
  const f = document.getElementById('flash');
  if (!f) return;
  f.classList.remove('go');
  void f.offsetWidth;
  f.classList.add('go');
}

function confettiBurst() {
  const cols = ["#FF6B6B", "#FF9F43", "#FFD54F", "#6FD9A0", "#5BC0EB", "#A77BFF", "#FF9EB5"];
  for (let i = 0; i < 40; i++) {
    const bit = document.createElement('div');
    bit.className = 'confetti';
    bit.style.left = Math.random() * 100 + 'vw';
    bit.style.background = cols[i % cols.length];
    bit.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
    bit.style.animationDelay = (Math.random() * 0.4) + 's';
    bit.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(bit);
    setTimeout(() => bit.remove(), 4200);
  }
}

// ==========================================
// 7. KAMERA
// ==========================================
async function initCamera() {
  stopCamera();
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: currentFacing },
        width: { ideal: 1280 },
        height: { ideal: 1920 }
      },
      audio: false
    });

    const settings = cameraStream.getVideoTracks()[0].getSettings();
    // Kamera depan (atau webcam laptop) dipaparkan seperti cermin
    isMirrored = settings.facingMode ? settings.facingMode === "user" : true;

    if (video) {
      video.classList.toggle('mirror', isMirrored);
      video.srcObject = cameraStream;
    }
  } catch (err) {
    console.error("Camera Access Error:", err);
    toast("Sila benarkan akses kamera untuk mengambil gambar 📷", 4500);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  if (video) video.srcObject = null;
}

function flipCamera() {
  currentFacing = currentFacing === "user" ? "environment" : "user";
  initCamera();
}

// ==========================================
// 8. TANGKAP GAMBAR & MUAT NAIK
// ==========================================
async function capturePhoto() {
  if (isUploading) return;
  if (!video || !video.srcObject || !video.videoWidth) {
    toast("Kamera belum bersedia, tunggu sekejap ya 📷");
    return;
  }

  doFlash();

  const ctx = canvas.getContext('2d');
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;

  // Potong video ke nisbah 3:4 (sama seperti preview object-fit: cover)
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const targetRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;
  let sx = 0, sy = 0, sw = vw, sh = vh;

  if (vw / vh > targetRatio) {
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }

  ctx.save();
  if (isMirrored) {
    ctx.translate(OUTPUT_WIDTH, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  ctx.restore();

  // Lukis bingkai (termasuk nama taska) di atas gambar
  try {
    await ensureFonts();
    const frameImg = await loadFrameImage(currentFrame);
    paintFrame(ctx, currentFrame, frameImg);
  } catch (err) {
    console.warn("Bingkai gagal dimuatkan, gambar disimpan tanpa bingkai.", err);
  }

  const imageBase64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  uploadPhoto(imageBase64);
}

if (snapBtn) snapBtn.addEventListener('click', capturePhoto);

function setUploading(state) {
  isUploading = state;
  if (snapBtn) {
    snapBtn.disabled = state;
    snapBtn.style.opacity = state ? "0.55" : "1";
  }
  if (uploadStatus) uploadStatus.textContent = state ? "Sedang menghantar gambar... ✨" : "";
}

async function uploadPhoto(base64Data) {
  setUploading(true);

  const name = studentNameInput && studentNameInput.value.trim() !== ""
    ? studentNameInput.value.trim()
    : DEFAULT_NAME;

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      // studentName & guestName dihantar kedua-duanya supaya serasi dengan Code.gs lama
      body: JSON.stringify({ image: base64Data, studentName: name, guestName: name })
    });

    const result = await response.json();

    if (result.status === "success") {
      goToPage4();
      toast("Hore! Gambar berjaya disimpan ke album konvo! 🎉");
      confettiBurst();
    } else {
      toast("Ralat muat naik: " + (result.message || "tidak diketahui"), 4500);
    }
  } catch (err) {
    console.error("Upload Error:", err);
    toast("Gagal menghantar gambar. Semak internet dan cuba lagi ya.", 4500);
  } finally {
    setUploading(false);
  }
}

// ==========================================
// 9. ALBUM DARI GOOGLE DRIVE
// ==========================================
function showAlbumMessage(text) {
  albumContainer.innerHTML = "";
  const box = document.createElement('div');
  box.className = 'empty-state';

  const art = document.createElement('div');
  art.className = 'mascot';
  art.innerHTML = mascotSVG();
  box.appendChild(art);

  const p = document.createElement('p');
  p.textContent = text;
  box.appendChild(p);

  albumContainer.appendChild(box);
}

async function loadAlbum() {
  if (!albumContainer) return;
  showAlbumMessage("Memuat turun gambar kenangan... 🎈");

  try {
    const response = await fetch(GAS_URL);
    const result = await response.json();

    if (result.status === "success" && result.files && result.files.length > 0) {
      albumContainer.innerHTML = "";

      result.files.forEach(file => {
        const card = document.createElement('figure');
        card.className = 'album-item';

        const img = document.createElement('img');
        img.src = file.thumb || file.url;
        img.alt = "Kenangan konvokesyen";
        img.loading = "lazy";
        // Kalau thumbnail gagal, guna URL asal sekali sahaja
        img.onerror = () => {
          img.onerror = null;
          if (file.url && img.src !== file.url) img.src = file.url;
        };

        const cap = document.createElement('figcaption');
        cap.textContent = file.studentName || file.guestName || DEFAULT_NAME;

        card.appendChild(img);
        card.appendChild(cap);
        albumContainer.appendChild(card);
      });
    } else {
      showAlbumMessage("Belum ada gambar lagi — jom ambil gambar sekarang!");
    }
  } catch (err) {
    console.error("Error loading album:", err);
    showAlbumMessage("Gagal memuat turun album. Sila tekan butang muat semula (↻).");
  }
}

// ==========================================
// 10. MULA
// ==========================================
buildArt();
changeFrame(currentFrame);