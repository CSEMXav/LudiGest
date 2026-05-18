ALTER TABLE "EmailConfig" ADD COLUMN IF NOT EXISTS "sessionReminderDays1" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "EmailConfig" ADD COLUMN IF NOT EXISTS "sessionReminderDays2" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "SessionReminderLog" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "daysBefore" INTEGER NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SessionReminderLog_sessionId_userId_daysBefore_key" ON "SessionReminderLog"("sessionId", "userId", "daysBefore");
CREATE INDEX IF NOT EXISTS "SessionReminderLog_sessionId_idx" ON "SessionReminderLog"("sessionId");
CREATE INDEX IF NOT EXISTS "SessionReminderLog_userId_idx" ON "SessionReminderLog"("userId");

ALTER TABLE "SessionReminderLog" ADD CONSTRAINT "SessionReminderLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionReminderLog" ADD CONSTRAINT "SessionReminderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
