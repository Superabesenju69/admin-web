-- Add physical attributes to tables for interactive map

begin;

ALTER TABLE public.tables
    ADD COLUMN IF NOT EXISTS x FLOAT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS y FLOAT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS width FLOAT NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS height FLOAT NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS shape TEXT NOT NULL DEFAULT 'rectangle' CHECK (shape IN ('rectangle', 'circle'));

-- Distribute existing tables so they don't overlap completely (optional, simple stagger)
WITH numbered_tables AS (
    SELECT id, row_number() OVER (ORDER BY created_at) as rn
    FROM public.tables
)
UPDATE public.tables t
SET x = (nt.rn * 20) % 500,
    y = (nt.rn * 20) % 500
FROM numbered_tables nt
WHERE t.id = nt.id
  AND t.x = 0 AND t.y = 0;

commit;
