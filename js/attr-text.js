/* ======================= attribute descriptions =======================
   Two fields for every attribute, kept apart.

   measures — what the arithmetic does to the numbers in the section. True
              regardless of what was recorded.
   crust    — what that quantity has been found to correspond to, and where
              that correspondence is not established. Most published work on
              these attributes is on sedimentary sections; where that is the
              case, it says so.

   watch    — the conditions under which the number stops meaning what it
              normally means. Optional. */

const ATTR_TEXT = {

/* ---- amplitude and energy ---- */
envelope: {
  measures:"The magnitude of the analytic signal at every sample: the amplitude of the trace with the oscillation of the wavelet taken out. A peak and the trough beside it belong to the same reflection and give the same envelope value.",
  crust:"Marks where energy returned, independent of polarity. In the lower crust it outlines bands of reflectivity as continuous features rather than as sequences of alternating peaks and troughs.",
  watch:"Two reflections closer together than one wavelet length give a single envelope maximum, so the envelope shows an interference pattern rather than a count of interfaces."
},
rms: {
  measures:"The root mean square of the samples in a running window centered on each sample. The window length sets the scale of the measurement.",
  crust:"A measure of energy over an interval. Reflective zones read high whether the reflections inside them are strong and few or weak and many.",
  watch:"The window length controls the result as much as the data does. A window shorter than the wavelet measures the wavelet; one much longer averages across the boundaries of the zone being measured."
},
avt: {
  measures:"The RMS of the envelope over a running window, returned to the polarity of the original trace. Amplitude is measured at the scale of the window and then given back the sign structure of the section.",
  crust:"Shows where energy is concentrated at a scale set by the window rather than by the wavelet, which suits banded lower-crustal reflectivity. It is the attribute this tool opens with.",
  watch:null
},
sweetness: {
  measures:"Envelope divided by the square root of instantaneous frequency. High where the section is both strong and low frequency.",
  crust:"Introduced for clastic sections, where strong low-frequency intervals are often sand-prone. On crystalline crust neither term carries that meaning and the combination has no established interpretation.",
  watch:"Instantaneous frequency in the denominator can approach zero where two events interfere, which sends sweetness to large values that are a property of the estimator."
},
tke: {
  measures:"Teager-Kaiser energy: the square of the trace minus the product of the samples on either side. A nonlinear energy measure that responds to amplitude and frequency together.",
  crust:"Sharpens abrupt changes in the character of the trace, so the tops and bases of reflective zones are narrower than on an envelope image.",
  watch:"Built from differences between adjacent samples, so it responds to sample-to-sample noise as sharply as it responds to the section."
},
tkv: {
  measures:"The lateral variation of Teager-Kaiser energy: how much the energy measure changes from one trace to the next.",
  crust:"High where the character of the section changes across the line rather than along it, which includes faults, terminations, and the edges of reflective bands.",
  watch:"Trace-to-trace amplitude differences left by processing produce the same signature as a real lateral change."
},
rai: {
  measures:"The running integral of the trace, band-limited. Integration turns a series of reflections, which mark interfaces, into a curve that steps between levels.",
  crust:"Approximates impedance change over an interval up to a low-frequency trend that seismic data does not carry. Describes layers rather than boundaries.",
  watch:"The absolute level is meaningless. Only differences within the section can be read, and only over intervals shorter than the missing low-frequency trend."
},

/* ---- frequency ---- */
insfreq: {
  measures:"The rate of change of instantaneous phase with time, in hertz, computed sample by sample.",
  crust:"Where a single wavelet is present the value sits near the dominant frequency of the section. Systematic lowering over a zone has been read as absorption.",
  watch:"Where two events overlap within one wavelet length the phase turns rapidly and the estimate can go negative or far above the band the data contains. Those values are a property of the estimator and not of the rock."
},
wavfreq: {
  measures:"The instantaneous frequency evaluated at the peaks of the envelope, then held constant between them. One value per wavelet rather than one per sample.",
  crust:"A more stable version of the same measurement, because it samples the frequency where a single event dominates and skips the places where events interfere.",
  watch:null
},
avgfreq: {
  measures:"The amplitude-weighted mean frequency of the spectrum in a running window down the trace.",
  crust:"A measurement over an interval rather than at a point. Falls where the section has lost its high frequencies, whether from absorption, scattering or processing.",
  watch:"The window length sets the lowest frequency the measurement can see."
},
avgband: {
  measures:"The amplitude-weighted spread of the spectrum about its mean, in a running window. The width of the band present rather than its center.",
  crust:"Narrow where a single wavelet repeats, wider where the interval contains interference between events at different scales.",
  watch:null
},
band: {
  measures:"The envelope of the trace after a narrow Gaussian bandpass filter centered on one frequency. A single frequency component of the section.",
  crust:"Comparing bands shows where the section carries energy at one frequency and not at another, which responds to the thickness of the features producing the reflections.",
  watch:"A narrow filter in frequency is a long filter in time. The narrower the band, the more the image is smeared vertically."
},
rgb: {
  measures:"Three spectral bands displayed as the red, green and blue channels of one image. White where all three are strong, black where none is, colored where they differ.",
  crust:"Color marks where the frequency content changes across the section. Which color corresponds to which thickness depends on the three center frequencies chosen.",
  watch:"The color is a difference between the three bands and not a rock property. Changing the center frequencies changes every color in the image."
},

/* ---- phase ---- */
insphase: {
  measures:"The argument of the analytic signal, in radians, wrapping from pi to minus pi every cycle.",
  crust:"Amplitude is divided out completely, so a weak event and a strong one are displayed alike. Continuity can be followed through a zone where the amplitude dies away.",
  watch:"Every event looks equally strong, including noise. A phase image of a section with no signal in it still shows continuous-looking bands."
},
cosphase: {
  measures:"The cosine of instantaneous phase. The same information as the phase, without the wrap discontinuity at plus and minus pi.",
  crust:"Used where the wrapping artifact of a phase image interferes with reading continuity.",
  watch:null
},
unwrap: {
  measures:"Instantaneous phase with the jumps at plus and minus pi removed, accumulating down the trace.",
  crust:"The slope of the accumulated phase is the instantaneous frequency, so departures from a straight trend mark changes in frequency.",
  watch:"A single miscounted cycle shifts everything below it on that trace, which shows as a step that is not present in the section."
},
wavphase: {
  measures:"The instantaneous phase evaluated at the peaks of the envelope, held constant between them. One value per wavelet.",
  crust:"Near zero where the wavelet is zero phase, which is the state most processing aims for. Consistent departures indicate a phase rotation left by processing.",
  watch:null
},

/* ---- geometry ---- */
dip: {
  measures:"The orientation of the local fabric from the structure tensor, converted to a slope in milliseconds per trace.",
  crust:"The apparent dip in the plane of the line. A structure striking obliquely to the profile shows a shallower dip than it has.",
  watch:"Dip read off a display is also affected by vertical exaggeration, which is a property of the drawing and not of the data."
},
linearity: {
  measures:"How strongly oriented the image is at each sample, from the eigenvalues of the structure tensor. Zero where no direction is preferred, one where the local fabric is parallel.",
  crust:"Low values mark faults, terminations, and zones where reflections are disrupted. High values mark continuous layering.",
  watch:"Linearity is also high in coherent noise, including residual ground roll and processing artifacts, which are locally parallel in exactly the same sense."
},
coherence: {
  measures:"Semblance between neighboring traces over a short window, computed along the local dip rather than horizontally.",
  crust:"Low where the section changes character across the line. Computing it along dip prevents a steeply dipping but continuous reflector from registering as a discontinuity.",
  watch:"On a 2D line only variation along the profile can be measured. A fault striking parallel to the line produces little or no response."
},
relief: {
  measures:"The section treated as a height field and lit from a chosen azimuth and elevation, as a terrain map is shaded.",
  crust:"A display treatment. It makes low-relief lateral changes visible that a gray-scale amplitude image compresses away.",
  watch:"At high vertical relief the shading follows the corrugation of the wavelet instead of the structure. The shadow fraction reported under the panel is the diagnostic: above a few percent the surface is too steep."
},
reliefrgb: {
  measures:"Relief shading applied over the amplitude image, so the shading carries the lateral structure and the color carries amplitude.",
  crust:"Shows both at once where the two are being compared.",
  watch:"The same shadow limit applies as for relief shading alone."
}

};

/* Which attributes belong to which tab. RAI is grouped with amplitude because
   it is the trace integrated, though what it estimates is impedance. */
const ATTR_GROUPS = [
  {id:"amp",  label:"Amplitude and energy",
   keys:["avt","envelope","rms","tke","tkv","sweetness","rai"]},
  {id:"freq", label:"Frequency",
   keys:["insfreq","wavfreq","avgfreq","avgband","band","rgb"]},
  {id:"phase",label:"Phase",
   keys:["insphase","cosphase","wavphase","unwrap"]},
  {id:"geom", label:"Geometry",
   keys:["dip","linearity","coherence","relief","reliefrgb"]}
];

/* Attributes that need the structure tensor, which is built once and then
   held. */
const ATTR_NEEDS_TENSOR = {dip:1, linearity:1, coherence:1};
