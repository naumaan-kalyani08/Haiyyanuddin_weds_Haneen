import { useEffect } from 'react'
import { intro } from './motion'

/** Plays the card-face entrance (gold shimmer) once, however the guest arrives at the card. */
export function useCardEntrance() {
  useEffect(() => {
    const play = () => document.querySelectorAll('.card-face').forEach((el) => { el.dataset.entered = '' })
    if (intro.entrancePlayed) play()
    intro.onEntrance.add(play)
    return () => intro.onEntrance.delete(play)
  }, [])
}
