-- Migration: 024_seed_default_departments.sql
-- Description: Seed default departments for all existing companies

-- Insert default departments for each company that doesn't have them yet
-- Using a DO block to iterate through companies

DO $$
DECLARE
    company_record RECORD;
    default_departments TEXT[] := ARRAY[
        'Operations',
        'Legal',
        'Facilities & Maintenance',
        'Business Development',
        'Finance',
        'Admin & Support',
        'Security'
    ];
    dept_name TEXT;
BEGIN
    -- Loop through all companies
    FOR company_record IN SELECT id FROM companies WHERE deleted_at IS NULL
    LOOP
        -- Loop through default departments
        FOREACH dept_name IN ARRAY default_departments
        LOOP
            -- Insert department if it doesn't exist for this company
            INSERT INTO departments (company_id, name, status)
            SELECT company_record.id, dept_name, 'active'
            WHERE NOT EXISTS (
                SELECT 1 FROM departments
                WHERE company_id = company_record.id
                AND LOWER(name) = LOWER(dept_name)
                AND deleted_at IS NULL
            );
        END LOOP;
    END LOOP;
END $$;

-- Add comment
COMMENT ON TABLE departments IS 'Company departments - includes default departments seeded for each company';
