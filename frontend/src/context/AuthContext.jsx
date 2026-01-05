import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // For staff users with multiple deployments, track which company is currently active
  const [activeCompanyId, setActiveCompanyId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  // When user changes, set default active company for staff users
  useEffect(() => {
    if (user?.userType === 'staff' && user?.deployedCompanies?.length > 0) {
      // Use stored preference or default to first deployment
      const storedCompanyId = localStorage.getItem('activeCompanyId');
      const validCompany = user.deployedCompanies.find(c => c.company_id === storedCompanyId);
      setActiveCompanyId(validCompany?.company_id || user.deployedCompanies[0].company_id);
    } else {
      setActiveCompanyId(null);
    }
  }, [user]);

  const verifyToken = async (token) => {
    try {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await api.get('/api/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        logout();
      }
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, tenantId = null) => {
    try {
      const response = await api.post('/api/auth/login', { email, password, tenantId });

      // Check if tenant selection is required
      if (response.data.success && response.data.requiresTenantSelection) {
        return {
          success: true,
          requiresTenantSelection: true,
          tenants: response.data.tenants
        };
      }

      if (response.data.success) {
        const { accessToken, user } = response.data.data;
        localStorage.setItem('token', accessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        setUser(user);
        return { success: true };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Set user and token directly (used by AcceptInvite)
  const setAuth = (token, userData) => {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  // Switch active company (for staff users with multiple deployments)
  const switchCompany = (companyId) => {
    if (user?.userType === 'staff') {
      const validCompany = user.deployedCompanies?.find(c => c.company_id === companyId);
      if (validCompany) {
        localStorage.setItem('activeCompanyId', companyId);
        setActiveCompanyId(companyId);
        return true;
      }
    }
    return false;
  };

  // Get active company details
  const getActiveCompany = () => {
    if (user?.userType === 'staff' && activeCompanyId) {
      return user.deployedCompanies?.find(c => c.company_id === activeCompanyId);
    }
    return null;
  };

  // User type helpers
  const isConsultant = user?.userType === 'consultant';
  const isStaff = user?.userType === 'staff';
  const isCompanyAdmin = user?.userType === 'company_admin';
  const isEmployee = user?.userType === 'employee';
  const isAdmin = isConsultant || isStaff || isCompanyAdmin; // Can perform admin actions

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    setAuth,
    // Company switching for staff
    activeCompanyId,
    switchCompany,
    getActiveCompany,
    // User type helpers
    isConsultant,
    isStaff,
    isCompanyAdmin,
    isEmployee,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
