# Label-reader training kit

Tools for tuning the yarn-label reader in `app.js` (`readYarnLabel`,
`parseYarnLabel` and the `LABEL_PHRASES` phrase bank). Nothing here is loaded
by the app.

"Training" here means measuring rule-based reading against a labelled corpus
and adjusting the rules and the phrase bank. There is no machine-learning
model and no generative AI. The OCR engine (Tesseract) is used as-is.

## 1. Make a corpus

```
python3 generate.py OUT_DIR --train 40 --test 24 --seed 7
```

This builds synthetic ball-band photos from a bank of common label phrasings:
- fiber lines in English, French, German, Spanish, Italian and Dutch
- percentages before or after the fiber name
- length and weight formats
- CYC symbols
- colour and dye-lot styles
- care-text noise

Each label is then degraded like a phone photo: different fonts, tilt, blur,
speckle, a shadow, dark or low-contrast labels, small photos, two columns and
JPEG compression.

The **test** set also uses phrasings the train set never contains. Tune on
`train/`, and only report `test/`. When you change the rules, regenerate with a
new `--seed` before reporting a final number, so the test set is truly unseen.

Needs Pillow and the DejaVu and Liberation fonts.

## 2. Score the reader

```
npm install tesseract.js@5.1.1 @tesseract.js-data/eng playwright   # once, anywhere
node bench.mjs --set OUT_DIR/train --app ../.. --tess PATH/TO/node_modules [--show] [--text]
```

The benchmark:
1. loads `demo.html` in headless Chromium,
2. serves Tesseract from the local `node_modules`,
3. adds the corpus's preset and stash brands to the vocabulary,
4. runs `readYarnLabel` on every image,
5. prints per-field and overall accuracy.

`--show` lists each miss, and `--text` adds the raw OCR text for that label.
`--app` can point at another checkout to compare versions.

## Results when this kit was added

Measured on a corpus generated *after* the last rule change (`--seed 2026`),
so neither set was used for tuning:

| Version | Train (40 labels) | Test (24 labels, includes unseen phrasings) |
|---|---|---|
| Original reader | 50.3% | 50.5% |
| First overhaul (image clean-up and fuzzy matching) | 74.4% | 74.0% |
| Phrase-bank training | **85.0%** | **82.3%** |

Most of what's left is OCR-level: digits the engine misreads ("12B8" read as
"1288", "100" read as "180"), and a few photos too degraded to read at all.
Tesseract's "user words" list was also tried; it made no measurable
difference with its LSTM recognizer, so it isn't used.
