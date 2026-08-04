import { Platform } from "react-native";

const FIRST_FLOATING_ROTATION_MINUTES = 10 * 60 + 30;
const LAST_FLOATING_ROTATION_MINUTES = 14 * 60;
const FLOATING_ROTATION_INTERVAL_MINUTES = 30;
const FLOATING_ALARM_GRACE_MINUTES = 2;

const AUDIO_SOURCES = {
  test: [
    "/audio/floating-alarm-test.mp3",
    "/audio/floating-alarm-test.m4a",
  ],
  rotation: [
    "/audio/floating-rotation-announcement.mp3",
    "/audio/floating-rotation-announcement.m4a",
  ],
} as const;

type DashboardAudioKind = keyof typeof AUDIO_SOURCES;

let sharedAudio: HTMLAudioElement | null = null;
let audioConfirmed = false;
let activeSource = "";

export function isDashboardAlarmSupported(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof Audio !== "undefined";
}

function getSharedAudio(): HTMLAudioElement | null {
  if (!isDashboardAlarmSupported()) return null;
  if (sharedAudio) return sharedAudio;

  const audio = new Audio();
  audio.preload = "auto";
  audio.volume = 1;
  audio.playsInline = true;
  sharedAudio = audio;
  return audio;
}

async function waitForAudiblePlayback(
  audio: HTMLAudioElement,
  timeoutMs = 3000,
): Promise<boolean> {
  if (!audio.paused && audio.currentTime > 0) return true;

  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("error", handleError);
      resolve(value);
    };

    const handlePlaying = () => finish(true);
    const handleTimeUpdate = () => {
      if (!audio.paused && audio.currentTime > 0) finish(true);
    };
    const handleError = () => finish(false);

    audio.addEventListener("playing", handlePlaying, { once: true });
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("error", handleError, { once: true });
    timer = setTimeout(() => finish(false), timeoutMs);
  });
}

async function tryPlaySource(source: string): Promise<boolean> {
  const audio = getSharedAudio();
  if (!audio) return false;

  try {
    audio.pause();
    audio.currentTime = 0;

    if (activeSource !== source) {
      audio.src = source;
      activeSource = source;
      audio.load();
    }

    const playbackStarted = waitForAudiblePlayback(audio);
    await audio.play();
    const audible = await playbackStarted;
    if (audible) audioConfirmed = true;
    return audible;
  } catch (error) {
    console.warn(`[dashboard audio] unable to play ${source}`, error);
    return false;
  }
}

/**
 * Preloads the shared player. It deliberately does not report audio as armed:
 * Windows Chrome/Edge only count real playback inside a user gesture as proof.
 */
export async function armDashboardAudio(): Promise<boolean> {
  const audio = getSharedAudio();
  if (!audio) return false;

  if (!activeSource) {
    activeSource = AUDIO_SOURCES.test[0];
    audio.src = activeSource;
    audio.load();
  }

  return audioConfirmed;
}

export function isDashboardAudioArmed(): boolean {
  return audioConfirmed;
}

export async function playDashboardAudio(kind: DashboardAudioKind): Promise<boolean> {
  if (!isDashboardAlarmSupported()) return false;

  for (const source of AUDIO_SOURCES[kind]) {
    if (await tryPlaySource(source)) return true;
  }

  return false;
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
