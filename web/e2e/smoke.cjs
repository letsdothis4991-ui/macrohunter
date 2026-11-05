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
    await p.waitForSelector('text=Welcome to MacroHunter');
    await p.click('text=Use the defaults');
    await p.waitForSelector('text=Harbour Protein Café');
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${out}/${name}-e2e-home.png`, fullPage: true });
    await p.click('text=Harbour Protein Café');
    // example.com has no menu -> should fall back to other ways
    await p.waitForSelector('text=Give MacroHunter the menu', { timeout: 30000 });
    await p.screenshot({ path: `${out}/${name}-e2e-nomenu.png`, fullPage: true });
    await p.click('text=Paste menu text');
    await p.fill('textarea', 'Chicken power bowl $19.50 grilled chicken brown rice greens avocado tahini. Big brekkie $26. Salmon poke $21.');
    await p.click('button:has-text("Read this menu")');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/${name}-e2e-reading.png` });
    await p.waitForSelector('.dish', { timeout: 20000 });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${name}-e2e-menu.png`, fullPage: true });
    await p.click('.dish a:has-text("Check my plate") >> nth=0');
    await p.waitForSelector('text=Checking against');
    await p.setInputFiles('input[type=file]', photo);
    await p.waitForSelector('img[alt="Your meal"]');
    await p.click('button:has-text("Estimate my meal")');
    await p.waitForSelector('text=Compared with the menu', { timeout: 20000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${out}/${name}-e2e-check.png`, fullPage: true });
    await p.goto(`${BASE}/`);
    await p.waitForSelector('text=dishes fit');
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${out}/${name}-e2e-home-after.png`, fullPage: true });
    await p.click('text=Little Bangkok');
    await p.waitForSelector('text=Give MacroHunter the menu');
    await p.screenshot({ path: `${out}/${name}-e2e-noweb.png`, fullPage: true });
    await ctx.close();
  }
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
