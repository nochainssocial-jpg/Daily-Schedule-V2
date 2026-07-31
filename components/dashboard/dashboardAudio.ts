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

let activeAudio: HTMLAudioElement | null = null;

export function isDashboardAlarmSupported(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof Audio !== "undefined";
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

async function tryPlaySource(source: string): Promise<boolean> {
  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }

    const audio = new Audio(source);
    activeAudio = audio;
    audio.preload = "auto";
    audio.volume = 1;
    await audio.play();
    return true;
  } catch (error) {
    console.warn(`[dashboard alarm] unable to play ${source}`, error);
    return false;
  }
}

export async function playDashboardAudio(kind: DashboardAudioKind): Promise<boolean> {
  if (!isDashboardAlarmSupported()) return false;

  const sources = kind === "test" ? TEST_AUDIO_SOURCES : ROTATION_AUDIO_SOURCES;
  for (const source of sources) {
    if (await tryPlaySource(source)) return true;
  }

  return false;
}

export async function playFloatingAlarmTest(): Promise<boolean> {
  return playDashboardAudio("test");
}

export async function playFloatingRotationAnnouncement(): Promise<boolean> {
  return playDashboardAudio("rotation");
}
