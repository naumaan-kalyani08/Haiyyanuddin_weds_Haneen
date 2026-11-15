// Verifies the hand-off: the matrix just before the end must be ~identity, and the frames either
// side of the seam must match pixel for pixel (within antialiasing noise).
import { chromium } from 'playwright'
import sharp from 'sharp'
const browser = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1254/chrome-win64/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844, isMobile: true, hasTouch: true }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch })
  await page.goto('http://localhost:5180/', { waitUntil: 'load' })
  await page.waitForSelector('.enter.show', { timeout: 60000 })
  await page.click('.enter')
  await page.waitForTimeout(800)
  const go = (p) => page.evaluate((p) => { const st = window.__intro.trigger; window.__getLenis().scrollTo(st.start + p * (st.end - st.start), { immediate: true, force: true }) }, p)
  const shots = {}
  for (const p of [0.9985, 1]) {
    await go(p)
    await page.waitForTimeout(1200)
    shots[p] = await page.screenshot()
    console.log(vp.width, 'p', p, await page.evaluate(() => ({ p: window.__intro.p.toFixed(5), t: document.querySelector('.card-mapped').style.transform, o: document.querySelector('.card-mapped').style.opacity })))
  }
  const [a, b] = await Promise.all([sharp(shots[0.9985]).raw().toBuffer(), sharp(shots[1]).raw().toBuffer()])
  let diff = 0, big = 0
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); diff += d; if (d > 40) big++ }
  console.log(vp.width, 'seam: mean abs diff', (diff / a.length).toFixed(3), '| channels differing > 40:', big, 'of', a.length)
  await page.close()
}
await browser.close()
