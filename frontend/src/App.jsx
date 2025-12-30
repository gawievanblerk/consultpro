import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { HelpProvider } from './context/HelpContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';

// Public marketing pages
import Landing from './pages/public/Landing';
import Pricing from './pages/public/Pricing';
import SignUp from './pages/public/SignUp';
import Clients from './pages/crm/Clients';
import ClientDetail from './pages/crm/ClientDetail';
import Contacts from './pages/crm/Contacts';
import Engagements from './pages/crm/Engagements';
import Leads from './pages/bd/Leads';
import Pipeline from './pages/bd/Pipeline';
import Staff from './pages/hr/Staff';
import Deployments from './pages/hr/Deployments';
import Employees from './pages/employees/Employees';
import LeaveRequests from './pages/leave/LeaveRequests';
import LeaveBalances from './pages/leave/LeaveBalances';
import Invoices from './pages/finance/Invoices';
import Payments from './pages/finance/Payments';
import PAYECalculator from './pages/finance/PAYECalculator';
import Tasks from './pages/Tasks';
import Users from './pages/settings/Users';

// Compliance & Training pages (Admin)
import Policies from './pages/compliance/Policies';
import TrainingModules from './pages/training/TrainingModules';
import ComplianceDashboard from './pages/compliance/ComplianceDashboard';

// Compliance & Training pages (Employee)
import PolicyLibrary from './pages/compliance/PolicyLibrary';
import MyTraining from './pages/training/MyTraining';
import TakeTraining from './pages/training/TakeTraining';
import MyCertificates from './pages/training/MyCertificates';

// Super Admin pages
import SuperAdminLayout from './components/superadmin/Layout';
import SuperAdminLogin from './pages/superadmin/Login';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import SuperAdminConsultants from './pages/superadmin/Consultants';
import SuperAdminInvitations from './pages/superadmin/Invitations';

// Onboarding pages
import ConsultantOnboard from './pages/onboard/ConsultantOnboard';
import CompanyOnboard from './pages/onboard/CompanyOnboard';
import ESSActivate from './pages/onboard/ESSActivate';

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
      <ToastProvider>
        <ConfirmProvider>
          <HelpProvider>
            <CurrencyProvider>
              <BrowserRouter>
              <Routes>
          {/* Public marketing routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* Super Admin routes */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route path="/superadmin" element={<SuperAdminLayout />}>
            <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="consultants" element={<SuperAdminConsultants />} />
            <Route path="invitations" element={<SuperAdminInvitations />} />
          </Route>

          {/* Onboarding routes */}
          <Route path="/onboard/consultant" element={<ConsultantOnboard />} />
          <Route path="/onboard/company" element={<CompanyOnboard />} />
          <Route path="/onboard/ess" element={<ESSActivate />} />

          {/* Dashboard (protected) */}
          <Route path="/dashboard" element={
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

            {/* HR Outsourcing Module (Consultant) */}
            <Route path="staff" element={<Staff />} />
            <Route path="deployments" element={<Deployments />} />

            {/* Employees Module (Company Admin) */}
            <Route path="employees" element={<Employees />} />

            {/* Leave Management Module */}
            <Route path="leave-requests" element={<LeaveRequests />} />
            <Route path="leave-balances" element={<LeaveBalances />} />

            {/* Finance Module */}
            <Route path="invoices" element={<Invoices />} />
            <Route path="payments" element={<Payments />} />
            <Route path="paye-calculator" element={<PAYECalculator />} />

            {/* Collaboration Module */}
            <Route path="tasks" element={<Tasks />} />

            {/* Compliance & Training Module (Admin) */}
            <Route path="policies" element={<Policies />} />
            <Route path="training-modules" element={<TrainingModules />} />
            <Route path="compliance" element={<ComplianceDashboard />} />

            {/* Compliance & Training Module (Employee) */}
            <Route path="policy-library" element={<PolicyLibrary />} />
            <Route path="my-training" element={<MyTraining />} />
            <Route path="take-training/:assignmentId" element={<TakeTraining />} />
            <Route path="my-certificates" element={<MyCertificates />} />

            {/* Settings/Admin */}
            <Route path="users" element={<Users />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </BrowserRouter>
            </CurrencyProvider>
          </HelpProvider>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
