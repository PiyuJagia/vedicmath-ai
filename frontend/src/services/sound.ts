/**
 * Small synthesised sounds, so no audio files are needed. They only play
 * when the matching setting is on and the browser allows audio.
 */
type Cue = 'correct' | 'try-again' | 'celebrate' | 'hummingbird' | 'hop'

const NOTES: Record<Cue, { frequency: number; duration: number }[]> = {
  correct: [
    { frequency: 660, duration: 0.09 },
    { frequency: 880, duration: 0.14 },
  ],
  'try-again': [{ frequency: 392, duration: 0.16 }],
  celebrate: [
    { frequency: 523, duration: 0.1 },
    { frequency: 659, duration: 0.1 },
    { frequency: 784, duration: 0.18 },
  ],
  hummingbird: [
    { frequency: 1200, duration: 0.05 },
    { frequency: 1500, duration: 0.05 },
  ],
  hop: [{ frequency: 520, duration: 0.07 }],
}

let context: AudioContext | null = null

export function playCue(cue: Cue) {
  try {
    const AudioCtor = window.AudioContext
    if (!AudioCtor) return
    context ??= new AudioCtor()
    let start = context.currentTime
    for (const note of NOTES[cue]) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = note.frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + note.duration + 0.02)
      start += note.duration
    }
  } catch {
    // Audio is optional.
  }
}
