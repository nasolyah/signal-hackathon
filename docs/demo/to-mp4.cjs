const { chromium } = require('playwright-core');
const fs = require('fs');
const SRC = process.argv[2], DEST = process.argv[3];
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  const p = await (await b.newContext()).newPage();
  await p.goto('file://' + __dirname + '/blank.html');
  const types = await p.evaluate(() => ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.42E01F', 'video/mp4'].filter((t) => MediaRecorder.isTypeSupported(t)));
  console.log('supported:', types);
  if (!types.length) { await b.close(); process.exit(2); }
  const data = fs.readFileSync(SRC).toString('base64');
  const out = await p.evaluate(async ({ data, type }) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const v = document.createElement('video');
    v.src = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' }));
    v.muted = true; document.body.appendChild(v);
    await new Promise((r) => (v.onloadeddata = r));
    const stream = v.captureStream(25);
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 5_000_000 });
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start(1000); await v.play();
    await new Promise((r) => (v.onended = r));
    rec.stop(); await done;
    const buf = await new Blob(chunks, { type }).arrayBuffer();
    let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
    return btoa(s);
  }, { data, type: types[0] });
  fs.writeFileSync(DEST, Buffer.from(out, 'base64'));
  console.log('saved', DEST, fs.statSync(DEST).size);
  await b.close();
})();
