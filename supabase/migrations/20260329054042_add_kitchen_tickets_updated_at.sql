-- Add updated_at to kitchen_tickets
ALTER TABLE kitchen_tickets ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a trigger to auto-update the updated_at column whenever the row is modified
CREATE OR REPLACE FUNCTION update_kitchen_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kitchen_ticket_updated_at
BEFORE UPDATE ON kitchen_tickets
FOR EACH ROW
EXECUTE FUNCTION update_kitchen_ticket_updated_at();
