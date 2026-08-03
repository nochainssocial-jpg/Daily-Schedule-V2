import { Platform } from "react-native";

const FIRST_FLOATING_ROTATION_MINUTES = 10 * 60 + 30;
const LAST_FLOATING_ROTATION_MINUTES = 14 * 60;
const FLOATING_ROTATION_INTERVAL_MINUTES = 30;
const FLOATING_ALARM_GRACE_MINUTES = 2;

const TEST_AUDIO_SOURCES = [
  "/audio/floating-alarm-test.mp3",
  "/audio/floating-alarm-test.m4a",
] as const;

const ROTATION_AUDIO_SOURCES = [
  "/audio/floating-rotation-announcement.mp3",
  "/audio/floating-rotation-announcement.m4a",
] as const;

type DashboardAudioKind = "test" | "rotation";
type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;
let keepAliveOscillator: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;
let audioBuffers: Partial<Record<DashboardAudioKind, AudioBuffer>> = {};
let audioArmPromise: Promise<boolean> | null = null;
let activeSource: AudioBufferSourceNode | null = null;

export function isDashboardAlarmSupported(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const audioWindow = window as WebAudioWindow;
  return Boolean(audioWindow.AudioContext || audioWindow.webkitAudioContext);
}

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const audioWindow = window as WebAudioWindow;
  return audioWindow.AudioContext || audioWindow.webkitAudioContext || null;
}

function ensureAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) return null;
  audioContext = new AudioContextConstructor();
  return audioContext;
}

async function decodeFirstSupportedSource(
  context: AudioContext,
  sources: readonly string[],
): Promise<AudioBuffer | null> {
  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "force-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return await context.decodeAudioData(arrayBuffer.slice(0));
    } catch (error) {
      console.warn(`[dashboard audio] unable to decode ${source}`, error);
    }
  }
  return null;
}

function startKeepAlive(context: AudioContext) {
  if (keepAliveOscillator || keepAliveGain) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  gain.gain.value = 0.000001;
  oscillator.frequency.value = 20;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();

  keepAliveOscillator = oscillator;
  keepAliveGain = gain;
}

export async function armDashboardAudio(): Promise<boolean> {
  if (!isDashboardAlarmSupported()) return false;
  if (audioBuffers.test && audioBuffers.rotation && audioContext?.state === "running") {
    return true;
  }
  if (audioArmPromise) return audioArmPromise;

  audioArmPromise = (async () => {
    const context = ensureAudioContext();
    if (!context) return false;

    try {
      if (context.state !== "running") await context.resume();
      startKeepAlive(context);

      const [testBuffer, rotationBuffer] = await Promise.all([
        audioBuffers.test || decodeFirstSupportedSource(context, TEST_AUDIO_SOURCES),
        audioBuffers.rotation || decodeFirstSupportedSource(context, ROTATION_AUDIO_SOURCES),
      ]);

      if (!testBuffer || !rotationBuffer) return false;
      audioBuffers = { test: testBuffer, rotation: rotationBuffer };
      return context.state === "running";
    } catch (error) {
      console.warn("[dashboard audio] unable to arm dashboard audio", error);
      return false;
    } finally {
      audioArmPromise = null;
    }
  })();

  return audioArmPromise;
}

export function isDashboardAudioArmed(): boolean {
  return Boolean(
    audioContext?.state === "running" && audioBuffers.test && audioBuffers.rotation,
  );
}

export async function playDashboardAudio(kind: DashboardAudioKind): Promise<boolean> {
  if (!isDashboardAlarmSupported()) return false;

  const context = ensureAudioContext();
  if (!context) return false;

  try {
    if (!audioBuffers[kind]) {
      const armed = await armDashboardAudio();
      if (!armed) return false;
    }

    if (context.state !== "running") {
      await context.resume();
    }

    const buffer = audioBuffers[kind];
    if (!buffer || context.state !== "running") return false;

    if (activeSource) {
      try {
        activeSource.stop();
      } catch {
        // The previous source may already have finished.
      }
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (activeSource === source) activeSource = null;
    };
    activeSource = source;
    source.start(0);
    return true;
  } catch (error) {
    console.warn(`[dashboard audio] unable to play ${kind} audio`, error);
    return false;
  }
}

export function isFloatingRotationAlarmMinute(minutes: number): boolean {
  if (minutes < FIRST_FLOATING_ROTATION_MINUTES || minutes > LAST_FLOATING_ROTATION_MINUTES) {
    return false;
  }

  return (
    (minutes - FIRST_FLOATING_ROTATION_MINUTES) % FLOATING_ROTATION_INTERVAL_MINUTES === 0
  );
}

export function getFloatingRotationAlarmMinute(
  minutes: number,
  graceMinutes = FLOATING_ALARM_GRACE_MINUTES,
): number | null {
  if (minutes < FIRST_FLOATING_ROTATION_MINUTES) return null;

  const cappedMinutes = Math.min(minutes, LAST_FLOATING_ROTATION_MINUTES);
  const elapsed = cappedMinutes - FIRST_FLOATING_ROTATION_MINUTES;
  const rotationMinute =
    FIRST_FLOATING_ROTATION_MINUTES +
    Math.floor(elapsed / FLOATING_ROTATION_INTERVAL_MINUTES) * FLOATING_ROTATION_INTERVAL_MINUTES;

  if (!isFloatingRotationAlarmMinute(rotationMinute)) return null;
  if (minutes - rotationMinute < 0 || minutes - rotationMinute > graceMinutes) return null;

  return rotationMinute;
}

export function floatingRotationAlarmKey(
  date: string | null | undefined,
  minutes: number,
): string {
  return `${date || "today"}:floating-alarm:${minutes}`;
}

export async function playFloatingAlarmTest(): Promise<boolean> {
  return playDashboardAudio("test");
}

export async function playFloatingRotationAnnouncement(): Promise<boolean> {
  return playDashboardAudio("rotation");
}
