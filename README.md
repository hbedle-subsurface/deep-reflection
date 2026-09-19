# Cold Case: Legacy Seismic

*Investigating the deep crust*

**[Open the tool](https://hbedle-subsurface.github.io/deep-reflection/)**

The deep reflection profiles shot in the 1970s and 80s, COCORP in the US and its
cousins elsewhere, are still some of the best images we have of the crust below
the basins. Most of them sit in archives as stacked SEG-Y files, and most of the
people who could use them, in tectonics, geochemistry, or a thesis on a mountain
range, don't run seismic attributes and don't have the software to start.

So this is a way in. Drop a legacy 2D line into a browser and work through it:
bring the amplitude back up, see what the band actually is, filter out what
isn't reflection, and look at what every filter took out as well as what it
left. Then compute attributes, let a self-organizing map group them, and use
SHAP values to see which attributes the groups rest on.

Nothing gets uploaded. The file is read in your browser and every number on the
screen is computed there.

## Why "kept and removed"

Old data is noisy and archived stacks have often been filtered once already, so
it's easy to filter a line into something that looks clean and isn't. Every
filter page here shows three panels, the input, what was kept, and what was
removed, with checks that flag when the removed part starts to look like
reflections. If there's a fault plane or layering in the removed panel, the
filter took out geology.

The same idea runs through the classification. The SOM page tests the classes
against a version of the data with the lateral information scrambled out, so a
map that is only sorting noise gets caught, and the SHAP step shows which
attributes did the work.

## What's in it

1. **Open the line**: headers, trace spacing, crop, and a depth scale from a 1D velocity model (AK135 or PREM, with an optional sediment layer, editable)
2. **Amplitude**: the measured decay down the record, and a time gain to restore it
3. **Bandwidth**: the spectrum, and how the band changes down the record
4. **f-k filter**: dip and frequency rejection
5. **Migration**: constant-velocity Stolt migration, and a tool that turns a dragged slope into a dip in degrees
6. **Structure-oriented smoothing**: smoothing along reflectors, with faults protected
7. **Spectral balancing**: time-variant balancing and whitening
8. **Multiples**: pick a shallow reflector and see where its surface, peg-leg and interbed multiples would arrive, plus trace autocorrelations to look for periodicity
9. **Reflectivity**: reflection density, lamella lengths and dips, and correlation lengths, compared between two zones such as upper and lower crust
10. **Attributes**: twenty-two of them, with a correlation matrix and a striping check
11. **Self-organizing map**: pick the attributes and map size, train, run the null test
12. **SHAP**: which attributes decide where each sample lands on the map
13. **Refine and compare**: a second map with a revised set, next to the first

Every panel carries two-way time down the left and model depth down the right,
with the model Moho marked, and the display can be set to a fixed vertical
exaggeration, including true scale. The amplitude step starts on, with the
exponent measured from the line; the filters and migration start off.

## Sample lines

**COCORP Wyoming Line 1**, shot in 1976 across the Wind River Mountains to 20 s
of two-way time, the line that traced the Wind River thrust into the lower
crust. It's the coherency-filtered stack from Cornell's ELLIPSE archive. The
first step carries notes on the line, the published interpretation and the
argument about multiples that followed it.

**A synthetic line** built from a written-down model, with a fault, a channel, a
dim spot and steep noise trains, so any setting can be checked against what's
actually there. `make_segy.py` regenerates it.

## Running it locally

It's a static site, so on GitHub Pages it just works. On your own machine the
browser won't fetch the samples or start the background worker from a
`file://` page, so serve the folder:

    python -m http.server

and open `http://localhost:8000/`.

## Credits and sources

Heather Bedle, University of Oklahoma, with the AASPI consortium.
[Analyze 2D](https://hbedle-subsurface.github.io/analyze-2d/) is a separate
tool for modern processed lines that started from the same engine.

Each attribute is credited to its original authors in the Reference window
inside the tool. The self-organizing map follows Kohonen (1982), SHAP follows
Lundberg and Lee (2017) with the sampling estimate of Strumbelj and Kononenko
(2014), and the amplitude volume transform follows Bulhões (1999).

The COCORP data and the two Brewer et al. (1980) figures belong to others and
carry their own terms; permission status for both is in `NOTICE.md`.

The site keeps an anonymous page count with no cookies; `assets/count.js`
explains what it sends.

## License

[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Use it, teach
with it, adapt it, including at a company, as long as you credit it and share
your changes under the same license.

> Bedle, H. (2026). *Deep Reflection: A Browser-Based Workbench for Filtering
> and Attribute Analysis of Legacy 2D Seismic Lines.* SSRN working paper,
> University of Oklahoma. https://hbedle-subsurface.github.io/deep-reflection/
