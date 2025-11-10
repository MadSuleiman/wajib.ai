BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS categories (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  color TEXT
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'categories'
      AND policyname = 'Categories can be viewed by authenticated users'
  ) THEN
    CREATE POLICY "Categories can be viewed by authenticated users"
      ON categories FOR SELECT
      USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'categories'
      AND policyname = 'Categories can be managed by service role'
  ) THEN
    CREATE POLICY "Categories can be managed by service role"
      ON categories FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END
$$;

INSERT INTO categories (slug, label, description, color)
VALUES
  ('task', 'Tasks', 'Work or personal todos', '#6366f1'),
  ('shopping', 'Shopping', 'Groceries or things to buy', '#ec4899'),
  ('watch', 'Watch', 'Movies, shows, and content to watch', '#f59e0b'),
  ('idea', 'Ideas', 'Brainstorming and future ideas', '#06b6d4'),
  ('personal', 'Personal', 'Personal errands and reminders', '#84cc16'),
  ('reading', 'Reading', 'Books and articles to read', '#a855f7'),
  ('fitness', 'Fitness', 'Workouts and health goals', '#ef4444'),
  ('errands', 'Errands', 'Errands and quick chores', '#14b8a6')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority task_priority DEFAULT 'medium',
  estimated_hours NUMERIC,
  category TEXT NOT NULL DEFAULT 'task' REFERENCES categories (slug),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'list_items'
      AND policyname = 'Users can view their own list items'
  ) THEN
    CREATE POLICY "Users can view their own list items"
      ON list_items FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'list_items'
      AND policyname = 'Users can insert their own list items'
  ) THEN
    CREATE POLICY "Users can insert their own list items"
      ON list_items FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'list_items'
      AND policyname = 'Users can update their own list items'
  ) THEN
    CREATE POLICY "Users can update their own list items"
      ON list_items FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'list_items'
      AND policyname = 'Users can delete their own list items'
  ) THEN
    CREATE POLICY "Users can delete their own list items"
      ON list_items FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    INSERT INTO list_items (created_at, title, completed, priority, estimated_hours, category, user_id)
    SELECT created_at,
           title,
           completed,
           priority::task_priority,
           estimated_hours,
           'task',
           user_id
    FROM tasks;
  END IF;

  IF to_regclass('public.shopping_items') IS NOT NULL THEN
    INSERT INTO list_items (created_at, title, completed, priority, estimated_hours, category, user_id)
    SELECT created_at,
           title,
           completed,
           'medium'::task_priority,
           NULL,
           'shopping',
           user_id
    FROM shopping_items;
  END IF;

  IF to_regclass('public.watch_items') IS NOT NULL THEN
    INSERT INTO list_items (created_at, title, completed, priority, estimated_hours, category, user_id)
    SELECT created_at,
           title,
           completed,
           priority::task_priority,
           estimated_hours,
           'watch',
           user_id
    FROM watch_items;
  END IF;
END
$$;

DROP TABLE IF EXISTS shopping_items;
DROP TABLE IF EXISTS watch_items;
DROP TABLE IF EXISTS tasks;

COMMIT;
