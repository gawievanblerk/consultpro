import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  EnvelopeIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const getSteps = (hasCompanies) => [
  {
    id: 'company',
    title: hasCompanies ? 'Manage Companies' : 'Create Your First Company',
    description: hasCompanies
      ? 'View and manage your client companies'
      : 'Add your first client company to start managing their employees',
    icon: BuildingOfficeIcon,
    href: '/dashboard/companies',
    action: hasCompanies ? 'View Companies' : 'Add Company'
  },
  {
    id: 'employees',
    title: 'Add Employees',
    description: 'Import or add employees for your client company',
    icon: UserGroupIcon,
    href: '/dashboard/employees',
    action: 'Add Employees'
  },
  {
    id: 'ess',
    title: 'Send ESS Invitations',
    description: 'Invite employees to access the self-service portal',
    icon: EnvelopeIcon,
    href: '/dashboard/employees',
    action: 'Send Invites'
  },
  {
    id: 'payroll',
    title: 'Run First Payroll',
    description: 'Process your first payroll run for the company',
    icon: BanknotesIcon,
    href: '/dashboard/payroll',
    action: 'Create Payroll'
  }
];

function OnboardingWizard({ onDismiss }) {
  const navigate = useNavigate();
  const { companies, loading } = useCompany();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  // Load wizard state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('onboardingWizardState');
    if (savedState) {
      const state = JSON.parse(savedState);
      setCompletedSteps(state.completedSteps || []);
      setDismissed(state.dismissed || false);
    }
  }, []);

  // Auto-complete/uncomplete company step based on whether companies exist
  useEffect(() => {
    if (loading) return;

    if (companies.length > 0 && !completedSteps.includes('company')) {
      // Companies exist but step not marked complete - mark it
      markStepComplete('company');
    } else if (companies.length === 0 && completedSteps.includes('company')) {
      // No companies but step marked complete - unmark it
      const newCompleted = completedSteps.filter(id => id !== 'company');
      setCompletedSteps(newCompleted);
      saveState(newCompleted, dismissed);
      setCurrentStep(0); // Reset to first step
    }
  }, [companies, loading]);

  // Save wizard state to localStorage
  const saveState = (newCompletedSteps, newDismissed) => {
    localStorage.setItem('onboardingWizardState', JSON.stringify({
      completedSteps: newCompletedSteps,
      dismissed: newDismissed
    }));
  };

  const markStepComplete = (stepId) => {
    const newCompleted = [...completedSteps, stepId];
    setCompletedSteps(newCompleted);
    saveState(newCompleted, dismissed);

    // Move to next incomplete step
    const currentSteps = getSteps(companies.length > 0);
    const nextIncomplete = currentSteps.findIndex(s => !newCompleted.includes(s.id));
    if (nextIncomplete !== -1) {
      setCurrentStep(nextIncomplete);
    }
  };

  const handleStepClick = (step, index) => {
    setCurrentStep(index);
    navigate(step.href);
  };

  const handleDismiss = () => {
    setDismissed(true);
    saveState(completedSteps, true);
    if (onDismiss) onDismiss();
  };

  const handleReopen = () => {
    setDismissed(false);
    saveState(completedSteps, false);
  };

  // Don't show if dismissed
  if (dismissed) {
    return (
      <button
        onClick={handleReopen}
        className="fixed bottom-6 right-6 bg-accent-600 text-white p-4 rounded-full shadow-lg hover:bg-accent-700 transition-colors z-40"
        title="Reopen Onboarding Guide"
      >
        <SparklesIcon className="h-6 w-6" />
      </button>
    );
  }

  // Don't show if loading
  if (loading) return null;

  // Get steps with dynamic text based on whether companies exist
  const steps = getSteps(companies.length > 0);
  const allComplete = completedSteps.length === steps.length;

  return (
    <div className="bg-gradient-to-r from-primary-900 to-primary-800 rounded-2xl shadow-xl p-6 mb-8 text-white">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-accent-400" />
            Welcome to CoreHR!
          </h2>
          <p className="text-primary-200 mt-1">
            {allComplete
              ? "You've completed the setup. You're ready to go!"
              : "Let's get you set up. Follow these steps to onboard your first client."}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-2 hover:bg-primary-700 rounded-lg transition-colors text-primary-300 hover:text-white"
          title="Dismiss"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, index) => {
          const isComplete = completedSteps.includes(step.id);
          const isCurrent = index === currentStep && !isComplete;
          const isLocked = index > 0 && !completedSteps.includes(steps[index - 1].id) && !isComplete;

          return (
            <div
              key={step.id}
              className={`relative p-4 rounded-xl transition-all duration-200 ${
                isComplete
                  ? 'bg-accent-600/20 border border-accent-500/30'
                  : isCurrent
                  ? 'bg-primary-700 border border-accent-500 ring-2 ring-accent-500/50'
                  : isLocked
                  ? 'bg-primary-800/50 border border-primary-700 opacity-60'
                  : 'bg-primary-700/50 border border-primary-600 hover:bg-primary-700 cursor-pointer'
              }`}
              onClick={() => !isLocked && handleStepClick(step, index)}
            >
              {/* Step number */}
              <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isComplete
                  ? 'bg-accent-500 text-white'
                  : 'bg-primary-600 text-primary-300'
              }`}>
                {isComplete ? <CheckCircleIcon className="h-4 w-4" /> : index + 1}
              </div>

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  isComplete ? 'bg-accent-500/30' : 'bg-primary-600'
                }`}>
                  <step.icon className={`h-5 w-5 ${
                    isComplete ? 'text-accent-400' : 'text-primary-300'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm ${
                    isComplete ? 'text-accent-300' : 'text-white'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-primary-300 mt-1 line-clamp-2">
                    {step.description}
                  </p>
                </div>
              </div>

              {!isComplete && !isLocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStepClick(step, index);
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-1 py-2 px-3 bg-accent-600 hover:bg-accent-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {step.action}
                  <ArrowRightIcon className="h-3 w-3" />
                </button>
              )}

              {isComplete && (
                <div className="mt-3 flex items-center justify-center gap-1 py-2 text-accent-400 text-xs font-medium">
                  <CheckCircleIcon className="h-4 w-4" />
                  Complete
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-2 bg-primary-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-500 transition-all duration-500"
            style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-primary-300 font-medium">
          {completedSteps.length}/{steps.length} complete
        </span>
      </div>

      {allComplete && (
        <div className="mt-4 p-4 bg-accent-600/20 border border-accent-500/30 rounded-lg text-center">
          <h3 className="font-semibold text-accent-300">Setup Complete!</h3>
          <p className="text-sm text-primary-200 mt-1">
            You're all set. You can now manage your clients, employees, and payroll.
          </p>
          <button
            onClick={handleDismiss}
            className="mt-3 px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Close Guide
          </button>
        </div>
      )}
    </div>
  );
}

export default OnboardingWizard;
