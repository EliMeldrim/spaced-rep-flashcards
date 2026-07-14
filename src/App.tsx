import { useCallback, useState } from 'react';
import { DeckList } from './components/DeckList';
import { DeckView } from './components/DeckView';
import { StatsDashboard } from './components/StatsDashboard';
import { StudySession } from './components/StudySession';
import { loadState, saveState } from './lib/storage';
import type { StoreState } from './lib/types';

export type View =
  | { name: 'decks' }
  | { name: 'deck'; deckId: string }
  | { name: 'study'; deckId?: string }
  | { name: 'stats' };

export type Updater = (fn: (s: StoreState) => StoreState) => void;

export default function App() {
  const [state, setState] = useState<StoreState>(() => loadState());
  const [view, setView] = useState<View>({ name: 'decks' });

  const update: Updater = useCallback((fn) => {
    setState((prev) => {
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setView({ name: 'decks' })}>
          <span className="brand-mark" aria-hidden="true">
            ▞
          </span>
          Recall
        </button>
        <nav>
          <button
            className={view.name === 'decks' || view.name === 'deck' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setView({ name: 'decks' })}
          >
            Decks
          </button>
          <button
            className={view.name === 'stats' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setView({ name: 'stats' })}
          >
            Stats
          </button>
        </nav>
      </header>

      <main className="content">
        {view.name === 'decks' && <DeckList state={state} update={update} setView={setView} />}
        {view.name === 'deck' && (
          <DeckView state={state} update={update} deckId={view.deckId} setView={setView} />
        )}
        {view.name === 'study' && (
          <StudySession
            state={state}
            update={update}
            deckId={view.deckId}
            onExit={() =>
              setView(view.deckId ? { name: 'deck', deckId: view.deckId } : { name: 'decks' })
            }
          />
        )}
        {view.name === 'stats' && <StatsDashboard state={state} />}
      </main>
    </div>
  );
}
