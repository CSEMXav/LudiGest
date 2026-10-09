CREATE TABLE IF NOT EXISTS "ProposalArchive" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalArchive_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProposalArchive_location_idx" ON "ProposalArchive"("location");

ALTER TABLE "GameProposal" ADD COLUMN IF NOT EXISTS "archiveId" TEXT;
CREATE INDEX IF NOT EXISTS "GameProposal_archiveId_idx" ON "GameProposal"("archiveId");

DO $$ BEGIN
  ALTER TABLE "GameProposal" ADD CONSTRAINT "GameProposal_archiveId_fkey" FOREIGN KEY ("archiveId") REFERENCES "ProposalArchive"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
