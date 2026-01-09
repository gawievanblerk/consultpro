import { useState, useEffect } from 'react';
import api from '../../utils/api';

const CONTENT_TYPES = [
  { value: 'job_description', label: 'Job Descriptions' },
  { value: 'kpi', label: 'KPIs' },
  { value: 'task', label: 'Tasks' },
  { value: 'clause', label: 'Clauses' },
  { value: 'snippet', label: 'Snippets' },
  { value: 'boilerplate', label: 'Boilerplate' }
];

export default function ContentLibraryPanel({ onInsert, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    loadItems();
  }, [selectedType]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.length >= 2 || searchQuery === '') {
        loadItems();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedType) params.append('content_type', selectedType);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '20');

      const res = await api.get(`/api/content-library/items?${params.toString()}`);
      setItems(res.data.data || []);
    } catch (error) {
      console.error('Error loading content library:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = async (item) => {
    // Track usage
    try {
      await api.post(`/api/content-library/items/${item.id}/use`);
    } catch (err) {
      console.error('Error tracking usage:', err);
    }

    onInsert(item.content);
    setPreviewItem(null);
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Content Library</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="p-3 border-b bg-white space-y-2">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {CONTENT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No content found
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:border-primary-300 cursor-pointer transition-colors"
                onClick={() => setPreviewItem(item)}
              >
                <div className="font-medium text-sm text-gray-900 truncate">
                  {item.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {CONTENT_TYPES.find(t => t.value === item.content_type)?.label}
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{previewItem.name}</h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewItem.content }}
              />
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleInsert(previewItem)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Insert Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
