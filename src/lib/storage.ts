import { initialState } from './sm2';
import { seedState } from './seed';
import type { Card, StoreState } from './types';
import { DEFAULT_SETTINGS } from './types';

const STORAGE_KEY = 'srf:v1';

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Build a brand-new card with fresh SM-2 state. */
export function makeCard(
  deckId: string,
  front: string,
  back: string,
  tags: string[] = [],
  now: number = Date.now(),
): Card {
  return {
    id: uid(),
    deckId,
    front,
    back,
    tags,
    createdAt: now,
    due: now,
    lastReviewed: null,
    ...initialState(),
  };
}

export function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoreState>;
      if (Array.isArray(parsed.decks) && Array.isArray(parsed.cards)) {
        return {
          decks: parsed.decks,
          cards: parsed.cards,
          log: Array.isArray(parsed.log) ? parsed.log : [],
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        };
      }
    }
  } catch {
    // Corrupt storage — fall through to a fresh seeded state.
  }
  const seeded = seedState();
  saveState(seeded);
  return seeded;
}

export function saveState(state: StoreState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable; the app keeps working in-memory.
  }
}
