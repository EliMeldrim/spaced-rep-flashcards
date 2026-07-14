import { useRef, useState } from 'react';
import type { Updater, View } from '../App';
import { dueCounts } from '../lib/queue';
import { uid } from '../lib/storage';
import { exportDeck, parseDeckImport } from '../lib/transfer';
import type { StoreState } from '../lib/types';

interface Props {
  state: StoreState;
  update: Updater;
  setView: (v: View) => void;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DeckList({ state, update, setView }: Props) {
  const [newName, setNewName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const now = Date.now();

  const totals = dueCounts(state.cards, state.log, state.settings, now);

  function createDeck(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const deck = { id: uid(), name, createdAt: Date.now() };
    update((s) => ({ ...s, decks: [...s.decks, deck] }));
    setNewName('');
    setView({ name: 'deck', deckId: deck.id });
  }

  function deleteDeck(deckId: string, deckName: string) {
    const count = state.cards.filter((c) => c.deckId === deckId).length;
    if (!window.confirm(`Delete "${deckName}" and its ${count} card(s)? This cannot be undone.`)) {
      return;
    }
    update((s) => ({
      ...s,
      decks: s.decks.filter((d) => d.id !== deckId),
      cards: s.cards.filter((c) => c.deckId !== deckId),
    }));
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const { deck, cards } = parseDeckImport(text);
      update((s) => ({ ...s, decks: [...s.decks, deck], cards: [...s.cards, ...cards] }));
      setImportError(null);
      setView({ name: 'deck', deckId: deck.id });
    } catch (err) {
      setImportError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Decks</h1>
          <p className="muted">
            {totals.reviewsDue} review{totals.reviewsDue === 1 ? '' : 's'} due ·{' '}
            {totals.newAvailable} new available today
          </p>
        </div>
        <div className="page-actions">
          <label className="setting-inline">
            New cards/day
            <input
              type="number"
              min={0}
              max={999}
              value={state.settings.newPerDay}
              onChange={(e) => {
                const v = Math.max(0, Math.min(999, Number(e.target.value) || 0));
                update((s) => ({ ...s, settings: { ...s.settings, newPerDay: v } }));
              }}
            />
          </label>
          <button
            className="btn primary"
            disabled={totals.reviewsDue + totals.newAvailable === 0}
            onClick={() => setView({ name: 'study' })}
          >
            Study all
          </button>
        </div>
      </div>

      {state.decks.length === 0 && (
        <p className="empty">No decks yet. Create one below or import a JSON deck.</p>
      )}

      <ul className="deck-grid">
        {state.decks.map((deck) => {
          const cards = state.cards.filter((c) => c.deckId === deck.id);
          const due = dueCounts(state.cards, state.log, state.settings, now, deck.id);
          return (
            <li key={deck.id} className="deck-card">
              <button className="deck-main" onClick={() => setView({ name: 'deck', deckId: deck.id })}>
                <h2>{deck.name}</h2>
                {deck.description && <p className="muted small">{deck.description}</p>}
                <p className="deck-badges">
                  <span className="badge">{cards.length} cards</span>
                  {due.reviewsDue > 0 && <span className="badge due">{due.reviewsDue} due</span>}
                  {due.newAvailable > 0 && <span className="badge new">{due.newAvailable} new</span>}
                </p>
              </button>
              <div className="deck-actions">
                <button
                  className="btn primary small-btn"
                  disabled={due.reviewsDue + due.newAvailable === 0}
                  onClick={() => setView({ name: 'study', deckId: deck.id })}
                >
                  Study
                </button>
                <button
                  className="btn small-btn"
                  onClick={() =>
                    downloadJson(
                      `${deck.name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}.json`,
                      exportDeck(state, deck.id),
                    )
                  }
                >
                  Export
                </button>
                <button className="btn danger small-btn" onClick={() => deleteDeck(deck.id, deck.name)}>
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="deck-list-footer">
        <form className="inline-form" onSubmit={createDeck}>
          <input
            placeholder="New deck name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="New deck name"
          />
          <button className="btn primary" type="submit" disabled={!newName.trim()}>
            Create deck
          </button>
        </form>
        <div>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import deck (JSON)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onImportFile}
          />
        </div>
      </div>
      {importError && <p className="error">{importError}</p>}
    </div>
  );
}
