-- Esegui una volta sul database Postgres usato dall'app (Drizzle / produzione).
ALTER TABLE app_events
  ADD COLUMN IF NOT EXISTS survey_mode text NOT NULL DEFAULT 'flexible_voting';
