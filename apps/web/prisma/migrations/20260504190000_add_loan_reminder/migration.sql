-- Idempotent: creates LoanReminder table if it doesn't exist
-- (was in schema but never captured in a migration)

CREATE TABLE IF NOT EXISTS "LoanReminder" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoanReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoanReminder_loanId_idx" ON "LoanReminder"("loanId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LoanReminder_loanId_fkey') THEN
    ALTER TABLE "LoanReminder" ADD CONSTRAINT "LoanReminder_loanId_fkey"
      FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
