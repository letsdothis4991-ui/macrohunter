// End-to-end smoke test against the local mocks. See README "Testing without keys".
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3100';
(async () => {
  const b = await chromium.launch();
  const out = process.env.SHOTS_DIR || require('node:os').tmpdir();
  const photo = require('node:path').join(out, 'meal.png');
  const errs = [];
  { // a stand-in "meal photo"
    const pg = await b.newPage({ viewport: { width: 600, height: 400 } });
    await pg.setContent('<div style="width:600px;height:400px;background:radial-gradient(#e9c46a,#2a9d8f)"></div>');
    await pg.screenshot({ path: photo });
    await pg.close();
  }
  for (const [name, opts] of [['desk', { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 }], ['phone', { ...devices['iPhone 13'] }]]) {
    const ctx = await b.newContext(opts);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
    await p.goto(`${BASE}/`);
    await p.screenshot({ path: `${out}/${name}-e2e-login.png` });
    await p.fill('input[type=password]', 'nope'); await p.click('button:has-text("Enter")');
    await p.waitForSelector('text=That password isn');
    await p.fill('input[type=password]', 'letmein'); await p.click('button:has-text("Enter")');
    await p.waitForSelector('text=New here?');
    await p.click('text=keep the defaults');
    await p.waitForSelector('text=Harbour Protein Café');
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${out}/${name}-e2e-home.png`, fullPage: true });
    await p.click('text=Harbour Protein Café');
    // example.com has no menu -> should fall back to other ways
    await p.waitForSelector('text=Add the menu', { timeout: 30000 });
    await p.screenshot({ path: `${out}/${name}-e2e-nomenu.png`, fullPage: true });
    await p.click('[role=tab]:has-text("Paste")');
    await p.fill('textarea', 'Chicken power bowl $19.50 grilled chicken brown rice greens avocado tahini. Big brekkie $26. Salmon poke $21.');
    await p.click('button:has-text("Read this menu")');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/${name}-e2e-reading.png` });
    await p.waitForSelector('.dish', { timeout: 20000 });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${name}-e2e-menu.png`, fullPage: true });
    // Tracker and favourites: log the open dish, save it, save the place.
    await p.click('.dish[open] button:has-text("I ate this")');
    await p.waitForSelector('text=Added to today');
    await p.click('.dish[open] button:has-text("Save")');
    await p.waitForSelector('.dish[open] button:has-text("★ Saved")');
    await p.click('button:has-text("Save place")');
    await p.waitForSelector('button:has-text("★ Saved") >> nth=0');
    await p.click('.dish a:has-text("Check my plate") >> nth=0');
    await p.waitForSelector('text=Comparing with');
    await p.setInputFiles('input[type=file]', photo);
    await p.waitForSelector('img[alt="Your meal"]');
    await p.click('button:has-text("Estimate")');
    await p.waitForSelector('text=Versus the menu', { timeout: 20000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${out}/${name}-e2e-check.png`, fullPage: true });
    await p.goto(`${BASE}/today`);
    await p.waitForSelector('text=1 item logged');
    await p.click('button:has-text("Add something else")');
    await p.fill('input[aria-label=Name]', 'Protein shake');
    await p.fill('.manual-grid input >> nth=0', '180');
    await p.fill('.manual-grid input >> nth=1', '30');
    await p.click('button[type=submit]:has-text("Add")');
    await p.waitForSelector('text=2 items logged');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/${name}-e2e-today.png`, fullPage: true });
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Download day")')]);
    const csv = require('fs').readFileSync(await dl.path(), 'utf8');
    if (!csv.includes('Protein shake,,180,30,0,0,manual')) throw new Error('CSV missing manual entry: ' + csv);
    await p.goto(`${BASE}/saved`);
    await p.waitForSelector('.dish');
    await p.waitForSelector('text=Places');
    await p.screenshot({ path: `${out}/${name}-e2e-saved.png`, fullPage: true });
    await p.goto(`${BASE}/today`);
    await p.click('button:has-text("Show dishes that fit")');
    await p.waitForSelector('.seg button.on:has-text("What\'s left today")');
    await p.goto(`${BASE}/`);
    await p.waitForSelector('.fit');
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${out}/${name}-e2e-home-after.png`, fullPage: true });
    await p.click('text=Little Bangkok');
    await p.waitForSelector('text=Add the menu');
    await p.screenshot({ path: `${out}/${name}-e2e-noweb.png`, fullPage: true });
    await ctx.close();
  }
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
