// Date helpers. Venue times are local wall-clock times; neither zone below uses daylight saving.
const OFFSETS = { 'Asia/Kolkata': '+05:30', 'Asia/Karachi': '+05:00' }

/** "2027-01-22", "19:30" in the venue timezone → Date (an instant). */
export function zonedToDate(date, time, tz = 'Asia/Kolkata') {
  return new Date(`${date}T${time}:00${OFFSETS[tz] ?? 'Z'}`)
}

export function formatGregorian(date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

/** Umm al-Qura calendar via Intl. Local moon-sighting may differ by a day: always labelled approximate. */
export function formatHijri(date) {
  try {
    return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`))
  } catch {
    return null
  }
}

export function formatTime12(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = ((h + 11) % 12) + 1
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export function formatInZone(d, tz = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz,
  }).format(d).replace(' ', ' ')
}
