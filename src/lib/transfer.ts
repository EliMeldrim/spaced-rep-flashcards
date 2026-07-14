import { initialState } from './sm2';
import { makeCard, uid } from './storage';
import type { Card, Deck, StoreState } from './types';

/** JSON shape used for deck import/export. */
export interface DeckExport {
  format: 'srf-deck';
  version: 1;
  name: string;
  description?: string;
  cards: Array<{
    front: string;
    back: string;
    tags?: string[];
    // Optional scheduling snapshot so exports work as backups.
    ease?: number;
    interval?: number;
    repetitions?: number;
    lapses?: number;
    due?: number;
    lastReviewed?: number | null;
  }>;
}

export function exportDeck(state: StoreState, deckId: string): DeckExport {
  const deck = state.decks.find((d) => d.id === deckId);
  if (!deck) throw new Error(`Unknown deck: ${deckId}`);
  return {
    format: 'srf-deck',
    version: 1,
    name: deck.name,
    description: deck.description,
    cards: state.cards
      .filter((c) => c.deckId === deckId)
      .map(({ front, back, tags, ease, interval, repetitions, lapses, due, lastReviewed }) => ({
        front,
        back,
        tags,
        ease,
        interval,
        repetitions,
        lapses,
        due,
        lastReviewed,
      })),
  };
}

/**
 * Parse imported JSON into a new deck + cards. Accepts our export format
 * or any object with a `cards` array of {front, back} entries. Scheduling
 * fields are restored when present and valid, otherwise cards come in new.
 */
export function parseDeckImport(
  json: string,
  now: number = Date.now(),
): { deck: Deck; cards: Card[] } {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Not valid JSON.');
  }
  if (typeof data !== 'object' || data === null || !Array.isArray((data as DeckExport).cards)) {
    throw new Error('Expected an object with a "cards" array.');
  }
  const raw = data as Partial<DeckExport>;
  const deck: Deck = {
    id: uid(),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Imported deck',
    description: typeof raw.description === 'string' ? raw.description : undefined,
    createdAt: now,
  };

  const cards: Card[] = [];
  for (const [i, entry] of (raw.cards ?? []).entries()) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof entry.front !== 'string' ||
      typeof entry.back !== 'string'
    ) {
      throw new Error(`Card ${i + 1} is missing "front" or "back" text.`);
    }
    const tags = Array.isArray(entry.tags)
      ? entry.tags.filter((t): t is string => typeof t === 'string')
      : [];
    const card = makeCard(deck.id, entry.front, entry.back, tags, now + i);

    const hasSchedule =
      typeof entry.ease === 'number' &&
      typeof entry.interval === 'number' &&
      typeof entry.repetitions === 'number' &&
      typeof entry.due === 'number' &&
      typeof entry.lastReviewed === 'number';
    if (hasSchedule) {
      card.ease = Math.max(1.3, entry.ease as number);
      card.interval = Math.max(0, entry.interval as number);
      card.repetitions = Math.max(0, entry.repetitions as number);
      card.lapses = typeof entry.lapses === 'number' ? Math.max(0, entry.lapses) : 0;
      card.due = entry.due as number;
      card.lastReviewed = entry.lastReviewed as number;
    } else {
      Object.assign(card, initialState());
    }
    cards.push(card);
  }
  return { deck, cards };
}
