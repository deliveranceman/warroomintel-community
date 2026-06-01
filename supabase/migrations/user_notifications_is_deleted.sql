ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
