-- Update shape constraint to allow walls
begin;

ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_shape_check;
ALTER TABLE public.tables ADD CONSTRAINT tables_shape_check CHECK (shape IN ('rectangle', 'circle', 'wall'));

commit;
