-- Migration 017: Test Clone Support for Employee Testing
-- Adds columns to track test clones of employees for onboarding workflow testing

-- Add is_test_clone flag to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_test_clone BOOLEAN DEFAULT false;

-- Add reference to original employee that was cloned
ALTER TABLE employees ADD COLUMN IF NOT EXISTS cloned_from_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Create partial index for efficient queries on test clones
CREATE INDEX IF NOT EXISTS idx_employees_test_clone ON employees(is_test_clone) WHERE is_test_clone = true;

-- Add index for cloned_from_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_employees_cloned_from ON employees(cloned_from_id) WHERE cloned_from_id IS NOT NULL;

COMMENT ON COLUMN employees.is_test_clone IS 'True if this employee is a test clone created for onboarding workflow testing';
COMMENT ON COLUMN employees.cloned_from_id IS 'Reference to the original employee this was cloned from';
