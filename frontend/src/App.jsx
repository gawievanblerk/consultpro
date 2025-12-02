import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/crm/Clients';
import ClientDetail from './pages/crm/ClientDetail';
import Contacts from './pages/crm/Contacts';
import Engagements from './pages/crm/Engagements';
import Leads from './pages/bd/Leads';
import Pipeline from './pages/bd/Pipeline';
import Staff from './pages/hr/Staff';
import Deployments from './pages/hr/Deployments';
import Invoices from './pages/finance/Invoices';
import Payments from './pages/finance/Payments';
import Tasks from './pages/Tasks';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />

            {/* CRM Module */}
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="engagements" element={<Engagements />} />

            {/* Business Development Module */}
            <Route path="leads" element={<Leads />} />
            <Route path="pipeline" element={<Pipeline />} />

            {/* HR Outsourcing Module */}
            <Route path="staff" element={<Staff />} />
            <Route path="deployments" element={<Deployments />} />

            {/* Finance Module */}
            <Route path="invoices" element={<Invoices />} />
            <Route path="payments" element={<Payments />} />

            {/* Collaboration Module */}
            <Route path="tasks" element={<Tasks />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
