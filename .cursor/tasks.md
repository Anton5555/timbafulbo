# Task Playbooks

## General Rule

- Always get userId from Better Auth session
- Never trust client-provided userId

---

## Create Prediction (Server Action)

- Implement as a Server Action

Steps:

1. Get userId from Better Auth session
2. Validate input with Zod
3. Fetch match + tournament
4. Verify membership
5. Enforce lock time
6. Upsert prediction
7. Trigger revalidation if needed

---

## Compute Score (PURE FUNCTION)

Input:

- prediction
- match result
- rules

Steps:

1. If match.isFinal = false → return 0

2. If exact score → rules.scoring.exactScore

3. Else if correct outcome:
   - draw → rules.scoring.correctDraw
   - win → rules.scoring.correctWinner

4. Else → rules.scoring.wrongPrediction

---

## Compute Leaderboard

1. Get predictions for tournament
2. Join with matches where isFinal = true
3. Compute score per prediction
4. Aggregate per user:
   - totalPoints
   - exactHits
   - correctResults

5. Sort using tiebreakers
6. Return ranked list

---

## Create Tournament

1. Get userId from session
2. Validate input
3. Generate inviteCode
4. Create tournament
5. Create membership (admin)

---

## Join Tournament

1. Get userId from session
2. Find tournament by inviteCode
3. Create membership
4. Ignore duplicates safely

---

## Bonus Predictions

1. Validate type
2. Check submission window
3. Upsert per (userId, tournamentId, type)

---

# Edge Cases

- Prediction at exact lockTime → reject
- Match time changes → recompute lock
- Late join → no past predictions
- Duplicate prediction → upsert

---

## Revalidation Rules

- After mutations:
  - revalidate relevant paths or tags

- Example:
  - leaderboard → revalidate tournament page
  - predictions → revalidate match view
