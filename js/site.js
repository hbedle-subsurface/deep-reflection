/* ============================ this site ============================
   The name, storage, presets and sample lines of this site, in one place. */
const SITE = {
  title: "Cold Case: Legacy Seismic",
  subtitle: "Investigating the deep crust",
  lede: "Open a legacy 2D reflection line, restore its amplitude, separate signal from noise and see what each filter " +
        "takes out, compute attributes, classify them with a self-organizing map, and use SHAP values to see which " +
        "attributes the classes rest on. Everything is computed in this browser from the file itself.",
  // browser storage for this site; two sites under one host must not share it
  // a new name: the earlier Deep Reflection tool left a database called
  // "deep-reflection" with a different layout in browsers that used it
  db: "cold-case-legacy-seismic",
  // archived stacks often carry no amplitude recovery, so the workflow has an
  // amplitude step, applied with the measured exponent on the first visit
  gainStep: true,
  gainDefaultOn: true,
  // the deep-crust steps: migration, multiples, reflectivity; depth beside time
  deepSteps: true,
  depthScale: true,
  theme: "cork",
  // taller panels: a deep record is long in time for its length along the line
  panelScale: 1.6,
  // the question at each step, shown at the top of its page
  briefs: {
    "line": "Which part of the line holds the question, and what the file says about itself. The headers give the sample interval, the record length and whether the traces carry any geometry; the crop decides what every later step works on, and the velocity model sets how two-way time reads as depth.",
    "gain": "How much amplitude the record loses with time, and whether the archive copy already has a gain on it. A time gain that matches the decay makes deep reflections comparable with shallow ones without changing how bright one trace is next to its neighbor.",
    "bandwidth": "Which frequencies carry signal, and how that band narrows down a 20 s record. Every window length and filter corner in the later steps is set against this band, so a filter set outside it works on noise.",
    "fk": "Whether steep noise and steep geology can be told apart on this line. Crustal thrusts and shear zones can dip as steeply as the noise trains; the removed panel shows whether a dip limit has taken out anything with the geometry of a reflector.",
    "mig": "Where dipping reflections and diffractions actually belong, and how steep a reflector really is. The section is unmigrated, so dips read off it are too gentle and events are displaced updip; one migration velocity is right at one time only.",
    "sos": "How much lateral smoothing the reflections can take before faults, terminations and short lower-crustal lamellae are averaged away. The checks rise once the removed panel starts to carry reflections.",
    "balance": "Whether the loss of high frequencies down the record can be made up without raising noise to the level of the signal. The band at depth sets how far balancing can go.",
    "multiples": "Whether a bright deep event is a reflection from the lower crust or energy from a shallow interface arriving a second time. This was the argument over the deep events on COCORP Wyoming Line 1, and the predicted curves test it on the line itself.",
    "reflectivity": "How reflective the upper and lower crust are, and how the reflections are shaped: long and flat, short and dipping, or absent. The numbers compare zones on one line, since every threshold is set relative to this section.",
    "attributes": "Which measurements separate the character of different parts of the crust, and which only repeat each other. Attributes that correlate strongly count as one measurement in the classification that follows.",
    "som": "Whether the section falls into groups with a spatial pattern of their own. The null test says whether the groups are more organized along the line than they would be with the lateral information scrambled out.",
    "shap": "Which attributes decide where each sample lands on the map. An attribute with a short bar contributes little, and two that share the same information split the credit.",
    "refine": "Whether the classes hold up when the attribute set changes. Classes that survive a change of attributes rest on more than one measurement."
},
  // analysis window for spectra, ms: long records and low frequencies
  specWinMs: 400,
  // trace spacing offered when the headers carry no coordinates, m
  defaultDx: 50,
  dataCredit: "Sample seismic: COCORP Wyoming Line 1, Cornell University ELLIPSE archive; see NOTICE.md.",
  samples: [
  {
    "id": "wy01",
    "short": "WY01",
    "name": "COCORP Wyoming Line 1",
    "file": "data/COCORP_WY01_coherency.sgy",
    "mb": 8,
    "dx": 50,
    "blurb": "COCORP deep reflection profile across the southeastern Wind River Mountains, recorded in 1976 to 20 s of two-way time. Coherency-filtered stack from the Cornell ELLIPSE archive. 783 traces, 8 ms sampling, 20 s.",
    "hint": "No geometry in the trace headers; the distance axis uses 50 m, a typical COCORP CDP spacing, which can be changed on the first step. Permission for the data is requested from Cornell; see NOTICE.md.",
    "notes": [
      "COCORP recorded 158 km of deep reflection profile across the southeastern end of the Wind River Mountains in 1976, to 20 seconds of two-way time. The Wind River thrust was traced as a continuous reflection to about 24 km depth, giving a minimum horizontal displacement of 21 km and a dip of 30 to 35 degrees. The result bore directly on whether Laramide basement uplifts formed by horizontal compression or by vertical movement.",
      "The interpretation was subsequently disputed. Zawislak and Smithson (1981) argued that velocity inversions in overpressured Cretaceous shales generate multiple reflections strong enough to persist to 10 seconds, and that many deep events on Lines 1 and 2 are multiples rather than primaries.",
      "This file is the coherency-filtered stack as archived. A filter has therefore already been applied to it, and anything separated out here is a residual after that earlier filtering rather than the first pass over raw stacked data.",
      "The section is unmigrated. Dipping events are not in their true positions, diffractions have not been collapsed, and the apparent dip read from the tool is not the true dip of the thrust. Some energy rejected at steep dips will be diffraction tails.",
      "The trace headers carry no geometry: source, group and CDP coordinates are all zero or constant. Only the CDP number, running 1 to 783, is usable. A taper at the right edge, from about CDP 750, is an end-of-line mute."
    ],
    "figures": [
      {
        "src": "figures/WY01_map.png",
        "cap": "Location of COCORP Wyoming Lines 1, 1A and 2 across the southeastern Wind River Mountains. Numbers mark shotpoints along each line. Line 1 runs southwest from the range front toward Farson, across the Green River Basin.",
        "credit": "Figure from Brewer et al. (1980), Tectonophysics 62, 165–189. © 1980 Elsevier Scientific Publishing Company. Reproduced pending permission."
      },
      {
        "src": "figures/WY01_section.png",
        "cap": "Unmigrated seismic section showing the Wind River thrust in the lower crust, marked by arrows. A is the point at which the base of the sediments is cut off by the thrust. B is the region in which the thrust splits into possibly three sections in the lower crust. C is the apparent arching of the sediments beneath the thrust. D is the depth at which the thrust splits into two zones.",
        "credit": "Figure from Brewer et al. (1980), Tectonophysics 62, 165–189. © 1980 Elsevier Scientific Publishing Company. Reproduced pending permission."
      }
    ],
    "refs": [
      "Brewer, J.A., Smithson, S.B., Oliver, J.E., Kaufman, S., and Brown, L.D., 1980, The Laramide orogeny: Evidence from COCORP deep crustal seismic profiles in the Wind River Mountains, Wyoming: Tectonophysics, v. 62, no. 3–4, p. 165–189, doi:10.1016/0040-1951(80)90191-2.",
      "Smithson, S.B., Brewer, J.A., Kaufman, S., Oliver, J.E., and Hurich, C., 1978, Nature of the Wind River thrust, Wyoming, from COCORP deep reflection data and from gravity data: Geology, v. 6, p. 648–652.",
      "Smithson, S.B., Brewer, J.A., Kaufman, S., and Oliver, J.E., 1979, Structure of the Laramide Wind River uplift, Wyoming, from COCORP deep reflection data and from gravity data: Journal of Geophysical Research, v. 84, no. B11, p. 5955–5972.",
      "Zawislak, R.L., and Smithson, S.B., 1981, Problems and improvements in interpreting COCORP data: Geophysics, v. 46, p. 1684–1701.",
      "Data: Consortium for Continental Reflection Profiling, Wyoming Line 1, coherency-filtered stack. Cornell University ELLIPSE archive, cocorp.eas.cornell.edu/ELLIPSE/."
    ]
  },
  {
    "id": "synth",
    "short": "the synthetic",
    "name": "Synthetic 2D line",
    "file": "data/synthetic_2d_line.sgy",
    "mb": 1.8,
    "dx": 25,
    "blurb": "A line built from a written-down model, so the effect of any setting can be checked against what is actually there. Thirteen dipping horizons, a fault, a channel, a dim amplitude anomaly, spherical divergence and steep coherent noise. 480 traces, 1.8 s, 2 ms.",
    "hint": "Generated by make_segy.py in this repository. Not real earth data.",
    "notes": [
      "Built from a model that is written down, so a parameter change can be checked against what is actually there rather than judged by eye. It contains thirteen dipping horizons with lateral amplitude variation, a normal fault near CDP 1300 whose throw grows with depth, a low-relief channel near CDP 1160, a dim amplitude anomaly near CDP 1370 at 1192 ms, spherical divergence loss, band-limited random noise, and three steep coherent noise trains at roughly 0.55 to 0.70 samples per trace.",
      "The steep noise trains lie between about 0.55 and 0.70 samples per trace, well above the dips of the horizons, so a dip limit near 0.2 separates the two. The fault near CDP 1300 is the feature to follow in the removed panel as the smoothing length and edge protection change."
    ],
    "figures": [],
    "refs": [
      "Generated by make_segy.py in this repository. Not real earth data."
    ]
  }
]
};
