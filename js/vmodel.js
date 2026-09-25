/* ============================ velocity model ============================
   A 1D P-wave velocity model, used to put depth beside two-way time, to set
   the migration velocity, and to turn a time dip into a dip in degrees.

   Reference models, continental crust and uppermost mantle:
     AK135  Kennett, Engdahl and Buland (1995): 5.8 km/s to 20 km, 6.5 km/s to
            35 km, 8.04 km/s below. IASP91 has the same crust.
     PREM   Dziewonski and Anderson (1981), without its ocean layer: 5.8 km/s to
            15 km, 6.8 km/s to 24.4 km, 8.11 km/s below.
     Oceanic  layer thicknesses from the compilation of White, McKenzie and
            O'Nions (1992): layer 2 about 2.1 km, layer 3 about 5.0 km, crust
            7.1 km in all. Layer 2 is a steep velocity gradient in the real
            crust; one velocity of 5.0 km/s stands in for it here, 6.9 km/s
            for layer 3, and 8.1 km/s for the uppermost mantle.
   An optional sediment layer can be put on top, since a basin line starts in
   rocks far slower than any reference crust. The model is also editable.

   Water. On a marine line the model hangs from the seafloor: a water layer at
   1.5 km/s sits on top, and every layer below is measured down from the
   seafloor. The water thickness comes from the seafloor picked on the first
   step, so it changes along the line, or from a single entered depth where
   there is no pick. m.waterKm carries the thickness for one place on the line;
   the functions below read it like any other layer.

   Conversion is at vertical incidence: t(z) = 2 * sum(h_i / v_i). */

const VMODELS = {
  ak135: {name: "AK135 (Kennett et al., 1995)", layers: [{h: 20, v: 5.8}, {h: 15, v: 6.5}], mantle: 8.04},
  prem:  {name: "PREM, continental (Dziewonski and Anderson, 1981)", layers: [{h: 15, v: 5.8}, {h: 9.4, v: 6.8}], mantle: 8.11},
  ocean: {name: "Oceanic crust (White et al., 1992)", layers: [{h: 2.1, v: 5.0}, {h: 5.0, v: 6.9}], mantle: 8.1}
};
const V_WATER = 1.5;
/* marine: the line crosses water, and the model hangs from the seafloor.
   waterKm: the depth used where no seafloor has been picked. */
const VMODEL_DEFAULT = {base: "ak135", sedH: 0, sedV: 3.5, custom: null, marine: false, waterKm: 0};

/* The layers actually used: optional sediments, then the crust of the chosen
   model (or the edited one), then the mantle half-space. Thicknesses in km,
   velocities in km/s. */
function vLayers(m){
  m = m || VMODEL_DEFAULT;
  const ref = m.custom || VMODELS[m.base] || VMODELS.ak135;
  const out = [];
  if (m.marine && m.waterKm > 0) out.push({h: m.waterKm, v: V_WATER});
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
/* Moho: the top of the mantle half-space, below sea level on a marine line. */
function mohoDepth(m){ return vLayers(m).slice(0, -1).reduce((a, L) => a + L.h, 0); }

function vmodelLabel(m){
  m = m || VMODEL_DEFAULT;
  const base = m.custom ? "edited model" : (VMODELS[m.base] || VMODELS.ak135).name;
  return base + (m.sedH > 0 ? ", with " + m.sedH + " km of sediments at " + m.sedV + " km/s" : "") +
    (m.marine ? ", below water at " + V_WATER + " km/s" : "");
}
