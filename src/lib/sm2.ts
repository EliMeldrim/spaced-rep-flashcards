/**
 * SM-2 spaced repetition scheduler — a pure, side-effect-free module.
 *
 * Implements the SuperMemo SM-2 algorithm (P. Wozniak, 1987), the same
 * scheduler family used by Anki:
 *
 *   - Every card carries an ease factor (EF), starting at 2.5 and never
 *     dropping below 1.3.
 *   - Interval progression for successful reviews (quality >= 3):
 *       I(1) = 1 day, I(2) = 6 days, I(n) = round(I(n-1) * EF).
 *   - After EVERY review the ease factor is adjusted by
 *       EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 *     so q = 5 raises ease by 0.10, q = 4 keeps it flat, q = 3 lowers it
 *     by 0.14, and failures lower it further (clamped at 1.3).
 *   - A quality below 3 is a lapse: the repetition counter resets and the
 *     card is due again in 1 day, "as if memorized anew". Ease is still
 *     adjusted downward (the common Anki-style reading of the spec), so
 *     leeches gradually get shorter interval growth.
 *
 * The UI exposes the Anki-style four-button scale, mapped onto SM-2's
 * 0-5 quality scale via {@link GRADES}.
 */

/** One day in milliseconds. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Ease factor assigned to brand-new cards. */
export const INITIAL_EASE = 2.5;

/** SM-2's hard floor for the ease factor. */
export const MIN_EASE = 1.3;

/** Interval (days) at or above which a card is considered "mature". */
export const MATURE_INTERVAL = 21;

/** SM-2 response quality, 0 (blackout) to 5 (perfect recall). */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

/** The scheduling state SM-2 tracks per card. */
export interface Sm2State {
  /** Ease factor (>= MIN_EASE). Multiplies the previous interval. */
  ease: number;
  /** Current inter-repetition interval, in days. */
  interval: number;
  /** Count of consecutive successful reviews since the last lapse. */
  repetitions: number;
  /** Lifetime count of lapses (quality < 3 on a previously-seen card). */
  lapses: number;
}

/** Anki-style grade buttons mapped onto the SM-2 quality scale. */
export const GRADES = [
  { key: 'again', label: 'Again', quality: 0 as Quality },
  { key: 'hard', label: 'Hard', quality: 3 as Quality },
  { key: 'good', label: 'Good', quality: 4 as Quality },
  { key: 'easy', label: 'Easy', quality: 5 as Quality },
] as const;

export type GradeKey = (typeof GRADES)[number]['key'];

/** A grade counts as "correct" (retained) when quality >= 3. */
export const PASS_THRESHOLD = 3;

/** Scheduling state for a card that has never been reviewed. */
export function initialState(): Sm2State {
  return { ease: INITIAL_EASE, interval: 0, repetitions: 0, lapses: 0 };
}

/**
 * Apply one review to a card's scheduling state.
 *
 * Pure function: returns a new state, never mutates the input.
 *
 * @param state   Current SM-2 state of the card.
 * @param quality Response quality, 0-5.
 * @returns       Next SM-2 state.
 */
export function review(state: Sm2State, quality: Quality): Sm2State {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError(`SM-2 quality must be an integer 0-5, got ${quality}`);
  }

  // Ease adjustment applies after every repetition (SM-2 step 5).
  const ease = Math.max(
    MIN_EASE,
    state.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (quality < PASS_THRESHOLD) {
    // Lapse: restart repetitions from scratch (SM-2 step 6).
    return {
      ease,
      interval: 1,
      repetitions: 0,
      lapses: state.lapses + 1,
    };
  }

  const repetitions = state.repetitions + 1;
  let interval: number;
  if (repetitions === 1) {
    interval = 1;
  } else if (repetitions === 2) {
    interval = 6;
  } else {
    interval = Math.round(state.interval * ease);
  }

  return { ease, interval, repetitions, lapses: state.lapses };
}

/**
 * Compute the next due timestamp for a state produced by {@link review}.
 *
 * @param state Scheduling state after the review.
 * @param now   Timestamp (ms) of the review.
 */
export function nextDue(state: Sm2State, now: number): number {
  return now + state.interval * DAY_MS;
}

/** Human-readable interval preview, e.g. "1d", "6d", "3.2mo". */
export function formatInterval(days: number): string {
  if (days < 30) return `${days}d`;
  if (days < 365) return `${(days / 30).toFixed(1).replace(/\.0$/, '')}mo`;
  return `${(days / 365).toFixed(1).replace(/\.0$/, '')}y`;
}
