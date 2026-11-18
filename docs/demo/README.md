# Backup demo video

`signal-demo.mp4` (H.264, 1280×720, 67 s) — the demo path: a report from the phone → names removed →
the insulin counter 11 → 12 on the Ministry journal → RCA, where «Провести инструктаж персонала» is rated weak.

Re-record (dev server on :3000, it shares the prod DB):

```bash
npm run demo:reset
```

```bash
mkdir -p /tmp/sig-demo && cd /tmp/sig-demo && npm init -y && npm i playwright-core@1.56.1 && npx playwright-core install ffmpeg
```

```bash
cd /tmp/sig-demo && cp "<repo>/docs/demo/record.cjs" "<repo>/docs/demo/to-mp4.cjs" . && echo '<!doctype html><body>' > blank.html && OUT_DIR="<repo>/docs/demo" node record.cjs && node to-mp4.cjs "<repo>/docs/demo/signal-demo.webm" "<repo>/docs/demo/signal-demo.mp4"
```

Then run `npm run demo:reset` again (the recording adds a live report and a user action).
The recorder takes screenshots in a loop: the screencast of new-headless Chrome crops the bottom 84 px.
