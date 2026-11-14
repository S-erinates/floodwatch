// State
let currentMode = "slider"; // 'slider' | 'map'
let currentLayer = "radar"; // 'radar' | 'water' | 'change'
let currentBand = "HH";     // 'HH' | 'HV'
let statsData = {
  region_name: "NISAR Target Basin",
  date1: "2026-10-05",
  date2: "2026-10-29",
  area_date1_km2: 14.8,
  area_date2_km2: 22.4,
  change_percent: 51.35,
  bounds: [[39.68, 36.92], [39.82, 37.15]]
};

// DOM References
const imgBefore = document.getElementById("img-before");
const imgAfter = document.getElementById("img-after");
const imgChange = document.getElementById("img-change");
const viewportSlider = document.getElementById("viewport-slider");
const viewportMap = document.getElementById("viewport-map");
const sliderContainer = document.getElementById("slider-container");
const singleContainer = document.getElementById("single-container");
const bandGroup = document.getElementById("band-group");
const viewTitle = document.getElementById("current-view-title");

// Leaflet Map Instance
let map = null;
let mapOverlay = null;

// High-Detail Radar SVG Placeholder Generator (Fallback before Doğaca's PNGs arrive)
function createPlaceholderSVG(title, subtitle, isAfter, mode) {
  const bg = mode === "water" ? "#040812" : mode === "change" ? "#090f1d" : "#111827";
  const waterColor = mode === "water" ? "#38bdf8" : mode === "change" ? "#f43f5e" : "#030712";
  const rx = isAfter ? 210 : 120;
  const ry = isAfter ? 145 : 85;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
    <rect width="100%" height="100%" fill="${bg}"/>
    <g stroke="#1e293b" stroke-width="1">
      <line x1="0" y1="135" x2="960" y2="135"/><line x1="0" y1="270" x2="960" y2="270"/><line x1="0" y1="405" x2="960" y2="405"/>
      <line x1="240" y1="0" x2="240" y2="540"/><line x1="480" y1="0" x2="480" y2="540"/><line x1="720" y1="0" x2="720" y2="540"/>
    </g>
    <ellipse cx="480" cy="280" rx="${rx + 45}" ry="${ry + 30}" fill="${mode === 'change' ? '#38bdf8' : waterColor}" opacity="0.28"/>
    <ellipse cx="480" cy="280" rx="${rx}" ry="${ry}" fill="${waterColor}" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="32" y="46" fill="#38bdf8" font-family="monospace" font-size="22" font-weight="bold">${title}</text>
    <text x="32" y="78" fill="#94a3b8" font-family="monospace" font-size="15">FILE: ${subtitle} • NISAR L-BAND GCOV SIMULATED FEED</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function setImageWithFallback(imgElement, filePath, title, isAfter, mode) {
  imgElement.onerror = function () {
    this.onerror = null;
    this.src = createPlaceholderSVG(title, filePath, isAfter, mode);
  };
  imgElement.src = filePath;
}

// Update Active Layer & Band Images
function updateViewer() {
  let activeMapImage = `data/date2_${currentBand}.png`;
  let fallbackMode = "radar";

  if (currentLayer === "radar") {
    sliderContainer.classList.remove("hidden");
    singleContainer.classList.add("hidden");
    bandGroup.classList.remove("disabled-group");

    const file1 = `data/date1_${currentBand}.png`;
    const file2 = `data/date2_${currentBand}.png`;
    setImageWithFallback(imgBefore, file1, `DATE 1 (${statsData.date1}) — ${currentBand} BAND`, false, "radar");
    setImageWithFallback(imgAfter, file2, `DATE 2 (${statsData.date2}) — ${currentBand} BAND`, true, "radar");
    viewTitle.textContent = `ACTIVE FEED: RADAR BACKSCATTER (${currentBand} BAND) — SPLIT COMPARISON`;
    activeMapImage = file2;
    fallbackMode = "radar";

  } else if (currentLayer === "water") {
    sliderContainer.classList.remove("hidden");
    singleContainer.classList.add("hidden");
    bandGroup.classList.add("disabled-group");

    const file1 = "data/water_date1.png";
    const file2 = "data/water_date2.png";
    setImageWithFallback(imgBefore, file1, `DATE 1 WATER MASK (${statsData.date1})`, false, "water");
    setImageWithFallback(imgAfter, file2, `DATE 2 WATER MASK (${statsData.date2})`, true, "water");
    viewTitle.textContent = "ACTIVE FEED: BINARY WATER MASK (OTSU THRESHOLD) — SPLIT COMPARISON";
    activeMapImage = file2;
    fallbackMode = "water";

  } else if (currentLayer === "change") {
    sliderContainer.classList.add("hidden");
    singleContainer.classList.remove("hidden");
    bandGroup.classList.add("disabled-group");

    const fileChange = "data/change_map.png";
    setImageWithFallback(imgChange, fileChange, "SURFACE WATER ANOMALY & CHANGE MAP", true, "change");
    viewTitle.textContent = "ACTIVE FEED: MULTI-TEMPORAL INUNDATION CHANGE MAP";
    activeMapImage = fileChange;
    fallbackMode = "change";
  }

  if (currentMode === "map") {
    updateLeafletOverlay(activeMapImage, fallbackMode);
  }
}

// Initialize & Update Leaflet Geo-Map with `bounds`
function initOrUpdateMap() {
  const b = statsData.bounds || [[39.68, 36.92], [39.82, 37.15]];
  if (!map) {
    map = L.map("leaflet-map").fitBounds(b);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and NASA NISAR"
    }).addTo(map);
  } else {
    map.invalidateSize();
    map.fitBounds(b);
  }
  updateViewer();
}

function updateLeafletOverlay(imagePath, fallbackMode) {
  if (!map) return;
  const b = statsData.bounds || [[39.68, 36.92], [39.82, 37.15]];
  const opacity = parseFloat(document.getElementById("map-opacity").value || "0.8");

  const testImg = new Image();
  testImg.onload = () => {
    if (mapOverlay) map.removeLayer(mapOverlay);
    mapOverlay = L.imageOverlay(imagePath, b, { opacity }).addTo(map);
  };
  testImg.onerror = () => {
    const svgUrl = createPlaceholderSVG("GEOREFERENCED SAR OVERLAY", imagePath, true, fallbackMode);
    if (mapOverlay) map.removeLayer(mapOverlay);
    mapOverlay = L.imageOverlay(svgUrl, b, { opacity }).addTo(map);
  };
  testImg.src = imagePath;
}

// Smooth Counter Animation
function animateValue(el, start, end, duration, suffix = "", prefix = "") {
  const startTime = performance.now();
  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const val = (start + (end - start) * progress).toFixed(2);
    el.textContent = `${prefix}${val}${suffix}`;
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Load stats.json
async function loadStats() {
  try {
    const response = await fetch("data/stats.json", { cache: "no-store" });
    if (response.ok) {
      statsData = await response.json();
    }
  } catch (e) {
    console.warn("Using default telemetry stats:", e);
  }

  const area1 = parseFloat(statsData.area_date1_km2 ?? statsData.water_area_date1_km2 ?? 14.8);
  const area2 = parseFloat(statsData.area_date2_km2 ?? statsData.water_area_date2_km2 ?? 22.4);
  const pct = parseFloat(statsData.change_percent ?? statsData.percent_change ?? 51.35);
  const diff = (area2 - area1).toFixed(2);

  document.getElementById("stat-region").textContent = statsData.region_name || "NISAR Target Basin";
  document.getElementById("label-stat-date1").textContent = `Baseline (${statsData.date1 || "Date 1"})`;
  document.getElementById("label-stat-date2").textContent = `Post-Event (${statsData.date2 || "Date 2"})`;

  animateValue(document.getElementById("stat-area1"), 0, area1, 900, " km²");
  animateValue(document.getElementById("stat-area2"), 0, area2, 900, " km²");
  animateValue(document.getElementById("stat-change"), 0, pct, 1000, "%", pct > 0 ? "+" : "");

  document.getElementById("stat-diff-km2").textContent = `Net Delta: ${diff > 0 ? "+" : ""}${diff} km²`;
  document.getElementById("label-date1").textContent = `BEFORE: ${statsData.date1} (${area1} km²)`;
  document.getElementById("label-date2").textContent = `AFTER: ${statsData.date2} (${area2} km²)`;

  if (statsData.bounds) {
    document.getElementById("stat-bounds").textContent = `Bounds: ${JSON.stringify(statsData.bounds)}`;
  }

  // Dynamic Progress Bars & Severity Badge
  const maxArea = Math.max(area1, area2, 1) * 1.15;
  document.getElementById("bar-area1").style.width = `${Math.min(100, (area1 / maxArea) * 100)}%`;
  document.getElementById("bar-area2").style.width = `${Math.min(100, (area2 / maxArea) * 100)}%`;

  const badge = document.getElementById("severity-badge");
  if (pct >= 15) {
    badge.textContent = `⚠️ ALERT: +${pct}% INUNDATION EXPANSION`;
    badge.style.color = "#fda4af";
  } else if (pct <= -10) {
    badge.textContent = `📉 DROUGHT / DRAW-DOWN: ${pct}%`;
    badge.style.color = "#fde68a";
  } else {
    badge.textContent = `✅ STABLE HYDROLOGY (${pct}%)`;
    badge.style.color = "#6ee7b7";
  }
}

// Interactive Otsu / dB Threshold Simulator
document.getElementById("threshold-slider").addEventListener("input", (e) => {
  const db = parseFloat(e.target.value);
  document.getElementById("threshold-readout").innerHTML = `Backscatter Cutoff: <strong>${db.toFixed(1)} dB</strong>`;
  
  // Visual brightness/contrast response + simulated sensitivity readout
  const deltaFromOptimal = db - (-19.0);
  const baseArea2 = parseFloat(statsData.area_date2_km2 ?? 22.4);
  const simArea = Math.max(0.5, baseArea2 * (1 + deltaFromOptimal * 0.045)).toFixed(2);
  document.getElementById("sim-est-area").textContent = `Simulated Date-2 Water Mask: ~${simArea} km²`;

  const contrast = 100 + deltaFromOptimal * 4;
  const brightness = 100 - deltaFromOptimal * 2.5;
  imgBefore.style.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
  imgAfter.style.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
});

// Live Telemetry Crosshair Inspector on Image Hover
function handleStageHover(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const relX = (e.clientX - rect.left) / rect.width;
  const relY = (e.clientY - rect.top) / rect.height;

  const b = statsData.bounds || [[39.68, 36.92], [39.82, 37.15]];
  const lat = (b[1][0] - relY * (b[1][0] - b[0][0])).toFixed(4);
  const lon = (b[0][1] + relX * (b[1][1] - b[0][1])).toFixed(4);

  // Distance from center simulates water basin low dB vs land high dB
  const distFromCenter = Math.hypot(relX - 0.5, relY - 0.5);
  const isWaterZone = distFromCenter < 0.24;
  const estDb = isWaterZone
    ? (-22.8 + distFromCenter * 14).toFixed(1)
    : (-14.2 + distFromCenter * 12).toFixed(1);

  document.getElementById("cur-coords").textContent = `${lat}°N, ${lon}°E`;
  document.getElementById("cur-db").textContent = `${estDb} dB`;

  const clsEl = document.getElementById("cur-class");
  if (isWaterZone) {
    clsEl.textContent = "SPECULAR WATER";
    clsEl.className = "tag-water";
  } else {
    clsEl.textContent = "LAND / CANOPY";
    clsEl.className = "tag-land";
  }
}

document.getElementById("interactive-stage").addEventListener("mousemove", handleStageHover);
document.getElementById("single-stage").addEventListener("mousemove", handleStageHover);

// Mode Switcher (Slider vs Geo-Map)
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.getAttribute("data-mode");

    if (currentMode === "map") {
      viewportSlider.classList.add("hidden");
      viewportMap.classList.remove("hidden");
      initOrUpdateMap();
    } else {
      viewportMap.classList.add("hidden");
      viewportSlider.classList.remove("hidden");
    }
  });
});

// Layer & Band Buttons
document.querySelectorAll(".layer-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".layer-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentLayer = btn.getAttribute("data-layer");
    updateViewer();
  });
});

document.querySelectorAll(".band-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".band-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentBand = btn.getAttribute("data-band");
    updateViewer();
  });
});

// Map Opacity Slider
document.getElementById("map-opacity").addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById("map-opacity-val").textContent = `${Math.round(val * 100)}%`;
  if (mapOverlay) mapOverlay.setOpacity(val);
});

// Export Briefing Button
document.getElementById("btn-export").addEventListener("click", () => {
  window.print();
});

// Boot
loadStats();
updateViewer();
