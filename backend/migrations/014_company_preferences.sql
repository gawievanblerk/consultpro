-- CoreHR Company Preferences for Consultants
-- Migration: 014_company_preferences.sql
-- Purpose: Store user company preferences (favorites, recent, view mode)

-- ============================================================================
-- USER COMPANY PREFERENCES
-- ============================================================================

-- Store user preferences for company selector
CREATE TABLE IF NOT EXISTS user_company_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Favorites and Recent (stored as arrays for simplicity)
    favorite_company_ids UUID[] DEFAULT '{}',
    recent_company_ids UUID[] DEFAULT '{}',

    -- View preferences
    view_mode VARCHAR(20) DEFAULT 'header',  -- 'header' | 'sidebar'
    sidebar_collapsed BOOLEAN DEFAULT false,

    -- Last selected company (for restoring on login)
    last_selected_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One preferences record per user
    UNIQUE(user_id)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_user_company_prefs_user ON user_company_preferences(user_id);

-- ============================================================================
-- COMPANY ACCESS LOG (for tracking recent companies)
-- ============================================================================

-- Track when users access companies (for building recent list)
CREATE TABLE IF NOT EXISTS company_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient recent company queries
CREATE INDEX IF NOT EXISTS idx_company_access_user ON company_access_log(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_access_company ON company_access_log(company_id);

-- ============================================================================
-- CLEANUP FUNCTION (optional - keeps access log from growing too large)
-- ============================================================================

-- Function to clean up old access logs (keep last 100 per user)
CREATE OR REPLACE FUNCTION cleanup_company_access_log() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM company_access_log
    WHERE user_id = NEW.user_id
    AND id NOT IN (
        SELECT id FROM company_access_log
        WHERE user_id = NEW.user_id
        ORDER BY accessed_at DESC
        LIMIT 100
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run cleanup after each insert
DROP TRIGGER IF EXISTS trigger_cleanup_company_access ON company_access_log;
CREATE TRIGGER trigger_cleanup_company_access
    AFTER INSERT ON company_access_log
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_company_access_log();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_company_preferences IS 'Stores user preferences for company selector (favorites, view mode)';
COMMENT ON COLUMN user_company_preferences.view_mode IS 'Display mode: header (dropdown) or sidebar (panel)';
COMMENT ON COLUMN user_company_preferences.last_selected_company_id IS 'Last company user was working with, restored on login';
COMMENT ON TABLE company_access_log IS 'Tracks company access for building recent companies list';
