// Bismillah + verse, the reverse journey ("Back to the envelope"), and prefers-reduced-motion.
import { chromium } from 'playwright'
const out = 'checkpoints/run4'
const browser = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1254/chrome-win64/chrome.exe', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5180/', { waitUntil: 'load' })
await page.waitForSelector('.enter.show', { timeout: 60000 })
await page.click('.enter')
await page.waitForTimeout(800)
const to = (y) => page.evaluate((y) => window.__getLenis().scrollTo(y, { immediate: true, force: true }), y)
// Skip link: lands at the card, entrance plays.
await page.keyboard.press('Tab')
console.log('first focus:', await page.evaluate(() => document.activeElement.textContent))
await page.keyboard.press('Enter')
await page.waitForTimeout(1500)
console.log('after skip:', await page.evaluate(() => ({ p: window.__intro.p, entered: 'entered' in document.querySelector('.card-mapped').dataset, y: scrollY, end: window.__intro.trigger.end })))
for (const f of [0.35, 0.55, 0.75]) {
  await to(await page.evaluate((f) => { const b = document.getElementById('blessing'); return b.offsetTop - innerHeight * (1 - f) }, f))
  await page.waitForTimeout(1500)
}
await page.screenshot({ path: `${out}/desktop-blessing.png` })
// Back to the envelope (reverse).
await to(await page.evaluate(() => document.body.scrollHeight))
await page.waitForTimeout(800)
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Back to the envelope')).click())
await page.waitForTimeout(12000)
console.log('after back-to-envelope:', await page.evaluate(() => ({ p: window.__intro.p, y: scrollY })))
await page.screenshot({ path: `${out}/desktop-reversed.png` })
await page.close()
// Reduced motion.
const rm = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true })
await rm.goto('http://localhost:5180/', { waitUntil: 'load' })
await rm.waitForTimeout(1500)
await rm.screenshot({ path: `${out}/mobile-reduced-0.png` })
await rm.evaluate(() => scrollTo(0, innerHeight))
await rm.waitForTimeout(1000)
await rm.screenshot({ path: `${out}/mobile-reduced-1.png` })
console.log('reduced motion canvas present:', await rm.evaluate(() => Boolean(document.querySelector('canvas.scene-canvas, .scene-canvas canvas'))))
await browser.close()
