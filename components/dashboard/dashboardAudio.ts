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
const audioPlayers = new Map<DashboardAudioKind, HTMLAudioElement>();

function getAudioSources(kind: DashboardAudioKind) {
  return kind === "test" ? TEST_AUDIO_SOURCES : ROTATION_AUDIO_SOURCES;
}

function getOrCreateAudio(kind: DashboardAudioKind): HTMLAudioElement | null {
  if (!isDashboardAlarmSupported()) return null;

  const existing = audioPlayers.get(kind);
  if (existing) return existing;

  const [primarySource] = getAudioSources(kind);
  const audio = new Audio(primarySource);
  audio.preload = "auto";
  audio.volume = 1;
  audioPlayers.set(kind, audio);
  return audio;
}

export function prepareDashboardAudio(): boolean {
  if (!isDashboardAlarmSupported()) return false;

  getOrCreateAudio("test")?.load();
  getOrCreateAudio("rotation")?.load();
  return true;
}

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

async function playPersistentAudio(kind: DashboardAudioKind): Promise<boolean> {
  const sources = getAudioSources(kind);
  let audio = getOrCreateAudio(kind);
  if (!audio) return false;

  for (let index = 0; index < sources.length; index += 1) {
    try {
      if (activeAudio && activeAudio !== audio) {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      }

      if (audio.src !== new URL(sources[index], window.location.href).href) {
        audio.src = sources[index];
        audio.load();
      }

      activeAudio = audio;
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      await audio.play();
      return true;
    } catch (error) {
      console.warn(`[dashboard alarm] unable to play ${sources[index]}`, error);
      if (index + 1 < sources.length) {
        audio = new Audio(sources[index + 1]);
        audio.preload = "auto";
        audio.volume = 1;
        audioPlayers.set(kind, audio);
      }
    }
  }

  return false;
}

export async function playDashboardAudio(kind: DashboardAudioKind): Promise<boolean> {
  if (!isDashboardAlarmSupported()) return false;
  prepareDashboardAudio();
  return playPersistentAudio(kind);
}

export async function playFloatingAlarmTest(): Promise<boolean> {
  return playDashboardAudio("test");
}

export async function playFloatingRotationAnnouncement(): Promise<boolean> {
  return playDashboardAudio("rotation");
}
