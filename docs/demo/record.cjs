'use strict';
// Backup demo video for «Сигнал». Rehearse: node demo.cjs --rehearse   Record: node demo.cjs
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const FFMPEG = require('os').homedir() + '/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, 'video');
const REHEARSAL = process.argv.includes('--rehearse');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1280, H = 720;

const REPORT =
  'Ночью в палате 7 медсестра Нигора чуть не ввела Каримовой Лантус вместо Актрапида, коробки стоят рядом в холодильнике. Заметила перед уколом.';
const WEAK_ACTION = 'Провести инструктаж персонала';

// Hide dev-only chrome (Next.js dev indicator, the break-ui toggle) in every frame.
const HIDE_DEV = `(() => { const add = () => { if (document.getElementById('demo-hide')) return; const s = document.createElement('style'); s.id = 'demo-hide'; s.textContent = 'nextjs-portal{display:none!important}[aria-label="Dev data"]{display:none!important}'; (document.head || document.documentElement).appendChild(s); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add(); })();`;

const STAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#f3f3f3;font-family:"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif;color:#232323;overflow:hidden}
  .stage{display:flex;gap:28px;align-items:flex-start;justify-content:center;padding:22px 28px 0}
  .cap{font-size:14px;color:#686868;margin:0 0 8px 6px;display:flex;align-items:center;gap:8px}
  .cap i{width:8px;height:8px;border-radius:50%;background:#1f7a4d;display:inline-block}
  .phone{width:360px;height:612px;border-radius:40px;background:#232323;padding:10px;box-shadow:0 24px 48px -24px rgba(0,0,0,.35)}
  .phone iframe{width:360px;height:612px;border:0;border-radius:31px;background:#fff;display:block}
  .laptop{width:808px;height:612px;border-radius:16px;background:#fff;border:1px solid #e6e6e6;box-shadow:0 24px 48px -24px rgba(0,0,0,.25);overflow:hidden}
  .laptop iframe{width:808px;height:612px;border:0;display:block}
</style></head><body><div class="stage">
  <div><p class="cap"><i></i>Телефон медсестры · QR в ординаторской</p><div class="phone"><iframe id="phone" src="${BASE}/report?h=A"></iframe></div></div>
  <div><p class="cap"><i></i>Журнал Минздрава · ноутбук</p><div class="laptop"><iframe id="laptop" src="${BASE}/dashboard"></iframe></div></div>
</div></body></html>`;

// ---------------------------------------------------------------- overlays
async function injectOverlays(page) {
  await page.evaluate(() => {
    if (!document.getElementById('demo-cursor')) {
      const c = document.createElement('div');
      c.id = 'demo-cursor';
      c.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>';
      c.style.cssText = 'position:fixed;z-index:999999;pointer-events:none;width:24px;height:24px;left:640px;top:360px;transition:left .45s cubic-bezier(.2,.8,.2,1),top .45s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(1px 1px 2px rgba(0,0,0,.3))';
      document.body.appendChild(c);
    }
    if (!document.getElementById('demo-subtitle')) {
      const b = document.createElement('div');
      b.id = 'demo-subtitle';
      b.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:999998;max-width:1000px;padding:10px 22px;border-radius:999px;background:rgba(35,35,35,.88);color:#fff;font:500 17px/1.35 "IBM Plex Sans",-apple-system,sans-serif;opacity:0;transition:opacity .3s;pointer-events:none;text-align:center';
      document.body.appendChild(b);
    }
  });
}

async function subtitle(page, text) {
  await page.evaluate((t) => {
    const b = document.getElementById('demo-subtitle');
    if (!b) return;
    if (t) { b.textContent = t; b.style.opacity = '1'; } else b.style.opacity = '0';
  }, text);
  if (text) await page.waitForTimeout(900);
}

/** Moves the drawn cursor (and the real mouse) to an element, in any frame. */
async function moveTo(page, locator, label) {
  const el = locator.first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (!box) throw new Error(`moveTo: no box for "${label}"`);
  const x = box.x + Math.min(box.width / 2, 120), y = box.y + box.height / 2;
  await page.evaluate(([x, y]) => { const c = document.getElementById('demo-cursor'); c.style.left = x + 'px'; c.style.top = y + 'px'; }, [x, y]);
  await page.mouse.move(x, y, { steps: 12 });
  await page.waitForTimeout(550);
}

async function click(page, locator, label, after = 900) {
  await moveTo(page, locator, label);
  await locator.first().click();
  console.log('click:', label);
  await page.waitForTimeout(after);
}

async function ensure(locator, label) {
  const ok = await locator.first().isVisible().catch(() => false);
  console.log(`${ok ? 'REHEARSAL OK' : 'REHEARSAL FAIL'}: ${label}`);
  return ok;
}

async function smoothScroll(frameOrPage, selector, top) {
  await frameOrPage.evaluate(([sel, top]) => {
    const el = sel ? document.querySelector(sel) : null;
    (el || window).scrollTo({ top, behavior: 'smooth' });
  }, [selector, top]);
}

// ---------------------------------------------------------------- run
(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    locale: 'ru-RU',
  });
  await context.addInitScript(HIDE_DEV);
  const page = await context.newPage();
  let failed = false;

  // Screenshot capture: exact 1280x720 frames (the screencast of new-headless Chrome crops the bottom).
  const frames = [];
  let capturing = !REHEARSAL;
  let warned = false;
  const loop = (async () => {
    while (capturing) {
      try {
        frames.push({ t: Date.now(), buf: await page.screenshot({ type: 'jpeg', quality: 88, animations: 'allow', caret: 'initial' }) });
      } catch (e) {
        if (!warned) { console.warn('capture skipped a frame:', e.message.split('\n')[0]); warned = true; }
        await new Promise((r) => setTimeout(r, 30));
      }
    }
  })();

  try {
    await page.setContent(STAGE, { waitUntil: 'load' });
    await injectOverlays(page);
    const phone = page.frameLocator('#phone');
    const laptop = page.frameLocator('#laptop');
    const lead = laptop.locator('section[aria-labelledby="lead-h"]');
    const leadCount = lead.locator('[aria-live="polite"]').first();
    await phone.locator('#report-text').waitFor({ timeout: 60000 });
    await lead.waitFor({ timeout: 60000 });
    const patternHref = await lead.locator('a[href^="/pattern/"]').first().getAttribute('href');
    console.log('pattern:', patternHref, 'count before:', await leadCount.textContent());

    if (REHEARSAL) {
      let ok = true;
      ok = (await ensure(phone.locator('#report-text'), 'phone textarea')) && ok;
      ok = (await ensure(phone.getByRole('button', { name: 'Сообщить' }), 'phone submit')) && ok;
      ok = (await ensure(lead, 'dashboard lead card')) && ok;
      await page.goto(BASE + patternHref);
      ok = (await ensure(page.locator('#whys-h'), 'RCA whys')) && ok;
      ok = (await ensure(page.locator('#actions-h'), 'RCA actions')) && ok;
      ok = (await ensure(page.getByPlaceholder('Например'), 'add action input')) && ok;
      ok = (await ensure(page.getByRole('button', { name: 'Добавить', exact: true }), 'add action button')) && ok;
      console.log(ok ? 'REHEARSAL PASSED' : 'REHEARSAL FAILED');
      failed = !ok;
      return;
    }

    // Scene 0 — orientation
    await page.waitForTimeout(1200);
    await subtitle(page, 'Медсестра сканирует QR-код. Без входа и без приложения');
    await moveTo(page, phone.locator('h1'), 'phone title');
    await page.waitForTimeout(1600);
    await subtitle(page, 'Минздрав видит закономерность: 11 случаев путаницы инсулинов');
    await moveTo(page, leadCount, 'lead counter');
    await page.waitForTimeout(2200);

    // Scene 1 — the report
    await subtitle(page, '1 · Медсестра пишет как есть, с именами');
    const ta = phone.locator('#report-text');
    await click(page, ta, 'report textarea', 400);
    await ta.pressSequentially(REPORT, { delay: 32 });
    await page.waitForTimeout(1000);
    await subtitle(page, 'Подпись не нужна. Имя, IP и исходный текст не сохраняются');
    await page.waitForTimeout(1600);
    await click(page, phone.getByRole('button', { name: 'Сообщить' }), 'submit report', 300);
    await subtitle(page, 'Сигнал убирает имена ещё до сохранения');

    // Scene 2 — result + live counter
    await phone.getByRole('heading', { name: /Записано/ }).waitFor({ timeout: 60000 });
    await subtitle(page, '2 · В базу попал только текст без имён, с классификацией ВОЗ');
    await page.waitForTimeout(1200);
    await smoothScroll(page.frames().find((f) => f.url().includes('/report')), null, 260);
    await page.waitForTimeout(2400);
    await moveTo(page, leadCount, 'lead counter');
    await laptop.locator('section[aria-labelledby="lead-h"] [aria-live="polite"]', { hasText: '12' }).waitFor({ timeout: 20000 });
    await subtitle(page, 'В Минздраве счётчик: 11 → 12, в реальном времени');
    await page.waitForTimeout(3200);
    await smoothScroll(page.frames().find((f) => f.url().includes('/report')), null, 620);
    await page.waitForTimeout(2000);

    // Scene 3 — the analysis
    await subtitle(page, '3 · Разбор: ищем причину, а не виноватого');
    await page.waitForTimeout(800);
    await page.goto(BASE + patternHref, { waitUntil: 'load' });
    await injectOverlays(page);
    await page.locator('#whys-h').waitFor();
    await subtitle(page, 'Пять «почему» и причины по шести группам. Всё можно поправить');
    await moveTo(page, page.locator('#whys-h'), 'whys');
    await page.waitForTimeout(2600);
    const right = 'main > div > section:nth-of-type(2)';
    const actionsTop = await page.evaluate((sel) => {
      const s = document.querySelector(sel); const h = document.getElementById('actions-h');
      return h.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop - 24;
    }, right);
    await smoothScroll(page, right, actionsTop);
    await page.waitForTimeout(1800);
    await subtitle(page, 'Меры ранжированы по силе (иерархия RCA²)');
    await moveTo(page, page.getByText('Сильная', { exact: true }), 'strong tag');
    await page.waitForTimeout(1800);

    await subtitle(page, 'Добавим привычную меру: «Провести инструктаж персонала»');
    const input = page.getByPlaceholder('Например');
    await click(page, input, 'add action input', 300);
    await input.pressSequentially(WEAK_ACTION, { delay: 40 });
    await page.waitForTimeout(700);
    await click(page, page.getByRole('button', { name: 'Добавить', exact: true }), 'add action', 300);
    const added = page.locator('li', { hasText: WEAK_ACTION });
    await added.waitFor({ timeout: 40000 });
    await page.waitForTimeout(600);
    await moveTo(page, added.getByText('Слабая', { exact: true }), 'weak tag on added action');
    await subtitle(page, 'Сигнал помечает инструктаж как слабую меру: он не меняет систему');
    await page.waitForTimeout(4200);
    await subtitle(page, 'Сигнал · анонимные отчёты и разбор причин для больниц');
    await page.waitForTimeout(3000);
    await subtitle(page, '');
    await page.waitForTimeout(600);
  } catch (err) {
    failed = true;
    console.error('DEMO ERROR:', err.message);
  } finally {
    capturing = false;
    await loop;
    await context.close();
    await browser.close();
    if (!REHEARSAL && frames.length) {
      const dest = path.join(OUT_DIR, 'signal-demo.webm');
      const fps = 25, step = 1000 / fps, t0 = frames[0].t, t1 = frames[frames.length - 1].t;
      console.log(`frames: ${frames.length} over ${((t1 - t0) / 1000).toFixed(1)} s`);
      const mjpeg = path.join(__dirname, 'frames.mjpeg');
      const out = fs.openSync(mjpeg, 'w');
      let i = 0, n = 0;
      for (let t = t0; t <= t1; t += step) {
        while (i + 1 < frames.length && frames[i + 1].t <= t) i++;
        fs.writeSync(out, frames[i].buf); n++;
      }
      fs.closeSync(out);
      console.log(`encoding ${n} frames…`);
      const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', mjpeg, '-c:v', 'libvpx', '-b:v', '3M', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', dest], { stdio: 'inherit' });
      const code = await new Promise((r) => ff.on('close', r));
      if (code !== 0) throw new Error('ffmpeg exit ' + code);
      fs.unlinkSync(mjpeg);
      console.log('Video saved:', dest);
    }
    if (failed) process.exit(1);
  }
})();
