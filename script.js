// FloodWatch Mission Control - script.js
// Static front-end only. Works with GitHub Pages and data/stats.json.

const DEFAULT_BOUNDS = [
  [14.493970156609581, -5.00946245265618],
  [15.507051854135497, -3.995937159485534]
];

const DEFAULT_STATS = {
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
  bounds: DEFAULT_BOUNDS
};

let currentMode = "slider";
let currentLayer = "radar";
let currentBand = "HH";
let statsData = { ...DEFAULT_STATS };

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
let overlayRequestId = 0; // eski (geç yüklenen) overlay isteklerini yok saymak için

// ---------- Yardımcılar ----------

// Eleman yoksa hata fırlatmadan metin ata
function setText(selector, text) {
  const el = typeof selector === "string" ? $(selector) : selector;
  if (el) el.textContent = text;
}

// null, undefined ve boş string'i atlar (Number(null) === 0 ve Number("") === 0 hatasını önler)
function num(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function isValidPair(pair) {
  return Array.isArray(pair) && pair.length === 2 && pair.every(v => Number.isFinite(Number(v)));
}

// Her zaman [[south, west], [north, east]] sırasında, sayısal değerlerle döner
function normalizeBounds(raw) {
  let a, b;
  if (Array.isArray(raw) && raw.length === 2 && isValidPair(raw[0]) && isValidPair(raw[1])) {
    a = raw[0].map(Number);
    b = raw[1].map(Number);
  } else if (raw && [raw.south, raw.west, raw.north, raw.east].every(v => Number.isFinite(Number(v)))) {
    a = [Number(raw.south), Number(raw.west)];
    b = [Number(raw.north), Number(raw.east)];
  } else {
    return DEFAULT_BOUNDS;
  }
  return [
    [Math.min(a[0], b[0]), Math.min(a[1], b[1])],
    [Math.max(a[0], b[0]), Math.max(a[1], b[1])]
  ];
}

function escapeXML(text) {
  return String(text).replace(/[<>&'"]/g, c => (
    { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]
  ));
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
    <text x="32" y="46" fill="#38bdf8" font-family="monospace" font-size="22" font-weight="bold">${escapeXML(title)}</text>
    <text x="32" y="78" fill="#94a3b8" font-family="monospace" font-size="15">DEMO PLACEHOLDER • ${escapeXML(subtitle)}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function setImageWithFallback(element, path, title, isAfter, mode) {
  if (!element) return;
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

// ---------- Eşik önizleme filtresi ----------

function applyThresholdPreviewFilter() {
  const slider = $("#threshold-slider");
  let filter = "none";
  if (currentLayer === "radar" && slider) {
    const difference = Number(slider.value) - num(statsData.hh_threshold_db, -19);
    if (Number.isFinite(difference) && difference !== 0) {
      const contrast = Math.max(75, Math.min(135, 100 + difference * 3));
      const brightness = Math.max(75, Math.min(125, 100 - difference * 2));
      filter = `contrast(${contrast}%) brightness(${brightness}%)`;
    }
  }
  if (imgBefore) imgBefore.style.filter = filter;
  if (imgAfter) imgAfter.style.filter = filter;
}

// ---------- Görüntüleyici ----------

function updateViewer() {
  if (currentLayer === "radar") {
    sliderContainer?.classList.remove("hidden");
    singleContainer?.classList.add("hidden");
    bandGroup?.classList.remove("disabled-group");

    setImageWithFallback(imgBefore, `data/before_${currentBand}.png`,
      `BEFORE (${statsData.before_date}) - ${currentBand}`, false, "radar");
    setImageWithFallback(imgAfter, `data/after_${currentBand}.png`,
      `AFTER (${statsData.after_date}) - ${currentBand}`, true, "radar");
    setText(viewTitle, `ACTIVE FEED: RADAR BACKSCATTER (${currentBand} BAND)`);
  } else if (currentLayer === "water") {
    sliderContainer?.classList.remove("hidden");
    singleContainer?.classList.add("hidden");
    bandGroup?.classList.add("disabled-group");

    setImageWithFallback(imgBefore, "data/water_before.png", "BEFORE WATER MASK", false, "water");
    setImageWithFallback(imgAfter, "data/water_after.png", "AFTER WATER MASK", true, "water");
    setText(viewTitle, "ACTIVE FEED: OPEN-WATER MASK COMPARISON");
  } else {
    sliderContainer?.classList.add("hidden");
    singleContainer?.classList.remove("hidden");
    bandGroup?.classList.add("disabled-group");

    setImageWithFallback(imgChange, "data/change_map.png", "INNER NIGER DELTA WATER CHANGE", true, "change");
    setText(viewTitle, "ACTIVE FEED: MULTI-TEMPORAL WATER CHANGE MAP");
  }

  // Radar'a geri dönüldüğünde slider değeri korunur; diğer katmanlarda filtre kaldırılır
  applyThresholdPreviewFilter();

  if (currentMode === "map") {
    updateLeafletOverlay(activeMapPath(), currentLayer);
  }
}

// ---------- Harita ----------

function initOrUpdateMap() {
  if (typeof L === "undefined") {
    alert("Harita kütüphanesi yüklenemedi. İnternet bağlantısını kontrol edin.");
    return false;
  }
  const bounds = normalizeBounds(statsData.bounds);
  if (!map) {
    map = L.map("leaflet-map", { scrollWheelZoom: true });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
      maxZoom: 19
    }).addTo(map);
    map.fitBounds(bounds); // ilk görünüm (setView olmadan Leaflet hata verir)
  }
  // Kap gizliyken boyut 0 olabilir: önce boyutu güncelle, sonra sınırlara sığdır
  setTimeout(() => {
    map.invalidateSize();
    map.fitBounds(bounds);
  }, 120);
  updateLeafletOverlay(activeMapPath(), currentLayer);
  return true;
}

function updateLeafletOverlay(path, mode) {
  if (!map) return;
  const requestId = ++overlayRequestId;
  const bounds = normalizeBounds(statsData.bounds);
  const place = (url) => {
    if (requestId !== overlayRequestId) return; // daha yeni bir istek var, bunu at
    const opacity = num($("#map-opacity")?.value, 0.8);
    if (mapOverlay) map.removeLayer(mapOverlay);
    mapOverlay = L.imageOverlay(url, bounds, { opacity, interactive: false }).addTo(map);
  };
  const test = new Image();
  test.onload = () => place(path);
  test.onerror = () => place(createPlaceholderSVG("GEOREFERENCED DEMO OVERLAY", path, true, mode));
  test.src = path;
}

// ---------- İstatistikler ----------

function animateValue(element, end, duration, suffix = "", prefix = "") {
  if (!element) return;
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
    const json = await response.json();
    // JSON'daki null/undefined alanlar varsayılanları ezmesin
    const clean = Object.fromEntries(
      Object.entries(json || {}).filter(([, v]) => v !== null && v !== undefined)
    );
    statsData = { ...DEFAULT_STATS, ...clean };
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
  const region = statsData.region || DEFAULT_STATS.region;
  const beforeDate = statsData.before_date || DEFAULT_STATS.before_date;
  const afterDate = statsData.after_date || DEFAULT_STATS.after_date;
  const bounds = normalizeBounds(statsData.bounds);

  setText("#stat-region", region);
  setText("#stat-bounds",
    `Bounds: ${bounds[0][0].toFixed(3)}, ${bounds[0][1].toFixed(3)} -> ` +
    `${bounds[1][0].toFixed(3)}, ${bounds[1][1].toFixed(3)}`);
  setText("#label-stat-date1", `Baseline (${beforeDate})`);
  setText("#label-stat-date2", `After (${afterDate})`);
  setText("#label-date1", `BEFORE: ${beforeDate} (${areaBefore.toFixed(1)} km²)`);
  setText("#label-date2", `AFTER: ${afterDate} (${areaAfter.toFixed(1)} km²)`);
  setText("#stat-diff-km2",
    `Gain: +${waterGain.toFixed(1)} km² · Loss: -${waterLoss.toFixed(1)} km²`);

  animateValue($("#stat-area1"), areaBefore, 900, " km²");
  animateValue($("#stat-area2"), areaAfter, 900, " km²");
  animateValue($("#stat-change"), changePercent, 1000, "%", changePercent > 0 ? "+" : "");

  // Analiz kapsamı (stats.json'da varsa göster)
  const validArea = num(statsData.valid_area_km2);
  const excludedArea = num(statsData.excluded_artifact_km2);
  const pixelSize = Array.isArray(statsData.pixel_size_m) ? num(statsData.pixel_size_m[0]) : 0;
  const coverage = [];
  if (validArea > 0) coverage.push(`Valid area: ${validArea.toFixed(1)} km²`);
  if (pixelSize > 0) coverage.push(`${pixelSize} m pixels`);
  if (excludedArea > 0) coverage.push(`Excluded artifacts: ${excludedArea.toFixed(1)} km²`);
  setText("#stat-coverage", coverage.join(" · "));

  // HH > 3 dB değişimi: sınıflandırmadan bağımsız bir kontrol
  const hhDrop = num(statsData.hh_drop_gt3db_km2);
  const hhRise = num(statsData.hh_rise_gt3db_km2);
  if (hhDrop > 0 || hhRise > 0) {
    setText("#stat-hh-check", `HH >3 dB: drop ${hhDrop.toFixed(1)} km² · rise ${hhRise.toFixed(1)} km²`);
  }

  // Çubuklar: geçerli alan biliniyorsa, suyun geçerli alana oranı
  const barBase = validArea > 0 ? validArea : Math.max(areaBefore, areaAfter, 1) * 1.1;
  const bar1 = $("#bar-area1");
  const bar2 = $("#bar-area2");
  const pct1 = Math.min(100, areaBefore / barBase * 100);
  const pct2 = Math.min(100, areaAfter / barBase * 100);
  if (bar1) { bar1.style.width = `${pct1}%`; bar1.title = `${pct1.toFixed(1)}% of valid area`; }
  if (bar2) { bar2.style.width = `${pct2}%`; bar2.title = `${pct2.toFixed(1)}% of valid area`; }

  if (changePercent > 0) {
    setText("#severity-badge", `OBSERVED WATER EXPANSION: +${changePercent.toFixed(1)}%`);
  } else if (changePercent < 0) {
    setText("#severity-badge", `OBSERVED WATER RECESSION: ${changePercent.toFixed(1)}%`);
  } else {
    setText("#severity-badge", "LIMITED NET WATER CHANGE");
  }

  synchronizeThresholdControls();
  renderTimeSeries();
  updateViewer();
}

// ---------- Zaman serisi grafiği (stats.json → time_series) ----------

function getTimeSeries() {
  if (!Array.isArray(statsData.time_series)) return [];
  return statsData.time_series
    .map(p => ({ date: String(p?.date ?? ""), km2: num(p?.water_km2), t: Date.parse(p?.date) }))
    .filter(p => Number.isFinite(p.t) && p.km2 > 0)
    .sort((a, b) => a.t - b.t);
}

function formatKm2(value) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function niceStep(max) {
  const raw = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / pow;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * pow;
}

function renderTimeSeries() {
  const card = $("#timeseries-card");
  const chart = $("#ts-chart");
  const series = getTimeSeries();
  if (!card || !chart) return;
  if (series.length < 2) { card.classList.add("hidden"); return; }
  card.classList.remove("hidden");

  const first = series[0];
  const last = series[series.length - 1];
  const peak = series.reduce((a, b) => (b.km2 > a.km2 ? b : a));
  setText("#ts-summary",
    `${series.length} dates · ${formatKm2(first.km2)} → ${formatKm2(last.km2)} km² · peak ${formatDate(peak.date)}`);
  setText("#ts-note", statsData.time_series_note ||
    "Main before/after comparison uses the first and last dates. Values are approximate estimates from the Python pipeline.");

  // Veri tablosu (erişilebilirlik + yazdırma)
  const body = $("#ts-table-body");
  if (body) {
    body.innerHTML = "";
    for (const p of series) {
      const row = document.createElement("tr");
      const change = ((p.km2 - first.km2) / first.km2) * 100;
      [formatDate(p.date), formatKm2(p.km2), p === first ? "baseline" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`]
        .forEach(text => { const td = document.createElement("td"); td.textContent = text; row.appendChild(td); });
      body.appendChild(row);
    }
  }

  // Ölçekler
  const width = Math.max(280, chart.clientWidth || 800);
  const height = width < 500 ? 240 : 300;
  const pad = { top: 28, right: width < 500 ? 56 : 72, bottom: 34, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = niceStep(peak.km2);
  const yMax = Math.ceil((peak.km2 * 1.08) / step) * step;
  const x = t => pad.left + ((t - first.t) / (last.t - first.t || 1)) * innerW;
  const y = v => pad.top + innerH - (v / yMax) * innerH;

  const ns = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, text) => {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "ts-svg" });

  // Izgara ve y ekseni
  for (let v = 0; v <= yMax; v += step) {
    svg.appendChild(el("line", { x1: pad.left, x2: width - pad.right, y1: y(v), y2: y(v), class: v === 0 ? "ts-baseline" : "ts-grid" }));
    svg.appendChild(el("text", { x: pad.left - 8, y: y(v) + 4, "text-anchor": "end", class: "ts-axis" }, v.toLocaleString("en-US")));
  }
  svg.appendChild(el("text", { x: pad.left - 8, y: pad.top - 12, "text-anchor": "end", class: "ts-axis" }, "km²"));

  // X ekseni etiketleri (dar ekranda yalnızca ilk ve son)
  series.forEach((p, i) => {
    if (width < 500 && i !== 0 && i !== series.length - 1) return;
    const label = new Date(p.date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    svg.appendChild(el("text", { x: x(p.t), y: height - 10, "text-anchor": "middle", class: "ts-axis" }, label));
  });

  // Alan + çizgi
  const linePts = series.map(p => `${x(p.t)},${y(p.km2)}`).join(" ");
  svg.appendChild(el("polygon", {
    points: `${x(first.t)},${y(0)} ${linePts} ${x(last.t)},${y(0)}`, class: "ts-area"
  }));
  svg.appendChild(el("polyline", { points: linePts, class: "ts-line" }));

  // Noktalar + seçili doğrudan etiketler (ilk ve son)
  for (const p of series) {
    svg.appendChild(el("circle", { cx: x(p.t), cy: y(p.km2), r: 4.5, class: "ts-dot" }));
  }
  svg.appendChild(el("text", { x: x(first.t), y: y(first.km2) - 12, "text-anchor": "start", class: "ts-label" }, `${formatKm2(first.km2)} km²`));
  svg.appendChild(el("text", { x: x(last.t) - 8, y: y(last.km2) + 4, "text-anchor": "end", class: "ts-label" }, `${formatKm2(last.km2)} km²`));

  // Fareyle / klavyeyle okunabilen geniş tıklama alanları
  const tooltip = $("#ts-tooltip");
  const wrap = $("#ts-wrap");
  const show = (p, cx, cy) => {
    if (!tooltip || !wrap) return;
    const change = ((p.km2 - first.km2) / first.km2) * 100;
    tooltip.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = `${formatKm2(p.km2)} km²`;
    tooltip.append(formatDate(p.date), document.createElement("br"), strong,
      p === first ? " (baseline)" : ` (${change >= 0 ? "+" : ""}${change.toFixed(1)}%)`);
    tooltip.classList.remove("hidden");
    const scale = chart.clientWidth / width || 1;
    const left = Math.min(Math.max(cx * scale, 70), wrap.clientWidth - 70);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${cy * scale}px`;
  };
  const hide = () => tooltip?.classList.add("hidden");
  for (const p of series) {
    const hit = el("circle", {
      cx: x(p.t), cy: y(p.km2), r: 16, class: "ts-hit", tabindex: 0,
      "aria-label": `${formatDate(p.date)}: ${formatKm2(p.km2)} square kilometres`
    });
    hit.addEventListener("mouseenter", () => show(p, x(p.t), y(p.km2)));
    hit.addEventListener("focus", () => show(p, x(p.t), y(p.km2)));
    hit.addEventListener("mouseleave", hide);
    hit.addEventListener("blur", hide);
    svg.appendChild(hit);
  }

  chart.replaceChildren(svg);
}

let tsResizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(tsResizeTimer);
  tsResizeTimer = setTimeout(renderTimeSeries, 150);
});

// ---------- Fare ile koordinat okuma ----------

function handleStageHover(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  const b = normalizeBounds(statsData.bounds); // [[south, west], [north, east]]
  const lat = b[1][0] - y * (b[1][0] - b[0][0]);
  const lon = b[0][1] + x * (b[1][1] - b[0][1]);
  setText("#cur-coords", `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  // PNG files do not contain quantitative dB values. Avoid fabricating telemetry.
  setText("#cur-db", "N/A (PNG)");
  const cls = $("#cur-class");
  if (cls) {
    cls.textContent = "VISUAL INSPECTION";
    cls.className = "tag-neutral";
  }
}

// ---------- Eşik kontrolleri ----------

function synchronizeThresholdControls() {
  const hh = num(statsData.hh_threshold_db, -19);
  const hv = num(statsData.hv_threshold_db, -24);
  const slider = $("#threshold-slider");

  if (slider) slider.value = hh.toString();
  setText("#threshold-value", `${hh.toFixed(1)} dB`);
  setText("#sim-est-area", statsData.method
    ? `Analysis rule: ${statsData.method}`
    : `Analysis rule: HH < ${hh.toFixed(1)} dB · HV < ${hv.toFixed(1)} dB`);
  applyThresholdPreviewFilter();
}

// ---------- Olay dinleyicileri ----------

function setMode(mode) {
  currentMode = mode;
  $$(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  viewportSlider?.classList.toggle("hidden", mode !== "slider");
  viewportMap?.classList.toggle("hidden", mode !== "map");
}

$$(".mode-btn").forEach(button => button.addEventListener("click", () => {
  setMode(button.dataset.mode);
  // Leaflet yüklenemezse boş harita ekranında kalmak yerine slider moduna dön
  if (currentMode === "map" && !initOrUpdateMap()) setMode("slider");
}));

$$(".layer-btn").forEach(button => button.addEventListener("click", () => {
  $$(".layer-btn").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  currentLayer = button.dataset.layer;
  updateViewer();
}));

$$(".band-btn").forEach(button => button.addEventListener("click", () => {
  if (currentLayer !== "radar") return; // bant seçimi yalnızca radar katmanında geçerli
  $$(".band-btn").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  currentBand = button.dataset.band;
  updateViewer();
}));

$("#map-opacity")?.addEventListener("input", event => {
  const value = Number(event.target.value);
  setText("#map-opacity-val", `${Math.round(value * 100)}%`);
  mapOverlay?.setOpacity(value);
});

$("#threshold-slider")?.addEventListener("input", (event) => {
  const selectedHH = Number(event.target.value);
  const actualHV = num(statsData.hv_threshold_db, -24);

  setText("#threshold-value", `${selectedHH.toFixed(1)} dB`);
  setText("#sim-est-area",
    `Preview: HH < ${selectedHH.toFixed(1)} dB · ` +
    `Fixed HV rule: HV < ${actualHV.toFixed(1)} dB · ` +
    `Visual preview only; valid km² values come from Python analysis.`);

  // Visual preview only. This does not reclassify GCOV data or calculate area.
  applyThresholdPreviewFilter();
});

$("#interactive-stage")?.addEventListener("mousemove", handleStageHover);
$("#single-stage")?.addEventListener("mousemove", handleStageHover);
$("#btn-export")?.addEventListener("click", () => window.print());

// loadStats() zaten sonunda updateViewer() çağırıyor; ikinci çağrı gereksiz istek üretiyordu
loadStats();
