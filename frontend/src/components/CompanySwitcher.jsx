import React, { useState, useRef, useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import {
  BuildingOfficeIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  StarIcon,
  XMarkIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

function CompanySwitcher() {
  const {
    companies,
    selectedCompany,
    favoriteCompanies,
    recentCompanies,
    isCompanyMode,
    isOpen,
    setIsOpen,
    selectCompany,
    clearSelection,
    toggleFavorite,
    isFavorite,
    searchCompanies
  } = useCompany();

  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard shortcut (Cmd+K)
  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  const filteredCompanies = searchQuery ? searchCompanies(searchQuery) : companies;

  // Companies not in favorites or recent
  const otherCompanies = filteredCompanies.filter(c =>
    !favoriteCompanies.some(f => f.id === c.id) &&
    !recentCompanies.some(r => r.id === c.id)
  );

  const handleSelect = (company) => {
    selectCompany(company);
    setSearchQuery('');
  };

  const handleToggleFavorite = async (e, companyId) => {
    e.stopPropagation();
    await toggleFavorite(companyId);
  };

  const CompanyItem = ({ company, showStar = true }) => (
    <button
      onClick={() => handleSelect(company)}
      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors hover:bg-primary-50 ${
        selectedCompany?.id === company.id ? 'bg-accent-50 border border-accent-200' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 flex-shrink-0 bg-primary-100 rounded-lg flex items-center justify-center">
          <BuildingOfficeIcon className="h-4 w-4 text-primary-500" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-primary-900 text-sm truncate">
            {company.legal_name}
          </p>
          {company.trading_name && company.trading_name !== company.legal_name && (
            <p className="text-xs text-primary-400 truncate">{company.trading_name}</p>
          )}
        </div>
      </div>
      {showStar && (
        <button
          onClick={(e) => handleToggleFavorite(e, company.id)}
          className="p-1 rounded hover:bg-primary-100 transition-colors"
        >
          {isFavorite(company.id) ? (
            <StarIconSolid className="h-4 w-4 text-amber-400" />
          ) : (
            <StarIcon className="h-4 w-4 text-primary-300 hover:text-amber-400" />
          )}
        </button>
      )}
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
          isCompanyMode
            ? 'bg-accent-50 border border-accent-200 text-accent-700'
            : 'bg-primary-50 border border-primary-200 text-primary-700 hover:bg-primary-100'
        }`}
      >
        {isCompanyMode ? (
          <BuildingOfficeIcon className="h-5 w-5 text-accent-500" />
        ) : (
          <BuildingOffice2Icon className="h-5 w-5 text-primary-400" />
        )}
        <span className="font-medium text-sm max-w-[160px] truncate">
          {isCompanyMode ? selectedCompany.legal_name : 'All Companies'}
        </span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-primary-200 z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-primary-100">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search companies... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm placeholder-primary-400 focus:outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-primary-100 rounded"
                >
                  <XMarkIcon className="h-4 w-4 text-primary-400" />
                </button>
              )}
            </div>
          </div>

          {/* All Companies Option */}
          <div className="p-2 border-b border-primary-100">
            <button
              onClick={() => {
                clearSelection();
                setSearchQuery('');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors hover:bg-primary-50 ${
                !isCompanyMode ? 'bg-accent-50 border border-accent-200' : ''
              }`}
            >
              <div className="h-8 w-8 flex-shrink-0 bg-accent-100 rounded-lg flex items-center justify-center">
                <BuildingOffice2Icon className="h-4 w-4 text-accent-600" />
              </div>
              <div>
                <p className="font-medium text-primary-900 text-sm">All Companies</p>
                <p className="text-xs text-primary-400">Consultant Mode</p>
              </div>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-80 overflow-y-auto">
            {/* Favorites */}
            {!searchQuery && favoriteCompanies.length > 0 && (
              <div className="p-2">
                <p className="px-3 py-1 text-xs font-semibold text-primary-400 uppercase tracking-wider">
                  Favorites
                </p>
                {favoriteCompanies.map(company => (
                  <CompanyItem key={company.id} company={company} />
                ))}
              </div>
            )}

            {/* Recent */}
            {!searchQuery && recentCompanies.length > 0 && (
              <div className="p-2 border-t border-primary-50">
                <p className="px-3 py-1 text-xs font-semibold text-primary-400 uppercase tracking-wider">
                  Recent
                </p>
                {recentCompanies
                  .filter(c => !favoriteCompanies.some(f => f.id === c.id))
                  .slice(0, 3)
                  .map(company => (
                    <CompanyItem key={company.id} company={company} />
                  ))}
              </div>
            )}

            {/* All Companies or Search Results */}
            <div className="p-2 border-t border-primary-50">
              <p className="px-3 py-1 text-xs font-semibold text-primary-400 uppercase tracking-wider">
                {searchQuery ? 'Search Results' : 'All Companies'}
              </p>
              {(searchQuery ? filteredCompanies : otherCompanies).length > 0 ? (
                (searchQuery ? filteredCompanies : otherCompanies).map(company => (
                  <CompanyItem key={company.id} company={company} />
                ))
              ) : (
                <p className="px-3 py-4 text-sm text-primary-400 text-center">
                  {searchQuery ? 'No companies found' : 'No other companies'}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-primary-100 bg-primary-50/50">
            <p className="text-xs text-primary-400 text-center">
              {companies.length} company{companies.length !== 1 ? 'ies' : ''} • Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-primary-200 text-xs">⌘K</kbd> to search
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanySwitcher;
