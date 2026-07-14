import { useState } from 'react';
import type { Updater, View } from '../App';
import { Markdown } from './Markdown';
import { cardStage, dueCounts } from '../lib/queue';
import { formatInterval } from '../lib/sm2';
import { makeCard } from '../lib/storage';
import type { Card, StoreState } from '../lib/types';

interface Props {
  state: StoreState;
  update: Updater;
  deckId: string;
  setView: (v: View) => void;
}

interface EditorValues {
  front: string;
  back: string;
  tags: string;
}

const EMPTY: EditorValues = { front: '', back: '', tags: '' };

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function CardEditor({
  initial,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: EditorValues;
  onSave: (v: EditorValues) => void;
  onCancel?: () => void;
  saveLabel: string;
}) {
  const [values, setValues] = useState(initial);
  const valid = values.front.trim() && values.back.trim();

  return (
    <form
      className="card-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave(values);
        setValues(EMPTY);
      }}
    >
      <textarea
        placeholder="Front — the prompt (supports **bold**, *italic*, `code`)"
        value={values.front}
        rows={2}
        onChange={(e) => setValues({ ...values, front: e.target.value })}
      />
      <textarea
        placeholder="Back — the answer"
        value={values.back}
        rows={2}
        onChange={(e) => setValues({ ...values, back: e.target.value })}
      />
      <div className="editor-row">
        <input
          placeholder="Tags (comma separated, optional)"
          value={values.tags}
          onChange={(e) => setValues({ ...values, tags: e.target.value })}
        />
        <button className="btn primary" type="submit" disabled={!valid}>
          {saveLabel}
        </button>
        {onCancel && (
          <button className="btn" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function DeckView({ state, update, deckId, setView }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const deck = state.decks.find((d) => d.id === deckId);
  if (!deck) {
    return (
      <div className="page">
        <p className="empty">Deck not found.</p>
        <button className="btn" onClick={() => setView({ name: 'decks' })}>
          Back to decks
        </button>
      </div>
    );
  }

  const cards = state.cards
    .filter((c) => c.deckId === deckId)
    .sort((a, b) => a.createdAt - b.createdAt);
  const due = dueCounts(state.cards, state.log, state.settings, Date.now(), deckId);

  function addCard(v: EditorValues) {
    const card = makeCard(deckId, v.front.trim(), v.back.trim(), parseTags(v.tags));
    update((s) => ({ ...s, cards: [...s.cards, card] }));
  }

  function saveEdit(card: Card, v: EditorValues) {
    update((s) => ({
      ...s,
      cards: s.cards.map((c) =>
        c.id === card.id
          ? { ...c, front: v.front.trim(), back: v.back.trim(), tags: parseTags(v.tags) }
          : c,
      ),
    }));
    setEditingId(null);
  }

  function deleteCard(card: Card) {
    if (!window.confirm('Delete this card? This cannot be undone.')) return;
    update((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== card.id) }));
  }

  return (
    <div className="page">
      <button className="btn link" onClick={() => setView({ name: 'decks' })}>
        ← All decks
      </button>

      <div className="page-head">
        <div>
          {renaming ? (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const name = nameDraft.trim();
                if (name) {
                  update((s) => ({
                    ...s,
                    decks: s.decks.map((d) => (d.id === deckId ? { ...d, name } : d)),
                  }));
                }
                setRenaming(false);
              }}
            >
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                aria-label="Deck name"
              />
              <button className="btn primary" type="submit">
                Save
              </button>
              <button className="btn" type="button" onClick={() => setRenaming(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <h1>
              {deck.name}{' '}
              <button
                className="btn link small"
                onClick={() => {
                  setNameDraft(deck.name);
                  setRenaming(true);
                }}
              >
                rename
              </button>
            </h1>
          )}
          <p className="muted">
            {cards.length} cards · {due.reviewsDue} due · {due.newAvailable} new available
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn primary"
            disabled={due.reviewsDue + due.newAvailable === 0}
            onClick={() => setView({ name: 'study', deckId })}
          >
            Study this deck
          </button>
        </div>
      </div>

      <section className="add-card">
        <h2>Add a card</h2>
        <CardEditor initial={EMPTY} onSave={addCard} saveLabel="Add card" />
      </section>

      <ul className="card-list">
        {cards.map((card) => (
          <li key={card.id} className="card-row">
            {editingId === card.id ? (
              <CardEditor
                initial={{ front: card.front, back: card.back, tags: card.tags.join(', ') }}
                onSave={(v) => saveEdit(card, v)}
                onCancel={() => setEditingId(null)}
                saveLabel="Save"
              />
            ) : (
              <>
                <div className="card-row-text">
                  <div className="card-front">
                    <Markdown text={card.front} />
                  </div>
                  <div className="card-back muted">
                    <Markdown text={card.back} />
                  </div>
                  <div className="card-meta">
                    <span className={`badge stage-${cardStage(card)}`}>{cardStage(card)}</span>
                    {card.lastReviewed !== null && (
                      <span className="badge">every {formatInterval(card.interval)}</span>
                    )}
                    {card.lapses > 0 && <span className="badge">{card.lapses} lapses</span>}
                    {card.tags.map((t) => (
                      <span key={t} className="badge tag">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="card-row-actions">
                  <button className="btn small-btn" onClick={() => setEditingId(card.id)}>
                    Edit
                  </button>
                  <button className="btn danger small-btn" onClick={() => deleteCard(card)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {cards.length === 0 && <p className="empty">No cards yet — add your first card above.</p>}
    </div>
  );
}
