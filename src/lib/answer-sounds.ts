// Short sounds made with the browser's Web Audio API, so no audio files are needed.
let audio: AudioContext | null = null;

/** Call this directly from a click, otherwise browsers may keep sound blocked. */
export function prepareSound() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    // Sound is optional: the quiz must keep working without it
  }
}

function playTone(frequency: number, delay: number, duration: number, type: OscillatorType) {
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(0.15, start);
  volume.gain.exponentialRampToValueAtTime(0.001, start + duration);

  oscillator.connect(volume).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function playAnswerSound(isCorrect: boolean) {
  prepareSound();
  if (isCorrect) {
    // Cheerful rising notes
    playTone(523, 0, 0.15, "sine");
    playTone(659, 0.1, 0.15, "sine");
    playTone(784, 0.2, 0.3, "sine");
  } else {
    // Low falling buzz
    playTone(220, 0, 0.2, "square");
    playTone(155, 0.18, 0.35, "square");
  }
}
