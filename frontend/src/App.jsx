import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { HelpProvider } from './context/HelpContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { CompanyProvider } from './context/CompanyContext';
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

// ESS (Employee Self-Service) Portal pages
import ESSLanding from './pages/ess/ESSLanding';
import ESSLogin from './pages/ess/ESSLogin';

// Helper to detect ESS subdomain
const isESSPortal = () => {
  const hostname = window.location.hostname;
  return hostname.startsWith('ess.') || hostname === 'ess.corehr.africa';
};
import Clients from './pages/crm/Clients';
import ClientDetail from './pages/crm/ClientDetail';
import Contacts from './pages/crm/Contacts';
import Engagements from './pages/crm/Engagements';
import Leads from './pages/bd/Leads';
import Pipeline from './pages/bd/Pipeline';
import BDDashboard from './pages/bd/BDDashboard';
import Staff from './pages/hr/Staff';
import Deployments from './pages/hr/Deployments';
import Departments from './pages/hr/Departments';
import Employees from './pages/employees/Employees';
import Companies from './pages/companies/Companies';
import LeaveRequests from './pages/leave/LeaveRequests';
import LeaveBalances from './pages/leave/LeaveBalances';
import Invoices from './pages/finance/Invoices';
import Payments from './pages/finance/Payments';
import PAYECalculator from './pages/finance/PAYECalculator';
import PayrollRuns from './pages/payroll/PayrollRuns';
import PayrollRunDetail from './pages/payroll/PayrollRunDetail';
import StatutoryRemittances from './pages/payroll/StatutoryRemittances';
import MyPayslips from './pages/ess/MyPayslips';
import Tasks from './pages/Tasks';
import Users from './pages/settings/Users';
import Preferences from './pages/settings/Preferences';

// Compliance & Training pages (Admin)
import Policies from './pages/compliance/Policies';
import TrainingModules from './pages/training/TrainingModules';
import ComplianceDashboard from './pages/compliance/ComplianceDashboard';
import EmployeeCompliance from './pages/compliance/EmployeeCompliance';

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

// EMS pages (Employee Management System)
import ProbationManagement from './pages/ems/ProbationManagement';
import PerformanceReviews from './pages/ems/PerformanceReviews';
import ExitManagement from './pages/ems/ExitManagement';
import Disciplinary from './pages/ems/Disciplinary';
import OnboardingManagement from './pages/ems/OnboardingManagement';
import OnboardingWorkflowAdmin from './pages/ems/OnboardingWorkflowAdmin';
import DocumentTemplates from './pages/ems/DocumentTemplates';
import ContentLibrary from './pages/ems/ContentLibrary';
import DocumentEditor from './pages/ems/DocumentEditor';
import MyOnboarding from './pages/ess/MyOnboarding';
import MyOnboardingWizard from './pages/ess/MyOnboardingWizard';
import ESSProfile from './pages/ess/ESSProfile';

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
    // Redirect to ESS login if on ESS portal
    const loginPath = isESSPortal() ? '/ess/login' : '/login';
    return <Navigate to={loginPath} replace />;
  }

  return children;
}

// ESS Protected route wrapper (for employee-only routes)
function ESSProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/ess/login" replace />;
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
              <CompanyProvider>
                <BrowserRouter>
                <Routes>
          {/* ESS Portal routes */}
          <Route path="/ess" element={<ESSLanding />} />
          <Route path="/ess/login" element={<ESSLogin />} />

          {/* Public marketing routes - redirect to ESS if on ESS subdomain */}
          <Route path="/" element={isESSPortal() ? <Navigate to="/ess" replace /> : <Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Auth routes */}
          <Route path="/login" element={isESSPortal() ? <Navigate to="/ess/login" replace /> : <Login />} />
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
            <Route path="bd" element={<BDDashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="pipeline" element={<Pipeline />} />

            {/* HR Outsourcing Module (Consultant) */}
            <Route path="staff" element={<Staff />} />
            <Route path="deployments" element={<Deployments />} />

            {/* Employees Module (Company Admin) */}
            <Route path="employees" element={<Employees />} />
            <Route path="departments" element={<Departments />} />

            {/* Companies Module (Consultant) */}
            <Route path="companies" element={<Companies />} />

            {/* Leave Management Module */}
            <Route path="leave-requests" element={<LeaveRequests />} />
            <Route path="leave-balances" element={<LeaveBalances />} />

            {/* Finance Module */}
            <Route path="invoices" element={<Invoices />} />
            <Route path="payments" element={<Payments />} />
            <Route path="paye-calculator" element={<PAYECalculator />} />

            {/* Payroll Module */}
            <Route path="payroll" element={<PayrollRuns />} />
            <Route path="payroll/:id" element={<PayrollRunDetail />} />
            <Route path="remittances" element={<StatutoryRemittances />} />
            <Route path="my-payslips" element={<MyPayslips />} />

            {/* Collaboration Module */}
            <Route path="tasks" element={<Tasks />} />

            {/* Compliance & Training Module (Admin) */}
            <Route path="policies" element={<Policies />} />
            <Route path="training-modules" element={<TrainingModules />} />
            <Route path="compliance" element={<ComplianceDashboard />} />
            <Route path="employee-compliance" element={<EmployeeCompliance />} />

            {/* Compliance & Training Module (Employee) */}
            <Route path="policy-library" element={<PolicyLibrary />} />
            <Route path="my-training" element={<MyTraining />} />
            <Route path="take-training/:assignmentId" element={<TakeTraining />} />
            <Route path="my-certificates" element={<MyCertificates />} />

            {/* Employee Management System (EMS) */}
            <Route path="onboarding-workflow" element={<OnboardingWorkflowAdmin />} />
            <Route path="onboarding-admin" element={<OnboardingManagement />} />
            <Route path="document-templates" element={<DocumentTemplates />} />
            <Route path="content-library" element={<ContentLibrary />} />
            <Route path="document-editor/:type/:id" element={<DocumentEditor />} />
            <Route path="probation" element={<ProbationManagement />} />
            <Route path="performance" element={<PerformanceReviews />} />
            <Route path="exit-management" element={<ExitManagement />} />
            <Route path="disciplinary" element={<Disciplinary />} />
            <Route path="my-onboarding" element={<MyOnboarding />} />
            <Route path="my-onboarding-wizard" element={<MyOnboardingWizard />} />
            <Route path="my-profile" element={<ESSProfile />} />

            {/* Settings/Admin */}
            <Route path="users" element={<Users />} />
            <Route path="preferences" element={<Preferences />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </BrowserRouter>
              </CompanyProvider>
            </CurrencyProvider>
          </HelpProvider>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
