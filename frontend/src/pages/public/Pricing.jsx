import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../../components/public/Header';
import PublicFooter from '../../components/public/Footer';
import { CheckIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const plans = [
  {
    name: 'Starter',
    id: 'starter',
    description: 'Perfect for small consulting practices just getting started.',
    priceMonthly: 49,
    priceYearly: 470,
  },
  {
    name: 'Professional',
    id: 'professional',
    description: 'For growing consulting firms that need more power.',
    priceMonthly: 149,
    priceYearly: 1430,
    popular: true,
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    description: 'For large organizations with complex requirements.',
    priceMonthly: 399,
    priceYearly: 3830,
  },
];

const features = [
  { name: 'Clients', starter: '50', professional: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Team members', starter: '3', professional: '10', enterprise: 'Unlimited' },
  { name: 'Client management (CRM)', starter: true, professional: true, enterprise: true },
  { name: 'Contact management', starter: true, professional: true, enterprise: true },
  { name: 'Engagement tracking', starter: true, professional: true, enterprise: true },
  { name: 'Lead management', starter: false, professional: true, enterprise: true },
  { name: 'Sales pipeline', starter: false, professional: true, enterprise: true },
  { name: 'Proposal management', starter: false, professional: true, enterprise: true },
  { name: 'Staff management', starter: false, professional: true, enterprise: true },
  { name: 'Deployment tracking', starter: false, professional: true, enterprise: true },
  { name: 'Invoice generation', starter: true, professional: true, enterprise: true },
  { name: 'Payment tracking', starter: true, professional: true, enterprise: true },
  { name: 'Financial reports', starter: 'Basic', professional: 'Advanced', enterprise: 'Custom' },
  { name: 'Tax compliance (VAT/WHT)', starter: false, professional: true, enterprise: true },
  { name: 'Task management', starter: true, professional: true, enterprise: true },
  { name: 'Document storage', starter: '5GB', professional: '50GB', enterprise: 'Unlimited' },
  { name: 'API access', starter: false, professional: true, enterprise: true },
  { name: 'Custom integrations', starter: false, professional: false, enterprise: true },
  { name: 'White-labeling', starter: false, professional: false, enterprise: true },
  { name: 'Dedicated account manager', starter: false, professional: false, enterprise: true },
  { name: 'Support', starter: 'Email', professional: 'Priority', enterprise: '24/7 Phone' },
  { name: 'SLA guarantee', starter: false, professional: '99.5%', enterprise: '99.9%' },
];

const faqs = [
  {
    question: 'What happens after my free trial ends?',
    answer: 'After your 30-day free trial, you can choose to subscribe to any of our plans. If you don\'t subscribe, your account will be downgraded to read-only mode, and you\'ll still be able to export your data.',
  },
  {
    question: 'Can I change plans at any time?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged a prorated amount for the remainder of your billing cycle. When downgrading, the new rate will apply at the start of your next billing cycle.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for annual plans. For Enterprise customers, we also offer invoicing with NET-30 terms.',
  },
  {
    question: 'Is there a discount for annual billing?',
    answer: 'Yes! When you choose annual billing, you get 2 months free compared to monthly billing. That\'s a 20% savings.',
  },
  {
    question: 'Can I add more team members than my plan allows?',
    answer: 'Absolutely. Additional team members can be added for $15/user/month on the Starter plan and $10/user/month on the Professional plan. Enterprise plans include unlimited users.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer a 30-day money-back guarantee on all plans. If you\'re not satisfied within the first 30 days of your paid subscription, contact us for a full refund.',
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="bg-white">
      <PublicHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary-50 to-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary-900 sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-primary-600 max-w-2xl mx-auto">
            Choose the perfect plan for your consulting practice. All plans include a 30-day free trial.
          </p>

          {/* Billing toggle */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!annual ? 'text-primary-900' : 'text-primary-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                annual ? 'bg-accent-600' : 'bg-primary-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  annual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-primary-900' : 'text-primary-500'}`}>
              Annual
              <span className="ml-1.5 inline-flex items-center rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
                Save 20%
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? 'bg-accent-600 text-white ring-4 ring-accent-400 lg:scale-105 lg:z-10'
                    : 'bg-white border border-primary-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-accent-400 px-4 py-1 text-xs font-semibold text-accent-900">
                      Most Popular
                    </span>
                  </div>
                )}
                <div>
                  <h3 className={`text-xl font-semibold ${plan.popular ? 'text-white' : 'text-primary-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`mt-2 text-sm ${plan.popular ? 'text-accent-100' : 'text-primary-500'}`}>
                    {plan.description}
                  </p>
                  <div className="mt-6">
                    <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-primary-900'}`}>
                      ${annual ? Math.round(plan.priceYearly / 12) : plan.priceMonthly}
                    </span>
                    <span className={`text-sm ${plan.popular ? 'text-accent-100' : 'text-primary-500'}`}>/month</span>
                    {annual && (
                      <p className={`mt-1 text-sm ${plan.popular ? 'text-accent-200' : 'text-primary-400'}`}>
                        Billed ${plan.priceYearly} annually
                      </p>
                    )}
                  </div>
                </div>
                <Link
                  to={`/signup?plan=${plan.id}`}
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-white text-accent-600 hover:bg-accent-50'
                      : 'bg-accent-600 text-white hover:bg-accent-700'
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 bg-primary-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary-900 text-center mb-12">
            Compare all features
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-primary-200">
                  <th className="py-4 px-4 text-left text-sm font-semibold text-primary-900">Feature</th>
                  <th className="py-4 px-4 text-center text-sm font-semibold text-primary-900">Starter</th>
                  <th className="py-4 px-4 text-center text-sm font-semibold text-accent-600 bg-accent-50 rounded-t-lg">Professional</th>
                  <th className="py-4 px-4 text-center text-sm font-semibold text-primary-900">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {features.map((feature, index) => (
                  <tr key={feature.name} className={index % 2 === 0 ? 'bg-white' : 'bg-primary-50/50'}>
                    <td className="py-4 px-4 text-sm text-primary-700">{feature.name}</td>
                    <td className="py-4 px-4 text-center">
                      {renderFeatureValue(feature.starter)}
                    </td>
                    <td className="py-4 px-4 text-center bg-accent-50/50">
                      {renderFeatureValue(feature.professional)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {renderFeatureValue(feature.enterprise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="rounded-2xl bg-primary-900 p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Need a custom solution?
            </h2>
            <p className="mt-4 text-primary-300 max-w-2xl mx-auto">
              For organizations with more than 50 team members or specific compliance requirements, we offer custom enterprise solutions tailored to your needs.
            </p>
            <a
              href="mailto:sales@consultpro.rozitech.com"
              className="mt-8 inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-50 transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-primary-50">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary-900 text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-primary-100 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-medium text-primary-900">{faq.question}</span>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-primary-500 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-primary-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-primary-900 sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-primary-600">
            Start your 30-day free trial today. No credit card required.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center rounded-lg bg-accent-600 px-8 py-4 text-base font-semibold text-white hover:bg-accent-700 transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function renderFeatureValue(value) {
  if (value === true) {
    return <CheckIcon className="h-5 w-5 text-accent-600 mx-auto" />;
  }
  if (value === false) {
    return <XMarkIcon className="h-5 w-5 text-primary-300 mx-auto" />;
  }
  return <span className="text-sm text-primary-700">{value}</span>;
}
