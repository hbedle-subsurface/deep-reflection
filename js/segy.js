/* ============================ EBCDIC ============================ */
const [E2A, A2E] = (() => {
  const pairs = [];
  const punct = {64:32,74:91,75:46,76:60,77:40,78:43,79:33,80:38,90:93,91:36,92:42,93:41,
    94:59,95:94,96:45,97:47,106:124,107:44,108:37,109:95,110:62,111:63,121:96,122:58,
    123:35,124:64,125:39,126:61,127:34};
  for (const k in punct) pairs.push([+k, punct[k]]);
  const seg = [[129,"abcdefghi"],[145,"jklmnopqr"],[162,"stuvwxyz"],
               [193,"ABCDEFGHI"],[209,"JKLMNOPQR"],[226,"STUVWXYZ"],[240,"0123456789"]];
  for (const [s0,str] of seg) for (let i=0;i<str.length;i++) pairs.push([s0+i, str.charCodeAt(i)]);
  const dec = new Uint8Array(256).fill(46);      // unmapped EBCDIC decodes to "."
  const enc = new Uint8Array(128).fill(64);      // unmapped ASCII encodes to EBCDIC space
  for (const [e, a] of pairs){ dec[e] = a; enc[a] = e; }
  return [dec, enc];
})();

/* ============================ SEG-Y ============================ */
function ibmToFloat(u){
  if (u === 0) return 0;
  const s = (u >>> 31) ? -1 : 1;
  const e = (u >>> 24) & 0x7f;
  const m = u & 0x00ffffff;
  return s * m * Math.pow(16, e - 70);   // 16^(e-64) / 2^24
}

const BPS = {1:4, 2:4, 3:2, 5:4, 6:8, 8:1, 9:8, 10:4, 11:2, 12:8, 16:1};

const FMTNAME = {1:"IBM float", 2:"32-bit int", 3:"16-bit int", 5:"IEEE float",
  6:"IEEE double", 8:"8-bit int", 9:"64-bit int", 10:"32-bit uint", 11:"16-bit uint",
  12:"64-bit uint", 16:"8-bit uint"};

const MAXCELLS = 5.0e6;   // decimate traces above this

/* One trace's samples j0..j1-1 into out at base. Format 1 (IBM float) is
   decoded from big-endian words unless the file is little-endian overall. */
function decodeTrace(dv, o0, fmt, big, ns, j0, j1, out, base){
  const bps = BPS[fmt];
  let o = o0 + j0 * bps, k = base;
  switch (fmt){
    case 1:  for (let j=j0;j<j1;j++){ out[k++] = ibmToFloat(dv.getUint32(o,!big)); o+=4; } break;
    case 5:  for (let j=j0;j<j1;j++){ out[k++] = dv.getFloat32(o,!big); o+=4; } break;
    case 2:  for (let j=j0;j<j1;j++){ out[k++] = dv.getInt32(o,!big); o+=4; } break;
    case 3:  for (let j=j0;j<j1;j++){ out[k++] = dv.getInt16(o,!big); o+=2; } break;
    case 8:  for (let j=j0;j<j1;j++){ out[k++] = dv.getInt8(o); o+=1; } break;
    case 16: for (let j=j0;j<j1;j++){ out[k++] = dv.getUint8(o); o+=1; } break;
    case 11: for (let j=j0;j<j1;j++){ out[k++] = dv.getUint16(o,!big); o+=2; } break;
    case 10: for (let j=j0;j<j1;j++){ out[k++] = dv.getUint32(o,!big); o+=4; } break;
    case 6:  for (let j=j0;j<j1;j++){ out[k++] = dv.getFloat64(o,!big); o+=8; } break;
    default: throw new Error("Data format code " + fmt + " is not supported.");
  }
}

/* opts: {coord, xByte, yByte, units}, passed on to readGeometry. */
function parseSegy(ab, opts){
  const dv = new DataView(ab);
  if (ab.byteLength < 3600) throw new Error("File is shorter than a SEG-Y header. It may not be a SEG-Y file.");

  // Textual header. A card-image header is mostly spaces, so the reliable
  // discriminator is which space byte dominates: 0x40 in EBCDIC, 0x20 in ASCII.
  let n40 = 0, n20 = 0;
  for (let i = 0; i < 3200; i++){
    const b = dv.getUint8(i);
    if (b === 0x40) n40++; else if (b === 0x20) n20++;
  }
  const isEbcdic = n40 >= n20;
  let raw = "";
  for (let i = 0; i < 3200; i++){
    const b = dv.getUint8(i);
    raw += String.fromCharCode(isEbcdic ? E2A[b] : (b >= 32 && b < 127 ? b : 46));
  }
  const textual = [];
  for (let i = 0; i < 40; i++) textual.push(raw.slice(i*80, i*80+80).replace(/\s+$/,""));

  // binary header, with endian sniff
  let big = true;
  let fmt = dv.getInt16(3224, false), ns = dv.getUint16(3220, false);
  const sane = (f, n) => BPS[f] !== undefined && n > 0 && n < 200000;
  if (!sane(fmt, ns)){
    const f2 = dv.getInt16(3224, true), n2 = dv.getUint16(3220, true);
    if (sane(f2, n2)){ big = false; fmt = f2; ns = n2; }
  }
  if (!sane(fmt, ns)) throw new Error("Could not read a valid format code or sample count from the binary header.");

  let dt  = dv.getUint16(3216, !big);
  const ext = dv.getInt16(3506, !big);
  const rev = dv.getUint16(3500, !big);
  const measure = dv.getInt16(3254, !big);

  const bps = BPS[fmt];
  const start = 3600 + (ext > 0 ? ext * 3200 : 0);
  let traceBytes = 240 + ns * bps;
  // fall back to the first trace header if the binary header disagrees
  const hns = dv.getUint16(start + 114, !big);
  if (hns > 0 && hns !== ns && Math.abs((ab.byteLength - start) / (240 + hns*bps) % 1) < 1e-9){
    ns = hns; traceBytes = 240 + ns * bps;
  }
  const ntr = Math.floor((ab.byteLength - start) / traceBytes);
  if (ntr < 1) throw new Error("No complete traces found after the headers.");
  if (dt < 1 || dt > 100000) dt = dv.getUint16(start + 116, !big);
  if (dt < 1 || dt > 100000) dt = 4000;

  // Keep every trace if the line fits in memory, otherwise every step-th; a
  // crop is read again from the file later with as many traces as fit.
  const step = Math.max(1, Math.ceil((ntr * ns) / MAXCELLS));
  const nx = Math.floor((ntr - 1) / step) + 1;
  const data = new Float32Array(nx * ns);
  for (let i = 0; i < nx; i++) decodeTrace(dv, start + (i * step) * traceBytes + 240, fmt, big, ns, 0, ns, data, i * ns);
  for (let k = 0; k < data.length; k++) if (!isFinite(data[k])) data[k] = 0;

  // Delay recording time (bytes 109-110), the time of the first sample. Modern
  // processed data often starts at zero, but a file cut to a window does not,
  // and a deep-water marine record often starts seconds after the shot.
  const delayMs = dv.getInt16(start + 108, !big);

  const layout = {start, traceBytes, ns, fmt, big, ntr, measure};
  const G = readGeometry(ab, layout, opts);

  // The binary header fields a reader checks first, and the leading trace
  // headers, kept for display on the first step.
  const binary = {
    "Sample interval, microseconds (3217)": dt,
    "Samples per trace (3221)": ns,
    "Data format code (3225)": fmt + " (" + (FMTNAME[fmt] || "unknown") + ")",
    "Ensemble fold (3229)": dv.getInt16(3228, !big),
    "Trace sorting code (3231)": dv.getInt16(3230, !big),
    "Measurement system (3255)": ({1:"meters", 2:"feet"})[measure] || measure,
    "SEG-Y revision (3501)": (rev >> 8) + "." + (rev & 0xff),
    "Extended textual headers (3505)": ext,
    "Byte order": big ? "big-endian" : "little-endian"
  };
  const traceRows = [];
  for (let i = 0; i < Math.min(ntr, 12); i++){
    const h = start + i * traceBytes;
    traceRows.push({
      seq: dv.getInt32(h, !big), sp: dv.getInt32(h + 16, !big), cdp: dv.getInt32(h + 20, !big),
      wd: dv.getInt32(h + 60, !big), escal: dv.getInt16(h + 68, !big), scalar: dv.getInt16(h + 70, !big),
      sx: dv.getInt32(h + 72, !big), sy: dv.getInt32(h + 76, !big), units: dv.getInt16(h + 88, !big),
      x: dv.getInt32(h + 180, !big), y: dv.getInt32(h + 184, !big),
      delay: dv.getInt16(h + 108, !big), ns: dv.getUint16(h + 114, !big),
      dt: dv.getUint16(h + 116, !big)
    });
  }

  return {data, nx, ns, dt, fmt, rev, big, ntrFile: ntr, step, textual,
          delayMs, geom: G, cdp: G.cdp, dist: G.dist, binary, traceRows, layout};
}

/* ============================ geometry ============================
   Position along the line for every trace in the file, not only the ones kept
   for display, so a crop read again at full density lands on the right
   distances.

   Where the coordinates are. Processed industry lines carry them in the CDP
   X/Y fields (bytes 181, 185). Many academic marine lines leave those at zero
   and carry navigation in the source X/Y fields (bytes 73, 77), and some only
   in the receiver group fields (81, 85). "auto" takes the first of the three
   that changes along the line. A pair of byte positions can also be given.

   What the numbers mean. Byte 89 gives the units: 1 a length (meters or feet,
   as the binary header says), 2 seconds of arc, 3 decimal degrees, 4 degrees,
   minutes and seconds packed as DDDMMSS. Byte 71 scales every coordinate:
   negative divides, positive multiplies, zero means one. Many files leave byte
   89 at zero; when every coordinate then lies inside +/-180 and +/-90 the
   pairs are read as degrees, since a line of any useful length in meters
   cannot fit in that range. Geographic coordinates give distance along the
   great circle between neighboring traces.

   Repeated positions. Navigation written once per shot, or once per few CDPs,
   leaves runs of traces at one position. Distance is then interpolated between
   the traces where the position changes, so the axis does not step. */
const COORD_BYTES = {cdp: [181, 185], src: [73, 77], grp: [81, 85]};
const COORD_NAMES = {cdp: "CDP X/Y (bytes 181, 185)", src: "source X/Y (bytes 73, 77)", grp: "receiver group X/Y (bytes 81, 85)"};
const UNIT_NAMES = {m: "meters", ft: "feet", arcsec: "seconds of arc", deg: "decimal degrees", dms: "degrees, minutes and seconds"};

function readGeometry(ab, L, opts){
  opts = opts || {};
  const dv = new DataView(ab), {start, traceBytes, big, ntr} = L;
  const cdp = new Int32Array(ntr), sc = new Float64Array(ntr), uh = new Int16Array(ntr);
  const wdRaw = new Float64Array(ntr);
  let wdAny = false;
  for (let i = 0; i < ntr; i++){
    const h = start + i * traceBytes;
    cdp[i] = dv.getInt32(h + 20, !big) || (i + 1);
    const s = dv.getInt16(h + 70, !big);
    sc[i] = s < 0 ? -1 / s : (s > 0 ? s : 1);
    uh[i] = dv.getInt16(h + 88, !big);
    // water depth at the source (byte 61), scaled by the elevation scalar (byte 69)
    const es = dv.getInt16(h + 68, !big), ef = es < 0 ? -1 / es : (es > 0 ? es : 1);
    wdRaw[i] = dv.getInt32(h + 60, !big) * ef;
    if (wdRaw[i] > 0) wdAny = true;
  }
  const read = (bx, by) => {
    const x = new Float64Array(ntr), y = new Float64Array(ntr);
    for (let i = 0; i < ntr; i++){
      const h = start + i * traceBytes;
      x[i] = dv.getInt32(h + bx - 1, !big) * sc[i];
      y[i] = dv.getInt32(h + by - 1, !big) * sc[i];
    }
    return {x, y};
  };
  const moves = P => { for (let i = 1; i < ntr; i++) if (P.x[i] !== P.x[0] || P.y[i] !== P.y[0]) return true; return false; };

  let source = opts.coord || "auto", bytes = null, P = null;
  if (source === "custom" && opts.xByte > 0 && opts.yByte > 0 && opts.xByte <= 237 && opts.yByte <= 237){
    bytes = [opts.xByte, opts.yByte]; P = read(bytes[0], bytes[1]);
  } else if (COORD_BYTES[source]){
    bytes = COORD_BYTES[source]; P = read(bytes[0], bytes[1]);
  } else {
    source = "auto";
    for (const k of ["cdp", "src", "grp"]){
      const Q = read(COORD_BYTES[k][0], COORD_BYTES[k][1]);
      if (moves(Q)){ source = k; bytes = COORD_BYTES[k]; P = Q; break; }
    }
  }
  const G = {source, bytes, units: null, unitsFrom: null, dist: null, lon: null, lat: null,
             x: null, y: null, repeated: 0, cdp, waterDepthM: null};
  const ftToM = L.measure === 2 ? 0.3048 : 1;
  if (wdAny){ G.waterDepthM = new Float32Array(ntr); for (let i = 0; i < ntr; i++) G.waterDepthM[i] = wdRaw[i] * ftToM; }
  if (!P || !moves(P)) return G;

  // units: the user's choice, else byte 89 of the first trace, else inferred
  let u = opts.units && opts.units !== "header" ? opts.units : null;
  if (u) G.unitsFrom = "user";
  else {
    const code = uh[0];
    u = ({1: L.measure === 2 ? "ft" : "m", 2: "arcsec", 3: "deg", 4: "dms"})[code] || null;
    G.unitsFrom = u ? "header" : null;
    if (!u){
      let inDeg = true;
      for (let i = 0; i < ntr && inDeg; i++) if (Math.abs(P.x[i]) > 180 || Math.abs(P.y[i]) > 90) inDeg = false;
      u = inDeg ? "deg" : (L.measure === 2 ? "ft" : "m");
      G.unitsFrom = "inferred";
    }
  }
  G.units = u;
  G.x = P.x; G.y = P.y;

  // position changes: the anchors distance is interpolated between
  const anchors = [0];
  for (let i = 1; i < ntr; i++) if (P.x[i] !== P.x[i - 1] || P.y[i] !== P.y[i - 1]) anchors.push(i);
  G.repeated = anchors.length < ntr ? ntr / anchors.length : 0;

  let step;
  if (u === "m" || u === "ft"){
    const f = u === "ft" ? 0.3048 : 1;
    step = (a, b) => Math.hypot(P.x[b] - P.x[a], P.y[b] - P.y[a]) * f;
  } else {
    const toDeg = v => {
      if (u === "arcsec") return v / 3600;
      if (u === "dms"){ const s = v < 0 ? -1 : 1, a = Math.abs(v), d = Math.floor(a / 10000), m = Math.floor((a % 10000) / 100);
        return s * (d + m / 60 + (a % 100) / 3600); }
      return v;
    };
    G.lon = new Float32Array(ntr); G.lat = new Float32Array(ntr);
    for (let i = 0; i < ntr; i++){ G.lon[i] = toDeg(P.x[i]); G.lat[i] = toDeg(P.y[i]); }
    step = (a, b) => haversineM(G.lat[a], G.lon[a], G.lat[b], G.lon[b]);
  }
  const d = new Float64Array(ntr);
  if (anchors.length < 2){ return G; }
  // cumulative distance at the anchors, placed at the middle of each run of
  // repeated positions, then interpolated in between and extrapolated at the ends
  const mid = anchors.map((a, k) => { const b = k + 1 < anchors.length ? anchors[k + 1] - 1 : ntr - 1; return (a + b) / 2; });
  const cum = [0];
  for (let k = 1; k < anchors.length; k++) cum.push(cum[k - 1] + step(anchors[k - 1], anchors[k]));
  if (!G.repeated){ for (let i = 0; i < ntr; i++) d[i] = cum[i]; }
  else {
    let k = 0;
    for (let i = 0; i < ntr; i++){
      while (k < mid.length - 2 && i > mid[k + 1]) k++;
      const f = (i - mid[k]) / (mid[k + 1] - mid[k]);
      d[i] = cum[k] + f * (cum[k + 1] - cum[k]);
    }
    const off = d[0];
    for (let i = 0; i < ntr; i++) d[i] -= off;
  }
  if (!(d[ntr - 1] > 0) || !isFinite(d[ntr - 1])) return G;
  G.dist = d;
  return G;
}

function haversineM(la1, lo1, la2, lo2){
  const r = Math.PI / 180, a = Math.sin((la2 - la1) * r / 2), b = Math.sin((lo2 - lo1) * r / 2);
  const h = a * a + Math.cos(la1 * r) * Math.cos(la2 * r) * b * b;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* File traces f0..f1, every stride-th, samples j0..j1, read again from the
   file. Used to store a crop at full density when the line as a whole had to
   be thinned to fit in memory. */
function readSegyCrop(ab, L, f0, f1, stride, j0, j1){
  const dv = new DataView(ab);
  const nx = Math.floor((f1 - f0) / stride) + 1, ns = j1 - j0 + 1;
  const out = new Float32Array(nx * ns);
  for (let i = 0; i < nx; i++) decodeTrace(dv, L.start + (f0 + i * stride) * L.traceBytes + 240, L.fmt, L.big, L.ns, j0, j1 + 1, out, i * ns);
  for (let k = 0; k < out.length; k++) if (!isFinite(out[k])) out[k] = 0;
  return {data: out, nx, ns};
}

/* ============================ SEG-Y writer ============================
   IEEE float, big-endian, revision 1. hdr: {cdp, x, y, geo} per output trace,
   or a plain array of CDP numbers. Projected coordinates go to the CDP and
   source X/Y fields in meters at a scalar of -100; geographic ones in seconds
   of arc at a scalar of -100, with byte 89 set to 2. */
function writeSegy(d, nx, ns, dt, hdr, startMs, lines){
  if (Array.isArray(hdr) || ArrayBuffer.isView(hdr)) hdr = {cdp: hdr};
  const traceBytes = 240 + ns*4;
  const buf = new ArrayBuffer(3600 + nx*traceBytes);
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);

  for (let i = 0; i < 40; i++){
    const txt = (lines[i] || "").toUpperCase().slice(0, 80).padEnd(80, " ");
    for (let k = 0; k < 80; k++){
      const c = txt.charCodeAt(k);
      u8[i*80 + k] = c < 128 ? A2E[c] : 0x40;
    }
  }
  dv.setInt32(3200, 1, false);                    // job id
  dv.setInt16(3212, 1, false);                    // traces per ensemble
  dv.setUint16(3216, dt, false);                  // sample interval
  dv.setUint16(3218, dt, false);
  dv.setUint16(3220, ns, false);                  // samples per trace
  dv.setUint16(3222, ns, false);
  dv.setInt16(3224, 5, false);                    // IEEE float
  dv.setInt16(3228, 4, false);                    // CDP ensemble sorting
  dv.setInt16(3254, 1, false);                    // meters
  dv.setInt16(3500, 0x0100, false);               // rev 1
  dv.setInt16(3504, 1, false);                    // fixed length traces
  dv.setInt16(3506, 0, false);                    // no extended headers

  for (let i = 0; i < nx; i++){
    const h = 3600 + i*traceBytes;
    dv.setInt32(h, i+1, false);                   // trace seq within line
    dv.setInt32(h+4, i+1, false);                 // trace seq within file
    dv.setInt32(h+20, hdr.cdp ? hdr.cdp[i] : i + 1, false);   // CDP number, byte 21
    dv.setInt16(h+28, 1, false);                  // trace id: seismic data
    if (hdr.x && hdr.y){
      const f = hdr.geo ? 3600 * 100 : 100;
      const X = Math.round(hdr.x[i] * f), Y = Math.round(hdr.y[i] * f);
      if (Math.abs(X) < 2147483647 && Math.abs(Y) < 2147483647){
        dv.setInt16(h+70, -100, false);           // coordinate scalar, byte 71
        dv.setInt32(h+72, X, false); dv.setInt32(h+76, Y, false);     // source X/Y
        dv.setInt32(h+180, X, false); dv.setInt32(h+184, Y, false);   // CDP X/Y
        dv.setInt16(h+88, hdr.geo ? 2 : 1, false);                    // coordinate units, byte 89
      }
    }
    dv.setInt16(h+108, Math.round(startMs), false); // delay recording time, byte 109
    dv.setUint16(h+114, ns, false);               // samples this trace, byte 115
    dv.setUint16(h+116, dt, false);               // sample interval, byte 117
    let o = h + 240;
    for (let j = 0; j < ns; j++){ dv.setFloat32(o, d[i*ns+j], false); o += 4; }
  }
  return buf;
}
