import type { Sm2State } from './sm2';

export interface Deck {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface Card extends Sm2State {
  id: string;
  deckId: string;
  front: string;
  back: string;
  tags: string[];
  createdAt: number;
  /** Next review due timestamp (ms). Meaningless until first review. */
  due: number;
  /** Timestamp of the last review, or null for new (unseen) cards. */
  lastReviewed: number | null;
}

export interface ReviewLogEntry {
  ts: number;
  cardId: string;
  deckId: string;
  /** SM-2 quality 0-5. */
  quality: number;
  /** True when this was the card's first-ever review. */
  wasNew: boolean;
}

export interface Settings {
  /** Max number of new (unseen) cards introduced per day. */
  newPerDay: number;
}

export interface StoreState {
  decks: Deck[];
  cards: Card[];
  log: ReviewLogEntry[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { newPerDay: 20 };
