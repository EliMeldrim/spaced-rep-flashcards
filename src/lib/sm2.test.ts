import { describe, expect, it } from 'vitest';
import {
  DAY_MS,
  GRADES,
  INITIAL_EASE,
  MIN_EASE,
  PASS_THRESHOLD,
  formatInterval,
  initialState,
  nextDue,
  review,
  type Quality,
  type Sm2State,
} from './sm2';

/** Review a fresh card n times at the given quality, returning the state. */
function reviewTimes(times: number, quality: Quality, start?: Sm2State): Sm2State {
  let state = start ?? initialState();
  for (let i = 0; i < times; i++) state = review(state, quality);
  return state;
}

describe('initialState', () => {
  it('starts with default ease, no interval, no repetitions, no lapses', () => {
    expect(initialState()).toEqual({
      ease: INITIAL_EASE,
      interval: 0,
      repetitions: 0,
      lapses: 0,
    });
  });
});

describe('interval progression (successful reviews)', () => {
  it('schedules 1 day after the first successful review', () => {
    const s = review(initialState(), 4);
    expect(s.interval).toBe(1);
    expect(s.repetitions).toBe(1);
  });

  it('schedules 6 days after the second successful review', () => {
    const s = reviewTimes(2, 4);
    expect(s.interval).toBe(6);
    expect(s.repetitions).toBe(2);
  });

  it('multiplies by the ease factor from the third review on', () => {
    // Grade "Good" (4) keeps ease flat at 2.5, so I(3) = round(6 * 2.5) = 15.
    const s3 = reviewTimes(3, 4);
    expect(s3.interval).toBe(15);
    // I(4) = round(15 * 2.5) = 38.
    const s4 = review(s3, 4);
    expect(s4.interval).toBe(38);
  });

  it('grows faster with Easy (5) than Good (4)', () => {
    const easy = reviewTimes(4, 5);
    const good = reviewTimes(4, 4);
    expect(easy.interval).toBeGreaterThan(good.interval);
  });

  it('grows slower with Hard (3) than Good (4)', () => {
    const hard = reviewTimes(4, 3);
    const good = reviewTimes(4, 4);
    expect(hard.interval).toBeLessThan(good.interval);
  });

  it('does not mutate the input state', () => {
    const before = initialState();
    const frozen = { ...before };
    review(before, 4);
    expect(before).toEqual(frozen);
  });
});

describe('ease factor adjustments', () => {
  it('keeps ease unchanged on quality 4', () => {
    const s = review(initialState(), 4);
    expect(s.ease).toBeCloseTo(2.5, 10);
  });

  it('raises ease by 0.10 on quality 5', () => {
    const s = review(initialState(), 5);
    expect(s.ease).toBeCloseTo(2.6, 10);
  });

  it('lowers ease by 0.14 on quality 3', () => {
    const s = review(initialState(), 3);
    expect(s.ease).toBeCloseTo(2.36, 10);
  });

  it('lowers ease by 0.80 on quality 0', () => {
    const s = review(initialState(), 0);
    expect(s.ease).toBeCloseTo(1.7, 10);
  });
});

describe('ease factor floor', () => {
  it('never drops below MIN_EASE, even after many failures', () => {
    const s = reviewTimes(10, 0);
    expect(s.ease).toBe(MIN_EASE);
  });

  it('clamps exactly at the floor rather than going negative', () => {
    let s = initialState();
    for (let i = 0; i < 50; i++) {
      s = review(s, 0);
      expect(s.ease).toBeGreaterThanOrEqual(MIN_EASE);
    }
    expect(s.ease).toBe(MIN_EASE);
  });

  it('a floored card still grows its interval by at least 1.3x', () => {
    let s = reviewTimes(10, 0); // ease now 1.3
    s = reviewTimes(3, 4, s); // 1d, 6d, round(6 * 1.3) = 8d
    expect(s.interval).toBe(8);
  });
});

describe('lapses', () => {
  it('resets repetitions and interval to 1 day on quality < 3', () => {
    const mature = reviewTimes(4, 4); // interval 38, reps 4
    const lapsed = review(mature, 2);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.interval).toBe(1);
    expect(lapsed.lapses).toBe(1);
  });

  it('counts every lapse', () => {
    let s = reviewTimes(3, 4);
    s = review(s, 0);
    s = review(s, 4);
    s = review(s, 1);
    expect(s.lapses).toBe(2);
  });

  it('restarts the 1 / 6 / EF progression after a lapse', () => {
    let s = reviewTimes(4, 4);
    s = review(s, 0); // lapse -> interval 1, ease 2.5 - 0.8 = 1.7
    const easeAfterLapse = s.ease;
    s = review(s, 4);
    expect(s.interval).toBe(1);
    s = review(s, 4);
    expect(s.interval).toBe(6);
    s = review(s, 4);
    expect(s.interval).toBe(Math.round(6 * easeAfterLapse));
  });

  it('reduces ease on a lapse so leeches grow slower', () => {
    const s = review(reviewTimes(2, 4), 0);
    expect(s.ease).toBeLessThan(INITIAL_EASE);
  });

  it('does not count a passing grade as a lapse', () => {
    const s = reviewTimes(5, 3);
    expect(s.lapses).toBe(0);
  });
});

describe('quality validation and grade mapping', () => {
  it('rejects out-of-range or non-integer quality', () => {
    const s = initialState();
    expect(() => review(s, -1 as Quality)).toThrow(RangeError);
    expect(() => review(s, 6 as Quality)).toThrow(RangeError);
    expect(() => review(s, 3.5 as Quality)).toThrow(RangeError);
  });

  it('maps Again/Hard/Good/Easy onto the 0-5 scale', () => {
    const byKey = Object.fromEntries(GRADES.map((g) => [g.key, g.quality]));
    expect(byKey).toEqual({ again: 0, hard: 3, good: 4, easy: 5 });
    expect(byKey.again).toBeLessThan(PASS_THRESHOLD);
    expect(byKey.hard).toBeGreaterThanOrEqual(PASS_THRESHOLD);
  });
});

describe('nextDue', () => {
  it('offsets now by the interval in days', () => {
    const now = 1_700_000_000_000;
    const s = reviewTimes(2, 4); // 6 days
    expect(nextDue(s, now)).toBe(now + 6 * DAY_MS);
  });
});

describe('formatInterval', () => {
  it('formats days, months, and years', () => {
    expect(formatInterval(1)).toBe('1d');
    expect(formatInterval(29)).toBe('29d');
    expect(formatInterval(45)).toBe('1.5mo');
    expect(formatInterval(730)).toBe('2y');
  });
});
