import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const { user, isConsultant } = useAuth();

  // State
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [favoriteCompanies, setFavoriteCompanies] = useState([]);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [preferences, setPreferences] = useState({
    viewMode: 'header', // 'header' | 'sidebar'
    sidebarCollapsed: false
  });
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Computed
  const isCompanyMode = selectedCompany !== null;

  // Load companies and preferences on mount
  useEffect(() => {
    if (user && isConsultant) {
      loadCompaniesAndPreferences();
    } else {
      setLoading(false);
    }
  }, [user, isConsultant]);

  const loadCompaniesAndPreferences = async () => {
    try {
      setLoading(true);

      // Load all companies
      const companiesRes = await api.get('/api/companies');
      const allCompanies = companiesRes.data.data || [];
      setCompanies(allCompanies);

      // Load quick access data (favorites, recent, preferences)
      try {
        const quickAccessRes = await api.get('/api/companies/quick-access');
        const { favorites, recent, lastSelectedCompany, preferences: prefs } = quickAccessRes.data.data;

        setFavoriteCompanies(favorites || []);
        setRecentCompanies(recent || []);

        if (prefs) {
          setPreferences({
            viewMode: prefs.viewMode || 'header',
            sidebarCollapsed: prefs.sidebarCollapsed || false
          });
        }

        // Restore last selected company
        if (lastSelectedCompany) {
          setSelectedCompany(lastSelectedCompany);
        }
      } catch (err) {
        // Quick access tables might not exist yet - silently ignore
        console.log('Quick access not available:', err.message);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Select a company (enter Company Mode)
  const selectCompany = useCallback(async (companyOrId) => {
    const company = typeof companyOrId === 'string'
      ? companies.find(c => c.id === companyOrId)
      : companyOrId;

    if (!company) return;

    setSelectedCompany(company);
    setIsOpen(false);

    // Track access and save last selected
    try {
      await api.post(`/api/companies/${company.id}/access`);
    } catch (err) {
      console.error('Failed to track company access:', err);
    }

    // Update recent list locally
    setRecentCompanies(prev => {
      const filtered = prev.filter(c => c.id !== company.id);
      return [company, ...filtered].slice(0, 5);
    });
  }, [companies]);

  // Clear selection (return to Consultant Mode)
  const clearSelection = useCallback(async () => {
    setSelectedCompany(null);
    setIsOpen(false);

    // Clear last selected in preferences
    try {
      await api.put('/api/companies/preferences', { lastSelectedCompanyId: null });
    } catch (err) {
      console.error('Failed to clear selection:', err);
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(async (companyId) => {
    try {
      const res = await api.post(`/api/companies/${companyId}/favorite`);
      const { isFavorite } = res.data.data;

      if (isFavorite) {
        // Add to favorites
        const company = companies.find(c => c.id === companyId);
        if (company) {
          setFavoriteCompanies(prev => [...prev, company]);
        }
      } else {
        // Remove from favorites
        setFavoriteCompanies(prev => prev.filter(c => c.id !== companyId));
      }

      return isFavorite;
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      return null;
    }
  }, [companies]);

  // Update preferences
  const updatePreferences = useCallback(async (newPrefs) => {
    try {
      const merged = { ...preferences, ...newPrefs };
      setPreferences(merged);

      await api.put('/api/companies/preferences', {
        viewMode: merged.viewMode,
        sidebarCollapsed: merged.sidebarCollapsed
      });
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  }, [preferences]);

  // Search companies
  const searchCompanies = useCallback((searchQuery) => {
    if (!searchQuery) return companies;

    const lower = searchQuery.toLowerCase();
    return companies.filter(c =>
      c.legal_name?.toLowerCase().includes(lower) ||
      c.trading_name?.toLowerCase().includes(lower) ||
      c.industry?.toLowerCase().includes(lower)
    );
  }, [companies]);

  // Check if company is favorite
  const isFavorite = useCallback((companyId) => {
    return favoriteCompanies.some(c => c.id === companyId);
  }, [favoriteCompanies]);

  // Refresh companies list
  const refreshCompanies = useCallback(async () => {
    try {
      const companiesRes = await api.get('/api/companies');
      setCompanies(companiesRes.data.data || []);
    } catch (err) {
      console.error('Failed to refresh companies:', err);
    }
  }, []);

  const value = {
    // State
    companies,
    selectedCompany,
    favoriteCompanies,
    recentCompanies,
    preferences,
    loading,
    isOpen,
    setIsOpen,

    // Computed
    isCompanyMode,

    // Actions
    selectCompany,
    clearSelection,
    toggleFavorite,
    updatePreferences,
    searchCompanies,
    isFavorite,
    refreshCompanies
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

export default CompanyContext;
