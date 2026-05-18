-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "GameWaitlist" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "GameWaitlist_gameId_userId_key" ON "GameWaitlist"("gameId", "userId");
CREATE INDEX IF NOT EXISTS "GameWaitlist_gameId_idx" ON "GameWaitlist"("gameId");
CREATE INDEX IF NOT EXISTS "GameWaitlist_userId_idx" ON "GameWaitlist"("userId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "GameWaitlist" ADD CONSTRAINT "GameWaitlist_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GameWaitlist" ADD CONSTRAINT "GameWaitlist_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
