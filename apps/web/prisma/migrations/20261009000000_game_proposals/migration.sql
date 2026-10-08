CREATE TABLE IF NOT EXISTS "GameProposal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'famille',
    "link" TEXT,
    "summary" TEXT,
    "coverUrl" TEXT,
    "bggId" TEXT,
    "minAge" INTEGER,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "duration" INTEGER,
    "location" TEXT NOT NULL DEFAULT 'Joinville',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GameProposalVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameProposalVote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GameProposal_location_idx" ON "GameProposal"("location");
CREATE INDEX IF NOT EXISTS "GameProposal_userId_idx" ON "GameProposal"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "GameProposalVote_proposalId_userId_key" ON "GameProposalVote"("proposalId", "userId");
CREATE INDEX IF NOT EXISTS "GameProposalVote_proposalId_idx" ON "GameProposalVote"("proposalId");
CREATE INDEX IF NOT EXISTS "GameProposalVote_userId_idx" ON "GameProposalVote"("userId");

DO $$ BEGIN
  ALTER TABLE "GameProposal" ADD CONSTRAINT "GameProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "GameProposalVote" ADD CONSTRAINT "GameProposalVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "GameProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "GameProposalVote" ADD CONSTRAINT "GameProposalVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
