/**
 * Unique Notification Sound Engine for OneClick HRMS / Web Portal
 * Uses a crisp, harmonic 3-tone chime (F5 -> A5 -> C6) via Web Audio API
 * with automatic fallback to audio file playback.
 */

let audioCtx = null;
let userInteracted = false;

// Register user gesture listener to unlock Web Audio API cleanly
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    userInteracted = true;
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };
  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
}

const getAudioContext = () => {
  if (typeof window === "undefined" || !userInteracted) return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Play a distinctive harmonic chime using Web Audio API synthesizer
 */
export const playHarmonicChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const now = ctx.currentTime;

    // Distinct 3-tone signature chord sequence: 698.46Hz (F5), 880Hz (A5), 1046.5Hz (C6)
    const tones = [
      { freq: 698.46, start: now, duration: 0.22, gain: 0.25 },
      { freq: 880.00, start: now + 0.10, duration: 0.24, gain: 0.30 },
      { freq: 1046.50, start: now + 0.20, duration: 0.38, gain: 0.35 },
    ];

    tones.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Sine wave with soft triangle overtone
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      // Envelope: Instant attack, smooth exponential decay
      gainNode.gain.setValueAtTime(0.001, start);
      gainNode.gain.exponentialRampToValueAtTime(gain, start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration + 0.05);
    });

    return true;
  } catch (err) {
    console.warn("Web Audio chime failed, falling back to audio element:", err);
    return false;
  }
};

/**
 * Master notification sound player
 * Plays /sounds/notice11.mp3 as primary notification ringtone,
 * with graceful fallback to Web Audio synthesizer if audio element playback is restricted.
 */
export const playNotificationSound = () => {
  try {
    if (typeof window !== "undefined") {
      const audio = new Audio("/sounds/notice11.mp3");
      audio.volume = 0.9;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.warn("Audio element playback restricted, falling back to chime:", e.message);
          playHarmonicChime();
        });
      }
    } else {
      playHarmonicChime();
    }
  } catch (e) {
    console.warn("Notification sound error, falling back to chime:", e);
    playHarmonicChime();
  }
};
