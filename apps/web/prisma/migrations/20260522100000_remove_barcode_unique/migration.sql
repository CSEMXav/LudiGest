-- Supprime l'index unique sur barcode
-- Plusieurs exemplaires du même jeu peuvent partager le même code-barres
DROP INDEX IF EXISTS "Game_barcode_key";
