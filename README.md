# Latin Vocab

A mobile-first web app for learning the ~1,000 most common Latin words with spaced repetition and audio.

- **Stack:** TypeScript, Next.js (App Router), SQLite (content), Tailwind CSS.
- **Study:** FSRS-4.5 spaced repetition, daily new-word budget, four card styles (Latin / audio-only / meaning / mixed).
- **Audio:** pre-generated TTS in two pronunciations, user-selectable — *classical* and *ecclesiastical*.
- **Languages:** English and Chinese (Simplified or Traditional) UI; English, Chinese or both glosses.
- **No accounts.** Progress lives in the browser (`localStorage`) and can be exported/imported as a JSON backup.
- **PWA:** installable, works offline once audio is downloaded (Settings → Offline).

## Quick start

```bash
npm install
npm run data        # CSV + English glosses -> SQLite -> public/data/words.json (+ audio, see below)
npm run dev         # http://localhost:3000
```

Production: `npm run build && npm start`. Self-hosting needs only Node and the repo; SQLite is read at build time
(and for the per-word pages' metadata), so the running server needs no write access.

## Data pipeline

| Step | Command | Input → output |
| --- | --- | --- |
| Import | `npm run data:import` | `data/latin-core-list.csv` + `data/en/*.tsv` (English glosses) → `data/latin.db` |
| Sentences check | `npx tsx scripts/check-sentences.ts` | validates `data/sentences/*.tsv` (target word present, format) |
| Audio encode | `npm run data:audio` | `tts/out/<system>/<id>.wav` → `public/audio/<system>/<id>.mp3`, rows in `audio` table |
| Export | `npm run data:build` | `data/latin.db` → `public/data/words.json` (what the client loads) |

`public/audio/`, `public/data/` and `data/latin.db` are generated and git-ignored.

### Schema

`words(id, headword, lemma, lemma_plain, pos, pos_detail, semantic, freq_rank)`,
`glosses(word_id, lang, text)` (`zh`, `en`; add more languages as rows),
`audio(word_id, system, engine, path)`,
`sentences(word_id, la, en, zh, source)` (one example per word; `source` is set only for genuine quotations),
`sentence_audio(word_id, system, engine, path)`, `derivatives(word_id, en, it, es, fr)`.

### Forms and example sentences

Declension/conjugation tables are generated in the browser by `src/lib/morph.ts` from the dictionary entry
(principal parts, genitive, gender) — rule-based, with hand-written tables for irregular words; unsupported shapes show no table.
Example sentences live in `data/sentences/*.tsv` (`word_id, Latin, English, Chinese, source`); they were drafted by an LLM and
checked by `scripts/check-sentences.ts`, which uses the same inflection engine to confirm each sentence contains its word.
`/drill` (form-recognition drill) is generated from the same tables: it shows an inflected form of a studied word and asks for
its dictionary word and its case/tense/person; forms that fill several slots accept any of them.
Derivatives (English words; Italian/Spanish/French descendants) live in `data/derivatives/*.tsv`
(`word_id, English, Italian, Spanish, French`; empty columns allowed) — LLM-drafted, reviewed for false cognates.

## Audio pipeline (`tts/`)

Python 3.12 venv with PyTorch (CUDA 12.6 wheels work on the Tesla P100) — see `tts/requirements.txt`.

```bash
python -m venv tts/.venv && tts/.venv/bin/pip install -r tts/requirements.txt
tts/.venv/bin/python tts/generate_classical.py        # -> tts/out/classical/*.wav + report.json
tts/.venv/bin/python tts/generate_ecclesiastical.py   # -> tts/out/ecclesiastical/*.wav + report.json
tts/.venv/bin/python tts/generate_classical.py --sentences       # example sentences -> tts/out/classical/s/
tts/.venv/bin/python tts/generate_ecclesiastical.py --sentences  # -> tts/out/ecclesiastical/s/
npm run data
```

**Classical** uses [`Ken-Z/latin_SpeechT5`](https://huggingface.co/Ken-Z/latin_SpeechT5) (despite the name, a VITS model trained
on Vox Classica; CC-BY-4.0). Notes learned the hard way:

- The tokenizer silently drops macron letters (`abeō` → "abe"), so text is macron-stripped first.
- One-letter inputs crash the model; those words are spoken with their listed variants (`ā ab abs`).
- Each word is synthesised with up to 6 seeds (score = ASR agreement, minus a penalty for drawn-out delivery); a Latin Whisper model (`Ken-Z/latin_whisper-small`) transcribes each candidate and the
  best match wins. Isolated words are out-of-distribution for both models, so treat `report.json` scores as a rough guide.

Weak words can be re-rolled with more seeds: `python tts/generate_classical.py --seeds 16 --ids 12,34,56`. After the first full run,
words with ASR similarity < 0.5 or unusually slow delivery were redone this way (mean similarity 0.811 → 0.822).

**Ecclesiastical** has no ready-made model. `tts/ecclesiastical.py` respells Latin in Italian orthography (c/g softening,
`ti`→`tsi`, `ae`→`e`, silent `h`, …) and marks Latin stress (derived from macrons, diphthongs and consonant clusters) with an
accent; the Italian Piper voice `it_IT-serena-medium` (CC-BY-4.0 dataset) reads it. `python tts/test_ecclesiastical.py` checks the rules.

**Classical, phonetic voice** (`classical-alt`, chosen in Settings → Classical voice): `tts/latin_ipa.py` turns macronized
Latin into restored-classical IPA (vowel length from macrons, penultimate-rule stress, v = [w], ae = [aj]) and the Italian
Piper voice `it_IT-paola-medium` reads the phonemes directly — one take per item, no ASR selection.
`tts/generate_ipa.py` writes `tts/out/classical-alt/{,s/,f/}`. `tts/bakeoff.py` voices a form list through Piper and Kokoro for
listening comparisons.

**Inflected forms**: `npm run data:forms` writes every distinct single-word form in the paradigms to `data/forms.tsv`
(`formKey` in `src/lib/morph.ts`, e.g. `amāvī` → `ama_vi_`). Each generator takes `--forms data/forms.tsv` and writes
`<out>/f/<key>.wav`; `--offset`/`--limit` split a run across workers, and finished files are skipped on restart.
Form recordings live in `public/audio/<source>/f/` and aren't listed in `words.json`; the forms tables request them on tap
and fall back to the device voice. A full run is ~32,000 forms per voice (classical neural model: ~2.5 s/form on an RTX 4080).

`grecromancer` (PolyglotToolkit) was evaluated: its GitHub repository currently contains only a README stub and licence, no code or model.

## Tests

```bash
npm test                      # scheduler, queue, store, formatting (node:test)
npm run typecheck && npx eslint .
# Browser tests (Playwright driving system Chrome) against a production server:
npm run build && npx next start -p 3101 &
node tests/e2e/flow.mjs    http://localhost:3101   # study session, search, settings, export/import, zh/zh-Hant
node tests/e2e/offline.mjs http://localhost:3101   # service worker, cached pages and audio, offline study
node tests/e2e/a11y.mjs    http://localhost:3101   # axe-core WCAG checks, light/dark, 390px and 320px widths
```

## Credits

Vocabulary: Latin Core List. English glosses written for this project. Traditional Chinese converted with OpenCC. Classical audio: Ken-Z (CC-BY-4.0). Ecclesiastical audio: Piper + `serena` voice (CC-BY-4.0).
All audio is machine-generated and may contain errors.
