/* ============================ deep crust ============================
   Computations behind the migration, multiples and reflectivity steps.
   Nothing here reads or draws the page.

   Stolt migration: Stolt (1978). Constant velocity, zero offset, the
   exploding-reflector model, so the medium velocity is halved.
   Horizon tracking: steered by the structure-tensor dip, snapped to the
   largest amplitude of the picked polarity near the prediction.
   Reflectivity: reflection density (the share of samples whose envelope is
   above a threshold), lamellae (runs of envelope peaks that connect from trace
   to trace), and correlation lengths of the envelope, after the stochastic
   description of crustal reflectivity of Holliger and Levander (1992). */

/* ---------- Stolt migration ----------
   data: trace-major (nx, ns); dtUs sample interval; dxM trace spacing (m);
   vMs migration velocity (m/s). Returns the migrated section, same size. */
function stoltMigrate(data, nx, ns, dtUs, dxM, vMs){
  const NX = pow2(Math.ceil(nx * 1.25)), NZ = pow2(Math.ceil(ns * 1.25));
  const re = new Float32Array(NX * NZ), im = new Float32Array(NX * NZ);
  // zero padding, with the outer 16 traces tapered so the ends of the line do
  // not migrate as a pair of vertical steps
  const tap = Math.min(16, Math.floor(nx / 8));
  for (let i = 0; i < nx; i++){
    let w = 1;
    if (i < tap) w = 0.5 - 0.5 * Math.cos(Math.PI * (i + 0.5) / tap);
    else if (i >= nx - tap) w = 0.5 - 0.5 * Math.cos(Math.PI * (nx - i - 0.5) / tap);
    for (let j = 0; j < ns; j++) re[i * NZ + j] = data[i * ns + j] * w;
  }
  fft2(re, im, NX, NZ, false);
  const dt = dtUs * 1e-6, v2 = vMs / 2;
  const ore = new Float32Array(NX * NZ), oim = new Float32Array(NX * NZ);
  for (let i = 0; i < NX; i++){
    const k = (i <= NX / 2 ? i : i - NX) / (NX * dxM);      // cycles per meter
    const kv = v2 * k;
    const b = i * NZ;
    for (let j = 0; j < NZ; j++){
      const ft = (j <= NZ / 2 ? j : j - NZ) / (NZ * dt);     // output frequency, Hz
      const fin = (ft >= 0 ? 1 : -1) * Math.sqrt(ft * ft + kv * kv);
      let q = fin * NZ * dt;                                   // fractional input bin
      if (Math.abs(q) >= NZ / 2 - 1) continue;
      if (q < 0) q += NZ;
      const q0 = Math.floor(q), f = q - q0, q1 = (q0 + 1) % NZ;
      const scale = fin !== 0 ? Math.abs(ft / fin) : 1;
      ore[b + j] = scale * ((1 - f) * re[b + q0] + f * re[b + q1]);
      oim[b + j] = scale * ((1 - f) * im[b + q0] + f * im[b + q1]);
    }
  }
  fft2(ore, oim, NX, NZ, true);
  const out = new Float32Array(nx * ns);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ns; j++) out[i * ns + j] = ore[i * NZ + j];
  return out;
}

function fft2(re, im, NX, NZ, inv){
  const cr = new Float64Array(NZ), ci = new Float64Array(NZ);
  for (let i = 0; i < NX; i++){
    const b = i * NZ;
    for (let j = 0; j < NZ; j++){ cr[j] = re[b + j]; ci[j] = im[b + j]; }
    fftRadix2(cr, ci, inv);
    for (let j = 0; j < NZ; j++){ re[b + j] = cr[j]; im[b + j] = ci[j]; }
  }
  const dr = new Float64Array(NX), di = new Float64Array(NX);
  for (let j = 0; j < NZ; j++){
    for (let i = 0; i < NX; i++){ dr[i] = re[i * NZ + j]; di[i] = im[i * NZ + j]; }
    fftRadix2(dr, di, inv);
    for (let i = 0; i < NX; i++){ re[i * NZ + j] = dr[i]; im[i * NZ + j] = di[i]; }
  }
}

/* ---------- dip in degrees ----------
   p: two-way time slope, s per km; v: velocity, km/s. On an unmigrated
   zero-offset section a reflector of dip theta appears with slope
   2 sin(theta) / v, and on a migrated time section with 2 tan(theta) / v. */
function dipFromSlope(p, v, migrated){
  const s = Math.abs(p) * v / 2;
  if (migrated) return Math.atan(s) * 180 / Math.PI;
  return s <= 1 ? Math.asin(s) * 180 / Math.PI : NaN;
}

/* ---------- horizon tracking ----------
   From a picked sample, step one trace at a time in each direction: predict
   the next time from the local dip, then move to the largest amplitude of the
   same polarity within +/- half samples. Tracking stops where the amplitude
   drops below a fifth of the picked amplitude for 15 traces running.
   Returns sample index per trace, NaN where the reflector was not followed. */
function trackHorizon(d, nx, ns, dip, i0, j0, half){
  const out = new Float32Array(nx).fill(NaN);
  const pol = d[i0 * ns + j0] >= 0 ? 1 : -1;
  const snap = (i, jp) => {
    let best = -1, bv = -Infinity;
    for (let j = Math.max(1, Math.round(jp) - half); j <= Math.min(ns - 2, Math.round(jp) + half); j++){
      const v = pol * d[i * ns + j];
      if (v > bv){ bv = v; best = j; }
    }
    return {j: best, a: bv};
  };
  const s0 = snap(i0, j0);
  out[i0] = s0.j;
  const aRef = Math.max(1e-30, s0.a);
  for (const dir of [1, -1]){
    let j = s0.j, weak = 0;
    for (let i = i0 + dir; i >= 0 && i < nx; i += dir){
      const jp = j + dir * dip[(i - dir) * ns + Math.round(j)];
      const s = snap(i, jp);
      if (s.j < 0) break;
      if (s.a < 0.2 * aRef){ if (++weak > 15) break; } else weak = 0;
      j = s.j; out[i] = j;
    }
  }
  return out;
}

/* ---------- reflectivity ---------- */

/* Share of samples in a box around each sample whose envelope exceeds thr. */
function reflectionDensity(env, nx, ns, thr, hx, hz){
  const ind = new Float32Array(nx * ns);
  for (let k = 0; k < ind.length; k++) ind[k] = env[k] > thr ? 1 : 0;
  return boxMean2(ind, nx, ns, hx, hz);
}
function boxMean2(a, nx, ns, hx, hz){
  const t = new Float32Array(a.length), o = new Float32Array(a.length);
  for (let i = 0; i < nx; i++){
    const b = i * ns; let acc = 0, c = 0;
    for (let j = 0; j <= Math.min(ns - 1, hz); j++){ acc += a[b + j]; c++; }
    for (let j = 0; j < ns; j++){
      t[b + j] = acc / c;
      const ad = j + hz + 1, sb = j - hz;
      if (ad < ns){ acc += a[b + ad]; c++; }
      if (sb >= 0){ acc -= a[b + sb]; c--; }
    }
  }
  for (let j = 0; j < ns; j++){
    let acc = 0, c = 0;
    for (let i = 0; i <= Math.min(nx - 1, hx); i++){ acc += t[i * ns + j]; c++; }
    for (let i = 0; i < nx; i++){
      o[i * ns + j] = acc / c;
      const ad = i + hx + 1, sb = i - hx;
      if (ad < nx){ acc += t[ad * ns + j]; c++; }
      if (sb >= 0){ acc -= t[sb * ns + j]; c--; }
    }
  }
  return o;
}

/* Lamellae inside a box: envelope peaks above thr, linked from one trace to
   the next when a peak lies within one sample of the prediction. Each
   lamella is {i0, j0, i1, j1, n}, n the number of traces it spans. Runs
   shorter than minTr traces are dropped. */
function findLamellae(env, nx, ns, thr, box, minTr){
  const peaks = [];
  for (let i = box.i0; i <= box.i1; i++){
    const row = [];
    for (let j = Math.max(1, box.j0); j <= Math.min(ns - 2, box.j1); j++){
      const v = env[i * ns + j];
      if (v > thr && v >= env[i * ns + j - 1] && v > env[i * ns + j + 1]) row.push(j);
    }
    peaks.push(row);
  }
  const open = new Map();   // peak sample on the previous trace -> lamella
  const done = [];
  for (let k = 0; k < peaks.length; k++){
    const i = box.i0 + k, next = new Map();
    for (const j of peaks[k]){
      let L = null;
      for (const dj of [0, -1, 1]){ if (open.has(j + dj)){ L = open.get(j + dj); open.delete(j + dj); break; } }
      if (!L) L = {i0: i, j0: j, i1: i, j1: j, n: 1};
      else { L.i1 = i; L.j1 = j; L.n++; }
      next.set(j, L);
    }
    for (const L of open.values()) if (L.n >= minTr) done.push(L);
    open.clear(); for (const [j, L] of next) open.set(j, L);
  }
  for (const L of open.values()) if (L.n >= minTr) done.push(L);
  return done;
}

/* Correlation lengths of the envelope in a box: the lags, in traces and in
   samples, at which its autocorrelation falls to 1/e along each axis. The
   envelope is used rather than the amplitude, since the amplitude
   oscillates with the wavelet and its vertical autocorrelation measures the
   wavelet rather than the layering. */
function correlationLengths(env, nx, ns, box){
  const bx = box.i1 - box.i0 + 1, bz = box.j1 - box.j0 + 1;
  const NX = pow2(bx * 2), NZ = pow2(bz * 2);
  const re = new Float32Array(NX * NZ), im = new Float32Array(NX * NZ);
  let mean = 0;
  for (let i = 0; i < bx; i++) for (let j = 0; j < bz; j++) mean += env[(box.i0 + i) * ns + box.j0 + j];
  mean /= bx * bz;
  for (let i = 0; i < bx; i++) for (let j = 0; j < bz; j++) re[i * NZ + j] = env[(box.i0 + i) * ns + box.j0 + j] - mean;
  fft2(re, im, NX, NZ, false);
  for (let k = 0; k < re.length; k++){ re[k] = re[k] * re[k] + im[k] * im[k]; im[k] = 0; }
  fft2(re, im, NX, NZ, true);
  const c0 = re[0] || 1;
  // normalize each lag by the number of overlapping samples, so long lags are
  // not biased low
  const ax = []; for (let i = 0; i < bx; i++) ax.push(re[i * NZ] / c0 * (bx * bz) / ((bx - i) * bz));
  const az = []; for (let j = 0; j < bz; j++) az.push(re[j] / c0 * (bx * bz) / (bx * (bz - j)));
  const efold = a => { for (let k = 1; k < a.length; k++) if (a[k] < 1 / Math.E){ const f = (a[k - 1] - 1 / Math.E) / (a[k - 1] - a[k]); return k - 1 + f; } return a.length; };
  return {ax: efold(ax), az: efold(az), acx: ax, acz: az};
}

/* Autocorrelation of each trace over rows j0..j1, lags 0..maxLag samples,
   normalized to 1 at zero lag. Returns trace-major (nx, maxLag + 1). */
function traceAutocorr(d, nx, ns, j0, j1, maxLag){
  const n = j1 - j0 + 1, L = maxLag + 1, N = pow2(n + L);
  const out = new Float32Array(nx * L);
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < nx; i++){
    re.fill(0); im.fill(0);
    for (let j = 0; j < n; j++) re[j] = d[i * ns + j0 + j];
    fftRadix2(re, im, false);
    for (let k = 0; k < N; k++){ re[k] = re[k] * re[k] + im[k] * im[k]; im[k] = 0; }
    fftRadix2(re, im, true);
    const z = re[0] || 1;
    for (let l = 0; l < L; l++) out[i * L + l] = re[l] / z;
  }
  return out;
}
