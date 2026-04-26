-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bggId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'famille',
    "summary" TEXT,
    "minAge" INTEGER,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "duration" INTEGER,
    "coverUrl" TEXT,
    "barcode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Game" ("addedAt", "barcode", "bggId", "coverUrl", "id", "minAge", "name", "status", "summary", "type") SELECT "addedAt", "barcode", "bggId", "coverUrl", "id", "minAge", "name", "status", "summary", "type" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_bggId_key" ON "Game"("bggId");
CREATE UNIQUE INDEX "Game_barcode_key" ON "Game"("barcode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
