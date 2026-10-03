# SIDELINED — not deployed, not called

Everything in this folder is **switched off**. Nothing in the app imports it,
`src/index.ts` exports none of it (so no Cloud Function is deployed from it),
and the functions build (`tsconfig.json`) excludes it. It is kept because Elo
ratings are planned future functionality (power rankings, big-game
highlights, upset alerts), not because anything uses it today.

## Why it is sidelined

- Betting was removed from YaleIMs (2026-10), and win probabilities are no
  longer shown anywhere. Elo ratings and odds were only ever computed to price
  bets and display probabilities.
- So since then **nothing computes Elo or odds**: `scoreMatch` no longer
  updates ratings, and `getMatchesPaginated` no longer fills in (and writes)
  missing odds during reads.
- The Firestore data is **left frozen, not deleted**: the `elo/` collection
  and the `home_college_odds` / `away_college_odds` / `draw_odds` fields on
  existing match documents keep their last values.

Nothing is lost by stopping: Elo is fully derivable from match results. To
bring it back for any season, replay that season's scored matches in order
(see `elo_runner.ts` / `research/replayEloSeason.ts`).

## What's here

| File | What it is |
|---|---|
| `elo_system.ts` | The rating engine: `ELO_CONFIG`, `updateEloRatings` (writes `elo/{season}/sports/{sport}/colleges/{abbr}` + a match log), `getEloWinProbabilities`. Was called by `scoreMatch` after every score. |
| `elo_odds_calculator.ts` | `hybridOddsCalculator`: Elo probabilities adjusted by each team's forfeit history → P(home), P(away), P(draw). |
| `recalcOdds.ts` | After a score, recomputed odds for the sport's upcoming matches involving those teams and wrote them to the match docs. |
| `elo_runner.ts` | `runEloSeason` (was deployed without source in git; recovered 2026-10-02): replays a season's matches through the engine and returns per-match odds. **Unauthenticated and writes Elo**, and it applies updates on top of current ratings (a second run double-counts). Fix both before ever deploying it again. |
| `getUpcomingMatchOdds.ts` | `getUpcomingMatchOdds` (deployed, recovered): odds for unscored matches. Unauthenticated, read-only. |
| `initEloSeason.ts` | Seeds `elo/{season}` with a doc per sport and college at the initial rating. Replaces the old `database/misc/initEloSeason.js`. |
| `SYSTEM_SPECIFICATION.md` | Spec of the model v1.1 (Feb 2026): tuned by a 525,000-run grid search, 67.96% accuracy. |
| `research/` | The tuning work: `elo_experiment.ts` (`runEloExperiment`, was deployed), `runExperiment.ts` (grid search), `replayEloSeason.ts`, `exportMatches.ts`, `aggregateSeasonStats.ts`, Python analysis scripts and guides. |

**Not included on purpose:** the recovered data dumps (`data/*.json`, real
student emails) and experiment outputs. They stay out of git; see
`.gitignore` below this folder. `exportMatches.ts` recreates a dump locally if
ever needed; never commit it.

## Betting volume

Model v1.1 blended Elo with **betting volume** ("market sentiment"). Betting
no longer exists, so that blend is gone from every piece of code here that
computes or replays odds: they use Elo + forfeit history only. The
`research/` code, the guides and `SYSTEM_SPECIFICATION.md` still describe and
tune the blend; they are kept as the record of how the parameters were
chosen. If Elo comes back, re-tune without the volume parameters
(`V_threshold`, `maxVolWeight`), since the published 67.96% included them.

## Rules while it is sidelined

1. Nothing outside `src/sidelined/` may import from it. CI enforces this
   (`npm run check:sidelined`).
2. It stays type-checked so it doesn't rot: `npm run typecheck:sidelined`
   (also in CI; no output is emitted).
3. Don't add it to `src/index.ts`.

## How to bring it back

1. Decide what the feature needs (ratings only for power rankings, or odds
   too) and where the data lives in the new schema (Phase 2), rather than
   reviving `elo/{season}/...` as is.
2. Move the needed modules out of `sidelined/` into the normal source tree
   and remove them from the `tsconfig.json` exclude.
3. Rebuild ratings by replaying each season's scored matches in order
   (`elo_runner.ts` logic), starting from fresh `initEloSeason` docs.
4. Put the Elo update back into scoring, **and also reverse it in
   `undoScoreMatch`** (it never was: a known bug before sidelining).
5. Any HTTP endpoint (`runEloSeason`, `getUpcomingMatchOdds`) must require an
   admin/dev token before it is deployed again.
