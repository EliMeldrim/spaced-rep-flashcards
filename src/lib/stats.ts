import { PASS_THRESHOLD } from './sm2';
import { cardStage, startOfDay } from './queue';
import type { Card, ReviewLogEntry } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StageCounts {
  total: number;
  new: number;
  learning: number;
  mature: number;
}

export function stageCounts(cards: Card[]): StageCounts {
  const counts: StageCounts = { total: cards.length, new: 0, learning: 0, mature: 0 };
  for (const card of cards) counts[cardStage(card)]++;
  return counts;
}

export interface DayReviews {
  /** Local-time start-of-day timestamp. */
  day: number;
  /** ISO date label, e.g. "07-14". */
  label: string;
  count: number;
}

/** Reviews per day for the trailing `days` days (including today). */
export function reviewsPerDay(
  log: ReviewLogEntry[],
  now: number,
  days = 30,
): DayReviews[] {
  const today = startOfDay(now);
  const buckets = new Map<number, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(startOfDay(today - i * DAY_MS), 0);
  }
  for (const entry of log) {
    const day = startOfDay(entry.ts);
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([day, count]) => {
    const d = new Date(day);
    const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    return { day, label, count };
  });
}

/**
 * Retention over the trailing `days` days: correct grades (quality >= 3)
 * divided by total grades. Returns null when there are no reviews.
 */
export function retention(
  log: ReviewLogEntry[],
  now: number,
  days = 30,
): number | null {
  const cutoff = startOfDay(now) - (days - 1) * DAY_MS;
  let total = 0;
  let correct = 0;
  for (const entry of log) {
    if (entry.ts >= cutoff) {
      total++;
      if (entry.quality >= PASS_THRESHOLD) correct++;
    }
  }
  return total === 0 ? null : correct / total;
}
