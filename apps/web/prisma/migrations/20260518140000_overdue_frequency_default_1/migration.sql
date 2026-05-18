-- Passe la fréquence des rappels retard à 1 jour (quotidien) par défaut
ALTER TABLE "EmailConfig" ALTER COLUMN "overdueFrequencyDays" SET DEFAULT 1;
UPDATE "EmailConfig" SET "overdueFrequencyDays" = 1 WHERE id = 'singleton' AND "overdueFrequencyDays" = 3;
