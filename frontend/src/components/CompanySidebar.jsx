import { useState, useEffect, useRef } from 'react';
import { useCompany } from '../context/CompanyContext';
import {
  BuildingOfficeIcon,
  StarIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export default function CompanySidebar() {
  const {
    companies,
    selectedCompany,
    favoriteCompanies,
    recentCompanies,
    preferences,
    selectCompany,
    clearSelection,
    toggleFavorite,
    isFavorite,
    updatePreferences
  } = useCompany();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'favorites', 'recent', 'all'
  const isCollapsed = preferences?.sidebarCollapsed ?? false;
  const searchRef = useRef(null);

  // Filter companies based on search
  const filteredCompanies = companies.filter(company =>
    (company.legal_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (company.trading_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get companies for the active tab
  const getDisplayCompanies = () => {
    if (searchQuery) return filteredCompanies;

    switch (activeTab) {
      case 'favorites':
        return favoriteCompanies;
      case 'recent':
        return recentCompanies;
      default:
        return companies;
    }
  };

  const displayCompanies = getDisplayCompanies();

  const handleToggleCollapse = async () => {
    try {
      await updatePreferences({ sidebarCollapsed: !isCollapsed });
    } catch (err) {
      console.error('Failed to toggle sidebar:', err);
    }
  };

  const handleCompanySelect = (company) => {
    if (company === null) {
      clearSelection();
    } else {
      selectCompany(company);
    }
  };

  const handleToggleFavorite = async (e, companyId) => {
    e.stopPropagation();
    await toggleFavorite(companyId);
  };

  // Collapsed sidebar view - just icons
  if (isCollapsed) {
    return (
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Expand button */}
        <div className="p-2 border-b border-gray-200">
          <button
            onClick={handleToggleCollapse}
            className="w-full p-2 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            title="Expand sidebar"
          >
            <ChevronDoubleRightIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* All Companies button */}
        <button
          onClick={() => handleCompanySelect(null)}
          className={`p-3 flex items-center justify-center border-b border-gray-100 ${
            !selectedCompany ? 'bg-primary/10' : 'hover:bg-gray-50'
          }`}
          title="All Companies"
        >
          <BuildingOfficeIcon className={`h-6 w-6 ${!selectedCompany ? 'text-primary' : 'text-gray-500'}`} />
        </button>

        {/* Company avatars */}
        <div className="flex-1 overflow-y-auto">
          {favoriteCompanies.slice(0, 5).map((company) => (
            <button
              key={company.id}
              onClick={() => handleCompanySelect(company)}
              className={`w-full p-3 flex items-center justify-center border-b border-gray-100 ${
                selectedCompany?.id === company.id ? 'bg-primary/10' : 'hover:bg-gray-50'
              }`}
              title={company.trading_name || company.legal_name}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  selectedCompany?.id === company.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {(company.trading_name || company.legal_name || '?')[0].toUpperCase()}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Expanded sidebar view
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Companies</h2>
          <button
            onClick={handleToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-100"
            title="Collapse sidebar"
          >
            <ChevronDoubleLeftIcon className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="mt-2 relative">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!searchQuery && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 px-3 py-2 text-xs font-medium ${
              activeTab === 'favorites'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <StarIcon className="h-4 w-4 inline mr-1" />
            Favorites
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 px-3 py-2 text-xs font-medium ${
              activeTab === 'recent'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClockIcon className="h-4 w-4 inline mr-1" />
            Recent
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-3 py-2 text-xs font-medium ${
              activeTab === 'all'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All
          </button>
        </div>
      )}

      {/* All Companies option */}
      <button
        onClick={() => handleCompanySelect(null)}
        className={`w-full px-3 py-2 flex items-center gap-3 text-left border-b border-gray-100 ${
          !selectedCompany ? 'bg-primary/10' : 'hover:bg-gray-50'
        }`}
      >
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
          !selectedCompany ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          <BuildingOfficeIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${!selectedCompany ? 'text-primary' : 'text-gray-900'}`}>
            All Companies
          </p>
          <p className="text-xs text-gray-500">Consultant Mode</p>
        </div>
      </button>

      {/* Company List */}
      <div className="flex-1 overflow-y-auto">
        {displayCompanies.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-gray-500">
              {searchQuery
                ? 'No companies found'
                : activeTab === 'favorites'
                  ? 'No favorite companies yet'
                  : activeTab === 'recent'
                    ? 'No recent companies'
                    : 'No companies available'}
            </p>
          </div>
        ) : (
          displayCompanies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleCompanySelect(company)}
              className={`w-full px-3 py-2 flex items-center gap-3 text-left border-b border-gray-50 group ${
                selectedCompany?.id === company.id ? 'bg-primary/10' : 'hover:bg-gray-50'
              }`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium ${
                  selectedCompany?.id === company.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {(company.trading_name || company.legal_name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  selectedCompany?.id === company.id ? 'text-primary' : 'text-gray-900'
                }`}>
                  {company.trading_name || company.legal_name}
                </p>
                {company.industry && (
                  <p className="text-xs text-gray-500 truncate">{company.industry}</p>
                )}
              </div>
              <button
                onClick={(e) => handleToggleFavorite(e, company.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
                title={isFavorite(company.id) ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite(company.id) ? (
                  <StarIconSolid className="h-4 w-4 text-yellow-400" />
                ) : (
                  <StarIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </button>
          ))
        )}
      </div>

      {/* Footer with count */}
      <div className="p-2 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          {companies.length} {companies.length === 1 ? 'company' : 'companies'}
        </p>
      </div>
    </div>
  );
}
