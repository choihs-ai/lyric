# lyric — Kinetic Lyric Motion Engine

Fan-made kinetic-typography lyric video engine that runs in the browser (iPhone Safari first).
The user loads a song file and pastes lyrics they own a copy of; the page analyses the audio,
picks an art direction, renders the motion on a canvas, and records it to MP4/WebM.

## Hard rule
- **Never put song lyrics into this repo** (code, demo text, tests, commit messages). The engine only
  renders text the viewer pastes at runtime; lyrics are stored in the viewer's localStorage only
  (per-project snapshots too; only the audio file goes to IndexedDB, never off the device).
  Demo/test text must be original placeholder sentences.

## Layout
- `src/js/NN_*.js` — modules, concatenated in filename order into one `<script>`:
  - `00_util` math/easing/color/storage, `LANG` + `T(ko,en)` · `10_song` song model, no-audio `manualSong`, in-browser audio analysis + mood features + vocal envelope (`vox`)
  - `20_lyrics` parser (`*emph*`, `**max**`, `(adlib)`, section headers), section slots, line/word timing, KO/EN demo text
  - `25_autosync` vocal envelope (STFT centre extraction → tonal peaks 0.7–4 kHz → floor; consonant + flux tracks), onsets,
    DP line alignment with user-pinned lines as anchors, `vocalConfidence`, tap correction `snapToVocal` (beta)
  - `30_directions` six art directions (fonts, palettes per section role, backgrounds, mode pools, motion, post-FX)
  - `35_director` mood → direction, per-line mode assignment, emphasis, AI director (`sample` capability)
  - `40_text` canvases, font roles (d/s/m/l/h), `A()` alpha convention, layout engine
  - `50_modes` 19 kinetic line treatments + motion-blur ghosts · `55_backgrounds` environments
  - `60_render` frame orchestration, titles, transitions, HUD · `70_post` WebGL finishing pass (2D fallback)
  - `75_export` offline MP4 export: renders `frame(t)` per frame, WebCodecs H.264 + AAC (Opus fallback), in-page MP4 muxer
  - `79_youtube` no-audio mode via an embedded YouTube player (IFrame API) as the playback clock; nothing is downloaded or
    analysed, saved videos stay silent; the player stays visible (≥200×200, movable)
  - `78_projects` several songs per device: snapshots of the rz_* keys, audio in IndexedDB, JSON export/import
  - `80_app` UI, KO/EN switch (`data-en` attributes in the template), playback, tap-sync (from any line, undo, 0.75×), per-line timing editor, save (fast export → realtime MediaRecorder fallback), init
- `src/template.html` — markup + CSS; `/*BUNDLE*/` and `/*FONT_CSS*/` placeholders.
- `PRESETS` in `10_song` is intentionally empty: no third-party song data ships in the app.
- `index.html` — **built output, committed** (GitHub Pages serves it from the repo root).

## Workflow
1. Edit `src/…` (never edit `index.html` by hand).
2. `python3 build.py`
3. `node tools/smoke.js` — must print `no errors`; look at a few frames in `.shots/`. It also checks the line editor and,
   when the browser has WebCodecs, runs a real export to `.shots/export.mp4` (verified with ffprobe/ffmpeg if installed).
4. Commit `src/` and `index.html` together.
- Changing auto-sync? `python3 tools/autosync_bench/mix.py` (needs espeak-ng + numpy) builds TTS test songs with known line
  starts; `node tools/autosync_bench/bench.js` reports accuracy. Current: vocal-led mixes ~68% of lines within 0.15 s,
  ~78% within 0.3 s; mixes with a loud centred lead are flagged by `vocalConfidence` (< 0.33) instead of applied.

## Conventions
- `frame(t)` must stay a pure function of `t` (no wall-clock state) — the offline exporter renders frames out of realtime.
- Modes never set `ctx.globalAlpha` directly; use `A(x)` so ghost/echo passes can scale alpha via `GA`.
- Every size is relative to `U` (1080-short-side units) so 16:9 and 9:16 both work.
- Every UI string needs both languages: `T('한국어','English')` in JS, `data-en` / `data-en-ph` on template elements
  (wrap the text in a `<span data-en>` when the element also contains an input).
- Touch-first UI: ≥44px targets, 16px inputs, `100dvh`/safe-area aware. Wrap storage in try/catch.
