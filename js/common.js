/* ============================ page shell ============================
   What every step page shares: the masthead, the workflow strip, the section
   panels with their axes, color bars and readout, the display controls, the
   reference window, and the glossary.

   Geometry. Every section carries the index of its first trace (i0) and first
   sample (j0) in the line as read, so a panel drawn from a crop is placed on
   the right distance and time axes. Distance comes from the CDP coordinates
   when the file has them, otherwise from the trace spacing entered on the first step. */

const $ = id => document.getElementById(id);

/* The steps, in order, numbered for this site. SITE (js/site.js) says whether
   the workflow has an amplitude step and holds the per-site presets. */
const STEP_DEFS = [
  {id:"line",       title:"Open the line",    stage:"crop",
   blurb:"SEG-Y headers, trace spacing, and the part of the line to work on."},
  {id:"gain",       title:"Amplitude",        stage:"gain",
   blurb:"How amplitude falls down the record, and a time gain to restore it."},
  {id:"bandwidth",  title:"Bandwidth",        stage:null,
   blurb:"The frequencies the line carries, and how the band changes with time."},
  {id:"fk",         title:"f-k filter",       stage:"fk",
   blurb:"Rejection of steep dips and of frequencies outside the band."},
  {id:"mig",        title:"Migration",        stage:"mig",
   blurb:"Constant-velocity migration, and dips measured in degrees."},
  {id:"sos",        title:"Structure-oriented smoothing", stage:"sos",
   blurb:"Smoothing along reflectors, with the edges of faults protected."},
  {id:"balance",    title:"Spectral balancing", stage:"balance",
   blurb:"Time-variant balancing and whitening over a filter bank."},
  {id:"multiples",  title:"Multiples",        stage:null,
   blurb:"Where multiples of a picked reflector arrive, and periodicity down the traces."},
  {id:"reflectivity", title:"Reflectivity",   stage:null,
   blurb:"Reflective and transparent crust, lamella lengths and dips, correlation lengths."},
  {id:"attributes", title:"Attributes",       stage:null,
   blurb:"Twenty-two attributes, their correlation, and the striping check."},
  {id:"som",        title:"Self-organizing map", stage:null,
   blurb:"Unsupervised classes from a chosen set of attributes, with a null test."},
  {id:"shap",       title:"SHAP",             stage:null,
   blurb:"Which attributes decide where each sample lands on the map."},
  {id:"refine",     title:"Refine and compare", stage:null,
   blurb:"A second map with a revised attribute set, compared with the first."}
];
const SITE_ONLY = {gain: "gainStep", mig: "deepSteps", multiples: "deepSteps", reflectivity: "deepSteps"};
const STEPS = STEP_DEFS.filter(s => !SITE_ONLY[s.id] || SITE[SITE_ONLY[s.id]])
  .map((s, k) => Object.assign({}, s, {n: k + 1, file: s.id + ".html"}));
function stepNo(id){ const s = STEPS.find(x => x.id === id); return s ? s.n : "?"; }
function stepRef(id){ return "step " + stepNo(id); }
/* Optional steps: the filters between the crop and the attributes. */
const OPTIONAL = STEPS.filter(s => s.stage && s.id !== "line");


let LINE = null;       // {name, file, nx, ns, dt, delayMs, dx, dist}
let DISP = {cmap:"gray", clip:99, gain:1, polarity:1, ve:0, hscale: SITE.panelScale || 1};
let VMODEL = null;     // the 1D velocity model, where the site shows depth
let SEAFLOOR = null;   // {f: file trace indices, t: seconds, src} or null
let MUTE = null;       // {on, marginMs, taperMs}: the water-column mute
const PREFIX = location.pathname.includes("/pages/") ? "../" : "";

/* ---------- geometry ----------
   Trace positions are indices of traces in the file. A section records the
   file trace of its first trace (i0) and how many file traces lie between its
   neighbors (istep): the whole line as read may be every few traces of a long
   file, while a crop read again from the file holds every trace. */
function kmAt(iFile){
  if (!LINE) return iFile;
  const n = LINE.ntrFile || LINE.nx;
  const i = Math.max(0, Math.min(n - 1, iFile));
  if (!LINE.dist) return i * (LINE.dx || 1) / 1000;
  const a = Math.floor(i), b = Math.min(n - 1, a + 1), f = i - a;
  return ((1 - f) * LINE.dist[a] + f * LINE.dist[b]) / 1000;
}
/* File trace of trace i of a section, and its distance in km. */
function fileIdx(sec, i){ return sec.i0 + i * (sec.istep || 1); }
function secKm(sec, i){ return kmAt(fileIdx(sec, i)); }
/* Mean trace spacing over a section in meters, from the distances the axes
   use. */
function traceSpacingM(sec){
  if (!LINE || !sec || sec.nx < 2) return SITE.defaultDx || 25;
  const d = (secKm(sec, sec.nx - 1) - secKm(sec, 0)) * 1000 / (sec.nx - 1);
  return d > 0 ? d : (SITE.defaultDx || 25);
}
function secAt(jRaw){
  if (!LINE) return jRaw;
  return (LINE.delayMs || 0) / 1000 + jRaw * LINE.dt * 1e-6;
}
function sectionOf(rec){
  if (!rec) return null;
  return {data: rec.data, nx: rec.nx, ns: rec.ns, dt: rec.dt, j0: rec.j0 || 0,
          i0: (rec.meta && rec.meta.i0) || 0, istep: (rec.meta && rec.meta.istep) || 1,
          stage: rec.stage, meta: rec.meta || {}, ts: rec.ts};
}
function extentOf(sec){
  return {x0: secKm(sec, 0), x1: secKm(sec, sec.nx - 1),
          t0: secAt(sec.j0), t1: secAt(sec.j0 + sec.ns - 1),
          fMid: fileIdx(sec, (sec.nx - 1) / 2)};
}

/* ---------- seafloor, water-column mute, model at a place ---------- */
/* Seafloor two-way time (s) at a file trace, interpolated between picks. */
function seafloorAt(f){
  const S = SEAFLOOR;
  if (!S || !S.f || !S.f.length) return NaN;
  const F = S.f, T = S.t, n = F.length;
  if (f <= F[0]) return T[0];
  if (f >= F[n - 1]) return T[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1){ const m = (lo + hi) >> 1; if (F[m] <= f) lo = m; else hi = m; }
  const u = (f - F[lo]) / Math.max(1e-9, F[hi] - F[lo]);
  return T[lo] + u * (T[hi] - T[lo]);
}
/* Seafloor time for each trace of a section, as a sample index of it. */
function seafloorIdx(sec){
  if (!SEAFLOOR) return null;
  const out = new Float32Array(sec.nx), t0 = secAt(sec.j0), dts = sec.dt * 1e-6;
  for (let i = 0; i < sec.nx; i++) out[i] = (seafloorAt(fileIdx(sec, i)) - t0) / dts;
  return out;
}
/* The velocity model at a file trace: on a marine line the water layer takes
   its thickness from the seafloor there, or from the entered depth. */
function modelAt(f){
  if (!VMODEL) return null;
  if (!VMODEL.marine) return VMODEL;
  const t = seafloorAt(f);
  return Object.assign({}, VMODEL, {waterKm: isFinite(t) ? t * V_WATER / 2 : (VMODEL.waterKm || 0)});
}
function modelFor(e){ return modelAt(e && isFinite(e.fMid) ? e.fMid : 0); }

/* First live sample of each trace of a section under the water-column mute,
   or null with no mute. The mute starts marginMs above the seafloor, so the
   seafloor reflection itself is kept, and rises over taperMs above that. */
function muteFor(sec){
  if (!SEAFLOOR || !MUTE || !MUTE.on) return null;
  const idx = seafloorIdx(sec), m = MUTE.marginMs * 1000 / sec.dt;
  const out = new Int32Array(sec.nx);
  for (let i = 0; i < sec.nx; i++) out[i] = Math.max(0, Math.min(sec.ns, Math.floor(idx[i] - m)));
  return out;
}
/* Apply the mute to a section's samples, in place. With hard set, only the
   fully muted part above the taper is set to zero again: filters that are not
   local, such as the f-k filter, spread energy back into the water column,
   and balancing would then raise it to the level of the signal, so every
   filter output is muted again this way. */
function applyMute(sec, data, hard){
  const live = muteFor(sec);
  if (!live) return data;
  const nt = Math.max(1, Math.round((MUTE.taperMs || 0) * 1000 / sec.dt));
  for (let i = 0; i < sec.nx; i++){
    const L = live[i], b = i * sec.ns;
    for (let j = 0; j < Math.min(L, sec.ns); j++){
      const k = L - j;              // samples above the first live one
      if (k > nt) data[b + j] = 0;
      else if (!hard) data[b + j] *= 0.5 + 0.5 * Math.cos(Math.PI * k / nt);
    }
  }
  return data;
}

/* ---------- small helpers ---------- */
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
function debounce(fn, ms){
  let t = 0;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
function setBusy(msg){
  const b = $("busy");
  if (!b) return;
  b.textContent = msg || "";
  b.hidden = !msg;
}
function energyShare(rem, inp){
  let a = 0, b = 0;
  for (let k = 0; k < inp.length; k++){ a += rem[k]*rem[k]; b += inp[k]*inp[k]; }
  return b > 0 ? 100 * a / b : 0;
}
function ordinal(n){ const t = n % 100, u = n % 10; return n + (t > 10 && t < 14 ? "th" : u === 1 ? "st" : u === 2 ? "nd" : u === 3 ? "rd" : "th"); }
function fmt(v, d){ return isFinite(v) ? v.toFixed(d === undefined ? 2 : d) : "–"; }

/* ---------- header, step tags, cards, footer ---------- */
/* Axes and color bars sit on the dark board, so they are drawn in chalk. */
AX = {rule:"#3b4549", tick:"#9fb0b6", label:"#dfe6e9",
      font:"11px Barlow, Arial, sans-serif", labelFont:"12px Barlow, Arial, sans-serif"};

async function pageShell(stepId){
  LINE = await kvGet("line");
  if (SITE.depthScale && typeof VMODEL_DEFAULT !== "undefined") VMODEL = Object.assign({}, VMODEL_DEFAULT, (await kvGet("vmodel")) || {});
  SEAFLOOR = await kvGet("seafloor");
  MUTE = await kvGet("mute");
  CROPBOX = await kvGet("crop");
  NOTES = await stageNotes().catch(() => ({log: {}, qc: {}}));
  if (SITE.theme) document.body.classList.add("theme-" + SITE.theme);
  // on the paper exhibits the axes are ink rather than chalk
  if (SITE.theme === "cork") AX = {rule:"#b9ad93", tick:"#4d3722", label:"#2b1d10", accent:"#a3261c",
    font:"11px Georgia, serif", labelFont:"12px Georgia, serif"};
  const d = await kvGet("display");
  if (d) DISP = Object.assign(DISP, d);
  const have = await stageList().catch(() => []);
  const top = document.createElement("header");
  top.className = "bar no-gloss";
  const tags = STEPS.map(s => {
    let cls = "tag";
    if (s.stage && s.id !== "line" && !have.includes(s.stage)) cls += " skipped";
    const fl = stepFlags(s, have);
    if (fl.length) cls += " flagged";
    return '<a class="' + cls + '" data-sid="' + s.id + '" href="' + PREFIX + 'pages/' + s.file + '"' +
      (s.id === stepId ? ' aria-current="page"' : "") + ' title="' + escAttr(s.blurb + (fl.length ? "\nFlagged: " + fl.join(" ") : "")) + '"><span>' + s.n + "</span>" + s.title + "</a>";
  }).join("");
  top.innerHTML =
    '<div class="case"><h1><a href="' + PREFIX + 'index.html">' + SITE.title + '</a></h1>' +
    "<p>" + SITE.subtitle + "</p></div>" +
    '<nav class="stages" aria-label="Steps"><button class="tag methods" data-help="start">Reference</button>' + tags + "</nav>";
  document.body.prepend(top);
  const me = STEPS.find(x => x.id === stepId);
  document.title = (me ? me.n + ". " + me.title + " — " : "") + SITE.title;

  // the controls on the right are grouped into pinned cards, one per heading
  const side = document.querySelector("aside.side");
  if (side){ cardify(side); watchCards(side); }
  CURRENT_STEP = stepId;
  if (side && LINE && stepId !== "index") recordCard(side);

  const foot = document.createElement("footer");
  foot.className = "foot";
  foot.innerHTML =
    "<p>The file is read in this browser and never uploaded. " + SITE.title + ", Heather Bedle, University of Oklahoma, with the AASPI consortium. " +
    'Content <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. ' + SITE.dataCredit + "</p>";
  // the case brief for this step: what has to be weighed and worked out
  const brief = SITE.briefs && SITE.briefs[stepId];
  const stage = document.querySelector("main.stage");
  if (brief && stage){
    const b = document.createElement("div");
    b.className = "brief";
    b.innerHTML = "<h3>The question at this step</h3><p>" + brief + "</p>";
    stage.prepend(b);
  }
  // step numbers written into static text, so one page serves both sites
  document.querySelectorAll("[data-step]").forEach(el => { el.textContent = stepNo(el.dataset.step); });
  document.querySelectorAll("a[data-step-link]").forEach(el => {
    const st = STEPS.find(x => x.id === el.dataset.stepLink);
    if (st){ el.href = st.file; el.textContent = "Step " + st.n + ": " + st.title; }
  });
  document.body.append(foot);
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-help]");
    if (b){ e.preventDefault(); openHelp(b.dataset.help); }
    const x = e.target.closest("[data-exp]");
    if (x){ e.preventDefault(); x.dataset.exp === "png" ? exportPanelPNG(x.dataset.panel) : exportPanelSegy(x.dataset.panel); }
  });
  return LINE;
}

/* Cards collapse to their title. A click on the title collapses or expands the
   card; the state is remembered per page and title in this browser. A few
   cards that are consulted rather than worked in start folded. */
const FOLDED_BY_DEFAULT = ["Display", "Removed panel", "How the settings are usually chosen", "About this line"];
function foldKey(card){
  const h = card.querySelector("h2");
  // the full path, since sites under one host share browser storage
  return "fold:" + location.pathname + ":" + (h ? h.firstChild.textContent.trim() : "");
}
function prepareCard(card){
  if (card.dataset.fold) return;
  const h = card.querySelector(":scope > h2");
  if (!h) return;
  card.dataset.fold = "1";
  h.classList.add("foldable");
  h.setAttribute("role", "button"); h.setAttribute("tabindex", "0");
  let st = null;
  try { st = localStorage.getItem(foldKey(card)); } catch (e){}
  const title = h.firstChild ? h.firstChild.textContent.trim() : "";
  const folded = st === null ? FOLDED_BY_DEFAULT.includes(title) : st === "1";
  card.classList.toggle("folded", folded);
  h.setAttribute("aria-expanded", String(!folded));
}
function toggleCard(card, force){
  const f = force === undefined ? !card.classList.contains("folded") : force;
  card.classList.toggle("folded", f);
  const h = card.querySelector(":scope > h2"); if (h) h.setAttribute("aria-expanded", String(!f));
  try { localStorage.setItem(foldKey(card), f ? "1" : "0"); } catch (e){}
}
document.addEventListener("click", e => {
  const h = e.target.closest(".card > h2.foldable");
  if (!h || e.target.closest("button")) return;
  toggleCard(h.parentElement);
});
document.addEventListener("keydown", e => {
  const h = e.target.closest && e.target.closest(".card > h2.foldable");
  if (h && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); toggleCard(h.parentElement); }
});
function watchCards(col){
  col.querySelectorAll(":scope > .card").forEach(prepareCard);
  new MutationObserver(() => col.querySelectorAll(":scope > .card").forEach(prepareCard)).observe(col, {childList: true});
}
/* Collapse all / Expand all sit in the zoom bar above the panels, so they
   take no room from the cards. */
function foldButtons(bar){
  const col = document.querySelector("aside.side");
  if (!col) return;
  const g = document.createElement("div");
  g.className = "seg foldseg";
  g.setAttribute("role", "group");
  g.setAttribute("aria-label", "Cards");
  g.innerHTML = '<button type="button" id="foldAll">Collapse all cards</button><button type="button" id="unfoldAll">Expand all cards</button>';
  bar.append(g);
  $("foldAll").addEventListener("click", () => col.querySelectorAll(":scope > .card").forEach(c => toggleCard(c, true)));
  $("unfoldAll").addEventListener("click", () => col.querySelectorAll(":scope > .card").forEach(c => toggleCard(c, false)));
}

/* Wrap the loose children of a column into cards, starting a new card at
   every h2. Children that are already cards are left as they are. */
function cardify(col){
  const kids = [...col.children];
  let card = null;
  for (const el of kids){
    if (el.classList.contains("card")){ card = null; continue; }
    if (el.tagName === "H2" || !card){
      card = document.createElement("div");
      card.className = "card";
      col.insertBefore(card, el);
    }
    card.append(el);
  }
}

/* The next step link under the panels. */
function nextLink(stepId){
  const i = STEPS.findIndex(s => s.id === stepId);
  const nx = STEPS[i + 1];
  if (!nx) return "";
  return '<div class="nextstep no-gloss"><a href="' + nx.file + '">Next: ' + nx.n + ". " + nx.title + "</a></div>";
}

function emptyState(host, msg){
  host.innerHTML = '<div class="empty"><p>' + msg + "</p>" +
    '<p><a href="' + PREFIX + 'index.html">Open a line</a> to start.</p></div>';
}

/* ---------- reference window ---------- */
let helpWin = null;
function openHelp(key){
  if (typeof HELP === "undefined") return;
  if (!HELP[key]) key = "start";
  if (!helpWin || helpWin.closed){
    helpWin = window.open("", "a2d-reference", "width=720,height=820,scrollbars=yes");
    if (!helpWin) return;
    helpWin.document.open();
    helpWin.document.write(helpDocument());
    helpWin.document.close();
  }
  setTimeout(() => {
    try {
      const el = helpWin.document.getElementById(key);
      if (el) el.scrollIntoView();
      helpWin.focus();
    } catch (e){}
  }, 60);
}

/* ---------- panels ---------- */
/* Zoom. VIEW is the part of the section on screen, in sample indices of the
   section the page works on, or null for all of it. Every panel on a page
   shares it, so a feature stays lined up from one panel to the next. The color
   scale is always taken from the whole section, so zooming in does not change
   what a color means. */
let VIEW = null, REDRAW = () => {}, DRAGMODE = "zoom";
const PANEL_ACT = {};                 // per panel: {select, click}
function onView(fn){ REDRAW = fn; }
function viewOf(sec){
  if (!VIEW) return {i0: 0, i1: sec.nx - 1, j0: 0, j1: sec.ns - 1};
  const i0 = Math.max(0, Math.min(sec.nx - 2, VIEW.i0)), j0 = Math.max(0, Math.min(sec.ns - 2, VIEW.j0));
  return {i0, i1: Math.max(i0 + 1, Math.min(sec.nx - 1, VIEW.i1)), j0, j1: Math.max(j0 + 1, Math.min(sec.ns - 1, VIEW.j1))};
}
function sliceArr(arr, sec, v){
  const nx = v.i1 - v.i0 + 1, ns = v.j1 - v.j0 + 1;
  if (nx === sec.nx && ns === sec.ns) return arr;
  const o = new Float32Array(nx * ns);
  for (let i = 0; i < nx; i++) o.set(arr.subarray((v.i0 + i) * sec.ns + v.j0, (v.i0 + i) * sec.ns + v.j0 + ns), i * ns);
  return o;
}
function sliceSec(sec, v){
  return Object.assign({}, sec, {nx: v.i1 - v.i0 + 1, ns: v.j1 - v.j0 + 1, i0: sec.i0 + v.i0 * (sec.istep || 1), j0: sec.j0 + v.j0});
}
/* Position of section sample (i, j) as a fraction of the panel frame. */
function fracOf(id, i, j){
  const P = PANEL_DATA[id];
  const v = P ? P.v : {i0: 0, i1: 1, j0: 0, j1: 1};
  return {x: (i - v.i0) / Math.max(1, v.i1 - v.i0), y: (j - v.j0) / Math.max(1, v.j1 - v.j0)};
}

/* The bar above the panels: whole section, zoom out, and on pages where a drag
   also selects something, which of the two a drag does. */
/* opts.cropBox: on step 1, where the panel is the whole line, a function
   returning the crop so a button can zoom straight to it. */
function viewBar(host, selectLabel, opts){
  opts = opts || {};
  const bar = document.createElement("div");
  bar.className = "viewbar";
  const onLine = !!opts.cropBox;
  bar.innerHTML =
    '<div class="seg" role="group" aria-label="Zoom">' +
      '<button id="vbWhole" aria-pressed="true">' + (onLine ? "Whole line" : "Whole cropped line") + '</button>' +
      (onLine ? '<button id="vbCrop" aria-pressed="false">Cropped section</button>' : "") +
      '<button id="vbOut">Zoom out</button></div>' +
    (selectLabel ? '<div class="seg" role="group" aria-label="Drag on the section">' +
      '<button id="vbSel" aria-pressed="true">Drag to ' + selectLabel + '</button>' +
      '<button id="vbZoom" aria-pressed="false">Drag to zoom</button></div>' : "") +
    '<span class="readout" id="vbText">' + (selectLabel ? "" : "Drag a box on any panel to zoom in.") + "</span>";
  const br = host.querySelector(":scope > .brief");
  if (br) br.after(bar); else host.prepend(bar);
  foldButtons(bar);
  DRAGMODE = selectLabel ? "select" : "zoom";
  if (!onLine) kvGet("crop").then(c => {
    // with no crop made the section is the whole line, and the button says so
    if (c && LINE && c.i0 === 0 && c.j0 === 0 && c.i1 === LINE.nx - 1 && c.j1 === LINE.ns - 1) $("vbWhole").textContent = "Whole line";
  }).catch(() => {});
  const sync = () => {
    $("vbWhole").setAttribute("aria-pressed", String(!VIEW));
    if (onLine){ const c = opts.cropBox(); $("vbCrop").setAttribute("aria-pressed", String(!!(VIEW && c && VIEW.i0 === c.i0 && VIEW.i1 === c.i1 && VIEW.j0 === c.j0 && VIEW.j1 === c.j1))); }
    if (selectLabel){
      $("vbSel").setAttribute("aria-pressed", String(DRAGMODE === "select"));
      $("vbZoom").setAttribute("aria-pressed", String(DRAGMODE === "zoom"));
    }
  };
  $("vbWhole").addEventListener("click", () => { VIEW = null; sync(); REDRAW(); });
  if (onLine) $("vbCrop").addEventListener("click", () => { const c = opts.cropBox(); if (!c) return; VIEW = Object.assign({}, c); sync(); REDRAW(); });
  $("vbOut").addEventListener("click", () => {
    if (!VIEW) return;
    const w = VIEW.i1 - VIEW.i0, h = VIEW.j1 - VIEW.j0, ci = (VIEW.i0 + VIEW.i1) / 2, cj = (VIEW.j0 + VIEW.j1) / 2;
    VIEW = {i0: Math.round(ci - w), i1: Math.round(ci + w), j0: Math.round(cj - h), j1: Math.round(cj + h)};
    const any = Object.values(PANEL_DATA)[0];
    if (any && VIEW.i0 <= 0 && VIEW.j0 <= 0 && VIEW.i1 >= any.sec.nx - 1 && VIEW.j1 >= any.sec.ns - 1) VIEW = null;
    sync(); REDRAW();
  });
  if (selectLabel){
    $("vbSel").addEventListener("click", () => { DRAGMODE = "select"; sync(); });
    $("vbZoom").addEventListener("click", () => { DRAGMODE = "zoom"; sync(); });
  }
  VIEWSYNC = sync;
}
let VIEWSYNC = () => {};

function makePanel(host, id, title, opts){
  opts = opts || {};
  const el = document.createElement("div");
  el.className = "panel";
  el.id = id;
  el.innerHTML =
    '<div class="cap"><h3 id="' + id + '-title">' + title + '</h3><span class="pnote" id="' + id + '-note"></span>' +
      (opts.tools ? '<span class="ptools" id="' + id + '-tools"></span>' : "") +
      '<span class="pexp no-gloss"><button data-exp="png" data-panel="' + id + '" title="Save this panel as an image, with its axes">PNG</button>' +
      '<button data-exp="segy" data-panel="' + id + '" title="Save the whole section behind this panel as a SEG-Y file">SEG-Y</button></span>' + "</div>" +
    '<div class="plot' + (SITE.depthScale ? " withdepth" : "") + '" style="--ph:' + Math.round((opts.height || 300) * (DISP.hscale || 1)) + 'px" data-ph="' + (opts.height || 300) + '">' +
      '<canvas class="yax" id="' + id + '-y"></canvas>' +
      '<div class="frame crosshair" id="' + id + '-frame">' +
        '<canvas class="img" id="' + id + '-img"></canvas>' +
        '<canvas class="cls" id="' + id + '-cls"></canvas>' +
        '<canvas class="sf" id="' + id + '-sf"></canvas>' +
        '<canvas class="ovl" id="' + id + '-ovl"></canvas>' +
        '<div class="ro" id="' + id + '-ro" hidden></div>' +
      "</div>" +
      (SITE.depthScale ? '<canvas class="dax" id="' + id + '-dax"></canvas>' : "") +
      '<canvas class="cb" id="' + id + '-cb"></canvas>' +
      '<canvas class="xax" id="' + id + '-x"></canvas>' +
    "</div>";
  host.append(el);
  PANEL_ACT[id] = PANEL_ACT[id] || {};
  wireDrag(id);
  return el;
}

function frameRows(id, ns){
  const fr = $(id + "-frame");
  const h = Math.round(fr.getBoundingClientRect().height * (window.devicePixelRatio || 1));
  return Math.max(50, Math.min(ns, h || ns));
}

function drawAxes(id, sub){
  const e = extentOf(sub);
  drawYAxis(id + "-y", e.t0, e.t1, "two-way time (s)", 1, 0);
  drawXAxis(id + "-x", e.x0, e.x1, LINE && (LINE.dist || LINE.dx) ? "distance along the line (km)" : "trace");
  if (SITE.depthScale && $(id + "-dax")) drawDepthAxis(id, e);
  drawSeafloorGuide(id, sub);
}

/* The picked seafloor as a thin dashed line over any section panel, where the
   display settings ask for it. */
function drawSeafloorGuide(id, sub){
  const cv = $(id + "-sf");
  if (!cv) return;
  const {ctx, w, h, ok} = fitCanvas(cv);
  if (!ok || !SEAFLOOR || DISP.seafloor === false) return;
  const idx = seafloorIdx(sub);
  ctx.strokeStyle = "#1f7ab8"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
  ctx.beginPath();
  let on = false;
  for (let i = 0; i < sub.nx; i++){
    const x = i / Math.max(1, sub.nx - 1) * w, y = idx[i] / Math.max(1, sub.ns - 1) * h;
    if (!isFinite(y) || y < -2 || y > h + 2){ on = false; continue; }
    on ? ctx.lineTo(x, y) : ctx.moveTo(x, y); on = true;
  }
  ctx.stroke(); ctx.setLineDash([]);
}

/* Depth down the right side, from the velocity model. The ticks are evenly
   spaced in kilometers and so unevenly spaced on the time axis: the two scales
   are not proportional, since velocity rises with depth. The model Moho is
   marked on the axis. */
function drawDepthAxis(id, e){
  const cv = $(id + "-dax");
  const {ctx, w, h, ok} = fitCanvas(cv);
  if (!ok || !VMODEL) return;
  const M = modelFor(e);
  const z0 = depthAtTime(e.t0, M), z1 = depthAtTime(e.t1, M);
  const Y = z => (timeAtDepth(z, M) - e.t0) / (e.t1 - e.t0) * h;
  ctx.strokeStyle = AX.tick; ctx.fillStyle = AX.tick; ctx.font = AX.font; ctx.lineWidth = 1;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const ticks = niceTicks(z0, z1, Math.max(3, Math.round(h / 45))), step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
  const myy = Y(mohoDepth(M));
  for (const z of ticks){
    const y = Y(z); if (y < 0 || y > h) continue;
    if (Math.abs(y - myy) < 12) continue;
    ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(5, y + .5); ctx.stroke();
    ctx.fillText(fmtTick(z, step), 7, y);
  }
  const mz = mohoDepth(M), my = Y(mz);
  if (my > 0 && my < h){
    ctx.strokeStyle = AX.accent || "#ffd166"; ctx.fillStyle = AX.accent || "#ffd166";
    ctx.beginPath(); ctx.moveTo(0, my + .5); ctx.lineTo(w, my + .5); ctx.stroke();
    ctx.fillText("Moho", 7, my - 6);
  }
  ctx.save(); ctx.translate(40, h / 2); ctx.rotate(Math.PI / 2);
  ctx.fillStyle = AX.label; ctx.font = AX.labelFont; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const ve = veOf(id, e);
  // on a marine line the depth scale holds at one place, the middle of the view
  const at = VMODEL.marine && SEAFLOOR ? " at " + fmt(kmAt(e.fMid), 1) + " km" : "";
  ctx.fillText("depth (km)" + at + (ve ? ", VE " + (ve >= 1 ? ve.toFixed(1) : ve.toPrecision(2)) + " : 1" : ""), 0, 0); ctx.restore();
}

/* Vertical exaggeration of what is on screen: the vertical scale in depth
   over the horizontal scale, both in kilometers per pixel. With a fixed
   exaggeration chosen, the panel height is set to give it. */
function veOf(id, e){
  if (!VMODEL) return null;
  const r = $(id + "-frame").getBoundingClientRect(), M = modelFor(e);
  const zr = depthAtTime(e.t1, M) - depthAtTime(e.t0, M), xr = Math.abs(e.x1 - e.x0);
  if (!(zr > 0 && xr > 0 && r.width > 0)) return null;
  return (r.height / zr) / (r.width / xr);
}
function applyVE(id, sub){
  if (!SITE.depthScale || !VMODEL) return;
  const plot = $(id + "-frame").parentElement;
  const base = +plot.dataset.ph || 300;
  if (!DISP.ve){ plot.style.setProperty("--ph", Math.round(base * (DISP.hscale || 1)) + "px"); return; }
  const e = extentOf(sub), w = $(id + "-frame").getBoundingClientRect().width, M = modelFor(e);
  const zr = depthAtTime(e.t1, M) - depthAtTime(e.t0, M), xr = Math.abs(e.x1 - e.x0);
  if (!(zr > 0 && xr > 0 && w > 0)) return;
  const hpx = Math.max(140, Math.min(1600, w * (zr / xr) * DISP.ve));
  plot.style.setProperty("--ph", Math.round(hpx) + "px");
}

function seisClip(arr){
  return (percentileAbs(arr, DISP.clip) || 1e-30) / (DISP.gain || 1);
}

/* The seismic, sliced to the view, drawn into a canvas. */
function paintSeis(canvas, id, sec, arr, c){
  const v = viewOf(sec), a = sliceArr(arr, sec, v), sub = sliceSec(sec, v);
  applyVE(id, sub);
  DISPLAY_H = frameRows(id, sub.ns);
  const lo = DISP.polarity > 0 ? -c : c, hi = DISP.polarity > 0 ? c : -c;
  draw(canvas, a, sub.nx, sub.ns, lo, hi, buildLUT(DISP.cmap));
  return {v, sub};
}

/* A seismic amplitude panel. clip: the amplitude at the ends of the color bar,
   shared between panels that are compared. */
function drawSeis(id, sec, arr, clip, noteText){
  const c = clip || seisClip(arr);
  const lut = buildLUT(DISP.cmap);
  const {v, sub} = paintSeis($(id + "-img"), id, sec, arr, c);
  clearCanvas($(id + "-cls"));
  drawAxes(id, sub);
  drawColorbar(id + "-cb", -c, c, DISP.polarity > 0 ? lut : flipLut(lut), "amplitude");
  if (noteText !== undefined) $(id + "-note").textContent = noteText;
  PANEL_DATA[id] = Object.assign(PANEL_DATA[id] || {}, {sec, arr, v, unit: ""});
  return c;
}
function clearCanvas(cv){ cv.width = 1; cv.height = 1; cv.getContext("2d").clearRect(0, 0, 1, 1); cv.style.opacity = 1; }
function flipLut(lut){
  // the color bar is drawn low value at the bottom; with polarity reversed the
  // colors run the other way along the same numeric axis
  const out = new Uint8ClampedArray(lut.length);
  for (let i = 0; i < 512; i++) for (let c = 0; c < 3; c++) out[i*3+c] = lut[(511-i)*3+c];
  return out;
}

/* An attribute panel. With alpha below 1 the attribute is drawn over the
   seismic at that opacity, which is co-rendering; at 1 the attribute alone. */
function drawAttrPanel(id, sec, arr, vmin, vmax, cmap, label, noteText, alpha, seis){
  const lut = buildLUT(cmap);
  const v = viewOf(sec), sub = sliceSec(sec, v), a = sliceArr(arr, sec, v);
  applyVE(id, sub);
  DISPLAY_H = frameRows(id, sub.ns);
  const co = alpha !== undefined && alpha < 1 && seis;
  if (co){
    paintSeis($(id + "-img"), id, sec, seis, seisClip(seis));
    DISPLAY_H = frameRows(id, sub.ns);
    drawRange($(id + "-cls"), a, sub.nx, sub.ns, vmin, vmax, lut);
    $(id + "-cls").style.opacity = alpha;
  } else {
    drawRange($(id + "-img"), a, sub.nx, sub.ns, vmin, vmax, lut);
    clearCanvas($(id + "-cls"));
  }
  drawAxes(id, sub);
  drawColorbar(id + "-cb", vmin, vmax, lut, label || "");
  if (noteText !== undefined) $(id + "-note").textContent = noteText;
  PANEL_DATA[id] = Object.assign(PANEL_DATA[id] || {}, {sec, arr, v, unit: label || ""});
}

function drawRGBPanel(id, sec, ch, scales, noteText, alpha, seis){
  const v = viewOf(sec), sub = sliceSec(sec, v);
  const chs = ch.map(c => sliceArr(c, sec, v));
  applyVE(id, sub);
  DISPLAY_H = frameRows(id, sub.ns);
  const co = alpha !== undefined && alpha < 1 && seis;
  if (co){
    paintSeis($(id + "-img"), id, sec, seis, seisClip(seis));
    DISPLAY_H = frameRows(id, sub.ns);
    drawRGB($(id + "-cls"), chs, scales, sub.nx, sub.ns);
    $(id + "-cls").style.opacity = alpha;
  } else {
    drawRGB($(id + "-img"), chs, scales, sub.nx, sub.ns);
    clearCanvas($(id + "-cls"));
  }
  drawAxes(id, sub);
  const cb = $(id + "-cb"); const g = cb.getContext("2d"); g.clearRect(0, 0, cb.width, cb.height);
  if (noteText !== undefined) $(id + "-note").textContent = noteText;
  PANEL_DATA[id] = Object.assign(PANEL_DATA[id] || {}, {sec, arr: null, v});
}

/* ---------- readout ---------- */
const PANEL_DATA = {};
/* The section sample under the pointer, in indices of the whole section. */
function frameToSample(id, ev, loose){
  const P = PANEL_DATA[id];
  if (!P) return null;
  const r = $(id + "-frame").getBoundingClientRect();
  let u = (ev.clientX - r.left) / r.width, w = (ev.clientY - r.top) / r.height;
  if (!loose && (u < 0 || u > 1 || w < 0 || w > 1)) return null;
  u = Math.max(0, Math.min(1, u)); w = Math.max(0, Math.min(1, w));
  const v = P.v;
  const i = Math.round(v.i0 + u * (v.i1 - v.i0)), j = Math.round(v.j0 + w * (v.j1 - v.j0));
  return {i, j, u, v: w};
}
function attachReadout(id){
  const fr = $(id + "-frame"), ro = $(id + "-ro");
  fr.addEventListener("mousemove", ev => {
    const P = PANEL_DATA[id], s = frameToSample(id, ev);
    if (!P || !s){ ro.hidden = true; return; }
    const km = secKm(P.sec, s.i), t = secAt(P.sec.j0 + s.j);
    let txt = fmt(km, 2) + " km, " + fmt(t, 3) + " s";
    if (P.arr) txt += ", " + P.arr[s.i * P.sec.ns + s.j].toPrecision(3);
    if (P.extra) txt += P.extra(s);
    ro.textContent = txt; ro.hidden = false;
  });
  fr.addEventListener("mouseleave", () => { ro.hidden = true; });
}

/* ---------- boxes drawn and dragged on a panel ---------- */
function drawBoxOverlay(id, box, sec, dim){
  const cv = $(id + "-ovl");
  const {ctx, w, h} = fitCanvas(cv);
  if (!box) return;
  const a = fracOf(id, box.i0, box.j0), b = fracOf(id, box.i1, box.j1);
  const x0 = a.x * w, x1 = b.x * w, y0 = a.y * h, y1 = b.y * h;
  if (dim){
    ctx.fillStyle = "rgba(17,17,17,0.6)";
    ctx.fillRect(0, 0, w, Math.max(0, y0)); ctx.fillRect(0, y1, w, h - y1);
    ctx.fillRect(0, y0, Math.max(0, x0), y1 - y0); ctx.fillRect(x1, y0, w - x1, y1 - y0);
  }
  ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
}

/* A drag on any panel either zooms every panel on the page or, on pages that
   select something with a box and with that mode chosen, hands the box to the
   page. A drag too small to be a box is a click. */
function wireDrag(id){
  const fr = $(id + "-frame");
  let a = null;
  fr.addEventListener("mousedown", ev => { a = frameToSample(id, ev); ev.preventDefault(); });
  window.addEventListener("mousemove", ev => {
    if (!a) return;
    const b = frameToSample(id, ev, true);
    if (!b) return;
    const P = PANEL_DATA[id];
    const box = {i0: Math.min(a.i, b.i), i1: Math.max(a.i, b.i), j0: Math.min(a.j, b.j), j1: Math.max(a.j, b.j)};
    if (Math.abs(a.u - b.u) + Math.abs(a.v - b.v) > 0.01) drawBoxOverlay(id, box, P.sec, false);
  });
  window.addEventListener("mouseup", ev => {
    if (!a) return;
    const b = frameToSample(id, ev, true) || a;
    const start = a; a = null;
    const act = PANEL_ACT[id] || {};
    const small = Math.abs(start.u - b.u) < 0.01 && Math.abs(start.v - b.v) < 0.01;
    if (small){ if (act.click) act.click(start); else REDRAW(); return; }
    const box = {i0: Math.min(start.i, b.i), i1: Math.max(start.i, b.i), j0: Math.min(start.j, b.j), j1: Math.max(start.j, b.j)};
    if (act.select && DRAGMODE === "select"){
      if (!act.anyBox && (box.i1 - box.i0 < 8 || box.j1 - box.j0 < 16)){ REDRAW(); return; }
      act.select(box, start, b); return;
    }
    if (box.i1 - box.i0 < 4 || box.j1 - box.j0 < 8){ REDRAW(); return; }
    VIEW = box; VIEWSYNC(); REDRAW();
  });
}
function enableBox(id, onBox){ PANEL_ACT[id] = Object.assign(PANEL_ACT[id] || {}, {select: (box, a, b) => onBox(box, a, b)}); }
function onPanelClick(id, fn){ PANEL_ACT[id] = Object.assign(PANEL_ACT[id] || {}, {click: fn}); }

/* ---------- display controls ---------- */
function displayControls(host, onChange){
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML =
    '<h2>Display<button class="help" data-help="display">Learn more</button></h2>' +
    '<label for="dCmap">Color map</label>' +
    '<select id="dCmap">' +
      '<option value="gray">Gray, black to white</option>' +
      '<option value="graygb">Gray, white to black</option>' +
      '<option value="seis">Blue, black, red</option>' +
      '<option value="bwr">Blue, white, red</option>' +
      '<option value="vik">Vik, diverging</option></select>' +
    '<label for="dClip">Clip at percentile <b><span id="v-dClip"></span></b></label>' +
    '<input type="range" id="dClip" min="90" max="99.9" step="0.1">' +
    '<label for="dGain">Display gain <b><span id="v-dGain"></span>×</b></label>' +
    '<input type="range" id="dGain" min="0.25" max="4" step="0.05">' +
    '<label class="toggle"><input type="checkbox" id="dPol"> Reverse polarity</label>' +
    (SEAFLOOR ? '<label class="toggle"><input type="checkbox" id="dSf"> Show the picked seafloor</label>' : "") +
    '<label for="dH">Panel height <b><span id="v-dH"></span>×</b></label>' +
    '<input type="range" id="dH" min="0.6" max="3" step="0.1">' +
    (SITE.depthScale ? '<label for="dVe">Vertical exaggeration</label><select id="dVe">' +
      '<option value="0">Fit the panel</option><option value="1">1 : 1, true scale</option><option value="2">2 : 1</option>' +
      '<option value="4">4 : 1</option><option value="8">8 : 1</option></select>' +
      '<p class="hint" id="veText">At a fixed exaggeration the panel height follows from the width, the distance range and the depth range of the velocity model.</p>' : "");
  host.append(div);
  const sync = () => {
    $("dCmap").value = DISP.cmap; $("dClip").value = DISP.clip; $("dGain").value = DISP.gain;
    $("dPol").checked = DISP.polarity < 0;
    if ($("dSf")) $("dSf").checked = DISP.seafloor !== false;
    if ($("dVe")) $("dVe").value = DISP.ve || 0;
    $("dH").value = DISP.hscale || 1; $("v-dH").textContent = (+DISP.hscale || 1).toFixed(1);
    $("v-dClip").textContent = (+DISP.clip).toFixed(1);
    $("v-dGain").textContent = (+DISP.gain).toFixed(2);
  };
  sync();
  const upd = () => {
    DISP = {cmap: $("dCmap").value, clip: +$("dClip").value, gain: +$("dGain").value,
            polarity: $("dPol").checked ? -1 : 1, ve: $("dVe") ? +$("dVe").value : 0, hscale: +$("dH").value,
            seafloor: $("dSf") ? $("dSf").checked : DISP.seafloor};
    sync(); kvSet("display", DISP).catch(() => {});
    onChange();
  };
  ["dCmap", "dClip", "dGain", "dPol", "dVe", "dH", "dSf"].forEach(k => { if ($(k)) $(k).addEventListener("input", upd); });
}

/* ---------- small line plots on fixed axes ---------- */
function plotFrame(cv, xr, yr, xl, yl){
  const {ctx, w, h, ok} = fitCanvas(cv);
  if (!ok) return null;
  const L = 48, R = 10, T = 10, B = 34;
  const X = v => L + (v - xr[0]) / (xr[1] - xr[0]) * (w - L - R);
  const Y = v => T + (1 - (v - yr[0]) / (yr[1] - yr[0])) * (h - T - B);
  ctx.strokeStyle = "#C9CDD2"; ctx.fillStyle = "#5C6670"; ctx.lineWidth = 1;
  ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  const xt = niceTicks(xr[0], xr[1], Math.max(3, Math.round(w / 80))), xs = xt.length > 1 ? xt[1] - xt[0] : 1;
  for (const v of xt){
    ctx.beginPath(); ctx.moveTo(X(v) + .5, T); ctx.lineTo(X(v) + .5, h - B); ctx.stroke();
    ctx.fillText(fmtTick(v, xs), X(v), h - B + 4);
  }
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  const yt = niceTicks(Math.min(yr[0], yr[1]), Math.max(yr[0], yr[1]), Math.max(3, Math.round(h / 45))), ys = yt.length > 1 ? yt[1] - yt[0] : 1;
  for (const v of yt){
    ctx.beginPath(); ctx.moveTo(L, Y(v) + .5); ctx.lineTo(w - R, Y(v) + .5); ctx.stroke();
    ctx.fillText(fmtTick(v, ys), L - 5, Y(v));
  }
  ctx.fillStyle = "#16191C"; ctx.font = "10px 'IBM Plex Sans', system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText(xl, (L + w - R) / 2, h - 2);
  ctx.save(); ctx.translate(10, (T + h - B) / 2); ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = "middle"; ctx.fillText(yl, 0, 0); ctx.restore();
  ctx.strokeStyle = "#5C6670"; ctx.strokeRect(L + .5, T + .5, w - L - R, h - T - B);
  return {ctx, X, Y, w, h, L, R, T, B};
}
function plotLine(P, xs, ys, color, width, dash){
  const {ctx, X, Y} = P;
  ctx.save();
  ctx.beginPath();
  ctx.rect(P.L, P.T, P.w - P.L - P.R, P.h - P.T - P.B); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = width || 1.5; ctx.setLineDash(dash || []);
  ctx.beginPath();
  for (let k = 0; k < xs.length; k++){
    const x = X(xs[k]), y = Y(ys[k]);
    if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke(); ctx.restore();
}

/* Amplitude spectrum in decibels relative to its own peak. */
function specDb(a){
  let mx = 0; for (let k = 1; k < a.length; k++) if (a[k] > mx) mx = a[k];
  const out = new Float32Array(a.length);
  for (let k = 0; k < a.length; k++) out[k] = Math.max(-80, 20 * Math.log10((a[k] || 1e-20) / (mx || 1e-20)));
  return out;
}
/* The frequency axis is held at one range for the whole line so a curve can be
   compared from page to page: the Nyquist frequency, capped at 150 Hz. */
function fAxisMax(dt_us){ return Math.min(150, 0.5 / (dt_us * 1e-6)); }

/* ---------- measured band and modern-data presets ---------- */
async function measuredBand(){
  return kvGet("band");
}


/* ============================ getting results out ============================
   Every section panel can be saved two ways: as an image of what is on the
   screen, axes and color bar included, and as a SEG-Y file of the whole
   section behind it (not only the zoomed part), with the CDP numbers and
   coordinates of the file it came from. Horizons and the seafloor are saved as
   CSV tables by the pages that pick them. */
function saveBlob(blob, name){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function fileStem(extra){
  const base = ((LINE && LINE.name) || "line").replace(/\.(sgy|segy)$/i, "");
  return (base + (extra ? "_" + extra : "")).replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(0, 90);
}
function panelTitle(id){ const h = $(id + "-title"); return h ? h.textContent.trim() : id; }

function exportPanelPNG(id){
  const plot = $(id + "-frame") && $(id + "-frame").parentElement;
  if (!plot) return;
  const pr = plot.getBoundingClientRect(), S = 2, top = 30, foot = 18;
  const out = document.createElement("canvas");
  out.width = Math.round(pr.width * S); out.height = Math.round((pr.height + top + foot) * S);
  const g = out.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, out.width, out.height);
  g.scale(S, S);
  plot.querySelectorAll("canvas").forEach(cv => {
    const r = cv.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0) || cv.width < 2) return;
    g.globalAlpha = +(getComputedStyle(cv).opacity || 1);
    g.drawImage(cv, r.left - pr.left, r.top - pr.top + top, r.width, r.height);
  });
  g.globalAlpha = 1;
  g.fillStyle = "#16191C"; g.font = "600 14px Georgia, serif"; g.textBaseline = "middle";
  const st = STEPS.find(x => PREFIX && location.pathname.endsWith("/" + x.file));
  g.fillText((st ? st.title + ": " : "") + panelTitle(id), 6, top / 2);
  g.fillStyle = "#5C6670"; g.font = "10px Georgia, serif";
  g.fillText(((LINE && LINE.name) || "") + ". " + SITE.title + ", " + location.host + location.pathname.replace(/pages\/.*$/, ""), 6, pr.height + top + foot / 2);
  const step = STEPS.find(x => PREFIX && location.pathname.endsWith("/" + x.file));
  out.toBlob(b => saveBlob(b, fileStem((step ? step.id + "_" : "") + panelTitle(id)) + ".png"), "image/png");
}

/* CDP numbers and coordinates for the traces of a section, from the file. */
function traceHeadersFor(sec){
  const n = sec.nx, cdp = new Int32Array(n);
  const G = LINE && LINE.geo;
  let x = null, y = null, geo = false;
  if (G && G.lon){ x = new Float64Array(n); y = new Float64Array(n); geo = true; }
  else if (G && G.x){ x = new Float64Array(n); y = new Float64Array(n); }
  const ft = G && G.units === "ft" ? 0.3048 : 1;
  for (let i = 0; i < n; i++){
    const f = Math.round(fileIdx(sec, i));
    cdp[i] = LINE && LINE.cdpF ? LINE.cdpF[Math.min(LINE.cdpF.length - 1, f)] : f + 1;
    if (geo){ x[i] = G.lon[f]; y[i] = G.lat[f]; }
    else if (x){ x[i] = G.x[f] * ft; y[i] = G.y[f] * ft; }
  }
  return {cdp, x, y, geo};
}

async function exportPanelSegy(id){
  const P = PANEL_DATA[id];
  if (!P || !P.arr){ $(id + "-note").textContent = "This panel holds a color blend of several attributes, which a SEG-Y trace cannot carry."; return; }
  const sec = P.sec, H = traceHeadersFor(sec);
  const f0 = fileIdx(sec, 0), f1 = fileIdx(sec, sec.nx - 1);
  const have = await stageList().catch(() => []);
  const stages = STAGES.filter(k => k !== "raw" && have.includes(k));
  const step = STEPS.find(x => PREFIX && location.pathname.endsWith("/" + x.file));
  const lines = [
    "C01 WRITTEN BY " + SITE.title + ", HBEDLE-SUBSURFACE.GITHUB.IO",
    "C02 SOURCE FILE: " + ((LINE && LINE.name) || ""),
    "C03 CONTENT: " + (step ? "STEP " + step.n + " " + step.title + ", " : "") + panelTitle(id) + (P.unit ? " (" + P.unit + ")" : ""),
    "C04 WORKFLOW STAGES PRESENT: " + stages.join(", "),
    "C05 FILE TRACES " + (f0 + 1) + " TO " + (f1 + 1) + (sec.istep > 1 ? ", EVERY " + ordinal(sec.istep) : ""),
    "C06 COORDINATES: " + (H.geo ? "SECONDS OF ARC, SCALAR -100, BYTE 89 = 2" : H.x ? "METERS, SCALAR -100" : "NONE IN THE SOURCE FILE"),
    "C07 SAMPLES: IEEE FLOAT; FIRST SAMPLE AT " + Math.round(secAt(sec.j0) * 1000) + " MS (BYTE 109)",
    MUTE && MUTE.on && SEAFLOOR ? "C08 WATER COLUMN MUTED FROM " + MUTE.marginMs + " MS ABOVE THE PICKED SEAFLOOR" : "C08",
    "C09 LICENSE OF THE TOOL: CC BY-SA 4.0. THE DATA KEEP THE TERMS OF THEIR SOURCE."
  ];
  for (let k = lines.length; k < 39; k++) lines.push("C" + String(k + 1).padStart(2, "0"));
  lines.push("C40 END TEXTUAL HEADER");
  const buf = writeSegy(P.arr, sec.nx, sec.ns, sec.dt, H, secAt(sec.j0) * 1000, lines);
  saveBlob(new Blob([buf], {type: "application/octet-stream"}), fileStem((step ? step.id + "_" : "") + panelTitle(id)) + ".sgy");
}

/* A table of picked times along a section: one row per trace, one column of
   time and one of model depth per pick. picks: {name: sample index per trace}. */
function exportPicksCSV(sec, picks, name){
  const G = LINE && LINE.geo, geo = G && G.lon, xy = !geo && G && G.x;
  const names = Object.keys(picks).filter(k => picks[k]);
  let head = "file_trace,cdp,distance_km" + (geo ? ",longitude,latitude" : xy ? ",x,y" : "");
  names.forEach(k => { head += "," + k + "_twt_s" + (VMODEL ? "," + k + "_depth_km" : ""); });
  const rows = [head];
  for (let i = 0; i < sec.nx; i++){
    const f = Math.round(fileIdx(sec, i));
    let r = (f + 1) + "," + (LINE.cdpF ? LINE.cdpF[f] : f + 1) + "," + secKm(sec, i).toFixed(4);
    if (geo) r += "," + G.lon[f].toFixed(6) + "," + G.lat[f].toFixed(6);
    else if (xy) r += "," + G.x[f] + "," + G.y[f];
    const M = modelAt(f);
    names.forEach(k => {
      const j = picks[k][i];
      if (!isFinite(j)){ r += "," + (VMODEL ? "," : ""); return; }
      const t = secAt(sec.j0 + j);
      r += "," + t.toFixed(4) + (VMODEL ? "," + depthAtTime(t, M).toFixed(3) : "");
    });
    rows.push(r);
  }
  saveBlob(new Blob([rows.join("\n") + "\n"], {type: "text/csv"}), fileStem(name) + ".csv");
}


/* ============================ record and checks ============================
   What has been done to the line, step by step, visible on every page.

   NOTES holds, per stage, the settings a step ran with ("log") and the checks
   flagged on its output ("qc"), written as the step runs and cleared when it
   or anything before it runs again. Each setting is shown with where its value
   came from: measured from this line, taken from the velocity model or the
   file, the tool's starting value, or changed by hand. */
let NOTES = {log: {}, qc: {}}, CROPBOX = null, CURRENT_STEP = null;
function escAttr(t){ return String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

/* Flags of a processing step that is applied, as plain sentences. */
function stepFlags(s, have){
  if (!s.stage || s.id === "line" || !have.includes(s.stage)) return [];
  const q = NOTES.qc[s.stage];
  return q && q.flags ? q.flags : [];
}

/* Store the flagged rows of a step's checks, and mark the step in the strip. */
async function recordChecks(stage, rows){
  const flags = rows.filter(r => r.flag).map(r => r.name + ": " + r.flag);
  NOTES.qc[stage] = {flags};
  await kvSet("qc:" + stage, {flags}).catch(() => {});
  const s = STEPS.find(x => x.stage === stage);
  const a = s && document.querySelector('.stages a[data-sid="' + s.id + '"]');
  if (a){ a.classList.toggle("flagged", flags.length > 0); a.title = s.blurb + (flags.length ? "\nFlagged: " + flags.join(" ") : ""); }
  refreshRecord();
}

/* Settings of each processing step as [label, value, keys]. */
const RECORD_FMT = {
  gain: p => p.mode === "agc" ? [["AGC window", p.agcMs + " ms", ["agcMs"]]]
                             : [["Time gain exponent n", fmt(p.n, 1), ["n"]]],
  fk: p => [["Dip limit", fmt(p.dipMax, 2) + " samples per trace", ["dipMax"]],
            ["Transition", p.tapPct + "% of the limit", ["tapPct"]],
            ["Pass band", p.fLo > 0 || p.fHi < 0.5 / (p.dt * 1e-6) - 1 ? p.fLo + " to " + p.fHi + " Hz" : "no frequency limit", ["fLo", "fHi"]]],
  mig: p => [["Velocity", fmt(p.v, 2) + " km/s", ["v"]], ["Trace spacing", fmt(p.dx, 1) + " m", ["dx"]]],
  sos: p => [["Smoothing length", p.len + " traces", ["len"]], ["Dip estimation window", fmt(p.sig, 1) + " samples", ["sig"]],
             ["Edge protection", fmt(p.gate, 1), ["gate"]], ["Strength", fmt(p.str, 2), ["str"]]],
  balance: p => [["Balancing in time", fmt(p.strength, 2), ["strength"]], ["Flattening across frequency", fmt(p.flatten, 2), ["flatten"]],
                 ["Envelope window", p.smoothMs + " ms", ["smoothMs"]], ["Bands", p.nb, ["nb"]], ["Stability floor", p.floorPct + "%", ["floorPct"]],
                 ["Taper", p.f1 + ", " + p.f2 + ", " + p.f3 + ", " + p.f4 + " Hz", ["f1", "f2", "f3", "f4"]]]
};
function originOf(L, keys){
  const same = k => L.start && isFinite(L.start[k]) && Math.abs(L.params[k] - L.start[k]) < 1e-9;
  if (!keys.every(same)) return "set by hand";
  const o = L.origin && keys.map(k => L.origin[k]).find(Boolean);
  return o || "starting value";
}

function recordHTML(){
  const have = Object.keys(NOTES.log);
  const link = s => '<a href="' + PREFIX + "pages/" + s.file + '">' + s.n + ". " + s.title + "</a>";
  const cur = s => s.id === CURRENT_STEP ? ' class="here"' : "";
  let h = '<ol class="record">';
  // the first step: file, crop, positions, seafloor, model
  const s1 = STEPS.find(x => x.id === "line"), C = NOTES.log.crop;
  const items = [];
  if (C){
    const nFile = (C.nx - 1) * (C.istep || 1) + 1;
    items.push(LINE.name + ": " + nFile + " of " + (LINE.ntrFile || LINE.nx) + " traces" +
      (C.istep > 1 ? ", every " + ordinal(C.istep) + " kept" : "") + ", " + fmt(secAt(C.j0), 2) + " to " + fmt(secAt(C.j0 + C.ns - 1), 2) + " s");
  }
  const G = LINE.geo || {};
  items.push(LINE.dist ? "Positions from " + (COORD_NAMES[G.source] || "the headers") + ", " + (UNIT_NAMES[G.units] || G.units) +
      ' <span class="o">' + (G.unitsFrom === "user" ? "set by hand" : G.unitsFrom === "inferred" ? "units inferred from the values" : "from the file") + "</span>"
    : "Trace spacing " + (LINE.dx || SITE.defaultDx) + ' m <span class="o">' + (LINE.dx && LINE.dx !== SITE.defaultDx ? "set by hand" : "starting value, not from the file") + "</span>");
  if (VMODEL && VMODEL.marine) items.push(SEAFLOOR ? "Seafloor " + (SEAFLOOR.src === "header" ? "from the header water depth" : "picked") +
      (MUTE && MUTE.on ? "; water column muted from " + MUTE.marginMs + " ms above it" : "; water column not muted") : "Marine line, no seafloor picked");
  if (VMODEL) items.push("Depth scale: " + vmodelLabel(VMODEL));
  h += "<li" + cur(s1) + ">" + link(s1) + "<ul>" + items.map(t => "<li>" + t + "</li>").join("") + "</ul></li>";
  // the processing steps
  STEPS.filter(s => s.stage && s.id !== "line").forEach(s => {
    const L = NOTES.log[s.stage];
    if (!L){ h += '<li class="skipped' + (s.id === CURRENT_STEP ? " here" : "") + '">' + link(s) + ' <span class="o">skipped</span></li>'; return; }
    const rows = RECORD_FMT[s.stage] && L.params ? RECORD_FMT[s.stage](L.params) : [];
    const fl = stepFlags(s, have);
    h += "<li" + cur(s) + ">" + link(s) + "<ul>" +
      rows.map(([lab, val, keys]) => "<li>" + lab + " " + val + ' <span class="o">' + originOf(L, keys) + "</span></li>").join("") +
      fl.map(t => '<li class="flag">' + t + "</li>").join("") + "</ul></li>";
  });
  return h + "</ol>";
}

function recordCard(side){
  const c = document.createElement("div");
  c.className = "card"; c.id = "recordCard";
  c.innerHTML = '<h2>Record of this line<button class="help" data-help="record">Learn more</button></h2><div id="recordBody"></div>';
  side.append(c);
  $("recordBody").innerHTML = recordHTML();
}
async function refreshRecord(){
  if (!$("recordBody")) return;
  NOTES = await stageNotes().catch(() => NOTES);
  CROPBOX = await kvGet("crop").catch(() => CROPBOX);
  $("recordBody").innerHTML = recordHTML();
}

/* Before the attributes: whatever in the earlier steps affects what the
   attributes and the classification will measure. Each item links to the
   step where it is changed. level "flag" is a check that tripped or a setting
   that changes the result; "note" is a fact about the data worth knowing. */
function preflightItems(){
  const out = [], have = Object.keys(NOTES.log);
  const at = id => { const s = STEPS.find(x => x.id === id); return s ? ' <a href="' + PREFIX + "pages/" + s.file + '">Step ' + s.n + "</a>" : ""; };
  const C = NOTES.log.crop;
  if (C && C.istep > 1) out.push({level: "note", text: "The crop holds every " + ordinal(C.istep) + " trace of the file, so lateral detail finer than " +
    fmt(C.istep * traceSpacingM({i0: 0, istep: 1, nx: 2}) , 0) + " m is not in it. A shorter time window or a narrower crop lets more traces in." + at("line")});
  if (!LINE.dist) out.push({level: "note", text: "Distances come from a trace spacing of " + (LINE.dx || SITE.defaultDx) +
    " m entered on the first step, not from the file. Lengths, dips in degrees and the migration depend on it." + at("line")});
  if (VMODEL && VMODEL.marine && !(SEAFLOOR && MUTE && MUTE.on)) out.push({level: "flag", text: "The line crosses water and the water column is not muted, " +
    "so its samples enter the attribute statistics and the self-organizing map." + at("line")});
  if (SITE.gainStep && !have.includes("gain")) out.push({level: "note", text: "The amplitude step is skipped, so unless the archived stack already carries a gain, " +
    "amplitude attributes fall with two-way time and the deep record reads as weak." + at("gain")});
  STEPS.filter(s => s.stage && s.id !== "line").forEach(s => stepFlags(s, have).forEach(t =>
    out.push({level: "flag", text: s.title + ": " + t + at(s.id)})));
  if (have.includes("mig") && MUTE && MUTE.on) out.push({level: "note", text: "The migrated section is not muted again, since migration moves a dipping seafloor " +
    "away from its unmigrated pick; the mute still keeps the water column out of the self-organizing map." + at("mig")});
  return out;
}
function preflightBox(host){
  const it = preflightItems();
  const b = document.createElement("div");
  b.className = "preflight";
  b.innerHTML = "<h3>Before the attributes</h3>" + (it.length
    ? "<ul>" + it.map(x => '<li class="pf-' + x.level + '">' + x.text + "</li>").join("") + "</ul>"
    : "<p>Nothing in the earlier steps is flagged, and the crop holds every trace of the file inside it.</p>");
  const br = host.querySelector(":scope > .brief");
  if (br) br.after(b); else host.prepend(b);
}
