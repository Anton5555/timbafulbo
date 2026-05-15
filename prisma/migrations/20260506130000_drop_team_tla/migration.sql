-- Drop redundant Team.tla column (we use Team.code as the single 3-letter code)
ALTER TABLE "Team" DROP COLUMN IF EXISTS "tla";

