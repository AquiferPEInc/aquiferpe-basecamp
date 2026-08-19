-- Add abstract column to freelancer table
ALTER TABLE freelancer ADD COLUMN IF NOT EXISTS abstract TEXT;
