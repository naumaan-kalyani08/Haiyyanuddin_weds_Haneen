// Screenshots of the pinned story sections (family reveal, couple, verse tunnel, farewell) at fixed progress points.
//   npm run dev  (in another terminal), then: node scripts/shots-sections.mjs [outDir]
import { chromium } from 'playwright'
import fs from 'node:fs'

const out = process.argv[2] || 'checkpoints/sections'
fs.mkdirSync(out, { recursive: true })
const URL = process.env.URL || 'http://localhost:5180/'
const browser = await chromium.launch({
  executablePath: process.env.CHROME || process.env.LOCALAPPDATA + '/ms-playwright/chromium-1254/chrome-win64/chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const plan = [
  ['fam', 6.0, [0.02, 0.3, 0.74]],
  ['quote', 2.0, [0.15, 0.5, 0.97]],
  ['duas', 1.5, [0.05, 0.6]],
  ['bye', 3.0, [0.3, 0.98]],
]
for (const s of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true }]) {
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height }, isMobile: s.isMobile, hasTouch: s.hasTouch })
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForSelector('.enter.show', { timeout: 60000 })
  await page.click('.enter')
  await page.waitForTimeout(800)
  await page.evaluate(() => window.__getLenis().scrollTo(window.__intro.trigger.end, { immediate: true, force: true }))
  await page.waitForTimeout(600)
  for (const [id, len, pts] of plan) {
    // Scroll to the section's top, then through its pin.
    for (const p of pts) {
      await page.evaluate(({ id, len, p }) => {
        const el = document.getElementById(id)
        const spacer = el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el
        const top = spacer.getBoundingClientRect().top + scrollY
        window.__getLenis().scrollTo(top + p * len * innerHeight, { immediate: true, force: true })
      }, { id, len, p })
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${out}/${s.name}-${id}-${String(Math.round(p * 100)).padStart(3, '0')}.png` })
    }
  }
  if (errs.length) console.log(s.name, 'errors:', errs)
  await page.close()
}
await browser.close()
console.log('done')
