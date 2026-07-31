import { Platform } from "react-native";

const FIRST_FLOATING_ROTATION_MINUTES = 10 * 60 + 30;
const LAST_FLOATING_ROTATION_MINUTES = 14 * 60;
const FLOATING_ROTATION_INTERVAL_MINUTES = 30;

type WebAudioWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

let sharedAudioContext: AudioContext | null = null;

function getAudioContextConstructor(): typeof AudioContext | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;

  const audioWindow = window as WebAudioWindow;
  return window.AudioContext || audioWindow.webkitAudioContext || null;
}

export function isDashboardAlarmSupported(): boolean {
  return Boolean(getAudioContextConstructor());
}

export function isFloatingRotationAlarmMinute(minutes: number): boolean {
  if (
    minutes < FIRST_FLOATING_ROTATION_MINUTES ||
    minutes > LAST_FLOATING_ROTATION_MINUTES
  ) {
    return false;
  }

  return (
    (minutes - FIRST_FLOATING_ROTATION_MINUTES) %
      FLOATING_ROTATION_INTERVAL_MINUTES ===
    0
  );
}

export function floatingRotationAlarmKey(
  date: string | null | undefined,
  minutes: number,
): string {
  return `${date || "today"}:floating-alarm:${minutes}`;
}

export async function playFloatingRotationChime(): Promise<boolean> {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) return false;

  try {
    const context = sharedAudioContext || new AudioContextConstructor();
    sharedAudioContext = context;
    if (context.state === "suspended") {
      await context.resume();
    }

    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.0001, context.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.72);
    masterGain.connect(context.destination);

    const notes = [659.25, 783.99];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      const start = context.currentTime + index * 0.24;
      const end = start + 0.28;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      noteGain.gain.setValueAtTime(0.0001, start);
      noteGain.gain.exponentialRampToValueAtTime(0.85, start + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(noteGain);
      noteGain.connect(masterGain);
      oscillator.start(start);
      oscillator.stop(end);
    });

    return true;
  } catch (error) {
    console.error("[dashboard alarm] failed to play chime", error);
    return false;
  }
}
