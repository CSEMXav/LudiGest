-- Ensure EmailConfig table exists (may have been created via db push without a migration file)
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

-- Add session invite columns if table already existed without them
ALTER TABLE "EmailConfig" ADD COLUMN IF NOT EXISTS "sessionInviteSubject" TEXT NOT NULL DEFAULT '🎲 Invitation session : "{{sessionName}}" — le {{sessionDate}}';
ALTER TABLE "EmailConfig" ADD COLUMN IF NOT EXISTS "sessionInviteBody" TEXT NOT NULL DEFAULT 'Bonjour {{userName}},';
