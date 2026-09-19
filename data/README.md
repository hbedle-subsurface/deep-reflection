# Data

    COCORP_WY01_coherency.sgy   COCORP Wyoming Line 1, coherency-filtered stack
    synthetic_2d_line.sgy       synthetic line with a known model

See `../NOTICE.md` for the terms covering the COCORP file.

The synthetic can be regenerated, and its model edited, with:

    python ../make_segy.py synthetic_2d_line.sgy

That needs only NumPy. Changing the noise levels or the horizon list gives a
harder or easier test.
