-- CreateEnum
CREATE TYPE "PenaltyWinnerSide" AS ENUM ('HOME', 'AWAY');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "penaltyWinner" "PenaltyWinnerSide";

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN "penaltyWinner" "PenaltyWinnerSide";
