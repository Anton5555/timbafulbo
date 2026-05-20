-- CreateTable
CREATE TABLE "TournamentChatMessage" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TournamentChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentChatMessage_tournamentId_createdAt_idx" ON "TournamentChatMessage"("tournamentId", "createdAt");

-- CreateIndex
CREATE INDEX "TournamentChatMessage_userId_idx" ON "TournamentChatMessage"("userId");

-- AddForeignKey
ALTER TABLE "TournamentChatMessage" ADD CONSTRAINT "TournamentChatMessage_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentChatMessage" ADD CONSTRAINT "TournamentChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
