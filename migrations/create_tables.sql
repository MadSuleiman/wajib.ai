-- Create enum for task priority
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority task_priority DEFAULT 'medium',
  estimated_hours NUMERIC,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create shopping_items table
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create watch_items table
CREATE TABLE IF NOT EXISTS watch_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority task_priority DEFAULT 'medium',
  estimated_hours NUMERIC,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create RLS policies for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for shopping_items
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shopping items"
  ON shopping_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping items"
  ON shopping_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping items"
  ON shopping_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping items"
  ON shopping_items FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for watch_items
ALTER TABLE watch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watch items"
  ON watch_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch items"
  ON watch_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch items"
  ON watch_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch items"
  ON watch_items FOR DELETE
  USING (auth.uid() = user_id);

