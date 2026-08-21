-- Add rotation to tables for diagonal elements
begin;

ALTER TABLE public.tables
    ADD COLUMN IF NOT EXISTS rotation FLOAT NOT NULL DEFAULT 0;

commit;
