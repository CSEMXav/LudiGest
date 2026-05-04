-- Full idempotent migration: creates EmailConfig, adds private session columns, creates PrivateSessionInvitation
-- Safe to run multiple times (IF NOT EXISTS everywhere).

-- 1. EmailConfig table (may not exist if it was never created via a migration)
CREATE TABLE IF NOT EXISTS "EmailConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "reminderDaysBefore" INTEGER NOT NULL DEFAULT 2,
    "overdueFrequencyDays" INTEGER NOT NULL DEFAULT 3,
    "reminderSubject" TEXT NOT NULL DEFAULT 'Rappel : rendez "{{gameName}}" avant le {{dueAt}}',
    "reminderBody" TEXT NOT NULL DEFAULT 'Bonjour {{userName}},',
    "overdueSubject" TEXT NOT NULL DEFAULT 'Retard : veuillez rendre "{{gameName}}"',
    "overdueBody" TEXT NOT NULL DEFAULT 'Bonjour {{userName}},',
    "sessionInviteSubject" TEXT NOT NULL DEFAULT '🎲 Invitation session : "{{sessionName}}" — le {{sessionDate}}',
    "sessionInviteBody" TEXT NOT NULL DEFAULT 'Bonjour {{userName}},',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EmailConfig" ADD COLUMN IF NOT EXISTS "sessionInviteSubject" TEXT NOT NULL DEFAULT '🎲 Invitation session : "{{sessionName}}" — le {{sessionDate}}';
ALTER TABLE "EmailConfig" ADD COLUMN IF NOT EXISTS "sessionInviteBody" TEXT NOT NULL DEFAULT 'Bonjour {{userName}},';

-- 2. New columns on GameSession
ALTER TABLE "GameSession" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GameSession" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
ALTER TABLE "GameSession" ADD COLUMN IF NOT EXISTS "maxParticipants" INTEGER;

-- 3. PrivateSessionInvitation table
CREATE TABLE IF NOT EXISTS "PrivateSessionInvitation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivateSessionInvitation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PrivateSessionInvitation_sessionId_idx" ON "PrivateSessionInvitation"("sessionId");
CREATE INDEX IF NOT EXISTS "PrivateSessionInvitation_userId_idx" ON "PrivateSessionInvitation"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PrivateSessionInvitation_sessionId_userId_key" ON "PrivateSessionInvitation"("sessionId", "userId");

-- 4. Foreign keys (idempotent via DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GameSession_createdByUserId_fkey') THEN
    ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PrivateSessionInvitation_sessionId_fkey') THEN
    ALTER TABLE "PrivateSessionInvitation" ADD CONSTRAINT "PrivateSessionInvitation_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PrivateSessionInvitation_userId_fkey') THEN
    ALTER TABLE "PrivateSessionInvitation" ADD CONSTRAINT "PrivateSessionInvitation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
