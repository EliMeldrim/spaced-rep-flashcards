import { makeCard } from './storage';
import type { StoreState } from './types';
import { DEFAULT_SETTINGS } from './types';

/**
 * Demo deck: 15 high-yield medical mnemonics and lab values, so the app
 * has something to study the moment it first loads.
 */
const DEMO_CARDS: Array<{ front: string; back: string; tags: string[] }> = [
  {
    front: 'Normal serum **sodium** (Na+) range?',
    back: '**135–145 mEq/L**',
    tags: ['lab-values', 'electrolytes'],
  },
  {
    front: 'Normal serum **potassium** (K+) range?',
    back: '**3.5–5.0 mEq/L**',
    tags: ['lab-values', 'electrolytes'],
  },
  {
    front: 'Normal **total calcium** range?',
    back: '**8.5–10.5 mg/dL**',
    tags: ['lab-values', 'electrolytes'],
  },
  {
    front: 'Normal **serum creatinine** range (adult)?',
    back: '**0.6–1.2 mg/dL**',
    tags: ['lab-values', 'renal'],
  },
  {
    front: 'Normal **fasting glucose** range?',
    back: '**70–99 mg/dL** (126+ on two occasions = diabetes)',
    tags: ['lab-values', 'endocrine'],
  },
  {
    front: 'Normal **anion gap**?',
    back: '**8–12 mEq/L** (Na − (Cl + HCO3))',
    tags: ['lab-values', 'acid-base'],
  },
  {
    front: 'Normal **WBC** count?',
    back: '**4.5–11.0 × 10^9/L**',
    tags: ['lab-values', 'heme'],
  },
  {
    front: 'Normal **platelet** count?',
    back: '**150–450 × 10^9/L**',
    tags: ['lab-values', 'heme'],
  },
  {
    front: 'MUDPILES — causes of *high anion gap* metabolic acidosis?',
    back: '**M**ethanol, **U**remia, **D**KA, **P**ropylene glycol, **I**ron/INH, **L**actic acidosis, **E**thylene glycol, **S**alicylates',
    tags: ['mnemonics', 'acid-base'],
  },
  {
    front: 'Cranial nerve names mnemonic: "Oh Oh Oh To Touch And Feel Very Good Velvet, Such Heaven"?',
    back: 'Olfactory, Optic, Oculomotor, Trochlear, Trigeminal, Abducens, Facial, Vestibulocochlear, Glossopharyngeal, Vagus, Spinal accessory, Hypoglossal',
    tags: ['mnemonics', 'neuro'],
  },
  {
    front: 'Cranial nerve types: "Some Say Marry Money, But My Brother Says Big Brains Matter More"?',
    back: 'S = sensory, M = motor, B = both — CN I through XII in order',
    tags: ['mnemonics', 'neuro'],
  },
  {
    front: 'APGAR score components?',
    back: '**A**ppearance, **P**ulse, **G**rimace, **A**ctivity, **R**espiration — each 0–2, scored at 1 and 5 minutes',
    tags: ['mnemonics', 'peds'],
  },
  {
    front: '"5 W\'s" of *postoperative fever*?',
    back: '**W**ind (atelectasis/pneumonia), **W**ater (UTI), **W**alking (DVT/PE), **W**ound (infection), **W**onder drugs (drug fever)',
    tags: ['mnemonics', 'surgery'],
  },
  {
    front: 'CAGE questionnaire (alcohol use screening)?',
    back: '**C**ut down? **A**nnoyed by criticism? **G**uilty? **E**ye-opener? — 2+ positives is a positive screen',
    tags: ['mnemonics', 'psych'],
  },
  {
    front: 'Hypercalcemia symptoms: "Stones, Bones, Groans, Thrones, Psychiatric Overtones"?',
    back: 'Kidney *stones*, bone pain, abdominal *groans* (constipation, nausea), polyuria (*thrones*), and confusion/depression',
    tags: ['mnemonics', 'endocrine'],
  },
];

/** Fresh app state containing only the demo deck. */
export function seedState(): StoreState {
  const now = Date.now();
  const deckId = 'demo-medical-mnemonics';
  return {
    decks: [
      {
        id: deckId,
        name: 'Medical Mnemonics & Lab Values',
        description: 'A starter deck of high-yield mnemonics and normal lab ranges.',
        createdAt: now,
      },
    ],
    cards: DEMO_CARDS.map((c, i) =>
      // Stagger createdAt so new cards are introduced in authored order.
      makeCard(deckId, c.front, c.back, c.tags, now + i),
    ),
    log: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
