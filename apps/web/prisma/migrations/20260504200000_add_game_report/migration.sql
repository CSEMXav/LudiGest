-- GameReport table: stores game problem reports from users

CREATE TABLE IF NOT EXISTS "GameReport" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GameReport_gameId_idx" ON "GameReport"("gameId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GameReport_gameId_fkey') THEN
    ALTER TABLE "GameReport" ADD CONSTRAINT "GameReport_gameId_fkey"
      FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
