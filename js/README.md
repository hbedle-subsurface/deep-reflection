# js/

The engine, taken out of the single-page tool so that the step pages can share
it.

## Where things live

    index.html          the landing page and the step cards
    workbench.html      the original single-page tool, unchanged in behavior
    pages/NN-name.html  one step each; paths reach back with ../
    js/                 the engine and the page shell
    assets/             style.css, glossary.css, page.css, count.js
    data/               the sample lines

`js/page.js` holds `BUILT_PAGES`. A link to a numbered step that is not in that
list is left in place, marked, and made inert rather than sending a reader to a
page that does not exist. Adding a page means adding its filename there.
Every file here is loaded as a classic script, in the order the pages list
them, and defines plain global functions. No modules, no bundler, no build
step: the site stays a set of files that can be opened from disk.

| file | what is in it | document |
|---|---|---|
| `segy.js` | EBCDIC tables, IBM float, SEG-Y reader and writer | no |
| `dsp.js` | FFT, f-k forward/mask/apply, Gaussian blurs, structure tensor, structure-oriented smoothing, detail boost, AGC, dip statistics, residual statistics | no |
| `attributes.js` | analytic signal, the 22 attributes, `ATTR_META`, `attrCache`, `computeOne` | no |
| `spectrum.js` | Hann window, mean spectrum, spectral statistics, lateral continuity | no |
| `measure.js` | `spectrumOf`, `decayOf`, `tpowOf` — measurement over a section | no |
| `display.js` | colormaps, section and attribute rasterizing, time decimation, percentiles, f-k spectrum plot, axes and color bars | canvas only |
| `balance.js` | time-variant spectral balancing over a filter bank, and the taper response for drawing |
| `glossary.js` | the term list, the automatic markup, and the card it opens |
| `page.js` | the step-page shell: stage guard, tabs, PNG export, link sharing |
| `som.js` | random number generator, training, classification, class colors, neighbor agreement, phase randomization | no |
| `help.js` | the reference text and the document written into the reference window | writes its own window |
| `store.js` | the IndexedDB stage store that carries a section from one step page to the next | no |

`display.js` takes canvas elements and element ids; nothing else here reads or
writes the page. The panel drawing that does — the spectrum curves, the
time-frequency track, the striping note — is still in `index.html`, because
each of those belongs to one step page and will be written there.

## Shared drop-ins from the other repositories

`assets/panelout.js` is the connected control pop-out, copied unchanged from
the AVO set; `ADD-PANELOUT.md` is its own instructions. It needs the header to
be `<div class="labhead">` with each half opening on a `<p class="cap">` line,
which both step pages now do. The button lands on the last of those captions.
`tools/harness-panelout.js` came with it and is written against that
repository's script names, so it needs its three `.replace` lines repointed
before it will run here.

`drawColorbarH` puts the bar under the panel rather than beside it: the width
of a section has room for the quantity, the units and the value at each end,
where a strip 66 pixels wide has room for none of them. Where the range crosses
zero the zero is marked, which is the reading on any diverging quantity — dip,
the amplitude volume transform, relative impedance.

`blitField` sizes a section bitmap to the box the canvas occupies rather than
to the shape of the data. The bitmap used to be nx by nz with the height set in
CSS, which looks right on the page and falls apart the moment the canvas is
copied into another window, where the copy is sized by its own aspect ratio.

`displayGain` applies t^n or AGC to a copy used for drawing. It is display
only; the step that puts gain into the data is separate. Without it a line that
has never been gained shows an empty lower half, which is the first thing
somebody screening a legacy line needs to get past.

`reverseLUT`, `CMAP_LABEL`, `CMAP_DIVERGING` and `CMAP_SEQUENTIAL` drive the
color-map controls. Reversing polarity is done by swapping the two ends of the
scale passed to the drawing routine, so the samples are untouched.

`savePanelPNG` writes the panels at the resolution they were drawn at rather
than the size they are displayed. `stateRead` and `stateWrite` keep the control
settings in the address bar so a particular setup can be handed over as a link;
values left at the page's own defaults stay out of the URL.

## Glossary

A page links `assets/glossary.css`, loads `js/glossary.js`, and calls
`glossaryScan()` once the text is in place. The scan marks the first occurrence
of each term on the page and leaves later mentions alone, so a paragraph is not
littered with the same word marked repeatedly. Headings, `code`, canvases and
form controls are skipped, and anything inside an element with class
`no-gloss` is left alone. A term can also be marked by hand:

    <button class="gterm" type="button" data-g="moho">Moho</button>

Each entry carries what the term means and, separately, what the quantity is
used for. A term that wraps across a line break still matches.

## Spectral balancing

`spectralBalance(d, nx, nz, dt_s, p)` splits each trace into overlapping
Gaussian bands whose weights sum to the output Ormsby taper, divides each band
by its own smoothed envelope, and sums the bands back. Two controls, because
two different things go under the name:

- `strength` holds each band at a constant level down the record. At 0 the band
  keeps its own envelope; at 1 the envelope is flat in time.
- `flatten` brings the bands to a common level across frequency, which is
  whitening. At 0 the measured shape of the spectrum is kept.

At `strength: 0, flatten: 0` the operator returns the input with the taper
applied and nothing else changed, so the difference panel on that page reads a
true zero. On Wyoming Line 1, `flatten: 1` moves the 6 dB band from 8.1-24.5 Hz
to 4.1-31.4 Hz. A full pass over the line takes about 6 seconds at eight bands,
so the page runs it from a button rather than on every slider move.

## Sections

A section is `{data, nx, ns, dt, j0}`: samples as a `Float32Array` in
trace-major order, trace and sample counts, sample interval in microseconds,
and the index of the first sample in the full record, which is what puts a
crop back on the right time axis.

## Attributes over any section

`attrCache(d, nx, ns, dt, tensor)` builds the analytic signal, envelope, phase
and frequency once and hands them to `computeOne(key, params, cache)`. Both the
section and its structure tensor ride on the cache rather than being read from
a global, so attributes can be computed over the raw line, over any stage of
the workflow, or over two stages at once for comparison.

`computeOne` no longer writes to the page. Relief shading returns `shadowPct`
and the page decides what to say about it.

## Stages

`store.js` names the steps in order — `raw`, `gain`, `crop`, `fk`, `sos`,
`balance` — and keeps one record per stage in IndexedDB. A `Float32Array`
survives the structured clone IndexedDB uses, so samples go in and come out as
themselves. Wyoming Line 1 is 7.8 MB a stage. `stageSave` a result,
`stageSection` the one before, `stageDropAfter` when a step is rerun so that
nothing downstream is left claiming to be current.
