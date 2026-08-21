-- Add 'archived' to the kitchen_tickets status check constraint
-- This is needed so tickets can be archived when orders are marked as served/complete
ALTER TABLE public.kitchen_tickets DROP CONSTRAINT IF EXISTS kitchen_tickets_status_check;
ALTER TABLE public.kitchen_tickets ADD CONSTRAINT kitchen_tickets_status_check CHECK (status IN ('pending', 'in_progress', 'done', 'archived'));
