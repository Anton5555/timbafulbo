# Realistic WC Rehearsal Results Design

## Goal

Make manual World Cup rehearsal finalization produce football-like scores instead of too many high-scoring matches. Common results such as `0-0`, `1-0`, `1-1`, and `2-1` should appear often. Higher-scoring matches such as `3-2`, `4-2`, or `4-3` can still happen, but rarely.

## Chosen Approach

Use a deterministic weighted scoreline table. The script already supports seeded deterministic output, so the new helper will keep that behavior while selecting from realistic result frequencies.

Alternatives considered:

- A Poisson-style goal model would be more statistical, but it adds tuning complexity for a manual testing script.
- Reshaping the existing independent `0..4` rolls would be quick, but it is harder to reason about exact scoreline frequencies.

## Behavior

- `finalize-wc-batch` will choose one weighted scoreline per match from a curated list.
- Low-score results will dominate the table.
- A small number of high-score entries will remain possible.
- Group-stage draws will remain tied with no penalty winner.
- Knockout-stage draws will receive a deterministic `HOME` or `AWAY` `penaltyWinner`.
- Non-draw knockout matches will not set `penaltyWinner`.

## Implementation

- Move the simulation logic into an exported helper in `scripts/manual-testing/wc-rehearsal-utils.ts`.
- Keep `finalize-wc-batch.ts` focused on fetching pending matches and writing the generated result.
- Add script tests for the simulation helper before changing production behavior.

## Testing

- Verify representative seeds produce common low-score results.
- Verify at least one rare high-score result is still reachable.
- Verify group-stage draws do not set penalties.
- Verify knockout-stage draws do set deterministic penalties.
- Run the existing rehearsal utility test command.
