import numpy as np, struct

# ---------------- model ----------------
rng = np.random.default_rng(7)
NT, NS, DT = 480, 900, 2000        # traces, samples, us

t = np.arange(NS) * DT * 1e-6      # seconds
x = np.arange(NT)

refl = np.zeros((NT, NS), dtype=np.float32)

def ricker(f, dt, n=101):
    tt = (np.arange(n) - n // 2) * dt
    a = (np.pi * f * tt) ** 2
    return ((1 - 2 * a) * np.exp(-a)).astype(np.float32)

# fault: throw applied to the right of trace 300, grows with depth
def throw(ix, isamp):
    if ix < 300:
        return 0.0
    ramp = min(1.0, (ix - 300) / 12.0)          # narrow damage zone
    return ramp * (14 + 0.02 * isamp)           # samples of downthrow

# horizon set: (base sample, dip in samples/trace, reflection coeff, curvature)
horizons = [
    (110, 0.010,  0.85, 0.0),
    (168, 0.012, -0.60, 0.0),
    (205, 0.014,  0.45, 1.6e-4),
    (262, 0.016, -0.75, 1.6e-4),
    (300, 0.018,  0.50, 2.4e-4),
    (355, 0.020, -0.40, 2.4e-4),
    (398, 0.022,  0.70, 2.4e-4),
    (452, 0.026, -0.55, 3.0e-4),
    (505, 0.030,  0.35, 3.0e-4),
    (560, 0.034, -0.65, 3.4e-4),
    (615, 0.038,  0.48, 3.4e-4),
    (682, 0.044, -0.42, 4.0e-4),
    (740, 0.050,  0.60, 4.0e-4),
]

for ix in x:
    for (s0, dip, rc, curv) in horizons:
        s = s0 + dip * ix + curv * (ix - 240) ** 2
        s = s + throw(ix, s)
        # gentle lateral amplitude variation (the subtle detail to recover)
        amp = rc * (1.0 + 0.16 * np.sin(2 * np.pi * ix / 95.0 + s0))
        si = int(round(s))
        if 0 <= si < NS:
            refl[ix, si] += amp

# a low-relief channel: thin bright event, only present over part of the line
for ix in x:
    if 120 < ix < 205:
        s = 470 + 0.030 * ix + 3.0e-4 * (ix - 240) ** 2 + throw(ix, 470)
        w = np.exp(-((ix - 162) / 34.0) ** 4)     # flat-topped
        si = int(round(s))
        if 0 <= si < NS:
            refl[ix, si] += 0.9 * w

# a tuning wedge: two interfaces converging, so bed thickness sweeps from well
# above tuning down to zero. At 28 Hz and 2 ms, tuning thickness is about
# 9 ms, or 4.5 samples, so the wedge crosses it near trace 355.
for ix in x:
    if 250 < ix < 420:
        top = 430 + 0.026 * ix + 3.0e-4 * (ix - 240) ** 2 + throw(ix, 430)
        thick = 34.0 * (1.0 - (ix - 250) / 165.0)
        ti = int(round(top))
        if 0 <= ti < NS:
            refl[ix, ti] += 0.75
        bi = int(round(top + thick))
        if thick > 0.5 and 0 <= bi < NS:
            refl[ix, bi] -= 0.75

# a dim, subtle amplitude anomaly (flat spot-ish) - the thing a detail boost should reveal
for ix in x:
    if 330 < ix < 415:
        si = 596
        refl[ix, si] += 0.13 * np.exp(-((ix - 372) / 40.0) ** 4)

w = ricker(28.0, DT * 1e-6)
data = np.array([np.convolve(refl[i], w, mode='same') for i in x], dtype=np.float32)

# spherical-divergence style gain loss so AGC has something to do
data *= np.exp(-1.4 * t)[None, :]

# ---- noise: random (incoherent) + a coherent steep linear artifact ----
data += 0.020 * rng.standard_normal(data.shape).astype(np.float32) * np.exp(-1.0 * t)[None, :]

# coherent dipping noise train (like a migration artifact / ground roll remnant)
coh = np.zeros_like(data)
for k, (s0, dip, amp) in enumerate([(150, -0.55, 0.05), (330, 0.62, 0.045), (520, -0.70, 0.04)]):
    for ix in x:
        s = s0 + dip * ix
        si = int(round(s))
        if 0 <= si < NS:
            coh[ix, si] += amp
coh = np.array([np.convolve(coh[i], w, mode='same') for i in x], dtype=np.float32)
data += coh

data = (data / np.percentile(np.abs(data), 99.5)).astype(np.float32)

# ---------------- IBM float encoding ----------------
def to_ibm(a):
    a = np.asarray(a, dtype=np.float64)
    out = np.zeros(a.shape, dtype=np.uint32)
    nz = a != 0
    v = a[nz]
    sign = (v < 0).astype(np.uint32) << 31
    av = np.abs(v)
    e = np.floor(np.log2(av) / 4).astype(np.int64) + 1
    mant = av / np.power(16.0, e.astype(np.float64))
    # guard against mantissa rounding to 1.0
    bump = mant >= 1.0
    e[bump] += 1
    mant[bump] /= 16.0
    m = np.round(mant * (1 << 24)).astype(np.uint32)
    over = m >= (1 << 24)
    m[over] = m[over] >> 4
    e[over] += 1
    out[nz] = sign | (((e + 64).astype(np.uint32) & 0x7F) << 24) | (m & 0x00FFFFFF)
    return out

# ---------------- headers ----------------
txt = [
 "C 1 SYNTHETIC 2D SEISMIC LINE - TEST DATA FOR SEPARATOR TOOL",
 "C 2 CREATED FOR TEACHING / SOFTWARE TESTING.  NOT REAL EARTH DATA.",
 "C 3 AASPI - UNIVERSITY OF OKLAHOMA",
 "C 4",
 "C 5 480 TRACES   900 SAMPLES   SAMPLE INTERVAL 2 MS   FORMAT 1 (IBM FLOAT)",
 "C 6 CONTENT: 13 DIPPING HORIZONS, NORMAL FAULT AT CDP 300 (GROWING THROW),",
 "C 6A A TUNING WEDGE FROM CDP 1250 TO 1420 THINNING TO ZERO,",
 "C 7 A LOW-RELIEF CHANNEL NEAR CDP 160, A DIM AMPLITUDE ANOMALY NEAR CDP 372,",
 "C 8 SPHERICAL DIVERGENCE LOSS, RANDOM NOISE, AND 3 STEEP COHERENT NOISE TRAINS.",
 "C 9",
 "C10 THE DIM ANOMALY AT SAMPLE 596 IS DELIBERATELY NEAR THE NOISE LEVEL.",
 "C11 IT SHOULD APPEAR UNDER DETAIL BOOST OR AGC AND SHOULD SURVIVE SMOOTHING.",
 "C12 THE STEEP NOISE TRAINS ARE THE TARGET FOR F-K FAN REJECTION.",
 "C13",
 "C14 BYTE 21-24  CDP NUMBER",
 "C15 BYTE 181-184 CDP X (SCALAR -1, 25 M SPACING)",
]
txt += ["C%2d" % i for i in range(16, 40)]
txt += ["C40 END EBCDIC"]

ASCII_TO_EBCDIC = bytes.maketrans(
    bytes(range(256)),
    bytes(bytearray("".join(chr(i) for i in range(256)).encode('cp037', errors='replace')[:256]))
) if False else None

def ebcdic(s):
    return s.encode('cp037')

tblock = b""
for i in range(40):
    line = txt[i] if i < len(txt) else ""
    tblock += ebcdic(line.ljust(80)[:80])
assert len(tblock) == 3200

bh = bytearray(400)
struct.pack_into('>i', bh, 0, 1)        # job id
struct.pack_into('>i', bh, 4, 1)        # line
struct.pack_into('>i', bh, 8, 1)        # reel
struct.pack_into('>h', bh, 12, 1)       # traces per ensemble
struct.pack_into('>H', bh, 16, DT)      # 3217-18 sample interval us
struct.pack_into('>H', bh, 18, DT)      # 3219-20 orig sample interval
struct.pack_into('>H', bh, 20, NS)      # 3221-22 samples per trace
struct.pack_into('>H', bh, 22, NS)      # 3223-24
struct.pack_into('>h', bh, 24, 1)       # 3225-26 format = IBM float
struct.pack_into('>h', bh, 28, 4)       # trace sorting = CDP ensemble
struct.pack_into('>h', bh, 54, 1)       # measurement system = meters
struct.pack_into('>h', bh, 300, 0x0100) # 3501-02 rev 1
struct.pack_into('>h', bh, 304, 1)      # fixed length trace flag
struct.pack_into('>h', bh, 306, 0)      # no extended headers

with open('/home/claude/synthetic_2d_line.sgy', 'wb') as f:
    f.write(tblock)
    f.write(bytes(bh))
    for ix in range(NT):
        th = bytearray(240)
        struct.pack_into('>i', th, 0, ix + 1)          # trace seq in line
        struct.pack_into('>i', th, 4, ix + 1)          # trace seq in file
        struct.pack_into('>i', th, 20, 1000 + ix)      # CDP number (byte 21)
        struct.pack_into('>h', th, 28, 1)              # trace id = seismic
        struct.pack_into('>h', th, 68, -1)             # coord scalar (byte 71)
        struct.pack_into('>i', th, 180, (500000 + ix * 25) * 1)   # CDP X byte 181
        struct.pack_into('>i', th, 184, 4200000)                  # CDP Y byte 185
        struct.pack_into('>H', th, 114, NS)            # samples this trace (byte 115)
        struct.pack_into('>H', th, 116, DT)            # sample int this trace (117)
        struct.pack_into('>h', th, 104, 0)             # delay recording time
        f.write(bytes(th))
        f.write(to_ibm(data[ix]).astype('>u4').tobytes())

import os
print("wrote", os.path.getsize('/home/claude/synthetic_2d_line.sgy'), "bytes")
print("expected", 3600 + NT * (240 + NS * 4))
print("amp range", data.min(), data.max())
