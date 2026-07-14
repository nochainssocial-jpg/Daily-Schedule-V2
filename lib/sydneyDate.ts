const SYDNEY_TIMEZONE = 'Australia/Sydney';

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getSydneyDateKey(date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: SYDNEY_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (year && month && day) return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('[sydneyDate] timezone formatting unavailable; using device date', error);
  }

  return localDateKey(date);
}

export function normaliseSydneyDateKey(value?: string | null, fallback = new Date()): string {
  const candidate = typeof value === 'string' ? value.slice(0, 10) : '';
  return isDateKey(candidate) ? candidate : getSydneyDateKey(fallback);
}

export function getSydneyTimeParts(date = new Date()): {
  dateKey: string;
  hours: number;
  minutes: number;
} {
  try {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: SYDNEY_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;

    const year = value('year');
    const month = value('month');
    const day = value('day');
    const hours = Number(value('hour'));
    const minutes = Number(value('minute'));

    if (year && month && day && Number.isFinite(hours) && Number.isFinite(minutes)) {
      return {
        dateKey: `${year}-${month}-${day}`,
        hours,
        minutes,
      };
    }
  } catch (error) {
    console.warn('[sydneyDate] time parts unavailable; using device time', error);
  }

  return {
    dateKey: localDateKey(date),
    hours: date.getHours(),
    minutes: date.getMinutes(),
  };
}

export function getSydneyMinutesSinceMidnight(date = new Date()): number {
  const { hours, minutes } = getSydneyTimeParts(date);
  return hours * 60 + minutes;
}

export { SYDNEY_TIMEZONE };
