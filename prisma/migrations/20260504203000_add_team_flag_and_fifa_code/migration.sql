-- AlterTable
ALTER TABLE "Team" ADD COLUMN "flagEmoji" TEXT,
ADD COLUMN "fifaCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Team_fifaCode_key" ON "Team"("fifaCode");
