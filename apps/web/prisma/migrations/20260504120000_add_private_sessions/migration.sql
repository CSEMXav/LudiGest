-- AlterTable GameSession
ALTER TABLE "GameSession" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GameSession" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "maxParticipants" INTEGER;

-- AlterTable EmailConfig
ALTER TABLE "EmailConfig" ADD COLUMN "sessionInviteSubject" TEXT NOT NULL DEFAULT '🎲 Invitation session : "{{sessionName}}" — le {{sessionDate}}';
ALTER TABLE "EmailConfig" ADD COLUMN "sessionInviteBody" TEXT NOT NULL DEFAULT E'Bonjour {{userName}},\n\nVous avez été invité(e) à la session ludique "{{sessionName}}".\n\nDate : {{sessionDate}}\nHeure : {{sessionTime}}\nLieu : {{sessionLocation}}\n\nCliquez ici pour vous inscrire : {{registerUrl}}\n\nLudothèque BRED';

-- CreateTable
CREATE TABLE "PrivateSessionInvitation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateSessionInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivateSessionInvitation_sessionId_idx" ON "PrivateSessionInvitation"("sessionId");
CREATE INDEX "PrivateSessionInvitation_userId_idx" ON "PrivateSessionInvitation"("userId");
CREATE UNIQUE INDEX "PrivateSessionInvitation_sessionId_userId_key" ON "PrivateSessionInvitation"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PrivateSessionInvitation" ADD CONSTRAINT "PrivateSessionInvitation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivateSessionInvitation" ADD CONSTRAINT "PrivateSessionInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
