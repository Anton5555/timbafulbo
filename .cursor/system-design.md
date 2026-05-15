# Authentication (Better Auth)

- Better Auth manages users

- userId comes from session

- No local User table

- userId is used as external reference in all tables

---

# Database Design (Prisma)

## Tournament

- id
- name
- ownerId (userId)
- inviteCode (unique)
- rules (JSON)
- createdAt

---

## Membership

- id
- userId
- tournamentId
- role ("admin" | "member")

Constraints:

- unique(userId, tournamentId)

---

## Match (GLOBAL)

- id
- externalId (optional)
- homeTeam
- awayTeam
- startTime
- homeScore (nullable)
- awayScore (nullable)
- isFinal (boolean)

---

## Prediction

- id
- userId
- matchId
- tournamentId
- homeScore
- awayScore
- createdAt
- updatedAt

Constraints:

- unique(userId, matchId, tournamentId)

---

## BonusPrediction (optional)

- id
- userId
- tournamentId
- type ("champion", "runnerUp", etc.)
- value (string)
- createdAt

---

# Relationships

- userId is from Better Auth

- No Prisma relation to a User table

- User ↔ Tournament via Membership

- Tournament → many Predictions

- Match → many Predictions

- Matches are shared across tournaments

---

# Core Invariants

- User must be member of tournament to interact
- Predictions must respect lock time
- Predictions immutable after lock
- Match result is source of truth
- Scores are derived

---

# Derived Data (DO NOT STORE)

- matchPoints
- totalPoints
- leaderboard ranking

---

# Indexing Strategy

- Prediction:
  - index(tournamentId)
  - index(matchId)
  - index(userId)

- Membership:
  - index(tournamentId)

- Match:
  - index(startTime)

---

# Optional Cache (ONLY if needed)

## UserProfile (optional)

- id (userId)
- email
- displayName

Used for UI only (not source of truth)
