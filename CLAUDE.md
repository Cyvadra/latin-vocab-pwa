@AGENTS.md

# Latin Vocab — project notes

Mobile-first Latin vocabulary app: Next.js 16 (App Router, Cache Components) + SQLite (content only) + FSRS in the browser.
See README.md for the data/audio pipelines. Always respond in English.

## Commands
- `npm run data` — rebuild everything content-related (CSV → SQLite → mp3 → `public/data/words.json`). **Use `npm run build`, not `npx next build`**: `prebuild` regenerates words.json (it records which audio exists).
- `npm test` (unit), `npm run typecheck`, `npx eslint .`
- E2E (needs a running server, uses system Chrome via playwright-core): `node tests/e2e/{flow,offline,a11y}.mjs http://localhost:3101`
- `npm run gen:zh-hant` after editing `src/lib/strings.ts` or `src/lib/guide-content.ts` (regenerates Traditional Chinese).

## Conventions / gotchas
- Cache Components: never call `Date.now()` during render — use `useNow()` (`src/lib/now.ts`); wrap `params`/`searchParams` readers in `<Suspense>`.
- Progress lives only in `localStorage` (`src/lib/progress-store.ts`); no accounts, no server writes. Imported files are validated by `parseProgress`.
- UI text goes through `src/lib/strings.ts` (en + zh); Traditional Chinese is *generated*, never hand-edited.
- Audio files are `public/audio/<classical|ecclesiastical>/<wordId>.mp3`; `public/sw.js` must keep answering Range requests (Safari).
- Generated/ignored: `data/latin.db`, `public/data`, `public/audio`, `tts/out`, `tts/.venv`.
- `pkill -f`/`pgrep -f` patterns match your own shell command line; find servers with `ss -ltnp` instead.
