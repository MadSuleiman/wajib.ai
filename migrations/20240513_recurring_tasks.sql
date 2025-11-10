BEGIN;

ALTER TABLE list_items
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_next_occurrence TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS recurrence_last_completed TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS recurrence_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_item_id UUID NOT NULL REFERENCES list_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE recurrence_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_logs FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'recurrence_logs'
      AND policyname = 'Users can view their own recurrence logs'
  ) THEN
    CREATE POLICY "Users can view their own recurrence logs"
      ON recurrence_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'recurrence_logs'
      AND policyname = 'Users can insert their own recurrence logs'
  ) THEN
    CREATE POLICY "Users can insert their own recurrence logs"
      ON recurrence_logs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

UPDATE list_items
SET recurrence_type = 'none'
WHERE recurrence_type IS NULL;

UPDATE list_items
SET recurrence_interval = 1
WHERE recurrence_interval IS NULL OR recurrence_interval < 1;

COMMIT;
