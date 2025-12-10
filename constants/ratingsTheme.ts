// constants/ratingsTheme.ts

export type RiskBand = 'low' | 'medium' | 'high';

export const MAX_PARTICIPANT_SCORE = 21; // 7 criteria × 3

export const BAND_THRESHOLDS = {
  low: 10,      // 0–10
  medium: 16,   // 11–16
  high: 21,     // 17–21
} as const;

export function getRiskBand(total: number | null | undefined): RiskBand {
  const value = typeof total === 'number' ? total : 0;

  if (value <= BAND_THRESHOLDS.low) return 'low';
  if (value <= BAND_THRESHOLDS.medium) return 'medium';
  return 'high';
}

// Gradient colours used everywhere (meters, etc)
export const RISK_GRADIENT_COLORS = ['#22c55e', '#eab308', '#ef4444'];

// Bubble / chip colours per band
export const SCORE_BUBBLE_STYLES: Record<
  RiskBand,
  { bg: string; border: string; text: string }
> = {
  low: {
    bg: '#dcfce7',      // pale green
    border: '#22c55e',
    text: '#14532d',
  },
  medium: {
    bg: '#fef9c3',      // pale yellow
    border: '#eab308',
    text: '#713f12',
  },
  high: {
    bg: '#fee2e2',      // pale red
    border: '#ef4444',
    text: '#7f1d1d',
  },
};

// Behaviour L/M/H pill colours (re-use same mapping)
export const BEHAVIOUR_PILL_STYLES = SCORE_BUBBLE_STYLES;
