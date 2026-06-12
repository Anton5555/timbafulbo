-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FootballDataMatchStatus" ADD VALUE 'TIMED';
ALTER TYPE "FootballDataMatchStatus" ADD VALUE 'EXTRA_TIME';
ALTER TYPE "FootballDataMatchStatus" ADD VALUE 'PENALTY_SHOOTOUT';
ALTER TYPE "FootballDataMatchStatus" ADD VALUE 'AWARDED';
