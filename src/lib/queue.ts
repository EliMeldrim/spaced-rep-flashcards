import type { Card, ReviewLogEntry, Settings } from './types';
import { MATURE_INTERVAL } from './sm2';

/** Local-time start of the day containing `ts`. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local-time end of the day containing `ts` (exclusive upper bound). */
export function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export type CardStage = 'new' | 'learning' | 'mature';

/** New = never reviewed; mature = interval >= 21 days; else learning. */
export function cardStage(card: Card): CardStage {
  if (card.lastReviewed === null) return 'new';
  return card.interval >= MATURE_INTERVAL ? 'mature' : 'learning';
}

/** Distinct new cards first introduced today (counts against the daily limit). */
export function newIntroducedToday(log: ReviewLogEntry[], now: number): number {
  const start = startOfDay(now);
  const ids = new Set<string>();
  for (const entry of log) {
    if (entry.wasNew && entry.ts >= start && entry.ts <= endOfDay(now)) {
      ids.add(entry.cardId);
    }
  }
  return ids.size;
}

export interface StudyQueue {
  /** Previously-seen cards due on or before today, oldest due first. */
  reviews: Card[];
  /** New cards available today, capped by the daily new-card limit. */
  news: Card[];
}

/**
 * Build today's study queue for a deck (or all decks when deckId is
 * undefined): every due review card, plus new cards up to the remaining
 * daily allowance. The new-card limit is global across decks, matching
 * how a daily study budget works in practice.
 */
export function buildQueue(
  cards: Card[],
  log: ReviewLogEntry[],
  settings: Settings,
  now: number,
  deckId?: string,
): StudyQueue {
  const inScope = deckId ? cards.filter((c) => c.deckId === deckId) : cards;
  const horizon = endOfDay(now);

  const reviews = inScope
    .filter((c) => c.lastReviewed !== null && c.due <= horizon)
    .sort((a, b) => a.due - b.due);

  const allowance = Math.max(0, settings.newPerDay - newIntroducedToday(log, now));
  const news = inScope
    .filter((c) => c.lastReviewed === null)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, allowance);

  return { reviews, news };
}

export interface DueCounts {
  reviewsDue: number;
  newAvailable: number;
}

/** Counts shown on deck badges and the dashboard. */
export function dueCounts(
  cards: Card[],
  log: ReviewLogEntry[],
  settings: Settings,
  now: number,
  deckId?: string,
): DueCounts {
  const q = buildQueue(cards, log, settings, now, deckId);
  return { reviewsDue: q.reviews.length, newAvailable: q.news.length };
}
