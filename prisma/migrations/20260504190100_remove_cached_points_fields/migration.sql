/*
  Warnings:

  - You are about to drop the column `pointsEarned` on the `BonusPrediction` table. All the data in the column will be lost.
  - You are about to drop the column `pointsEarned` on the `Prediction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BonusPrediction" DROP COLUMN "pointsEarned";

-- AlterTable
ALTER TABLE "Prediction" DROP COLUMN "pointsEarned";
