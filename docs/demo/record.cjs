'use strict';
// Demo video for «Сигнал» (v2-lite path, 2:00): phone report → analyst digest → chief doctor → district.
//   Rehearse (no writes):  PW_CORE=<path to playwright-core> node record.cjs --rehearse
//   Record:                PW_CORE=<path to playwright-core> FRAMES=<dir> node record.cjs
// Frames come from the CDP screencast (~24 fps, smooth), AI waits are time-compressed, then
// encode.swift writes a constant 30 fps H.264 MP4. Writes to the shared DB: run `npm run demo:reset` after.
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'https://signal-hackathon.vercel.app';
const FRAMES = process.env.FRAMES || path.join(__dirname, 'frames');
const REHEARSAL = process.argv.includes('--rehearse');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1280, H = 720, FPS = 30, TARGET_S = 120;

const REPORT =
  'Ночью пациентка Саидова из палаты 4 упала в коридоре — свет не горит уже неделю. Медсестра Дильноза помогла ей встать, у пациентки ушиб колена.';

// Every frame: no dev chrome, and no Ministry link in the role nav (the video is about the district).
const HIDE = `(() => { const add = () => { if (document.getElementById('demo-hide')) return; const s = document.createElement('style'); s.id = 'demo-hide'; s.textContent = 'nextjs-portal{display:none!important}[aria-label="Dev data"]{display:none!important}nav[aria-label="Роль"] a[href="/dashboard"]{display:none!important}nav:has(> a[href="/dashboard"]):not([aria-label]){display:none!important}html{scroll-behavior:smooth}'; (document.head || document.documentElement).appendChild(s); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add(); })();`;

const STAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap"><style>
  html,body{margin:0;height:100%;background:#f3f3f3;font-family:"IBM Plex Sans",-apple-system,sans-serif;color:#232323;overflow:hidden}
  .stage{display:flex;gap:28px;align-items:flex-start;justify-content:center;padding:22px 28px 0}
  .cap{font-size:14px;color:#686868;margin:0 0 8px 6px;display:flex;align-items:center;gap:8px}
  .cap i{width:8px;height:8px;border-radius:50%;background:#1f7a4d;display:inline-block}
  .phone{width:375px;height:612px;border-radius:40px;background:#232323;padding:10px;box-shadow:0 24px 48px -24px rgba(0,0,0,.35)}
  .phone iframe{width:375px;height:612px;border:0;border-radius:31px;background:#fff;display:block}
  .laptop{width:798px;height:612px;border-radius:16px;background:#fff;border:1px solid #e6e6e6;box-shadow:0 24px 48px -24px rgba(0,0,0,.25);overflow:hidden}
  .laptop iframe{width:798px;height:612px;border:0;display:block;transition:opacity .35s ease}
</style></head><body><div class="stage">
  <div><p class="cap"><i></i>Телефон · QR-код в больнице</p><div class="phone"><iframe id="phone" src="${BASE}/report?h=A"></iframe></div></div>
  <div><p class="cap"><i></i>Райздрав · Самаркандский район</p><div class="laptop"><iframe id="laptop" src="${BASE}/district/SAM-1"></iframe></div></div>
</div></body></html>`;

// ---------------------------------------------------------------- overlays
async function overlays(page, fadeIn = false) {
  await page.evaluate((fadeIn) => {
    if (!document.getElementById('demo-cursor')) {
      const c = document.createElement('div');
      c.id = 'demo-cursor';
      c.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>';
      c.style.cssText = 'position:fixed;z-index:999999;pointer-events:none;width:24px;height:24px;left:' + (window.__cx || 640) + 'px;top:' + (window.__cy || 360) + 'px;transition:left .7s cubic-bezier(.22,1,.36,1),top .7s cubic-bezier(.22,1,.36,1);filter:drop-shadow(1px 1px 2px rgba(0,0,0,.3))';
      document.body.appendChild(c);
    }
    if (!document.getElementById('demo-subtitle')) {
      const b = document.createElement('div');
      b.id = 'demo-subtitle';
      b.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:999998;max-width:1040px;padding:11px 24px;border-radius:999px;background:rgba(35,35,35,.9);color:#fff;font:500 18px/1.35 "IBM Plex Sans",-apple-system,sans-serif;opacity:0;transition:opacity .45s ease;pointer-events:none;text-align:center;white-space:nowrap';
      document.body.appendChild(b);
    }
    if (!document.getElementById('demo-fade')) {
      const f = document.createElement('div');
      f.id = 'demo-fade';
      f.style.cssText = 'position:fixed;inset:0;z-index:999990;background:#fff;pointer-events:none;transition:opacity .5s ease;opacity:' + (fadeIn ? 1 : 0);
      document.body.appendChild(f);
      if (fadeIn) requestAnimationFrame(() => requestAnimationFrame(() => (f.style.opacity = '0')));
    }
  }, fadeIn);
}

async function say(page, text, hold = 0) {
  await page.evaluate((t) => {
    const b = document.getElementById('demo-subtitle');
    if (!b) return;
    if (!t) { b.style.opacity = '0'; return; }
    if (b.style.opacity === '1') {
      b.style.opacity = '0';
      setTimeout(() => { b.textContent = t; b.style.opacity = '1'; }, 300);
    } else { b.textContent = t; b.style.opacity = '1'; }
  }, text);
  await page.waitForTimeout(700 + hold);
}

let recast = async () => {};
const cut = { begin: () => {}, end: () => {} };

/** Closing card over the last scene: name, line, link. */
async function endCard(page) {
  await page.evaluate(() => {
    const s = document.getElementById('demo-subtitle'); if (s) s.style.opacity = '0';
    const cur = document.getElementById('demo-cursor'); if (cur) { cur.style.transition = 'opacity .5s ease'; cur.style.opacity = '0'; }
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;inset:0;z-index:999995;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;opacity:0;transition:opacity .8s ease;font-family:"IBM Plex Sans",-apple-system,sans-serif;color:#232323';
    c.innerHTML = '<div style="display:flex;align-items:center;gap:14px"><span style="width:26px;height:26px;border-radius:50%;background:#1f7a4d;display:inline-block"></span><span style="font-size:44px;font-weight:500;letter-spacing:-.02em">Сигнал</span></div>' +
      '<div style="font-size:26px;color:#686868">Анонимные сигналы о рисках для пациентов</div>' +
      '<div style="margin-top:18px;padding:10px 22px;border-radius:999px;background:#a1ffcb;font:500 20px/1.3 \'IBM Plex Mono\',ui-monospace,monospace">signal-hackathon.vercel.app</div>';
    document.body.appendChild(c);
    requestAnimationFrame(() => requestAnimationFrame(() => (c.style.opacity = '1')));
  });
  await page.waitForTimeout(1600);
}

/** Navigate the whole window with a white cross-fade. */
async function go(page, url, ready) {
  await page.evaluate(() => { const f = document.getElementById('demo-fade'); if (f) f.style.opacity = '1'; });
  await page.waitForTimeout(550);
  cut.begin();
  await page.goto(url, { waitUntil: 'load' });
  await recast();
  if (ready) await ready.waitFor({ timeout: 60000 });
  await page.waitForTimeout(300);
  cut.end(500);
  await overlays(page, true);
  await page.waitForTimeout(600);
}

async function moveTo(page, locator, label) {
  const el = locator.first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const box = await el.boundingBox();
  if (!box) throw new Error(`moveTo: no box for "${label}"`);
  const x = Math.round(box.x + Math.min(box.width / 2, 140)), y = Math.round(box.y + box.height / 2);
  await page.evaluate(([x, y]) => { window.__cx = x; window.__cy = y; const c = document.getElementById('demo-cursor'); if (c) { c.style.left = x + 'px'; c.style.top = y + 'px'; } }, [x, y]);
  await page.mouse.move(x, y, { steps: 20 });
  await page.waitForTimeout(800);
}

async function click(page, locator, label, after = 900) {
  await moveTo(page, locator, label);
  await locator.first().click();
  console.log('click:', label);
  await page.waitForTimeout(after);
}

async function scrollBy(frame, dy, wait = 1400) {
  await frame.evaluate((dy) => window.scrollBy({ top: dy, behavior: 'smooth' }), dy);
  await new Promise((r) => setTimeout(r, wait));
}

async function ensure(locator, label) {
  const ok = await locator.first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  console.log(`${ok ? 'REHEARSAL OK' : 'REHEARSAL FAIL'}: ${label}`);
  return ok;
}

// ---------------------------------------------------------------- run
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: [`--window-size=${W},${H + 84}`, '--hide-scrollbars'] });
  const context = await browser.newContext({ viewport: { width: W, height: H }, locale: 'ru-RU' });
  await context.addInitScript(HIDE);
  // The stage frames our own pages; production sends X-Frame-Options: DENY, so drop it for framed documents here only.
  await context.route(/\/(report|district)/, async (route) => {
    const r = route.request();
    if (r.resourceType() !== 'document' || !r.frame().parentFrame()) return route.continue();
    const res = await route.fetch();
    const headers = res.headers();
    delete headers['x-frame-options'];
    return route.fulfill({ response: res, headers });
  });
  const page = await context.newPage();

  const frames = [];
  const cuts = [];
  let cutStart = 0;
  const cutBegin = () => { cutStart = Date.now(); };
  const cutEnd = (outMs) => cuts.push({ a: cutStart, b: Date.now(), out: outMs });
  cut.begin = cutBegin;
  cut.end = cutEnd;
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp * 1000, buf: Buffer.from(data, 'base64') });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  let failed = false;
  const SC = { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 };
  recast = async () => { if (!REHEARSAL) await cdp.send('Page.startScreencast', SC).catch(() => {}); };

  try {
    // The stage is served on the app's own origin (intercepted, never hits the server), so later
    // full-window navigations stay in one renderer process and the screencast keeps running.
    await context.route(BASE + '/__stage', (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: STAGE }));
    await page.goto(BASE + '/__stage', { waitUntil: 'load' });
    await overlays(page);
    const phone = page.frameLocator('#phone');
    const laptop = page.frameLocator('#laptop');
    await phone.locator('#report-text').waitFor({ timeout: 60000 });
    await laptop.locator('#cross-h').waitFor({ timeout: 60000 });
    await page.waitForTimeout(1500);

    if (REHEARSAL) {
      let ok = true;
      ok = (await ensure(phone.locator('#report-text'), 'phone textarea')) && ok;
      ok = (await ensure(phone.locator('select[name="involved_role"]'), 'phone role select')) && ok;
      ok = (await ensure(phone.getByRole('button', { name: 'Сообщить' }), 'phone submit')) && ok;
      ok = (await ensure(laptop.locator('#cross-h'), 'district cross patterns')) && ok;
      await page.goto(BASE + '/analyst?h=A', { waitUntil: 'load' });
      ok = (await ensure(page.getByRole('button', { name: 'Собрать сводку' }), 'analyst build')) && ok;
      ok = (await ensure(page.locator('nav[aria-label="Роль"] a[href="/district/SAM-1"]'), 'role nav (district)')) && ok;
      const ministryHidden = !(await page.locator('nav[aria-label="Роль"] a[href="/dashboard"]').isVisible());
      console.log(`${ministryHidden ? 'REHEARSAL OK' : 'REHEARSAL FAIL'}: ministry link hidden`);
      ok = ministryHidden && ok;
      await page.goto(BASE + '/hospital/A', { waitUntil: 'load' });
      ok = (await ensure(page.locator('main h1'), 'hospital title')) && ok;
      await page.goto(BASE + '/district/SAM-1', { waitUntil: 'load' });
      ok = (await ensure(page.locator('table'), 'district table')) && ok;
      console.log(ok ? 'REHEARSAL PASSED' : 'REHEARSAL FAILED');
      failed = !ok;
      return;
    }

    await cdp.send('Page.startScreencast', SC);
    await page.waitForTimeout(800);

    // Scene 1 — anyone reports a condition, from the phone
    await say(page, 'Сигнал: анонимно сообщить, что в больнице может навредить пациенту', 2400);
    await moveTo(page, phone.locator('h1'), 'phone title');
    await say(page, 'Медсестра сканирует QR-код в больнице. Без входа и без приложения', 1800);
    await moveTo(page, phone.locator('select[name="involved_role"]'), 'role');
    await phone.locator('select[name="involved_role"]').selectOption('nurse');
    await page.waitForTimeout(800);
    await say(page, 'Пишет как есть, своими словами — даже с именами');
    const ta = phone.locator('#report-text');
    await click(page, ta, 'report textarea', 300);
    await ta.pressSequentially(REPORT, { delay: 34 });
    await page.waitForTimeout(800);
    await say(page, 'Подпись не нужна: имя, IP и исходный текст не сохраняются', 1600);
    await click(page, phone.getByRole('button', { name: 'Сообщить' }), 'submit', 200);
    await say(page, 'ИИ убирает имена ещё до сохранения');
    cutBegin();
    await phone.getByRole('heading', { name: /Записано/ }).waitFor({ timeout: 90000 });
    await page.waitForTimeout(400);
    cutEnd(2600);

    // Scene 2 — what was kept, and the district sees the repeat
    await say(page, 'Сохранён только текст без имён — зелёным то, что убрано', 2800);
    const phoneFrame = page.frames().find((f) => f.url().includes('/report'));
    await scrollBy(phoneFrame, 300, 1800);
    await say(page, 'Разметка по рамке ВОЗ: падение, лёгкий вред, ночь, освещение', 2600);
    await scrollBy(phoneFrame, 280, 1600);
    await say(page, 'Райздрав обновляет страницу района…');
    await page.evaluate(() => { document.getElementById('laptop').style.opacity = '0'; });
    await page.waitForTimeout(400);
    const laptopFrame = page.frames().find((f) => f.url().includes('/district'));
    cutBegin();
    await laptopFrame.goto(BASE + '/district/SAM-1', { waitUntil: 'load' });
    await laptopFrame.locator('#cross-h').waitFor({ timeout: 60000 });
    cutEnd(300);
    await page.evaluate(() => { document.getElementById('laptop').style.opacity = '1'; });
    await page.waitForTimeout(500);
    await laptopFrame.evaluate(() => document.getElementById('cross-h').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    await page.waitForTimeout(1300);
    const falls = laptop.locator('li', { hasText: /Падени/ }).first();
    await moveTo(page, falls, 'falls pattern in district');
    await say(page, 'Падения в тёмном коридоре — уже в двух больницах района', 3200);

    // Scene 3 — the analyst builds a weekly digest
    await say(page, 'Раз в неделю аналитик собирает для больницы короткую сводку');
    await go(page, BASE + '/analyst?h=A', page.getByRole('button', { name: 'Собрать сводку' }));
    await say(page, 'Раз в неделю аналитик собирает для больницы короткую сводку', 600);
    await moveTo(page, page.locator('#inbox-h'), 'inbox');
    await page.waitForTimeout(1500);
    await click(page, page.getByRole('button', { name: 'Собрать сводку' }), 'build digest', 300);
    await say(page, 'ИИ готовит черновик: что повторяется и 1–3 меры');
    cutBegin();
    await page.getByRole('button', { name: 'Отправить главврачу' }).waitFor({ timeout: 120000 });
    await page.waitForTimeout(400);
    cutEnd(3500);
    await say(page, 'Аналитик проверяет текст: меры отсортированы по силе', 600);
    await scrollBy(page, 360, 1700);
    const weak = page.getByText('Слабая', { exact: true });
    if (await weak.first().isVisible().catch(() => false)) {
      await moveTo(page, weak, 'weak measure');
      await say(page, 'Слабая мера вроде «предупредить» или «инструктаж» помечена красным', 2600);
    } else {
      await moveTo(page, page.getByText('Сильная', { exact: true }), 'strong measure');
      await say(page, 'Сильная мера меняет среду, а не полагается на память людей', 2600);
    }
    await click(page, page.getByRole('button', { name: 'Отправить главврачу' }), 'send digest', 300);
    cutBegin();
    await page.getByRole('button', { name: 'Отправить главврачу' }).waitFor({ state: 'detached', timeout: 60000 });
    await page.waitForTimeout(400);
    cutEnd(700);
    await say(page, 'Сводка ушла главврачу Больницы А', 1600);

    // Scene 4 — the chief doctor decides
    await go(page, BASE + '/hospital/A', page.locator('main h1'));
    await say(page, 'Главврач открывает сводку — район сразу видит, что её прочитали');
    cutBegin();
    await page.getByText(/Отмечено как прочитанное/).waitFor({ timeout: 30000 }).catch(() => {});
    cutEnd(600);
    await moveTo(page, page.locator('main h1'), 'digest title');
    await page.waitForTimeout(1800);
    const card = page.locator('main ol > li').first();
    await card.scrollIntoViewIfNeeded();
    await scrollBy(page, 260, 1500);
    await say(page, 'Одно решение: выбрать меру и срок — или отклонить с причиной', 800);
    const strong = card.locator('label', { hasText: 'Сильная' }).first();
    if (await strong.isVisible().catch(() => false)) await click(page, strong, 'strong option', 700);
    await click(page, card.getByRole('button', { name: 'Принять меру' }), 'accept measure', 300);
    cutBegin();
    await card.getByText('Мера принята').waitFor({ timeout: 30000 });
    await page.waitForTimeout(300);
    cutEnd(700);
    await moveTo(page, card.getByText('Мера принята'), 'accepted badge');
    await say(page, 'Мера принята со сроком — дальше главврач отметит «Выполнено»', 2400);

    // Scene 5 — the district sees reaction speed, not the number of reports
    await go(page, BASE + '/district/SAM-1', page.locator('table'));
    await say(page, 'Райздрав видит скорость реакции, а не число сигналов', 600);
    const rowA = page.locator('tbody', { hasText: 'Больница А' }).first();
    await moveTo(page, rowA.locator('td').nth(1), 'hospital A reaction');
    await say(page, 'Больница А прочитала сводку за минуты и приняла меру', 2600);
    const rowC = page.locator('tbody', { hasText: 'Больница В' }).first();
    await moveTo(page, rowC.locator('td').nth(1), 'hospital C unread');
    await say(page, 'Больница В не открыла сводку больше двух суток — это видно сразу', 2800);
    await page.evaluate(() => document.getElementById('cross-h').scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await page.waitForTimeout(1400);
    await moveTo(page, page.locator('li', { hasText: /Падени/ }).first(), 'falls in district');
    await say(page, 'И общая причина по району: падения в тёмных коридорах', 2600);
    await say(page, 'Сигнал · условия вместо виноватых — и мера до следующего случая', 2200);
    await endCard(page);
  } catch (err) {
    failed = true;
    console.error('DEMO ERROR:', err.message);
  } finally {
    if (!REHEARSAL) await cdp.send('Page.stopScreencast').catch(() => {});
    await context.close();
    await browser.close();
    if (!REHEARSAL && frames.length) writeTimeline(frames, cuts);
    if (failed) process.exit(1);
  }
})();

/** Resample to a constant 30 fps, compress the AI waits, hold the last frame up to exactly 2:00. */
function writeTimeline(frames, cuts) {
  fs.mkdirSync(FRAMES, { recursive: true });
  frames.sort((x, y) => x.t - y.t);
  const t0 = frames[0].t, t1 = frames.at(-1).t, step = 1000 / FPS;
  const speedAt = (t) => { for (const c of cuts) if (t >= c.a && t < c.b) return (c.b - c.a) / c.out; return 1; };
  const picks = [];
  let i = 0;
  for (let t = t0; t <= t1; t += step * speedAt(t)) {
    while (i + 1 < frames.length && frames[i + 1].t <= t) i++;
    picks.push(i);
  }
  const total = FPS * TARGET_S;
  console.log(`raw ${((t1 - t0) / 1000).toFixed(1)} s, frames ${frames.length}, output ${(picks.length / FPS).toFixed(1)} s before hold`);
  while (picks.length < total) picks.push(picks.at(-1));
  if (picks.length > total) console.warn(`WARNING: ${(picks.length / FPS).toFixed(1)} s is over ${TARGET_S} s`);
  const lines = [];
  let n = 0;
  for (let k = 0; k < picks.length; k++) {
    if (k > 0 && picks[k] === picks[k - 1]) { lines[lines.length - 1][1]++; continue; }
    const file = path.join(FRAMES, `f${String(n++).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, frames[picks[k]].buf);
    lines.push([file, 1]);
  }
  fs.writeFileSync(path.join(FRAMES, 'list.txt'), lines.map(([f, c]) => `${f}\t${c}`).join('\n'));
  console.log(`timeline: ${picks.length} frames (${(picks.length / FPS).toFixed(1)} s), ${n} unique → ${path.join(FRAMES, 'list.txt')}`);
}
