// components/use-today-label.ts
import { useMemo } from 'react';

export function useTodayLabel() {
  return useMemo(() => {
    const d = new Date();

    // e.g. "Sat, 15 Nov"
    const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
    const dayMonth = d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });

    return `${weekday}, ${dayMonth}`;
  }, []);
}
