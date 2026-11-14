// FloodWatch Mission Control - script.js
// Static front-end only. Works with GitHub Pages and data/stats.json.

let currentMode = "slider";
let currentLayer = "radar";
let currentBand = "HH";
let statsData = {
  region: "Inner Niger Delta, Mali",
  before_date: "2026-07-17",
  after_date: "2026-10-21",
  water_before_km2: 1035.2,
  water_after_km2: 3129.9,
  water_gain_km2: 2360.5,
  water_loss_km2: 265.8,
  water_change_pct: 202.3,
  hh_threshold_db: -19,
  hv_threshold_db: -24,
  bounds: [
    [14.493970156609581, -5.00946245265618],
    [15.507051854135497, -3.995937159485534]
  ]
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const imgBefore = $("#img-before");
const imgAfter = $("#img-after");
const imgChange = $("#img-change");
const viewportSlider = $("#viewport-slider");
const viewportMap = $("#viewport-map");
const sliderContainer = $("#slider-container");
const singleContainer = $("#single-container");
const bandGroup = $("#band-group");
const viewTitle = $("#current-view-title");

let map = null;
let mapOverlay = null;

function normalizeBounds(raw) {
  if (Array.isArray(raw) && raw.length === 2) return raw;
  if (raw && [raw.south, raw.west, raw.north, raw.east].every(Number.isFinite)) {
    return [[raw.south, raw.west], [raw.north, raw.east]];
  }
  return [[14.493970156609581, -5.00946245265618], [15.507051854135497, -3.995937159485534]];
}

function num(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

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
    <ellipse cx="480" cy="280" rx="${rx + 45}" ry="${ry + 30}" fill="${mode === "change" ? "#38bdf8" : waterColor}" opacity="0.28"/>
    <ellipse cx="480" cy="280" rx="${rx}" ry="${ry}" fill="${waterColor}" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="32" y="46" fill="#38bdf8" font-family="monospace" font-size="22" font-weight="bold">${title}</text>
    <text x="32" y="78" fill="#94a3b8" font-family="monospace" font-size="15">DEMO PLACEHOLDER • ${subtitle}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function setImageWithFallback(element, path, title, isAfter, mode) {
  element.onerror = function () {
    this.onerror = null;
    this.src = createPlaceholderSVG(title, path, isAfter, mode);
  };
  element.src = path;
}

function activeMapPath() {
  if (currentLayer === "water") return "data/water_after.png";
  if (currentLayer === "change") return "data/change_map.png";
  return `data/after_${currentBand}.png`;
}

function updateViewer() {
  let fallbackMode = currentLayer;
  if (currentLayer !== "radar") {
    imgBefore.style.filter = "none";
    imgAfter.style.filter = "none";
  }

  if (currentLayer === "radar") {
    sliderContainer.classList.remove("hidden");
    singleContainer.classList.add("hidden");
    bandGroup.classList.remove("disabled-group");

    setImageWithFallback(
      imgBefore,
      `data/before_${currentBand}.png`,
      `BEFORE (${statsData.before_date}) - ${currentBand}`,
      false,
      "radar"
    );
    setImageWithFallback(
      imgAfter,
      `data/after_${currentBand}.png`,
      `AFTER (${statsData.after_date}) - ${currentBand}`,
      true,
      "radar"
    );
    viewTitle.textContent = `ACTIVE FEED: RADAR BACKSCATTER (${currentBand} BAND)`;
  } else if (currentLayer === "water") {
    sliderContainer.classList.remove("hidden");
    singleContainer.classList.add("hidden");
    bandGroup.classList.add("disabled-group");

    setImageWithFallback(imgBefore, "data/water_before.png", "BEFORE WATER MASK", false, "water");
    setImageWithFallback(imgAfter, "data/water_after.png", "AFTER WATER MASK", true, "water");
    viewTitle.textContent = "ACTIVE FEED: OPEN-WATER MASK COMPARISON";
  } else {
    sliderContainer.classList.add("hidden");
    singleContainer.classList.remove("hidden");
    bandGroup.classList.add("disabled-group");

    setImageWithFallback(imgChange, "data/change_map.png", "INNER NIGER DELTA WATER CHANGE", true, "change");
    viewTitle.textContent = "ACTIVE FEED: MULTI-TEMPORAL WATER CHANGE MAP";
  }

  if (currentMode === "map") {
    updateLeafletOverlay(activeMapPath(), fallbackMode);
  }
}
function initOrUpdateMap() {
  if (typeof L === "undefined") {
    alert("Harita kutuphanesi yuklenemedi. Internet baglantisini kontrol edin.");
    return;
  }
  const bounds = normalizeBounds(statsData.bounds);
  if (!map) {
    map = L.map("leaflet-map", { scrollWheelZoom: true }).fitBounds(bounds);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
      maxZoom: 19
    }).addTo(map);
  } else {
    map.fitBounds(bounds);
  }
  setTimeout(() => map.invalidateSize(), 120);
  updateLeafletOverlay(activeMapPath(), currentLayer);
}

function updateLeafletOverlay(path, mode) {
  if (!map) return;
  const bounds = normalizeBounds(statsData.bounds);
  const opacity = num($("#map-opacity")?.value, 0.8);
  const test = new Image();
  const place = (url) => {
    if (mapOverlay) map.removeLayer(mapOverlay);
    mapOverlay = L.imageOverlay(url, bounds, { opacity, interactive: false }).addTo(map);
  };
  test.onload = () => place(path);
  test.onerror = () => place(createPlaceholderSVG("GEOREFERENCED DEMO OVERLAY", path, true, mode));
  test.src = path;
}

function animateValue(element, end, duration, suffix = "", prefix = "") {
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    element.textContent = `${prefix}${(end * eased).toFixed(2)}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function loadStats() {
  try {
    const response = await fetch("data/stats.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    statsData = { ...statsData, ...(await response.json()) };
  } catch (error) {
    console.warn("stats.json could not be loaded; fallback values are in use.", error);
  }

  const areaBefore = num(statsData.water_before_km2);
  const areaAfter = num(statsData.water_after_km2);
  const changePercent = num(
    statsData.water_change_pct,
    areaBefore ? ((areaAfter - areaBefore) / areaBefore) * 100 : 0
  );
  const waterGain = num(statsData.water_gain_km2);
  const waterLoss = num(statsData.water_loss_km2);
  const region = statsData.region || "Inner Niger Delta, Mali";
  const beforeDate = statsData.before_date || "2026-07-17";
  const afterDate = statsData.after_date || "2026-10-21";
  const bounds = normalizeBounds(statsData.bounds);

  $("#stat-region").textContent = region;
  $("#stat-bounds").textContent =
    `Bounds: ${bounds[0][0].toFixed(3)}, ${bounds[0][1].toFixed(3)} -> ` +
    `${bounds[1][0].toFixed(3)}, ${bounds[1][1].toFixed(3)}`;
  $("#label-stat-date1").textContent = `Baseline (${beforeDate})`;
  $("#label-stat-date2").textContent = `After (${afterDate})`;
  $("#label-date1").textContent = `BEFORE: ${beforeDate} (${areaBefore.toFixed(1)} km²)`;
  $("#label-date2").textContent = `AFTER: ${afterDate} (${areaAfter.toFixed(1)} km²)`;
  $("#stat-diff-km2").textContent =
    `Gain: +${waterGain.toFixed(1)} km² · Loss: -${waterLoss.toFixed(1)} km²`;

  animateValue($("#stat-area1"), areaBefore, 900, " km²");
  animateValue($("#stat-area2"), areaAfter, 900, " km²");
  animateValue($("#stat-change"), changePercent, 1000, "%", changePercent > 0 ? "+" : "");

  const maxArea = Math.max(areaBefore, areaAfter, 1) * 1.1;
  $("#bar-area1").style.width = `${Math.min(100, areaBefore / maxArea * 100)}%`;
  $("#bar-area2").style.width = `${Math.min(100, areaAfter / maxArea * 100)}%`;

  const badge = $("#severity-badge");
  if (changePercent > 0) {
    badge.textContent = `OBSERVED WATER EXPANSION: +${changePercent.toFixed(1)}%`;
  } else if (changePercent < 0) {
    badge.textContent = `OBSERVED WATER RECESSION: ${changePercent.toFixed(1)}%`;
  } else {
    badge.textContent = "LIMITED NET WATER CHANGE";
  }

  synchronizeThresholdControls();
  updateViewer();
}
function handleStageHover(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  const b = normalizeBounds(statsData.bounds);
  const lat = b[1][0] - y * (b[1][0] - b[0][0]);
  const lon = b[0][1] + x * (b[1][1] - b[0][1]);
  $("#cur-coords").textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  // PNG files do not contain quantitative dB values. Avoid fabricating telemetry.
  $("#cur-db").textContent = "N/A (PNG)";
  $("#cur-class").textContent = "VISUAL INSPECTION";
  $("#cur-class").className = "tag-neutral";
}

$$('.mode-btn').forEach(button => button.addEventListener('click', () => {
  $$('.mode-btn').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
  currentMode = button.dataset.mode;
  viewportSlider.classList.toggle('hidden', currentMode !== 'slider');
  viewportMap.classList.toggle('hidden', currentMode !== 'map');
  if (currentMode === 'map') initOrUpdateMap();
}));

$$('.layer-btn').forEach(button => button.addEventListener('click', () => {
  $$('.layer-btn').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
  currentLayer = button.dataset.layer;
  updateViewer();
}));

$$('.band-btn').forEach(button => button.addEventListener('click', () => {
  $$('.band-btn').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
  currentBand = button.dataset.band;
  updateViewer();
}));

$("#map-opacity")?.addEventListener("input", event => {
  const value = Number(event.target.value);
  $("#map-opacity-val").textContent = `${Math.round(value * 100)}%`;
  mapOverlay?.setOpacity(value);
});

function synchronizeThresholdControls() {
  const hh = num(statsData.hh_threshold_db, -19);
  const hv = num(statsData.hv_threshold_db, -24);
  const slider = document.getElementById("threshold-slider");
  const value = document.getElementById("threshold-value");
  const information = document.getElementById("sim-est-area");

  if (slider) slider.value = hh.toString();
  if (value) value.textContent = `${hh.toFixed(1)} dB`;
  if (information) {
    information.textContent =
      `Analysis rule: HH < ${hh.toFixed(1)} dB · HV < ${hv.toFixed(1)} dB`;
  }
}

const thresholdSlider = document.getElementById("threshold-slider");
if (thresholdSlider) {
  thresholdSlider.addEventListener("input", (event) => {
    const selectedHHThreshold = Number(event.target.value);
    const actualHVThreshold = num(statsData.hv_threshold_db, -24);
    const actualHHThreshold = num(statsData.hh_threshold_db, -19);
    const thresholdValue = document.getElementById("threshold-value");
    const simulatorInformation = document.getElementById("sim-est-area");

    if (thresholdValue) {
      thresholdValue.textContent = `${selectedHHThreshold.toFixed(1)} dB`;
    }
    if (simulatorInformation) {
      simulatorInformation.textContent =
        `Preview: HH < ${selectedHHThreshold.toFixed(1)} dB · ` +
        `Fixed HV rule: HV < ${actualHVThreshold.toFixed(1)} dB · ` +
        `Visual preview only; valid km² values come from Python analysis.`;
    }

    // Visual preview only. This does not reclassify GCOV data or calculate area.
    const difference = selectedHHThreshold - actualHHThreshold;
    const contrast = Math.max(75, Math.min(135, 100 + difference * 3));
    const brightness = Math.max(75, Math.min(125, 100 - difference * 2));

    if (imgBefore && currentLayer === "radar") {
      imgBefore.style.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
    }
    if (imgAfter && currentLayer === "radar") {
      imgAfter.style.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
    }
  });
}
$("#interactive-stage")?.addEventListener("mousemove", handleStageHover);
$("#single-stage")?.addEventListener("mousemove", handleStageHover);
$("#btn-export")?.addEventListener("click", () => window.print());

loadStats();
updateViewer();
