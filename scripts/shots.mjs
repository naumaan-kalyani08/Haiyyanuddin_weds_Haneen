// Headless screenshots: loader, the opening at fixed scroll progress points, the family reveal and every section.
//   npm run dev  (in another terminal), then: node scripts/shots.mjs [outDir]
import { chromium } from 'playwright'
import fs from 'node:fs'

const out = process.argv[2] || 'checkpoints/shots'
fs.mkdirSync(out, { recursive: true })
const URL = process.env.URL || 'http://localhost:5180/'
const points = (process.env.POINTS || '0,0.08,0.14,0.2,0.235,0.3,0.4,0.47,0.6,0.72,0.85,1').split(',').map(Number)
const sections = ['bismillah', 'announce', 'couple', 'families', 'nikah', 'walima', 'gratitude', 'memory', 'regards', 'soon']
const sizes = [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
]
const browser = await chromium.launch({
  executablePath: process.env.CHROME || process.env.LOCALAPPDATA + '/ms-playwright/chromium-1254/chrome-win64/chrome.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
for (const s of sizes) {
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 1, isMobile: s.mobile, hasTouch: s.mobile })
  const logs = []
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GL Driver') && logs.push(m.text()))
  page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message))
  await page.goto(URL, { waitUntil: 'load' })
  const ok = await page.waitForSelector('.enter.show', { timeout: 60000 }).then(() => true, () => false)
  console.log(s.name, 'scene ready:', ok)
  await page.screenshot({ path: `${out}/${s.name}-loader.png` })
  await page.click('.enter')
  await page.waitForTimeout(1200)
  const lenisTo = (y) => page.evaluate((y) => { const l = window.__getLenis(); l ? l.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y) }, y)
  for (const p of points) {
    const y = await page.evaluate((p) => { const st = window.__intro.trigger; return st.start + p * (st.end - st.start) }, p)
    await lenisTo(y)
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${out}/${s.name}-p${String(Math.round(p * 100)).padStart(3, '0')}.png` })
  }
  console.log(s.name, 'end state', await page.evaluate(() => ({ p: window.__intro.p, t: document.querySelector('.card-mapped').style.transform })))
  // Family reveal (pinned): sample its timeline.
  const fam = await page.evaluate(() => { const t = window.__st?.getAll?.() ?? []; return t.length })
  void fam
  const famTop = await page.evaluate(() => document.getElementById('fam').getBoundingClientRect().top + scrollY)
  const famLen = await page.evaluate(() => innerHeight * 5.6)
  for (const f of [0.02, 0.3, 0.5, 0.75, 0.97]) {
    await lenisTo(famTop + f * famLen)
    await page.waitForTimeout(1600)
    await page.screenshot({ path: `${out}/${s.name}-fam${String(Math.round(f * 100)).padStart(3, '0')}.png` })
  }
  for (const id of sections) {
    await lenisTo(await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + scrollY, id))
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${out}/${s.name}-sec-${id}.png` })
  }
  if (logs.length) console.log(s.name, 'console:\n ' + [...new Set(logs)].slice(0, 15).join('\n '))
  await page.close()
}
await browser.close()
