-- Migration: 023_departments.sql
-- Description: Create departments table and add department_id to employees

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for departments
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status) WHERE deleted_at IS NULL;

-- Add department_id to employees table (keeping existing department VARCHAR for backward compatibility)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Index for employee department lookups
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);

-- Comment for documentation
COMMENT ON TABLE departments IS 'Company departments for organizing employees';
COMMENT ON COLUMN departments.manager_id IS 'Department manager (employee)';
COMMENT ON COLUMN departments.parent_department_id IS 'Parent department for hierarchical structure';
COMMENT ON COLUMN employees.department_id IS 'FK to departments table (new structured approach)';
