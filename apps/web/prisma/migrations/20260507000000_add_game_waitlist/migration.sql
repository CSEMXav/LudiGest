-- CreateTable
CREATE TABLE "GameWaitlist" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameWaitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameWaitlist_gameId_userId_key" ON "GameWaitlist"("gameId", "userId");

-- CreateIndex
CREATE INDEX "GameWaitlist_gameId_idx" ON "GameWaitlist"("gameId");

-- CreateIndex
CREATE INDEX "GameWaitlist_userId_idx" ON "GameWaitlist"("userId");

-- AddForeignKey
ALTER TABLE "GameWaitlist" ADD CONSTRAINT "GameWaitlist_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameWaitlist" ADD CONSTRAINT "GameWaitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
