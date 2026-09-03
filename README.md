# Deep Reflection

### Watching what a filter takes out of a seismic line

**Open it at** https://hbedle-subsurface.github.io/deep-reflection

---

## Who this is for

The interpreter who was never taught the machinery. You know what an f-k filter
is for and roughly what coherence means. What you have probably never done is
watch a filter remove something and decide whether you should have let it.

That is the gap this fills. An interpretation package will compute a filtered
section and show you the result. It will not show you the difference. So the
question people actually ask is whether the output looks cleaner, and a smoother
always makes a section look cleaner, including when it has quietly erased a
fault.

## What it does

Load a 2D SEG-Y line and you get three panels: the input, the filtered result,
and the arithmetic difference between them. The third one is the point. Whatever
the filter rejected is displayed at its own gain with the share of input energy
it carries, so the question changes from "does this look better" to "what did I
just lose."

From there you can compute twenty-one attributes on any crop, compare several at
once against a correlation matrix, cluster them with a self-organizing map, and
test that clustering against a null. Everything is measured on the page rather
than asserted in the text.

There is a deep crustal line to try it on: COCORP Wyoming Line 1, recorded
across the Wind River Mountains in 1976, on which the interpretation of what the
deep reflections mean has been argued about since. And a synthetic line built
from a model that is written down, so a parameter change can be checked against
what is actually there instead of judged by eye.

## Five things it takes a position on

1. **Compute, do not illustrate.** Every panel is generated from the data and the
   parameters on screen. This means the tool can be wrong, and during building it
   repeatedly was. A drawing cannot disagree with theory; a computation can.
2. **State what is left out.** Every attribute and filter carries a Limitations
   section naming what it cannot do, including the cases where a measurement
   showed it performing worse than the plain amplitude display. That is teaching
   content, not a disclaimer.
3. **Show the problem, not the fix.** The removed panel is always visible, never
   an option. A parameter that has quietly deleted a reflector should be visible
   on arrival.
4. **Numbers, not adjectives.** "The lower crust is reflective" is an assertion.
   The share of energy that survives structure-oriented smoothing is a
   measurement, and it is what the tool reports.
5. **Nothing leaves your machine.** Static HTML, CSS and JavaScript. Your seismic
   data is read by JavaScript in your own browser; there is no server to send it
   to. Save the page and it runs offline.

## Getting started

Open the link, press **Load** on one of the sample lines, and drag a box on the
input panel to crop. Turn on a filter in the Filters tab and watch the removed
panel rather than the kept one.

To use your own data, drag a SEG-Y file onto the page. Any extension: legacy
archives use .sgy, .segy, .bin, .sgd and often nothing at all.

Every filter and every attribute has a **Learn more** button. They open one
reference window that stays beside the tool, so it can be read while the
controls are being worked. Twenty-eight topics, each covering what the thing
measures, what high and low values correspond to, what that usually indicates in
the earth, and where the measurement fails.

## A place to start on the Wyoming line

1. Load COCORP Wyoming Line 1 and crop to roughly 2 to 6 seconds.
2. In the Display tab set the exaggeration to 3 and press Apply. Note what
   happens to the apparent dips.
3. Turn on the f-k filter and lower the dip limit until the removed panel starts
   to show reflector geometry. Read off the equivalent angle.
4. Turn on structure-oriented smoothing with edge protection at 0, then at 4.
   Watch the removed panel rather than the result.
5. Select six attributes and read the correlation matrix before reading the
   panels. Decide how many independent measurements you are actually looking at.

## Why the difference panel

Most filter interfaces show you a before and an after and let you decide by eye
whether the after looks better. Looking better is a weak test. A structure-oriented
smoother will bridge a fault and produce a cleaner-looking section that has lost a
real discontinuity, and a detail boost will happily sharpen the blocking artifacts
in a JPEG.

Showing the difference makes the question answerable. Whatever the filter removed
is displayed at its own gain, next to a number giving its share of the input
energy. If reflector geometry is visible in that panel, signal was removed and the
parameters are wrong. Coherent noise, random speckle, and flat gray are what
belong there.

## Filters

Filters are applied in the order listed and each can be turned off independently.

**f-k dip and frequency rejection.** A 2D Fourier transform, a wedge reject in the
f-k plane, and an inverse transform. The dip limit is given in samples per trace
with a cosine transition of adjustable width; a pass band in Hz is available on the
same transform. Steep coherent events — migration artifacts, ground roll remnants,
some multiples — separate cleanly from reflectors on dip, because reflectors on a
2D line are usually well under 0.1 samples per trace. The spectrum display shades
the rejected region as you move the sliders.

The transform pads to the next power of two and fills the pad by crossfading a
mirror of each edge, so the periodic image has no step at the wrap and the data
itself is untouched. With no dip or band limit applied the round trip reproduces
the input to a relative error of 3e-8.

**Structure-oriented smoothing.** Image gradients by Sobel operator, outer product
smoothed by a separable Gaussian to form the gradient structure tensor, then an
eigen-decomposition at every sample. The eigenvector of the smaller eigenvalue
points along the local reflector; the data is averaged along that direction with
Gaussian weights and bilinear interpolation.

The edge protection control raises the tensor linearity to a power and uses it to
blend between the smoothed and unsmoothed result, so the filter holds back where
the local image is not linear. This is what keeps faults, terminations and
pinchouts intact. At edge protection 0 the filter smooths everywhere and will heal
real discontinuities. On the included test line, the removed-panel RMS in the fault
zone relative to a quiet part of the section falls from 1.57 at edge protection 0,
to 1.18 at 2, to 1.02 at 4.

**Detail boost.** A Gaussian base is subtracted and the residual is rescaled. Above
1x this sharpens thin beds and low-contrast terminations. It does not help with a
broad dim zone, because a feature many traces wide is large-scale and lands in the
base rather than the detail.

**AGC.** A running-RMS normalization with an adjustable window, applied identically
to all three panels so that it cannot manufacture an apparent difference. AGC and
percentile clipping change how amplitudes look but not what the filters did, and
relative amplitude is not preserved under either.

## SEG-Y support

Textual header in EBCDIC or ASCII, detected by counting printable characters.
Binary header read big-endian with a fallback to little-endian when the format code
or sample count is implausible. Extended textual headers are skipped. Data format
codes 1 (IBM float), 2, 3, 5 (IEEE float), 6, 8, 10, 11 and 16 are supported.
Sample interval is taken from the binary header and falls back to the first trace
header. CDP number is read from byte 21. Lines above roughly five million samples
are decimated in trace to keep the display interactive, and the decimation factor
is reported.

Non-finite samples are set to zero on load.

## Regenerating the synthetic

    python make_segy.py data/synthetic_2d_line.sgy

Needs only NumPy. The model is 480 traces, 900 samples, 2 ms, in IBM float:
thirteen dipping horizons with lateral amplitude variation, a normal fault near
CDP 1300 whose throw grows with depth, a low-relief channel near CDP 1160, a dim
amplitude anomaly near CDP 1370 at 1192 ms, spherical divergence loss,
band-limited random noise, and three steep coherent noise trains at roughly 0.55
to 0.70 samples per trace. Editing the noise levels or the horizon list gives a
harder test.

## Axes and colorbars

Every panel carries a two-way time axis, a CDP axis, and a colorbar. Time
switches between milliseconds and seconds depending on the record length, so a
15-second crustal line reads in seconds and a 1.8-second line reads in
milliseconds. The horizontal axis uses CDP numbers from the trace headers when
they increase sensibly across the line, and falls back to trace index when they
do not, which happens often enough on legacy files to be worth handling. Under
a crop, both axes show absolute position in the original line rather than
position within the crop.

The colorbar on the input, kept and removed panels is the clipped amplitude
range, so the removed panel's bar shows its own smaller range and you can read
directly how much smaller. The attribute panel's bar carries that attribute's
units.

## Attributes

Attributes are chosen from a single checklist and computed on the current crop.

    Complex trace     envelope, instantaneous phase, cosine of phase,
                      instantaneous frequency, unwrapped phase, sweetness
    Wavelet           wavelet frequency and phase, average frequency,
                      average bandwidth
    Energy            RMS amplitude, Teager-Kaiser energy, Teager-Kaiser
                      variation, amplitude volume transform, relative
                      acoustic impedance
    Geometric         apparent dip, linearity, in-line coherence
    Spectral          constant-Q band with an adjustable center frequency

Instantaneous frequency and unwrapped phase share one spectral derivative, so
they are consistent with each other; a central difference would under-read by
sin(w*dt)/(w*dt), nine percent at 60 Hz on 2 ms data. The Teager-Kaiser energy
uses Holoborodko smooth noise-robust differentiators, which are low-pass by
construction and so read the energy increasingly low with frequency: about 35
percent low at 45 Hz with the 7-point filter. That is the price of their noise
robustness, and the filter length is adjustable. Because the energy is
non-negative it cannot feed a coherence computation; the Teager-Kaiser
variation, which is the bandpassed energy followed by a Hilbert transform, is
zero mean and can.

Each attribute was checked against a signal whose answer can be written down:
H{cos} = sin, the envelope of A(t)cos(wt) recovers A(t), Taner's instantaneous
frequency tracks a linear chirp, the weighted bandwidth of a chirp sweeping at
rate r over a window of width W equals r*W/sqrt(3), the Teager-Kaiser energy of
A*cos(wt) is A^2*w^2, RMS of a sinusoid is peak/sqrt(2), and relative acoustic
impedance matches the band-limited trace integral.

Two points to know when comparing against another package. Complex-trace
Teager-Kaiser energy is twice the real-trace value, because the real and
imaginary parts each contribute A^2*w^2 (Hamila et al., 1999) -- not a scaling
error, and a factor of two is easy to miss. And the full bandwidth here is
2*sigma, twice Barnes's sigma, to match the signal-processing convention.

Attributes are computed on the kept section, so they inherit whatever the
filters did. That cuts both ways: dip and coherence estimated on unfiltered
legacy data are dominated by noise, but anything computed after smoothing
carries the smoother's mistakes as well as its successes. Switch the filters
off and back on while watching the attribute panel before you trust it.

Two of these say less than they appear to on a 2D line. Apparent dip is
apparent: a reflector dipping out of the plane reads flatter than it is.
In-line coherence measures continuity along the line only, so a fault striking
parallel to the line will not show in it. Both are limits of 2D acquisition
rather than of the estimate.

## Display for deep crustal data

**Vertical exaggeration.** Enter the exaggeration you want and press Apply; the
panel height follows. It defaults to 3x, the usual convention for reflection
work. 1x is true scale, at which a dip measured off the display is the dip in
the ground; at 3x a bed dipping 33 degrees is drawn at 63. The exaggeration is
computed from a trace spacing and a velocity, and legacy trace headers rarely
carry the spacing, so it is entered by hand. COCORP CDP spacing is typically 50
to 100 m.

**Amplitude.** Three choices, applied as a single gain field shared by all
panels: as recorded, a time gain of t to a power, or AGC. The time gain is one
smooth curve applied to every trace alike, so it counters divergence and
attenuation while leaving lateral amplitude relations intact -- on a test where
amplitude decays as 1/t^2 and varies laterally, a t^2 gain flattens the decay
exactly and changes the lateral pattern by one part in 10^8, where AGC changes
it by 50 percent. That is why the amplitude-based attributes stay interpretable
under time gain and do not under AGC.

**Depth axis.** With a velocity set, the time axis carries a second column of
approximate depth in kilometres. It uses one velocity for the whole section, so
it is a scale rather than a conversion.

**Color.** Batlow and vik are perceptually uniform and remain readable with
color vision deficiency, which a conventional rainbow does not. Batlow is the
default for relative acoustic impedance and vik is available for any signed
attribute. Amplitude volume transform defaults to gray, since it is read like a
seismic section.

**Three-band RGB blend.** Low, middle and high frequency bands mapped to red,
green and blue. Color then shows which part of the spectrum carries the energy
rather than how much there is, which separates intervals that look alike on
amplitude. On narrow-bandwidth legacy data the bands are placed around the
chosen center frequency rather than across the whole spectrum.

## Comparing several attributes

Tick what you want in the Attributes tab and press Show. One selected is drawn
full width with its own axis and color bar; several are drawn as a grid on a
shared time axis, and each panel can be dismissed from its own header. The analytic trace and structure tensor are
computed once for the whole set, so eight attributes on a 500,000-sample crop
take under a second.

Below the panels is a Pearson correlation matrix for the displayed set. It
answers the question the panels cannot: whether these are different
measurements. On COCORP Wyoming Line 1, envelope correlates 0.98 with RMS
amplitude, 0.97 with sweetness and 0.91 with Teager-Kaiser energy. Those four
give four panels and one dimension. Coherence and linearity correlate 0.78,
both coming from the structure tensor.

The default selection -- envelope, cosine of phase, average frequency, average
bandwidth, apparent dip and in-line coherence -- was chosen from those measured
values so that no pair exceeds 0.5.

Two limits on reading the matrix. Correlation is computed on signed values, so a
signed attribute and a magnitude can read near zero while their magnitudes track
each other. And Pearson correlation sees linear association only; two attributes
related through a curve can read low and still carry the same information.

## Relief shading

Two entries in the attribute list, "Relief shading" and "Relief over
amplitude", treat the section as a surface whose height is the amplitude and
shine a directional light across it. The image is the Lambertian response of
that surface rather than a color lookup on the amplitude. This is analytical
hillshading, the standard method for rendering terrain, applied to seismic;
Lynch has applied it to seismic under the name High Visual Resolution
Interpretation. It runs on the full 783 by 2501 line in 361 ms.

Amplitude is normalized by its 98th percentile before the surface is built, so
the relief control behaves the same whatever the data are scaled to: multiplying
a section by 10^6 changes the shading by one part in 10^6. A flat area returns
exactly the sine of the light elevation.

Azimuth matters more than anything else. Amplitude ridges run along bedding, so
lighting across bedding renders the layering while lighting along it renders
lateral breaks and leaves the layering flat. Surface smoothing matters too: a
raw section oscillates at the wavelet period, and with no smoothing the shading
renders that corrugation rather than the structure.

**What it responds to** is lateral change in the shape of the amplitude
surface: ridge height follows amplitude, ridge width and spacing follow bed
thickness and tuning, ridge tilt follows dip, and a ridge ends at a
termination. On a synthetic containing a tuning wedge, a gradual brightening
and a fault, the lateral swing through each feature in units of the display's
own spread was 6.8 times larger on the shaded image than on the amplitude for
the wedge, 2.4 for the brightening and 15.5 for the fault, with lateral detail
through the wedge 20 times stronger. The synthetic sample line carries a tuning
wedge from CDP 1250 to 1420 for this reason.

**Where it does not work.** The method needs a well-behaved surface more than
any particular feature. On COCORP Wyoming Line 1, at 14 Hz and an 8 ms sample
interval, a wavelet cycle spans under nine samples, the gradient down the trace
is about 2.7 times the gradient along a reflector, and the shading renders a
herringbone of the wavelet rather than structure. Resampling to a display grid
does not fix it; on that line the plain amplitude display is more readable.

The shading adds no information the amplitude did not already carry, so nothing
seen in it is evidence on its own. Confirm a feature against the amplitude or an
attribute before interpreting it.

## Adjusting the color scale

Click the scale strip under any attribute panel, or the color bar beside the
single attribute panel, and an editor opens for that attribute: color map,
invert, a clip percentile, and explicit minimum and maximum. Nothing is
recomputed, since only the value-to-color mapping changes.

The clip percentile is the quick fix for a display dominated by a few extreme
samples: at the 99th percentile one percent of samples sit at an end of the bar,
at the 95th five percent do. Signed attributes stay symmetric about zero so
polarity remains readable. Explicit minimum and maximum matter when comparing
two crops or two lines, because the automatic range is computed per attribute
per crop and the same color otherwise means different values in each panel.

Choices are held per attribute and cleared when the crop, file or attribute set
changes. The three seismic panels keep using the section color and clip in the
Display tab, so input, kept and removed stay on one scale.

## Clustering

"Cluster with a self-organizing map" in the Attributes tab fits a grid of nodes
to whichever attributes are displayed, standardised first, and labels every
sample with its closest node. Node color follows position on the grid, so
neighboring classes take neighboring colors; the legend shows the grid with
each node sized by how many samples it took. A 330,000-sample crop with six
attributes on an 8x8 map trains and classifies in about 2.4 seconds.

**The null test is the point of it.** A clustering method always returns
clusters, and on data with no spatial structure the result looks as organized
as on data with plenty. The second button trains the same map twice: once on
the attributes, once on a version with the phase of each trace randomised
independently, which keeps every attribute's spectrum and histogram while
destroying the relationship between one trace and the next. It then reports how
often adjacent traces share a class in each case.

On a crop of Wyoming Line 1 the answer is 27.7 percent against 2.0 percent for
the null, a ratio of 14. On synthetic data built with no structure at all the
same procedure returns 1.08, and on synthetic data with three known facies it
returns 4.4 while separating those facies into non-overlapping sets of nodes.
A ratio near 1 means the classes are an artifact of the method.

The comparison is lateral only. The null preserves each trace's own spectrum,
so vertical smoothness survives it, and counting vertical agreement would
measure smoothness rather than organization.

## Learn more

Every filter group and the attribute picker carry a "Learn more" button, and
there is a Reference button in the page header. All of them open the same
window, scrolled to the topic you asked for, and it stays open beside the tool
so it can be read while the controls are being worked.

There are 23 topics: the three panels, the three filters, and all 19
attributes. Each attribute entry is in four parts -- what the attribute
measures in the wavefield, what high and low values correspond to, what those
values commonly indicate in the earth, and the limitations and assumptions of
the measurement. Filter entries substitute a description of the controls for
the second part.

The separation is deliberate. What an attribute measures is a property of the
arithmetic and holds everywhere; what it indicates geologically is an empirical
association, often established in a particular setting, and is stated as such
with its source where there is one. The window is a separate document, so it
can be moved to a second monitor or printed.

## The control rail

Four tabs, so the controls stay on one screen:

    Data          load a file, read its headers, set a crop
    Filters       f-k dip and frequency rejection, structure-oriented
                  smoothing, detail boost
    Attributes    pick one, with its own parameters
    Display       color, clip, gain, panel height, AGC, and export

Tabs hide state, so each one carries a small red badge when something behind it
is active: a count of how many filters are on, a mark when an attribute is
selected, a dot when the data is cropped. Left and right arrows move between
tabs when one has keyboard focus.

## Crop

Drag a box on the input panel, or type trace and time bounds into the crop fields.
Everything downstream operates on the crop: the filters run on it, the removed
panel is computed from it, and the SEG-Y export writes it.

This matters most for the f-k filter, which is not a local operation. A wedge
reject in the f-k plane has an impulse response that spans the whole section, so
restricting the aperture changes the answer everywhere and not only near the new
edges. On the included test line, cropping to 240 traces by 500 samples and then
rejecting dips above 0.20 differs from rejecting on the full line and then cropping
by about 7 percent RMS in the interior of the crop, and 12 percent including the
edges. Neither answer is wrong. They are answers to different questions, and the
difference is a reasonable thing to show students.

Structure-oriented smoothing and detail boost are local, so for them cropping only
affects a border a few samples wide.

## Export

The kept panel can be written back out as SEG-Y: rev 1, format 5 IEEE float,
big-endian, with the CDP numbers carried through and the crop's start time recorded
as the delay recording time in bytes 109-110, so a cropped section lands at the
right time when you reload it. The textual header records the filter parameters
that produced the file. AGC, clipping and display gain are not applied to the
export — the amplitudes are the filtered amplitudes.

PNG export of the kept and removed panels writes what you see, at the data's own
sample resolution.

## Running it from a local copy

Everything is in `index.html`. Save it and it works offline, with the sample
lines alongside it in `data/`. Browsers block reading local files from a page
opened directly off disk, so serve the folder if you want the sample buttons to
work:

    python3 -m http.server

Dragging your own file onto the page needs no server at all.

## What is in this repository

    index.html      the tool; this is the whole application
    data/           the sample lines, see data/README.md
    figures/        published figures, see figures/README.md
    make_segy.py    regenerates the synthetic line, needs NumPy
    NOTICE.md       the COCORP data and the published figures, and their terms

## Citation

Bedle, H., Kept and Removed: a browser tool for separating components of 2D
seismic images. University of Oklahoma.

## License

The tool, its documentation, its reference text and the synthetic data are
Creative Commons Attribution-ShareAlike 4.0 International. Use them, teach with
them, modify them, including commercially; credit the source and share
derivative work under the same terms.

The COCORP data and the published figures are third-party material under their
own terms and are **not** covered by that license. See `NOTICE.md`.
