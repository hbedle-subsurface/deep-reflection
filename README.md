# Deep Reflection

### Filters, attributes, and what each one leaves out

Run a legacy 2D seismic line through filters and attributes in the browser, and
see what each one leaves out. Free to use, nothing to install, and the file never
leaves your machine.

**[Open the tool →](https://hbedle-subsurface.github.io/deep-reflection/)**

Dr. Heather Bedle, University of Oklahoma, with the
[AASPI](https://www.ou.edu/mcee/labs/aaspi) consortium.

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

## The landing page

Before a file is open the stage carries an introduction rather than an empty
frame. It opens with a kicker, a question and a drawing: the same section as
recorded, after a filter, and as an attribute, with a dipping event cutting flat
layering through all three. The drawing is a hand-built SVG, not data, so it
carries no licensing and costs no load time.

Under it the argument runs in five short blocks rather than as continuous prose.
A lede states the point — attributes are ordinary practice on modern 3D data and
almost never run on legacy 2D lines, so a large archive has had one pass over it
and very little since. Three cards carry the rest: **Legacy 2D**, on profiles
recorded decades ago and still read the way they were read then; **the deeper
crust**, on the features an attribute reads well and a wiggle display reads
badly; and **modern data too**, since nothing here is specific to old data and
legacy data is where the unworked ground is, not where the methods stop.

Two quieter blocks close it. **A first look, not the last word** says that every
attribute here is one version of a method that has several, with the parameters
that matter fixed or reduced to a single slider, and points at the
[AASPI consortium](https://www.ou.edu/mcee/labs/aaspi) for the full versions with
the control and quality control that real work needs. **It runs here, on one
thread** covers the waiting and the fact that the file never leaves the machine.

The two sample lines and the file chooser sit under all of it, so the first click
does something.

## Waiting

Everything runs on the one thread the page has, so a few seconds of nothing
moving looks like a page that has stopped rather than one that is busy. A fixed
note in the corner names what is being computed while it is being computed:
applying the filters, computing six attributes, recomputing them for the filters
now set, training the map, building the co-render. Each site that used to flip an
unlabelled "working" flag now says what the wait is for, so a slow moment is
attributable to the thing that caused it.

Opening a file is three pieces of work with nothing on screen between them:
reading the bytes, parsing the headers and traces, and the first pass of
measurement and filtering. A modern 2D line is large enough that all three take
real time. Each stage yields to the browser before it starts so the note can be
painted, the read reports a percentage for files over about 4 MB, and once the
headers are parsed the note says how big the thing being opened turned out to be
— "4,213 traces of 1,500 samples — measuring and drawing" — which is the
reassurance actually wanted while the rest runs.

One CSS note, since it caused a visible bug: `[hidden]` is now enforced with
`!important`. A rule that sets `display` outranks the user agent's `[hidden]`
rule on specificity, so the calculating note, being `display:flex`, stayed on
screen after its hidden attribute was set and never went away.

## Getting started

Open the link. The Guide tab runs down the left, seven steps in the order they
are usually needed on a legacy line: load, measure the band, crop, set the gain,
separate on dip and frequency, run an attribute, and read what was left out.
Each step has a button that performs it and leaves its result on the panels, and
each marks itself done once the thing it sets is set. The button at the top runs
the whole sequence at once on the loaded line, and every setting it makes stays
adjustable afterwards.

Nothing in the guide is required. Press **Load** on one of the sample lines,
drag a box on the input panel to crop, turn on a filter in the Filters tab, and
watch the removed panel rather than the kept one.

To use your own data, drag a SEG-Y file onto the page. Any extension: legacy
archives use .sgy, .segy, .bin, .sgd and often nothing at all.

Every filter and every attribute has a **Learn more** button. They open one
reference window that stays beside the tool, so it can be read while the
controls are being worked. Thirty topics, each covering what the thing
measures, what high and low values correspond to, what that usually indicates in
the earth, and where the measurement fails.

## Bandwidth

Frequency content is the first thing that separates legacy 2D from modern data,
and it is not in the trace headers. The Bandwidth panel measures it on the input,
before any filter in the tool: each trace of the crop is tapered over a window,
Fourier transformed, and the magnitudes averaged across traces. The left display
is that average in decibels; the right is the same measurement repeated in
windows stepped down the section, with the peak frequency of each window drawn
over it.

Both curves in the left display are referenced to the peak of the crop average
rather than to their own, so a window whose energy has decayed sits lower on the
axis instead of being renormalized to fill it. The reported numbers are the peak
frequency, the frequencies 6 decibels below it, the frequencies 20 decibels below
it, and the quarter wavelength that follows from the peak and the velocity
entered under Display.

On COCORP Wyoming Line 1 the crop average peaks near 15 Hz and is within 6
decibels of that between about 8 and 25 Hz, against a Nyquist frequency of 62.5
Hz at the 8 ms sample interval. The peak falls from about 21 Hz at 1 second to
about 11 Hz at 20 seconds, and a shelf at 35 Hz marks a filter left by the
original processing. At 15 Hz and 6 km/s the dominant wavelength is 410 m and a
quarter of it is about 100 m, which is the separability limit the section is
working against.

The measurement feeds three things that would otherwise be guesses. A button sets
the f-k pass band to the 20 decibel limits, so the band being passed is the band
the data has. A second sets the center frequency of the spectral band attribute
and the RGB blend to the measured peak, since bands outside the data return
noise. And the analysis window of the windowed attributes carries a note giving
its length in cycles of the measured dominant frequency, which is the number that
matters rather than the milliseconds.

Opening a file sets the band center and the attribute window from the measurement
automatically. The window length and its position down the record are both
sliders, so the narrowing of the band with depth can be watched rather than
described.

## Gain, measured rather than assumed

The guide's gain step used to apply t squared, which is the conventional
correction for spherical divergence on a raw stack. It is wrong for most archived
legacy data, and badly wrong for the sample line: applying it to COCORP Wyoming
Line 1 washes out the top of the record and saturates everything below about 8
seconds.

The reason is that the file has already been gained. The RMS of the crop is now
fitted against time in logarithms, and the exponent that comes out is the one a
t-power gain has to undo. Wyoming Line 1 falls as t^-0.41, only 9 dB across 20
seconds, because it is the coherency-filtered stack as archived and whatever gain
the 1976 processing sequence applied is already in it. A t squared correction on
top of that multiplies the deep record by roughly 50 dB more than the decay it is
correcting. The synthetic, which carries real spherical divergence loss and
nothing else, measures t^-0.89.

The guide step and the button under the exponent slider both set n from that
measurement. The note beside them reports the measured decay in decibels over the
record and says when the figure is far enough below 1 to indicate the file was
gained before it was archived. The slider stays where it is; nothing here stops
you setting the exponent by hand.

## Dip, measured rather than guessed

The f-k dip limit is expressed in samples per trace, which is the right unit for
the transform and a hard one to picture. Two notes sit under the slider. The
first converts the current limit to an angle, given the trace spacing and
velocity entered under Display. The second reports the dip distribution actually
present: the structure tensor is computed over the section, samples whose
linearity is below 0.5 are discarded because the tensor returns an orientation
whether or not there is an event to orient, and the median, 90th and 98th
percentiles of what remains are reported.

A button sets the limit above almost all of that distribution. Steeply dipping
geology is a small fraction of the samples on any section and sits at the top of
the range, so a limit taken from the middle of the distribution removes the thing
the line was shot to image. On Wyoming Line 1 the median is 0.18 samples per
trace and the 98th percentile 0.93, while the Wind River thrust at 30 degrees is
near 2.1 at 100 m spacing and 6 km/s. The dip statistics are measured on the
unfiltered input, since taking them from f-k filtered data would be circular.

## A place to start on the Wyoming line

1. Load COCORP Wyoming Line 1 and crop to roughly 2 to 6 seconds.
2. In the Display tab set the exaggeration to 3 and press Apply. Note what
   happens to the apparent dips.
3. Turn on the f-k filter and lower the dip limit until the removed panel starts
   to show reflector geometry. Read off the equivalent angle.
4. Turn on structure-oriented smoothing with edge protection at 0, then at 4.
   Watch the removed panel rather than the result.
5. Press Default set and read the correlation matrix before reading the panels.
   Decide how many independent measurements you are actually looking at.

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

## The default set

Six attributes, built for deep crustal reflection data around four questions:
how reflective an interval is, where the reflective packages begin and end, what
the fabric is doing, and what the earth has done to the frequency content.

    amplitude volume transform   package boundaries; zero mean, so it survives
                                 the amplitude decay down a crustal record
    RMS amplitude                reflective against transparent, the measurement
                                 under most of the crustal literature
    apparent dip                 a thrust cutting subhorizontal fabric
    in-line coherence            lateral continuity of that fabric
    average frequency            the attenuation trend, and departures from it
    average bandwidth            laminated intervals against isolated events

The amplitude volume transform anchors the set. Over a run of all twenty
attributes on Wyoming Line 1 its largest correlation with anything else was 0.12,
which is the most independent measurement available in the tool. Within the set,
at the default windows, the strongest pair is RMS and coherence at 0.57 and the
next is bandwidth and coherence at 0.46; apparent dip stays below 0.03 against
every other member.

Envelope, sweetness, RMS amplitude, Teager-Kaiser energy and spectral band all
correlate above 0.82 with each other on this line, so only one of them is in the
set. Coherence and linearity correlate 0.64, so both are not. Cosine of phase is
not here either: its argument is that it carries weak deep events at full
strength, but amplitude normalization applies equally to noise, and the deep half
of a legacy crustal record is not signal-dominated, so the panel is a gray hash.
It reads usefully beside the envelope, which says where it means anything.

None of the six separates a primary from a multiple. A coherent multiple train
reads as high RMS, high coherence and clean package boundaries, which is the
objection Zawislak and Smithson (1981) raised against the deep events on this
line. An attribute set makes that energy more legible, not more diagnostic.

A line opens on this set. The first line of a session opens on the transform
alone if it is larger than about 1.2 million samples, since six attributes on a
20 second uncropped profile is several seconds of work before anything appears.

## Windows, and where their defaults come from

Three parameters used to be fixed numbers that meant different things on
different data. All three are now set from the measured dominant frequency when
a file is opened, and all three remain sliders.

**Event window and interval window.** These were one control. They cannot be:
the amplitude volume transform is an event-scale measurement and its deep record
goes flat once it is averaged over more than about three cycles, while average
frequency and bandwidth are trace-to-trace scatter until they are averaged over
about three. The event window drives the transform and the semblance length; the
interval window drives RMS amplitude, average frequency and average bandwidth.
They open at 1.5 and 3 cycles of the measured peak, which on Wyoming Line 1 at 15
Hz is 102 and 200 ms.

**Dip estimation window.** The gradient structure tensor is smoothed over a
Gaussian measured in samples, so a fixed default is a different physical length
on every survey. It opens at half a dominant period, 4.3 samples on the 8 ms
Wyoming line against the 3.0 the slider used to start at. The dip domains are
visibly cleaner for it and the measured 98th percentile of reflector dip falls
from 1.04 to 0.97 samples per trace.

**Semblance length.** This was 15 samples, which is 120 ms on 8 ms data and 30 ms
on 2 ms data, or roughly two wavelet periods in one case and less than one in the
other. It now follows the event window, which is where semblance is conventionally
set. Taken from the interval window instead it smooths toward RMS amplitude and
the correlation between the two rises from 0.57 to 0.62.

The trace aperture of the semblance is fixed at five traces. On a 2D line the
measurement is along the line only, so a fault striking with the section produces
no waveform difference between neighboring traces and is not detected at any
aperture.

## Cropping

Dragging a box on the input panel crops, and so do the four numeric fields.
Every crop pushes the one it replaced onto a stack of up to 24, so **Undo crop**
walks back through them one at a time. Ctrl+Z does the same from anywhere except
inside a text field. The button says what it goes back to, since a stack of crops
all look alike from the outside, and **Whole line** is itself an undoable step.
Opening a file clears the stack.

## Relief shading

Hillshading treats the section as a height field, which a raw seismic section is
bad at being: it changes sign every half cycle, so the surface is corrugated at
the wavelet period before any structure is in it. On Wyoming Line 1 a cycle spans
8.8 samples at 14 Hz and 8 ms, and the old shading rendered a herringbone of the
wavelet across the whole image.

Three changes, all of which follow from measuring the wavelet rather than
assuming it:

**The surface is the envelope by default.** It does not change sign, so it rises
once per reflection instead of once per half cycle. The amplitude remains
available for comparison, and still herringbones.

**The level is divided out.** The height was scaled by one percentile for the
whole section, so on a record whose amplitude falls by orders of magnitude the
deep half came out flat at any relief setting. Dividing by a long vertical
average of the envelope leaves the shape and removes the level, and the shading
then means the same thing at 3 seconds and at 15.

**Smoothing is measured in wavelet periods, and is anisotropic.** One sigma for
both directions is wrong here: the corrugation to be removed is a length in
samples and the lateral detail to be kept is a length in traces, and on legacy
data those are nothing like the same number. The control now reads in periods of
the measured dominant frequency, so 0.4 means the same thing on an 8 ms legacy
line and a 2 ms modern one. The note under it gives the translation into samples
and traces for the loaded file.

The relief scale is also solved for rather than set. A vertical exaggeration of 1
means nothing on its own, since it is a height divided by the percentile of a
surface whose units change with all of the above. What reads the same on every
dataset is the fraction of the image on the ambient floor, so the scale is
bisected to put two percent there. On Wyoming Line 1 that is 1.75 on the envelope
and 1.45 on the amplitude. Moving the slider takes the solving off for the rest
of the session.

Below about six samples per cycle nothing rescues the shading, because by then
the envelope itself is barely resolved.

## Aspect, and how the panel is sized

Vertical exaggeration is a ratio of two lengths on screen, so there are two ways
to reach a target and the tool used to offer one. Panel height alone cannot do
it: a crop 34 km across and 22.8 km deep needs a panel about 1400 pixels tall to
reach 2x, and an uncropped 20 second line needs far more than that.

The panel now opens at **2x**, which is where reflection interpretation is
usually done, and reaches it on both axes. Height is taken first, up to a cap
that keeps the first view navigable; whatever is still missing comes out of the
width. The aspect is re-solved whenever the crop changes, so a new zone opens at
the same exaggeration the last one did, and moving the height slider takes the
solving off for the rest of the session. The exaggeration box turns it back on
at whatever value it holds.

**Section width** under Display governs the horizontal half of that. It defaults
to solving for the exaggeration, and also offers a fill-the-panel mode and caps
of 16, 8, 4 or 2 pixels a trace. The limit narrows the whole plot grid, so the
time axis, the CDP axis and the color bar move in with the image rather than
being left behind, and a limit that is not binding is not applied at all.

This matters most for narrow crops. A 45-trace crop stretched across the full
width is drawn at 30 pixels a trace: the picture is magnified, not resolved.
Amplitude survives it, because a wiggle stretched sideways is still a wiggle, but
anything with texture smears into horizontal ribbons, and relief shading is the
worst affected since its whole content is the shape of a surface. Solving for 2x
puts the same crop at 3.7 pixels a trace.

The exaggeration note reports both figures: the exaggeration actually reached and
"45 traces across 164 pixels, 3.7 pixels a trace". Above about six pixels a trace
it says the panel is magnified rather than resolved.

## Canvases and browser zoom

Every canvas in a panel is positioned against its container rather than laid out
in flow. A canvas in flow with a percentage height is only as tall as its box
when that box has a definite height, and the fallback when the percentage fails
to resolve is the canvas's own bitmap height. Bitmaps here are sized in device
pixels, so at 250 percent zoom that fallback is two and a half times the panel:
the section spilled past its frame and over the panel below, while the axes
stayed at the size the frame still thought it was. Pinned to the frame, a canvas
cannot set or exceed its own box at any zoom.

The device pixel ratio is also watched directly, with a media query on the
current ratio, since browser zoom can change every bitmap's correct resolution
without changing a single laid-out size for a resize observer to notice.

## Panel layout

The three seismic panels default to sitting **side by side** in one row. Stacked,
a deep line at 2x is three screenfuls of scrolling, and the comparison the panels
exist for is then made from memory. Side by side the y-axis column narrows, which
drops the depth scale on its own, and the first color bar is left in place but
empty so all three frames keep the same width. Below about 1180 pixels of window
the row falls back to stacked.

The arrangement changes what 2x costs. On a 610-trace crop 22.8 km deep, a
stacked panel needs 874 pixels of height to reach 2x; side by side, where the
frame is a third as wide, it needs 249. Both are solved for, so switching
arrangement keeps the exaggeration and changes only the size.

Section width has no meaning side by side, where the three-column grid sets it,
so the control disables itself.

## What the removed panel is made of

Streaks in the removed panel are the question the panel exists to raise, and
looking at them does not answer it, because coherent steep events and the ringing
of a sharp mask edge both appear as streaks. The two are separable by
measurement, and the caption now reports it: the structure tensor is run over the
residual, and what comes back is the fraction well enough oriented to have a dip
at all, and how much of that dips more steeply than the f-k limit.

Ringing follows the edge of the reject cone, so it sits at the limit. Rejected
events lie beyond it. Random noise is not oriented at all.

On COCORP Wyoming Line 1 with the limit at 1.5 samples per trace, 17.9 percent of
the input energy is removed, 78 percent of it is well oriented, and 100 percent of
that dips more steeply than the limit. The streaks are coherent steep events the
filter was set to take. Widening the transition from 0.05 to 1.00 changes the
removed energy only from 18.1 to 16.3 percent, so mask-edge ringing is not what
is being seen. On an unmigrated section this energy is largely diffraction tails,
which the sample-line notes already flag.

Structure-oriented smoothing gives the opposite reading: none of its residual is
oriented, because what it takes is scatter.

## Where the guide lives

The guide used to be a tab in the rail, which was the wrong place for it twice
over. It is prose with buttons in it, and a 260 pixel column built for sliders
gives prose a measure too short to read. And following it meant tabbing away
from it to reach every control it mentions, so the step you were on disappeared
each time you acted on it.

It now runs across the top of the stage as a strip of seven numbered chips.
Closed, the strip is the whole guide: the sequence is legible at a glance and it
costs one line. Clicking a chip opens that step underneath at a readable width,
and only one is open at a time, so opening a step does not push the panels far.
Each chip ticks itself when the thing it describes is done, and the striping
count appears on the attributes chip rather than on a tab. The strip stays in
view while the rail switches tabs underneath it, and **Hide** puts it away
entirely.

The rail is four tabs now instead of five, and holds only controls.

## Rail readability

The five tabs used to be sized as equal fifths, which truncated Attributes and
Display into ellipses; they are sized to their content now and share the slack.

The file chooser and the sample list are the tallest thing in the Data tab and
have done their job once a line is open, so they fold away on load behind a
**Change** button beside the File heading.

The attribute checklist is twenty-one items, which read as one undifferentiated
wall. It is now drawn under the families the reference text already uses:
complex trace, wavelet, energy, geometric, spectral and shading. The parameter
sliders below it sit under their own heading, which appears only when there is
something under it.

Panel widths are watched with a ResizeObserver on the stage rather than only a
window resize listener, since a scrollbar appearing or a rail group opening also
changes the width a panel is given, and the axes are drawn from the laid-out
size.

## Co-rendering two attributes

**Co-render two attributes**, under the attribute checklist, draws one attribute
as a background image and paints a second over it. Both scales are shown beside
the panel, since a blended pixel carries two quantities and neither bar describes
it alone. Nothing is computed that either attribute did not already contain; the
pair is put in one place rather than in two panels, so a spatial relationship
between them is read directly instead of by moving the eye and holding one image
in memory.

The overlay's opacity can be flat, or can follow the overlay's own value in one
of three ways:

    High values opaque          energy, bandwidth, RMS: the interest is at the
                                top of the range
    Low values opaque           coherence, linearity: the meaning is in the
                                breaks, not the continuous parts
    Distance from the middle    signed attributes, where zero is the
                                uninteresting state and both polarities matter

The threshold sets where the ramp begins. Below it the overlay is fully
transparent; at the top of the range it reaches the chosen opacity. The caption
reports the mean opacity over the crop and the fraction that is more than half
overlay, which is the number to steer by: below about ten percent the overlay is
a sparse marking on the background, above about seventy the background is no
longer being read.

Skewed attributes need a low threshold. RMS amplitude and the amplitude volume
transform put most of their samples near one end of their range, so a threshold
set halfway up leaves three or four percent of the crop visible. The ramp is in
value units rather than rank so that it agrees with the color bar, which means
the threshold has to be moved rather than assumed.

The opacity and threshold sliders re-blend without recomputing either attribute,
so they respond immediately. Changing the crop or a filter clears the panel,
since the layers it was built from no longer exist.

## Reading one SOM class at a time

The node key beside the map is the control as well as the legend. Clicking a node
hides that class, clicking again brings it back, and alt-clicking shows that node
alone; alt-clicking the same node a second time restores the rest. **Show all**
and **Hide all** sit in the panel caption.

A hidden class is replaced by the section itself in pale gray rather than by a
blank, so the classes still on screen keep the structure they sit in. Hidden nodes
are drawn as outlines in the key rather than filled, so their color can still be
found. The caption reports how much of the crop the visible classes cover.

A map of thirty-six or sixty-four classes is more than can be read at once, and
most questions asked of one concern two or three of them: whether a class follows
a horizon, whether it stops at a fault, whether two classes that took neighboring
colors are in fact in the same place.

## Striping, and the filter recommendation

The tool measures the correlation between each trace of an attribute panel and
the trace next to it, at zero lag. A value near 1 means neighboring traces carry
the same thing, which is what a laterally continuous feature produces. Below 0.8
the panel is striped.

The finding is reported in three places, because striping is noticed while
looking at the panels rather than at the guide:

- **On each card.** Every attribute in the comparison grid carries its own value
  in its header, in red when it is below the threshold. The panel that is striped
  says so on itself.
- **Above the panels.** A banner names which attributes are affected, why, and
  what can be done about it, with the two filter buttons on it.
- **On the Guide tab.** The same text sits in step 6, and the tab carries a badge
  with the number of striped panels so it is visible from anywhere in the tool.

All three close themselves once nothing on screen is below the threshold, and the
count on the badge falls as each attribute clears it.

Average frequency, average bandwidth, instantaneous frequency and the phase
attributes are computed one trace at a time. Nothing in their definition looks
sideways, so any lateral continuity they show was already in the input and any
scatter in the input passes straight through. RMS amplitude and the amplitude
volume transform average over a window in time, which suppresses the scatter that
reaches them. Apparent dip, linearity and coherence do look sideways, so a low
value there says something about the section rather than about the attribute.

Two filters put lateral continuity into the input, and the guide offers both with
their cost reported by the removed panel. Measured on a 341 x 951 crop of Wyoming
Line 1, with no filters running:

    attribute            none    f-k     f-k + smoothing
    average frequency    0.64    0.78    0.90
    average bandwidth    0.53    0.60    0.79
    apparent dip         0.54    0.99    0.99
    in-line coherence    0.88    0.86    0.90
    RMS amplitude        0.99    0.99    1.00
    removed energy         0%   17.8%   30.9%

Rejecting steep dips is the cheaper of the two and is the whole of the fix for
apparent dip: the speckle on that panel is the steep energy the filter removes.
It does comparatively little for the frequency attributes.

Structure-oriented smoothing is the lever for those, but only once the
edge-protection gate is lowered. The gate scales the smoothing by linearity raised
to a power, and on a section whose linearity is low throughout, as a deep crustal
record is, it holds the filter back nearly everywhere: at the default setting of 2
average frequency moves from 0.64 to only 0.68. The guide's button sets the gate
to 0.5, which gives 0.80 on its own for 26 percent of the input energy. A gate of
0 gives 0.96 for 36 percent and averages across discontinuities narrower than the
smoothing length, producing continuous reflectors where the input had breaks. That
raises the number while destroying the feature, which is the case the removed panel
exists to catch.

The measurement cannot separate scatter from geology. A section whose character
genuinely changes over a few traces reads low, and so does one whose attribute is
noise.

## Keeping the panels in step with the controls

Everything computed from the filtered section stops being true the moment a
filter changes, and a panel that silently disagrees with the controls above it is
worse than no panel. Three things used to go stale.

The **attribute grid** was not recomputed at all: turning smoothing on or off
left six panels showing the previous filter state, with nothing to say so. It is
now marked out of date immediately, dimmed, and recomputed once the changes stop.
The delay is deliberate: a filter slider settles a recomputation on every move,
and six attributes is a second or two of work, so redoing them per move would
lock the controls. The single-attribute panel was always recomputed and still is,
because it is cheap.

The **self-organizing map** and the **co-render** are cleared rather than rebuilt.
Both are deliberate acts that take longer than the filter change that invalidated
them, so redoing them unasked would be worse than removing them; the map says why
it went, and training again gives a map of what is on screen now.

## Sizing the comparison cards

A card in the comparison grid is a fraction of the stage wide, so a height
carried over from the full-width panel leaves it squashed: exaggeration is a
ratio, and the same pixel height against half the width is half the aspect. The
cards used to take 55 percent of the panel height whatever their own width was,
which on a wide shallow crop drew them at about 1x while the sections beside
them were at 2x.

Each card is now solved for the same exaggeration the section is drawn at, from
the width the grid actually gives a column. Columns are set explicitly rather
than left to `auto-fit`, because the height solved has to be the height of the
card that gets drawn and `auto-fit` collapses empty tracks: two attributes on a
wide screen make two columns, not four. Three is the ceiling, which matches the
three sections above and keeps a card wide enough to read.

On a 623-trace crop 2.9 seconds deep, two attributes on a 1600 pixel grid go from
77 pixels tall to 206. On the same crop taken to 11.8 seconds, six attributes come
out at 546.

Each canvas also carries an explicit pixel height rather than a percentage, for
the same reason the section canvases are positioned: a percentage that fails to
resolve falls back to the bitmap size, which is in device pixels.

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

The default selection was chosen from those measured values; see the section
above for what is in it and why.

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

Five tabs, so the controls stay on one screen:

    Guide         a seven-step sequence for a legacy line, with a button
                  on each step that performs it
    Data          load a file, read its headers, set a crop, measure the
                  bandwidth
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

Dragging your own file onto the page needs no server at all. `assets/count.js`
is not needed for anything: if it is missing the page carries on exactly as
before, and it does not count a copy opened from disk or served from localhost
in any case.

## What is in this repository

    index.html          the tool; this is the whole application
    assets/count.js     page-view counting, and nothing else; see its own notes
    data/               the sample lines, see data/README.md
    figures/            published figures, see figures/README.md
    make_segy.py        regenerates the synthetic line, needs NumPy
    LICENSE             CC BY-SA 4.0, with the third-party carve-out
    NOTICE.md           the COCORP data and the published figures, and their terms

`assets/count.js` is the same file used unchanged by the other teaching
repositories under `hbedle-subsurface.github.io`, so one counting account covers
all of them and the page path tells them apart.

## Privacy

Your seismic file is read in the browser and is never uploaded. No slider
setting, no filtered section, no computed attribute and no exported SEG-Y leaves
your machine. The tool makes no network request of its own.

The site records an anonymous page count, with no cookie and no identifier, so
that the modules people actually use are the ones that get improved. See
`assets/count.js`, which explains exactly what is sent and how to switch it off.

## License and citation

Licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Free
to use, adapt and share, including in teaching and including commercially,
provided the source is credited and any adaptation is released under the same
license. If you use it in a course or a talk, a credit line and a link back are
all that is asked. The full legal text is in `LICENSE` at the repository root.

The COCORP data and the two published figures are third-party material under
their own terms and are **not** covered by that license. See `NOTICE.md`.

> Bedle, H. (2026). *Deep Reflection: A Browser-Based Workbench for Filtering and
> Attribute Analysis of Legacy 2D Seismic Lines.* SSRN working paper, University
> of Oklahoma. https://hbedle-subsurface.github.io/deep-reflection/
