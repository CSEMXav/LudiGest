-- Idempotent: ensures all v0.45 columns and tables exist (IF NOT EXISTS)
-- Safe to run even if the previous migration already applied some or all of these.

-- GameSession new columns
ALTER TABLE "GameSession" ADD COLUMN IF NOT EXISTS "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GameSession" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
ALTER TABLE "GameSession" ADD COLUMN IF NOT EXISTS "maxParticipants" INTEGER;

-- EmailConfig new columns (table must already exist)
ALTER TABLE "EmailConfig" ADD COLUMN IF NOT EXISTS "sessionInviteSubject" TEXT NOT NULL DEFAULT '🎲 Invitation session : "{{sessionName}}" — le {{sessionDate}}';
ALTER TABLE "EmailConfig" ADD COLUMN IF NOT EXISTS "sessionInviteBody" TEXT NOT NULL DEFAULT 'Bonjour {{userName}},

Vous avez été invité(e) à la session ludique "{{sessionName}}".

Date : {{sessionDate}}
Heure : {{sessionTime}}
Lieu : {{sessionLocation}}

Cliquez ici pour vous inscrire : {{registerUrl}}

Ludothèque BRED';

-- PrivateSessionInvitation table
CREATE TABLE IF NOT EXISTS "PrivateSessionInvitation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivateSessionInvitation_pkey" PRIMARY KEY ("id")
);

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "PrivateSessionInvitation_sessionId_idx" ON "PrivateSessionInvitation"("sessionId");
CREATE INDEX IF NOT EXISTS "PrivateSessionInvitation_userId_idx" ON "PrivateSessionInvitation"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PrivateSessionInvitation_sessionId_userId_key" ON "PrivateSessionInvitation"("sessionId", "userId");

-- Foreign keys (ignore if already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GameSession_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PrivateSessionInvitation_sessionId_fkey'
  ) THEN
    ALTER TABLE "PrivateSessionInvitation" ADD CONSTRAINT "PrivateSessionInvitation_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PrivateSessionInvitation_userId_fkey'
  ) THEN
    ALTER TABLE "PrivateSessionInvitation" ADD CONSTRAINT "PrivateSessionInvitation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
