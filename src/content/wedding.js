/**
 * REAL wedding details, exactly as supplied by the family (confirmed 2026-11-15).
 *
 * Rules
 * - Anything still FILL has NOT been supplied. Never replace it with a guess.
 *   It renders as a visible "[fill: …]" placeholder (see components/Fill.jsx).
 * - Script (Urdu/Arabic) text is copied from the brief, never transliterated by us.
 * - Quranic text is copied from the Quran.com API, never typed; hadith are cited to their collections.
 */

/** Marks a value the family still has to supply. `hint` says what is being asked. */
export const FILL = (hint) => ({ __fill: true, hint })
export const isFill = (v) => Boolean(v && typeof v === 'object' && v.__fill)

/** Google Maps search link (used until the family sends official pins). */
const mapsSearch = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

const person = (en, script, role, extra = {}) => ({ en, script, role, deceased: false, ...extra })
/** Urdu spelling of a name the family has not supplied yet: hidden on the page, listed by pendingFills(). */
const urdu = (name) => FILL(`Urdu spelling of ${name}`)

export const wedding = {
  // Details confirmed by the family on 2026-11-15. Junagadh and Ahmedabad: India Standard Time.
  timezone: 'Asia/Kolkata',
  siteUrl: FILL('domain'),

  couple: {
    groom: { en: 'Haiyyanuddin Siddiqui ', full: 'Haiyyanuddin Siddiqui ', script: urdu('Haiyyanuddin Siddiqui ') },
    bride: { en: 'Haneen Siddiqui ', full: 'Haneen Siddiqui ', script: urdu('Haneen Siddiqui ') },
    monogram: { latin: 'H & H', script: 'ح ح' },
  },

  families: {
    groom: {
      label: "The groom's family",
      parents: [
        person('Janab Sarfarazuddin Siddiqui ', urdu('Sarfarazuddin Siddiqui '), 'Father'),
        person('Mohtarma Irfat Siddiqui ', urdu('Irfat Siddiqui '), 'Mother'),
      ],
      grandparents: [
        person('Fariduddin Siddiqui ', urdu('Fariduddin Siddiqui '), 'Grandfather', { deceased: true, gender: 'm' }),
        person('Hamida Fariduddin Siddiqui ', urdu('Hamida Fariduddin Siddiqui '), 'Grandmother', { deceased: true, gender: 'f' }),
      ],
    },
    bride: {
      label: "The bride's family",
      parents: [
        person('Janab Irfan Siddiqui ', urdu('Irfan Siddiqui '), 'Father'),
        person('Mohtarma Nargis Siddiqui ', urdu('Nargis Siddiqui '), 'Mother'),
      ],
       grandparents: [
        person(' Mohammed Sadiq Siddiqui ', urdu(' Mohammed Sadiq Siddiqui '), 'Grandfather', { deceased: true, gender: 'm' }),
        person(' Qamrunnisa Mohammed Sadiq Siddiqui', urdu('Qamrunnisa Mohammed Sadiq Siddiqui '), 'Grandmother', { deceased: true, gender: 'f' }),
      ],
    },
  },

  /** As in the family's approved artifact: Marhoom (men) / Marhooma (women). */
  deceasedStyle: 'marhoom',

  /**
   * Sent by the GROOM'S family. Same sentence pattern as the family's earlier wording, with the confirmed names.
   * The Urdu version has not been supplied for these names.
   */
  invitationWording: {
    en: 'Janab Sarfarazuddin Siddiqui  & Mohtarma Irfat Siddiqui  request the pleasure of your company at the Nikah of their son Haiyyanuddin Siddiqui  with Haneen Siddiqui , daughter of Janab Irfan Siddiqui  & Mohtarma Nargis Siddiqui .',
    ur: FILL('Urdu invitation wording for the new names'),
  },

  events: [
    {
      id: 'nikah',
      name: { en: 'Nikah', script: 'نکاح' },
      city: 'Junagadh',
      date: '2027-01-11',
      timeLabel: 'Before Zuhr',
      start: '11:30',
      end: '12:30',
      note: 'Before Zuhr',
      venue: {
        name: 'Dhal Masjid',
        address: 'Junagadh, Gujarat',
        // Approximate (city centre), used only for prayer times. The map link searches the masjid by name.
        lat: 21.5222,
        lng: 70.4579,
        mapUrl: mapsSearch('Dhal Masjid Junagadh'),
      },
    },
    {
      id: 'walima',
      name: { en: 'Walima', script: 'ولیمہ' },
      hostedBy: "The groom's family",
      city: 'Ahmedabad',
      date: '2027-01-13',
      // "After Isha": 8:00 pm onwards, as in the family's approved artifact. Confirm.
      start: '20:00',
      end: '23:30',
      note: 'After Isha salah · dinner follows',
      venue: {
        name: 'Ahmed Farm',
        address: 'Narimanpura, Ahmedabad, Gujarat',
        lat: 23.0225,
        lng: 72.5714,
        mapUrl: mapsSearch('Ahmed Farm Narimanpura Ahmedabad'),
      },
    },
  ],

  /** No order of the day supplied for the Nikah yet; the timeline is hidden while this is empty. */
  nikahDay: [],

  prayer: {
    method: 'Karachi', // University of Islamic Sciences, Karachi (widely used in Gujarat)
    madhab: FILL('Asr: Hanafi / Shafi‘i'),
    referenceTimetable: FILL('reference masjid timetable'),
  },

  /**
   * Background nasheed (vocals only). Drop the file at public/audio/nasheed.mp3.
   * It starts softly when the guest taps "Open Invitation"; if the file is missing the toggle stays hidden.
   */
  audio: '/audio/nasheed.mp3',

  /**
   * Sacred text. Quranic Arabic and translations copied from the Quran.com API (v4, 2026-11-15):
   * Uthmani script; English = Sahih International (id 20); Urdu = Maulana Muhammad Junagarhi (id 54),
   * footnote markers removed. Hadith texts as published in the cited collections.
   * Please have an imam or the family glance over them before the invitation goes out.
   */
  sacred: {
    verse: {
      ref: 'Surah Ar-Rum · 30:21',
      arabic: 'وَمِنْ ءَايَـٰتِهِۦٓ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَٰجًا لِّتَسْكُنُوٓا۟ إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً ۚ إِنَّ فِى ذَٰلِكَ لَـَٔايَـٰتٍ لِّقَوْمٍ يَتَفَكَّرُونَ',
      en: 'And of His signs is that He created for you from yourselves mates that you may find tranquility in them; and He placed between you affection and mercy. Indeed in that are signs for a people who give thought.',
      ur: 'اور اس کی نشانیوں میں سے ہے کہ تمہاری ہی جنس سے بیویاں پیدا کیں تاکہ تم ان سے آرام پاؤ، اس نے تمہارے درمیان محبت اور ہمدردی قائم کر دی، یقیناً غور وفکر کرنے والوں کے لئے اس میں بہت سی نشانیاں ہیں۔',
    },
    blessings: [
      {
        kind: 'Dua for the newlyweds',
        source: 'Sunan Abi Dawud 2130 · Jami‘ at-Tirmidhi 1091',
        arabic: 'بَارَكَ اللَّهُ لَكَ، وَبَارَكَ عَلَيْكَ، وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ',
        translit: 'Barakallahu laka, wa baraka ‘alaika, wa jama‘a bainakuma fi khair',
        en: 'May Allah bless you, shower His blessings upon you, and bring you both together in goodness.',
      },
      {
        kind: 'Hadith on marriage',
        source: 'Shu‘ab al-Iman, al-Bayhaqi · graded hasan by al-Albani',
        arabic: 'إِذَا تَزَوَّجَ الْعَبْدُ فَقَدْ كَمَّلَ نِصْفَ الدِّينِ، فَلْيَتَّقِ اللَّهَ فِي النِّصْفِ الْبَاقِي',
        en: 'When a servant of Allah marries, he has completed half of his faith; so let him be mindful of Allah in the remaining half.',
      },
      {
        kind: 'Dua from the Quran',
        source: 'Surah Al-Furqan · 25:74',
        arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَٰجِنَا وَذُرِّيَّـٰتِنَا قُرَّةَ أَعْيُنٍ وَٱجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
        translit: 'Rabbana hab lana min azwajina wa dhurriyyatina qurrata a‘yunin waj‘alna lil-muttaqina imama',
        en: 'Our Lord, grant us from among our spouses and offspring comfort to our eyes, and make us an example for the righteous.',
        ur: 'اے ہمارے پروردگار! تو ہمیں ہماری بیویوں اور اولاد سے آنکھوں کی ٹھنڈک عطا فرما اور ہمیں پرہیزگاروں کا پیشوا بنا۔',
      },
    ],
  },

  options: {
    sealColour: 'gold',
    spellings: 'Nikkah/Nikah, Walima, Insha’Allah',
    languages: ['en', 'ur'],
  },
}

/**
 * Bismillah: required by the section list. Uthmani text as published by api.quran.com (1:1).
 * This is the only Arabic text not supplied in the brief; check it with the family/imam.
 */
export const bismillah = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ'

/** Lists every FILL with its path, for the report and the dev console. */
export function pendingFills(value = wedding, p = '') {
  if (isFill(value)) return [`${p}: ${value.hint}`]
  if (Array.isArray(value)) return value.flatMap((v, i) => pendingFills(v, `${p}[${v?.id ?? i}]`))
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => pendingFills(v, p ? `${p}.${k}` : k))
  return []
}
