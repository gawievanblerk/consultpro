import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Features', href: '/#features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/#about' },
  ];

  const isActive = (href) => {
    if (href.startsWith('/#')) return location.pathname === '/' && location.hash === href.substring(1);
    return location.pathname === href;
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-primary-100">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo-icon.svg" alt="ConsultPro" className="h-9 w-9" />
          <span className="text-xl font-semibold text-primary-900 tracking-tight">
            Consult<span className="text-accent-600">Pro</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-x-8">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'text-accent-600'
                  : 'text-primary-600 hover:text-primary-900'
              }`}
            >
              {item.name}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex lg:items-center lg:gap-x-4">
          <Link
            to="/login"
            className="text-sm font-medium text-primary-600 hover:text-primary-900 transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-accent-700 transition-colors"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden rounded-lg p-2.5 text-primary-600 hover:bg-primary-50"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-primary-100">
          <div className="px-6 py-4 space-y-4">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block text-base font-medium text-primary-600 hover:text-primary-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <div className="pt-4 border-t border-primary-100 space-y-3">
              <Link
                to="/login"
                className="block text-base font-medium text-primary-600 hover:text-primary-900"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="block w-full text-center rounded-lg bg-accent-600 px-4 py-2.5 text-base font-medium text-white hover:bg-accent-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
