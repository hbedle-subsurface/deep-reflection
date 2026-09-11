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

function parseSegy(ab){
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
  // bytes 3505-3506 in the standard, which is offset 3504
  const ext = dv.getInt16(3504, !big);
  const rev = dv.getUint16(3500, !big);

  const bps = BPS[fmt];
  const start = 3600 + (ext > 0 ? ext * 3200 : 0);
  const traceBytes = 240 + ns * bps;
  let ntr = Math.floor((ab.byteLength - start) / traceBytes);
  if (ntr < 1) throw new Error("No complete traces found after the headers.");

  // fall back to the first trace header if the binary header disagrees
  const hns = dv.getUint16(start + 114, !big);
  if (hns > 0 && hns !== ns && Math.abs((ab.byteLength - start) / (240 + hns*bps) % 1) < 1e-9){
    ns = hns;
  }
  if (dt < 1 || dt > 100000) dt = dv.getUint16(start + 116, !big);
  if (dt < 1 || dt > 100000) dt = 4000;

  // decimate traces if the line is very large
  const step = Math.max(1, Math.ceil((ntr * ns) / MAXCELLS));
  const nx = Math.floor((ntr - 1) / step) + 1;

  const data = new Float32Array(nx * ns);
  const cdp  = new Int32Array(nx);

  for (let i = 0; i < nx; i++){
    const h = start + (i * step) * traceBytes;
    cdp[i] = dv.getInt32(h + 20, !big) || (i + 1);
    let o = h + 240;
    const base = i * ns;
    switch (fmt){
      case 1:  for (let j=0;j<ns;j++){ data[base+j] = ibmToFloat(dv.getUint32(o,false)); o+=4; } break;
      case 5:  for (let j=0;j<ns;j++){ data[base+j] = dv.getFloat32(o,!big); o+=4; } break;
      case 2:  for (let j=0;j<ns;j++){ data[base+j] = dv.getInt32(o,!big); o+=4; } break;
      case 3:  for (let j=0;j<ns;j++){ data[base+j] = dv.getInt16(o,!big); o+=2; } break;
      case 8:  for (let j=0;j<ns;j++){ data[base+j] = dv.getInt8(o); o+=1; } break;
      case 16: for (let j=0;j<ns;j++){ data[base+j] = dv.getUint8(o); o+=1; } break;
      case 11: for (let j=0;j<ns;j++){ data[base+j] = dv.getUint16(o,!big); o+=2; } break;
      case 10: for (let j=0;j<ns;j++){ data[base+j] = dv.getUint32(o,!big); o+=4; } break;
      case 6:  for (let j=0;j<ns;j++){ data[base+j] = dv.getFloat64(o,!big); o+=8; } break;
      default: throw new Error("Data format code " + fmt + " is not supported.");
    }
  }
  // format 1 IBM is always big-endian words in practice; if the file is
  // little-endian overall, byte-swap before decoding
  if (fmt === 1 && !big){
    for (let i = 0; i < nx; i++){
      const h = start + (i*step)*traceBytes;
      let o = h + 240, base = i*ns;
      for (let j=0;j<ns;j++){ data[base+j] = ibmToFloat(dv.getUint32(o,true)); o+=4; }
    }
  }
  // scrub non-finite samples
  for (let k = 0; k < data.length; k++) if (!isFinite(data[k])) data[k] = 0;

  return {full: data, fullNx: nx, fullNs: ns, cdpAll: cdp,
          data, nx, ns, dt, fmt, rev, big, ntrFile: ntr, step, cdp, textual,
          // where the traces begin and how long each one is, so the header
          // readers can walk the file without working it out again
          start, traceBytes};
}

/* ============================ SEG-Y writer ============================ */
function writeSegy(d, nx, ns, dt, cdp, startMs, lines){
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
    dv.setInt32(h+20, cdp[i], false);             // CDP number, byte 21
    dv.setInt16(h+28, 1, false);                  // trace id: seismic data
    dv.setInt16(h+108, Math.round(startMs), false); // delay recording time, byte 109
    dv.setUint16(h+114, ns, false);               // samples this trace, byte 115
    dv.setUint16(h+116, dt, false);               // sample interval, byte 117
    let o = h + 240;
    for (let j = 0; j < ns; j++){ dv.setFloat32(o, d[i*ns+j], false); o += 4; }
  }
  return buf;
}

/* ======================= headers, field by field =======================
   The trace header is 240 bytes in front of every trace. The standard assigns
   most of it, whoever wrote the file filled in some of it, and which some is
   the thing worth knowing before anything is read off a line.

   Byte positions are given the way the SEG-Y standard gives them: one-based
   and inclusive, so "21-24" is the four bytes starting at offset 20. */

const TRACE_FIELDS = [
  [1,   4, "Trace sequence number within the line", "Counts across the whole line."],
  [5,   4, "Trace sequence number within the file", "Restarts in a concatenated file."],
  [9,   4, "Original field record number", "The shot or record it came from."],
  [13,  4, "Trace number within the field record", ""],
  [17,  4, "Energy source point number", ""],
  [21,  4, "Ensemble number", "CDP or CMP number on a stacked line. The usual horizontal axis."],
  [25,  4, "Trace number within the ensemble", "1 on every trace of a stack."],
  [29,  2, "Trace identification code", "1 is live seismic data, 2 is dead, 3 is a dummy."],
  [37,  4, "Distance from source to receiver", "Offset. Zero or absent on poststack data."],
  [41,  4, "Receiver group elevation", "Positive up, scaled by bytes 69-70."],
  [45,  4, "Surface elevation at source", "Positive up, scaled by bytes 69-70."],
  [49,  4, "Source depth below surface", ""],
  [53,  4, "Datum elevation at receiver group", ""],
  [57,  4, "Datum elevation at source", ""],
  [69,  2, "Scalar for elevations and depths", "Positive multiplies, negative divides."],
  [71,  2, "Scalar for coordinates", "Positive multiplies, negative divides. Often -100."],
  [73,  4, "Source X coordinate", ""],
  [77,  4, "Source Y coordinate", ""],
  [81,  4, "Group X coordinate", ""],
  [85,  4, "Group Y coordinate", ""],
  [89,  2, "Coordinate units", "1 length, 2 arc seconds, 3 decimal degrees."],
  [109, 2, "Delay recording time", "Milliseconds between the source and the first sample. A non-zero value shifts the whole time axis."],
  [111, 2, "Mute time, start", ""],
  [113, 2, "Mute time, end", ""],
  [115, 2, "Number of samples in this trace", "Overrides the binary header where the two disagree."],
  [117, 2, "Sample interval for this trace", "Microseconds."],
  [119, 2, "Gain type of field instruments", "1 fixed, 2 binary, 3 floating point."],
  [125, 2, "Correlated", "1 no, 2 yes."],
  [157, 2, "Year data was recorded", ""],
  [159, 2, "Day of year", ""],
  [181, 4, "CDP X coordinate", "Rev 1 position for the ensemble coordinate."],
  [185, 4, "CDP Y coordinate", ""],
  [189, 4, "Inline number", "3D only."],
  [193, 4, "Crossline number", "3D only."]
];

/* Read one trace header. `index` counts traces in the file, not traces held
   after decimation. */
function readTraceHeader(ab, index, layout){
  const dv = new DataView(ab);
  const base = layout.start + index * layout.traceBytes;
  const le = !layout.big;
  const out = [];
  for (const [pos, size, name, note] of TRACE_FIELDS){
    const o = base + pos - 1;
    if (o + size > ab.byteLength) break;
    const v = size === 4 ? dv.getInt32(o, le) : dv.getInt16(o, le);
    out.push({pos, size, name, note, value: v});
  }
  return out;
}

/* Which trace header fields carry anything, measured over the whole line
   rather than guessed from the first trace. A field that is zero on every
   trace was not filled in, and saying so is more use than printing a zero. */
function scanTraceHeaders(ab, layout, ntr){
  const dv = new DataView(ab);
  const le = !layout.big;
  const step = Math.max(1, Math.ceil(ntr / 2000));
  const stat = TRACE_FIELDS.map(([pos, size, name, note]) =>
    ({pos, size, name, note, min: Infinity, max: -Infinity, live: 0, n: 0}));
  for (let i = 0; i < ntr; i += step){
    const base = layout.start + i * layout.traceBytes;
    for (let k = 0; k < stat.length; k++){
      const f = stat[k];
      const o = base + f.pos - 1;
      if (o + f.size > ab.byteLength) continue;
      const v = f.size === 4 ? dv.getInt32(o, le) : dv.getInt16(o, le);
      f.n++;
      if (v !== 0) f.live++;
      if (v < f.min) f.min = v;
      if (v > f.max) f.max = v;
    }
  }
  return {fields: stat, sampled: Math.ceil(ntr / step), step};
}

/* Named fields out of the binary header, with where each one sits. */
const BINARY_FIELDS = [
  [3201, 4, "Job identification number", ""],
  [3205, 4, "Line number", ""],
  [3209, 4, "Reel number", ""],
  [3213, 2, "Traces per ensemble", "1 on a stacked line."],
  [3215, 2, "Auxiliary traces per ensemble", ""],
  [3217, 2, "Sample interval", "Microseconds. What the whole file is read with."],
  [3219, 2, "Sample interval of the original recording", ""],
  [3221, 2, "Samples per trace", ""],
  [3223, 2, "Samples per trace in the original recording", ""],
  [3225, 2, "Data sample format code", "1 IBM float, 5 IEEE float, 3 is 16-bit integer."],
  [3227, 2, "Ensemble fold", "How many traces were summed into each output trace."],
  [3229, 2, "Trace sorting code", "4 is a stacked section, 2 is CDP ensembles."],
  [3231, 2, "Vertical sum code", ""],
  [3253, 2, "Correlated data traces", "1 no, 2 yes."],
  [3255, 2, "Measurement system", "1 metres, 2 feet."],
  [3257, 2, "Impulse signal polarity", "1 is an increase in pressure as a negative number."],
  [3501, 2, "SEG-Y revision", "0 where the field was never written."],
  [3503, 2, "Fixed length trace flag", ""],
  [3505, 2, "Extended textual header records", "3200-byte blocks following the first."]
];

function readBinaryHeader(ab, big){
  const dv = new DataView(ab);
  const le = !big;
  const out = [];
  for (const [pos, size, name, note] of BINARY_FIELDS){
    const o = pos - 1;
    if (o + size > ab.byteLength) continue;
    const v = size === 4 ? dv.getInt32(o, le) : dv.getInt16(o, le);
    out.push({pos, size, name, note, value: v});
  }
  return out;
}
