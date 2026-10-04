# Architecture decisions

## Product boundaries

The browser owns forms and presentation. PostgreSQL owns challenge transitions, daily evaluation, rewards, coins, purchases, and attempt history. Every user-owned row has RLS; functions validate ownership as well as using `auth.uid()`.

## Routes

Public: `/login`, `/signup`. Protected onboarding: `/onboarding`. Main navigation: `/dashboard`, `/tracker`, `/checklist`, `/prebuilt`, `/profile`. Challenge flow: `/challenge/create`, `/challenge/:id`, `/challenge/:id/review`, `/challenge/:id/commit`. Unknown routes show a 404.

## Data model

`challenges` stores the commitment and its locked habit structure. `challenge_attempts` is append-only history for each run. `daily_progress` records evaluated days and current-day progress. `habit_completions` is unique per habit, attempt and day. `reward_events` has a unique key and is the coin ledger. The profile balance is a cached aggregate updated only in trusted functions.

## Date policy

Each challenge stores an IANA timezone chosen from the user's browser at creation, then locked at start. A day is the local calendar date in that timezone. A day is evaluated after its local date ends. Reconciliation runs on reads and habit completion, and can also be called by a scheduled job. A reset begins its next attempt on the date reconciliation occurs; missed dates before that do not immediately consume the new attempt.

## Design system

Ink `#14243a`, blue `#375df4`, cloud `#f6f8fb`, paper `#ffffff`, slate `#64748b`, and line `#dce4ee`. One sans family (Inter with system fallback), generous type hierarchy, small consistent radii, quiet surfaces, and one prominent 21-cell timeline. Mobile gets compact header and bottom navigation; desktop gets a side rail. The timeline is the product's distinctive visual rather than decorative game art.

## Security

No browser write policy exists for attempts, daily progress, completions, rewards, ownership, or shop purchases. Draft challenge and habit edits are constrained by database triggers and policies. Authenticated RPCs implement all irreversible transitions. Service-role credentials never enter the client bundle.
