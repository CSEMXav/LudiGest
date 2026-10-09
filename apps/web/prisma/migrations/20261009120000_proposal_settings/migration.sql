CREATE TABLE IF NOT EXISTS "ProposalSettings" (
    "location" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalSettings_pkey" PRIMARY KEY ("location")
);
