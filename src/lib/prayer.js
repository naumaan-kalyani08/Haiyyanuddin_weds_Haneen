import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from 'adhan'
import { formatInZone } from './dates'

/**
 * Maghrib and Isha for an event date at its venue, Karachi method (University of Islamic Sciences).
 * The Asr madhab is still [fill]; it does not affect Maghrib or Isha, which are all we show.
 */
export function maghribIsha(date, lat, lng, tz = 'Asia/Kolkata') {
  const [y, m, d] = date.split('-').map(Number)
  const params = CalculationMethod.Karachi()
  params.madhab = Madhab.Hanafi // irrelevant to Maghrib/Isha; replaced once the family answers
  const times = new PrayerTimes(new Coordinates(lat, lng), new Date(y, m - 1, d), params)
  return { maghrib: formatInZone(times.maghrib, tz), isha: formatInZone(times.isha, tz) }
}
