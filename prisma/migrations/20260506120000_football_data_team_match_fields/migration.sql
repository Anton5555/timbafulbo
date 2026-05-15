-- Drop removed Team columns (replaced by crest + ISO code sync from football-data.org)
DROP INDEX IF EXISTS "Team_fifaCode_key";

ALTER TABLE "Team" DROP COLUMN IF EXISTS "flagEmoji";
ALTER TABLE "Team" DROP COLUMN IF EXISTS "fifaCode";

ALTER TABLE "Team" ADD COLUMN "footballDataId" INTEGER,
ADD COLUMN "crestUrl" TEXT,
ADD COLUMN "shortName" TEXT,
ADD COLUMN "tla" TEXT,
ADD COLUMN "areaName" TEXT;

CREATE UNIQUE INDEX "Team_footballDataId_key" ON "Team"("footballDataId");

ALTER TABLE "Match" ADD COLUMN "footballDataId" INTEGER,
ADD COLUMN "status" TEXT,
ADD COLUMN "matchday" INTEGER,
ADD COLUMN "lastUpdated" TIMESTAMP(3);

CREATE UNIQUE INDEX "Match_footballDataId_key" ON "Match"("footballDataId");
