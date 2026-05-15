-- CreateEnum
CREATE TYPE "FootballDataMatchStatus" AS ENUM (
  'SCHEDULED',
  'LIVE',
  'IN_PLAY',
  'PAUSED',
  'FINISHED',
  'POSTPONED',
  'SUSPENDED',
  'CANCELLED'
);

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "apiSyncedAt" TIMESTAMP(3);

-- Convert status from TEXT to enum (unknown values become NULL)
ALTER TABLE "Match" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Match" ALTER COLUMN "status" TYPE "FootballDataMatchStatus" USING (
  CASE
    WHEN "status" IS NULL THEN NULL
    WHEN "status" IN (
      'SCHEDULED',
      'LIVE',
      'IN_PLAY',
      'PAUSED',
      'FINISHED',
      'POSTPONED',
      'SUSPENDED',
      'CANCELLED'
    ) THEN "status"::"FootballDataMatchStatus"
    ELSE NULL
  END
);
