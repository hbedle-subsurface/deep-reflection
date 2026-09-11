/* ============================ page shell ============================
   The parts every step page needs: finding the section to work on, the tab
   strip, the reference window, and the glossary pass.

   A step page declares which stage it wants. If that stage is not in the store
   the page says which step writes it and offers the sample line, rather than
   drawing an empty panel. */

function $(id){ return document.getElementById(id); }

/* The furthest-along stage at or before `want`. A reader who stopped after the
   f-k step can still run the attribute pages on the f-k result. */
function resolveStage(want){
  const i = STAGES.indexOf(want);
  const order = (i < 0 ? STAGES.slice() : STAGES.slice(0, i + 1)).reverse();
  return stageList().then(rows => {
    const have = {};
    rows.forEach(r => { have[r.stage] = r; });
    for (const s of order) if (have[s]) return stageSection(s).then(sec => ({section: sec, from: s}));
    return null;
  });
}

const STAGE_LABEL = {
  raw:     "the line as loaded",
  crop:    "the cropped zone",
  gain:    "the section after amplitude recovery",
  fk:      "the f-k filtered section",
  sof:     "the smoothed section",
  balance: "the balanced section"
};

const STAGE_PAGE = {
  raw: "01-load.html", crop: "03-crop.html", gain: "04-amplitude.html",
  fk: "05-fk.html", sof: "06-sof.html", balance: "07-balance.html"
};

/* Read a SEG-Y file that ships with the site. Used by the guard so that a page
   can be worked through on the sample line without running the earlier steps
   first. */
function loadSampleLine(url){
  return fetch(url)
    .then(r => { if (!r.ok) throw new Error(r.status + " " + r.statusText); return r.arrayBuffer(); })
    .then(ab => parseSegy(ab));
}

/* Shown in place of the panels when the store has nothing to work on. */
function stageGuard(el, want, onSample){
  const page = STAGE_PAGE[want] || "01-load.html";
  el.innerHTML =
    '<div class="miscon"><h4>Nothing loaded yet</h4>' +
    '<p>This step works on ' + (STAGE_LABEL[want] || want) + ', which is written by ' +
    '<a href="' + page + '">' + page.replace(/^\d+-|\.html$/g, "") + '</a>. ' +
    'Run the earlier steps to work on your own line, or start here on the sample line.</p>' +
    '<p><button class="btn" type="button" id="guardSample">Use Wyoming Line 1</button></p></div>';
  el.hidden = false;
  const b = $("guardSample");
  if (b) b.addEventListener("click", () => {
    b.disabled = true; b.textContent = "Reading\u2026";
    loadSampleLine("../data/COCORP_WY01_coherency.sgy")
      .then(seg => { el.hidden = true; onSample(seg); })
      .catch(e => { b.disabled = false; b.textContent = "Use Wyoming Line 1";
                    el.querySelector("p").textContent = "The sample line did not load: " + e.message; });
  });
}

/* Tabs. Markup is a .tabs strip of buttons whose aria-controls names a
   .tabpane, all inside one container. */
function setupTabs(wrap, onShow){
  const strip = wrap.querySelector(".tabs");
  const btns = [].slice.call(strip.querySelectorAll("button[aria-controls]"));
  function show(i){
    btns.forEach((b, k) => {
      const pane = $(b.getAttribute("aria-controls"));
      b.setAttribute("aria-selected", k === i ? "true" : "false");
      b.tabIndex = k === i ? 0 : -1;
      if (pane) pane.hidden = k !== i;
    });
    if (onShow) onShow(btns[i].getAttribute("aria-controls"), i);
  }
  btns.forEach((b, i) => {
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => show(i));
    b.addEventListener("keydown", e => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = (i + d + btns.length) % btns.length;
      btns[n].focus(); show(n);
    });
  });
  strip.setAttribute("role", "tablist");
  show(0);
  return {show, count: btns.length};
}

/* The live panel is pinned while the tabs change underneath it, which only
   works while the panel leaves room for the text. A tall panel on a short
   window would take most of the screen and push the tab strip down over the
   reading, so past about two thirds of the window height the panel stops being
   pinned and the page scrolls normally.

   The tab strip is never pinned. Two stacked sticky elements is what put the
   strip below its own panes. */
function stackSticky(){
  const strip = document.querySelector(".tabs");
  if (strip) strip.style.position = "static";
  const head = document.querySelector(".labhead");
  if (!head) return;
  head.style.position = "static";                    // measure it unpinned
  const h = head.getBoundingClientRect().height;
  head.style.position = h < window.innerHeight * 0.68 ? "sticky" : "static";
}

/* Panel height in CSS pixels, held to something that leaves room for the text
   below it. The slider sets what is asked for; this is what is drawn. */
function panelHeight(asked){
  return Math.max(180, Math.min(asked, Math.round(window.innerHeight * 0.52)));
}

/* The step pages that exist. Links to anything else are left in place but
   marked and made inert, so a half-built site does not send a reader to a 404.
   One line to update as a page is added. */
const BUILT_PAGES = ["01-load.html", "08-attributes.html"];

function markUnbuilt(){
  const here = location.pathname.replace(/^.*\//, "");
  document.querySelectorAll('a[href$=".html"]').forEach(a => {
    const f = a.getAttribute("href").replace(/^.*\//, "");
    if (!/^\d\d-/.test(f)) return;              // only the numbered steps
    if (f === here || BUILT_PAGES.indexOf(f) >= 0) return;
    if (a.dataset.unbuilt) return;             // safe to call more than once
    a.dataset.unbuilt = "1";
    a.setAttribute("aria-disabled", "true");
    a.style.opacity = ".5";
    a.style.pointerEvents = "none";
    a.title = "Not built yet";
    if (a.classList.contains("btn")) a.textContent = a.textContent.trim() + " \u2014 not built yet";
  });
}

let helpWin = null;
function openReference(){
  if (helpWin && !helpWin.closed){ helpWin.focus(); return; }
  helpWin = window.open("", "dr-reference", "width=560,height=760,scrollbars=yes");
  if (!helpWin) return;
  helpWin.document.open();
  helpWin.document.write(helpDocument());
  helpWin.document.close();
}

/* Open a panel in its own window, so the section can sit on a second screen
   while the controls are worked on the first. */
function popOut(canvasId, title){
  const src = $(canvasId);
  if (!src) return;
  const w = window.open("", "dr-" + canvasId, "width=900,height=700,scrollbars=no");
  if (!w) return;
  w.document.open();
  w.document.write('<!doctype html><meta charset="utf-8"><title>' + title +
    '</title><style>html,body{margin:0;background:#E2E6EA;font:13px system-ui}' +
    'img{display:block;width:100%;height:auto}h1{font-size:13px;margin:8px 10px;color:#5C6670}' +
    '</style><h1>' + title + '</h1><img id="p">');
  w.document.close();
  const sync = () => { if (w.closed) return; const im = w.document.getElementById("p");
                       if (im) im.src = src.toDataURL("image/png"); };
  sync();
  return sync;
}

function pageReady(fn){
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", fn);
  else fn();
}

/* Called by every page once its text is in place. */
function pageChrome(){
  const ref = $("btnRef");
  if (ref) ref.addEventListener("click", openReference);
  markUnbuilt();
  glossaryScan(document.body);
  stackSticky();
  window.addEventListener("resize", stackSticky);
}
