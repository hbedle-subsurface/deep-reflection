/* ============================ stage store ============================
   State carried from one step page to the next. Each step writes the section
   it produced; the next step reads it back and works on that.

   A Float32Array survives the structured clone that IndexedDB uses, so the
   samples go in and come out as themselves, with no encoding step and no size
   limit worth worrying about here. Wyoming Line 1 is 783 traces by 2501
   samples, 7.8 MB a stage, under 50 MB for a full pass.

   Nothing in this file draws or reads the document. Every call returns a
   promise. */

const DR_DB = "deep-reflection";
const DR_STORE = "stages";

/* The order the steps run in. A page asks for the stage before it and works on
   what it finds; if that stage is missing the page says so rather than drawing
   something arbitrary.

   Cropping comes before gain so that the later steps run on the smaller array,
   while the decay itself is still measured on the uncropped record: fitting an
   exponent over two seconds out of twenty gives a slope that describes the
   window rather than the record. */
const STAGES = ["raw", "crop", "gain", "fk", "sof", "balance"];

function stagePrev(name){
  const i = STAGES.indexOf(name);
  return i > 0 ? STAGES[i-1] : null;
}

function drOpen(){
  return new Promise((ok, fail) => {
    const rq = indexedDB.open(DR_DB, 1);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains(DR_STORE))
        db.createObjectStore(DR_STORE, {keyPath: "stage"});
    };
    rq.onsuccess = () => ok(rq.result);
    rq.onerror = () => fail(rq.error);
  });
}

function drTx(mode, run){
  return drOpen().then(db => new Promise((ok, fail) => {
    const tx = db.transaction(DR_STORE, mode);
    const st = tx.objectStore(DR_STORE);
    let out;
    try { out = run(st); } catch (e){ fail(e); return; }
    tx.oncomplete = () => { db.close(); ok(out && out.result !== undefined ? out.result : out); };
    tx.onerror = () => { db.close(); fail(tx.error); };
  }));
}

/* Write the section a step produced. `section` is {data, nx, ns, dt, j0}.
   `meta` carries whatever the next page needs to describe where this came
   from: the file name, the parameters the step ran with, the stage it was
   made from. */
function stageSave(name, section, meta){
  return drTx("readwrite", st => st.put({
    stage: name,
    data: section.data,
    nx: section.nx, ns: section.ns, dt: section.dt, j0: section.j0 || 0,
    meta: meta || {},
    ts: Date.now()
  }));
}

function stageLoad(name){
  return drTx("readonly", st => st.get(name)).then(r => r || null);
}

/* Both the section and the record it came in, for a page that wants the
   parameters as well as the samples. */
function stageSection(name){
  return stageLoad(name).then(r => r && ({
    data: r.data, nx: r.nx, ns: r.ns, dt: r.dt, j0: r.j0
  }));
}

function stageList(){
  return drTx("readonly", st => st.getAll())
    .then(rows => (rows || []).map(r => ({
      stage: r.stage, nx: r.nx, ns: r.ns, dt: r.dt, ts: r.ts, meta: r.meta
    })));
}

/* A stage is stale once anything upstream of it has been rewritten. Rather
   than track that, a step drops everything downstream of itself when it
   saves. */
function stageDropAfter(name){
  const i = STAGES.indexOf(name);
  if (i < 0) return Promise.resolve();
  const kill = STAGES.slice(i+1);
  return drTx("readwrite", st => { kill.forEach(k => st.delete(k)); });
}

function stageClear(){
  return drTx("readwrite", st => st.clear());
}
