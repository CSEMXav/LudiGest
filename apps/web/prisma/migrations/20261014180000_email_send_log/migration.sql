CREATE TABLE IF NOT EXISTS "EmailSendLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSendLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailSendLog_to_subject_day_key" ON "EmailSendLog"("to", "subject", "day");
CREATE INDEX IF NOT EXISTS "EmailSendLog_createdAt_idx" ON "EmailSendLog"("createdAt");
