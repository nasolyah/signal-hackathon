# Backup demo video

`signal-demo.mp4` (H.264, 1280×720, 30 fps, exactly 2:00) — the v2-lite path, with no Ministry screens:

1. Phone: a nurse reports a fall in a dark corridor, with names → the names are removed before saving, WHO-framework fields.
2. District (райздрав) page: the falls pattern now spans two hospitals of the district (8 cases).
3. Analyst: «Собрать сводку» → AI draft with measures ranked by strength → «Отправить главврачу».
4. Hospital A: the chief doctor opens the digest (the district sees it was read) and accepts the strong measure.
5. District: Hospital A reacted in a minute, Hospital В has not opened its digest for over 48 h.

## Re-record

Frames come from the Chrome DevTools screencast (~24 fps, smooth); AI waits and page loads are time-compressed,
then `encode.swift` writes a constant 30 fps MP4 with AVFoundation. The recording drives production and writes to
the shared database, so reset before and after.

```bash
npm run demo:reset
```

```bash
cd docs/demo && PW_CORE=<path to playwright-core> node record.cjs --rehearse
```

```bash
cd docs/demo && PW_CORE=<path to playwright-core> FRAMES=/tmp/signal-frames node record.cjs && swift encode.swift /tmp/signal-frames/list.txt signal-demo.mp4
```

```bash
npm run demo:reset
```

`PW_CORE` is any local `playwright-core` (1.5x+); the system Google Chrome is used as the browser.
