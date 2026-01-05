import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../../components/public/Header';
import PublicFooter from '../../components/public/Footer';
import { useCurrency } from '../../context/CurrencyContext';
import {
  UserGroupIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

// Hero background images - consulting/business themed
const heroImages = [
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80',
];

const features = [
  {
    name: 'Client Relationship Management',
    description: 'Manage your entire client portfolio with detailed profiles, engagement history, and communication tracking.',
    icon: UserGroupIcon,
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Business Development',
    description: 'Track leads through your sales pipeline, manage proposals, and convert prospects into long-term clients.',
    icon: BriefcaseIcon,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'HR & Staff Management',
    description: 'Oversee your consulting team, track deployments, and manage resource allocation across projects.',
    icon: ClipboardDocumentCheckIcon,
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Financial Operations',
    description: 'Generate invoices, track payments, and maintain complete financial oversight with tax compliance built-in.',
    icon: CurrencyDollarIcon,
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
  },
];

const stats = [
  { label: 'Clients Managed', value: '500+' },
  { label: 'Invoices Processed', value: '10,000+' },
  { label: 'Uptime SLA', value: '99.9%' },
  { label: 'Support Response', value: '<2hrs' },
];

export default function Landing() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [plans, setPlans] = useState([]);
  const { currency, formatPrice, currencyConfig } = useCurrency();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch plans from API
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPlans(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const getPriceDisplay = (plan) => {
    const priceKey = `price_${currency.toLowerCase()}`;
    const amount = plan[priceKey] || plan.price_usd;
    return `${currencyConfig?.symbol || '$'}${amount.toLocaleString()}`;
  };

  return (
    <div className="bg-white">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img src={image} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-900/70 to-primary-900/50" />
          </div>
        ))}

        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Modern consulting management,{' '}
              <span className="text-accent-400">simplified.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-primary-200">
              Streamline your client relationships, manage your team, track finances, and grow your consulting business with one powerful platform.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="rounded-lg bg-accent-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-accent-500 transition-all hover:scale-105"
              >
                Start 30-Day Free Trial
              </Link>
              <a
                href="#pricing"
                className="rounded-lg bg-white/10 backdrop-blur-sm px-6 py-3.5 text-base font-semibold text-white border border-white/20 hover:bg-white/20 transition-colors"
              >
                View Pricing
              </a>
            </div>
            <p className="mt-4 text-sm text-primary-300">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-primary-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-primary-900 sm:text-4xl">
              Everything you need to run your consulting business
            </h2>
            <p className="mt-4 text-lg text-primary-600">
              A complete suite of tools designed specifically for consulting firms and HR professionals.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 via-primary-900/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-lg bg-accent-600 p-2">
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{feature.name}</h3>
                  </div>
                  <p className="text-primary-200 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-accent-600">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold text-white">{stat.value}</p>
                <p className="mt-2 text-sm text-accent-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-primary-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-primary-600">
              Choose the plan that fits your business. All plans include a 30-day free trial.
            </p>
            <p className="mt-2 text-sm text-primary-500">
              Prices shown in {currencyConfig?.name || 'US Dollar'} ({currency})
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? 'bg-accent-600 text-white ring-4 ring-accent-400 scale-105'
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
                  <p className={`mt-1 text-sm ${plan.popular ? 'text-accent-100' : 'text-primary-500'}`}>
                    {plan.description}
                  </p>
                  <div className="mt-6">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-primary-900'}`}>
                      {getPriceDisplay(plan)}
                    </span>
                    <span className={`text-sm ${plan.popular ? 'text-accent-100' : 'text-primary-500'}`}>/month</span>
                  </div>
                </div>
                <ul className="mt-8 space-y-3">
                  {plan.features?.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircleIcon className={`h-5 w-5 flex-shrink-0 ${plan.popular ? 'text-accent-200' : 'text-accent-600'}`} />
                      <span className={`text-sm ${plan.popular ? 'text-accent-50' : 'text-primary-600'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>
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

          <div className="mt-12 text-center">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 text-accent-600 font-medium hover:text-accent-700"
            >
              Compare all features
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-primary-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-primary-900 sm:text-4xl">
                Built for consultants, by consultants
              </h2>
              <p className="mt-6 text-lg text-primary-600 leading-relaxed">
                CoreHR was born from the real challenges faced by consulting firms and HR professionals. We understand the complexity of managing client relationships, tracking staff deployments, and keeping finances in order.
              </p>
              <p className="mt-4 text-lg text-primary-600 leading-relaxed">
                Our platform brings all these essential functions together in one intuitive interface, so you can focus on what matters most - delivering exceptional service to your clients.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <BuildingOffice2Icon className="h-5 w-5 text-accent-600" />
                  <span className="text-sm text-primary-700">Multi-tenant architecture</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-accent-600" />
                  <span className="text-sm text-primary-700">Real-time analytics</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80"
                alt="Team collaboration"
                className="rounded-2xl shadow-xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-accent-100 flex items-center justify-center">
                    <CheckCircleIcon className="h-6 w-6 text-accent-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary-900">98%</p>
                    <p className="text-sm text-primary-500">Customer satisfaction</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-primary-900/90" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform your consulting practice?
          </h2>
          <p className="mt-4 text-lg text-primary-300">
            Join hundreds of consulting firms already using CoreHR to streamline their operations.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="rounded-lg bg-accent-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-accent-500 transition-all hover:scale-105"
            >
              Start Your Free Trial
            </Link>
            <a
              href="#"
              className="rounded-lg bg-white/10 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white border border-white/20 hover:bg-white/20 transition-colors"
            >
              Schedule a Demo
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
