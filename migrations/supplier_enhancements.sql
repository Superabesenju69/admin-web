-- Supplier Enhancements Migration
-- Run in Supabase SQL Editor

-- Add purchase_cost and batch_number to inventory_logs for price history + traceability
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS purchase_cost numeric DEFAULT 0;
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS batch_number text;
