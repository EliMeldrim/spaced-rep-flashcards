import { useEffect, useRef, useState } from 'react';
import type { Updater } from '../App';
import { Markdown } from './Markdown';
import { buildQueue, cardStage } from '../lib/queue';
import {
  GRADES,
  PASS_THRESHOLD,
  formatInterval,
  nextDue,
  review,
  type Quality,
} from '../lib/sm2';
import type { Card, StoreState } from '../lib/types';

interface Props {
  state: StoreState;
  update: Updater;
  deckId?: string;
  onExit: () => void;
}

function sm2Of(card: Card) {
  const { ease, interval, repetitions, lapses } = card;
  return { ease, interval, repetitions, lapses };
}

export function StudySession({ state, update, deckId, onExit }: Props) {
  // Snapshot the queue once at session start; failed cards re-enter at the
  // end of the queue so they are seen again this session (SM-2 step 7).
  const [queue, setQueue] = useState<string[]>(() => {
    const q = buildQueue(state.cards, state.log, state.settings, Date.now(), deckId);
    return [...q.reviews, ...q.news].map((c) => c.id);
  });
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(0);

  const currentId = queue[0];
  const card = state.cards.find((c) => c.id === currentId);
  const deckName = deckId ? state.decks.find((d) => d.id === deckId)?.name : 'All decks';

  // Keep the latest handlers in a ref so the keydown listener stays stable.
  const handlers = useRef({ flip: () => {}, grade: (_q: Quality) => {} });

  function flip() {
    if (card) setRevealed((r) => !r);
  }

  function grade(quality: Quality) {
    if (!card || !revealed) return;
    const now = Date.now();
    const next = review(sm2Of(card), quality);
    const due = nextDue(next, now);
    const wasNew = card.lastReviewed === null;
    const cardId = card.id;
    const cardDeckId = card.deckId;

    update((s) => ({
      ...s,
      cards: s.cards.map((c) =>
        c.id === cardId ? { ...c, ...next, due, lastReviewed: now } : c,
      ),
      log: [...s.log, { ts: now, cardId, deckId: cardDeckId, quality, wasNew }],
    }));
    setQueue((q) => {
      const rest = q.slice(1);
      // Failed cards come back around at the end of this session.
      return quality < PASS_THRESHOLD ? [...rest, cardId] : rest;
    });
    setRevealed(false);
    setCompleted((n) => n + 1);
  }

  handlers.current = { flip, grade };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handlers.current.flip();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const g = GRADES[Number(e.key) - 1];
        handlers.current.grade(g.quality);
      } else if (e.key === 'Escape') {
        onExit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  if (!card) {
    return (
      <div className="page study-page">
        <div className="study-done">
          <h1>{completed > 0 ? 'Session complete' : 'Nothing to study'}</h1>
          <p className="muted">
            {completed > 0
              ? `You answered ${completed} card${completed === 1 ? '' : 's'}. Nice work.`
              : 'No cards are due right now. Come back later or add more cards.'}
          </p>
          <button className="btn primary" onClick={onExit}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page study-page">
      <div className="study-head">
        <button className="btn link" onClick={onExit}>
          ← Exit
        </button>
        <span className="muted">
          {deckName} · {queue.length} left · {completed} done
        </span>
      </div>

      <div
        className="study-card"
        role="button"
        tabIndex={0}
        aria-label={revealed ? 'Card, answer shown' : 'Card, press space to reveal'}
        onClick={flip}
      >
        <div className="study-meta">
          <span className={`badge stage-${cardStage(card)}`}>{cardStage(card)}</span>
          {card.tags.map((t) => (
            <span key={t} className="badge tag">
              #{t}
            </span>
          ))}
        </div>
        <div className="study-front">
          <Markdown text={card.front} />
        </div>
        {revealed && (
          <>
            <hr className="study-divider" />
            <div className="study-back">
              <Markdown text={card.back} />
            </div>
          </>
        )}
      </div>

      {revealed ? (
        <div className="grade-row">
          {GRADES.map((g, i) => {
            const preview = review(sm2Of(card), g.quality);
            return (
              <button
                key={g.key}
                className={`btn grade grade-${g.key}`}
                onClick={() => grade(g.quality)}
              >
                <span className="grade-label">
                  {i + 1} · {g.label}
                </span>
                <span className="grade-interval">{formatInterval(preview.interval)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grade-row">
          <button className="btn primary reveal" onClick={flip}>
            Show answer <kbd>Space</kbd>
          </button>
        </div>
      )}

      <p className="muted small kbd-hint">
        Space to flip · 1 Again · 2 Hard · 3 Good · 4 Easy · Esc to exit
      </p>
    </div>
  );
}
