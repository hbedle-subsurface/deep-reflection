/* ============================ velocity model ============================
   A 1D P-wave velocity model, used to put depth beside two-way time, to set
   the migration velocity, and to turn a time dip into a dip in degrees.

   Reference models, continental crust and uppermost mantle:
     AK135  Kennett, Engdahl and Buland (1995): 5.8 km/s to 20 km, 6.5 km/s to
            35 km, 8.04 km/s below. IASP91 has the same crust.
     PREM   Dziewonski and Anderson (1981), without its ocean layer: 5.8 km/s to
            15 km, 6.8 km/s to 24.4 km, 8.11 km/s below.
   An optional sediment layer can be put on top, since a basin line starts in
   rocks far slower than any reference crust. The model is also editable.

   Conversion is at vertical incidence: t(z) = 2 * sum(h_i / v_i). */

const VMODELS = {
  ak135: {name: "AK135 (Kennett et al., 1995)", layers: [{h: 20, v: 5.8}, {h: 15, v: 6.5}], mantle: 8.04},
  prem:  {name: "PREM, continental (Dziewonski and Anderson, 1981)", layers: [{h: 15, v: 5.8}, {h: 9.4, v: 6.8}], mantle: 8.11}
};
const VMODEL_DEFAULT = {base: "ak135", sedH: 0, sedV: 3.5, custom: null};

/* The layers actually used: optional sediments, then the crust of the chosen
   model (or the edited one), then the mantle half-space. Thicknesses in km,
   velocities in km/s. */
function vLayers(m){
  m = m || VMODEL_DEFAULT;
  const ref = m.custom || VMODELS[m.base] || VMODELS.ak135;
  const out = [];
  if (m.sedH > 0) out.push({h: m.sedH, v: m.sedV});
  ref.layers.forEach(l => out.push({h: l.h, v: l.v}));
  out.push({h: 1e6, v: ref.mantle});
  return out;
}

/* Two-way time (s) at depth z (km). */
function timeAtDepth(z, m){
  let t = 0, top = 0;
  for (const L of vLayers(m)){
    const dz = Math.min(L.h, Math.max(0, z - top));
    t += 2 * dz / L.v;
    top += L.h;
    if (z <= top) break;
  }
  return t;
}
/* Depth (km) at two-way time t (s). */
function depthAtTime(t, m){
  let z = 0, tt = 0;
  for (const L of vLayers(m)){
    const tl = 2 * L.h / L.v;
    if (t <= tt + tl) return z + (t - tt) * L.v / 2;
    tt += tl; z += L.h;
  }
  return z;
}
/* Average vertical velocity (km/s) from the surface to two-way time t. */
function vAvg(t, m){ return t > 0 ? 2 * depthAtTime(t, m) / t : vLayers(m)[0].v; }
/* RMS velocity (km/s) to two-way time t, the velocity a constant-velocity
   time migration of that time needs. */
function vRms(t, m){
  let s = 0, tt = 0;
  for (const L of vLayers(m)){
    const tl = Math.min(2 * L.h / L.v, Math.max(0, t - tt));
    s += L.v * L.v * tl; tt += tl;
    if (tt >= t) break;
  }
  return t > 0 ? Math.sqrt(s / t) : vLayers(m)[0].v;
}
/* Moho: the top of the mantle half-space. */
function mohoDepth(m){ return vLayers(m).slice(0, -1).reduce((a, L) => a + L.h, 0); }

function vmodelLabel(m){
  m = m || VMODEL_DEFAULT;
  const base = m.custom ? "edited model" : (VMODELS[m.base] || VMODELS.ak135).name;
  return base + (m.sedH > 0 ? ", with " + m.sedH + " km of sediments at " + m.sedV + " km/s" : "");
}
