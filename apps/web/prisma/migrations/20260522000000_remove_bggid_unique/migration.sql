-- Supprime la contrainte d'unicité globale sur bggId
-- Plusieurs bibliothèques peuvent avoir le même jeu (même bggId, copie physique différente)
DROP INDEX IF EXISTS "Game_bggId_key";
ALTER TABLE "Game" DROP CONSTRAINT IF EXISTS "Game_bggId_key";
