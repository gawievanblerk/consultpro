import React from 'react';
import { TrashIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * BulkActions component for list pages
 *
 * Props:
 * - selectedCount: number of selected items
 * - onClearSelection: function to clear selection
 * - onBulkDelete: function to handle bulk delete (optional)
 * - onBulkEdit: function to handle bulk edit (optional)
 * - customActions: array of { label, icon, onClick, className } for custom actions
 */
function BulkActions({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkEdit,
  customActions = []
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-primary-900 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="bg-accent-500 text-white text-sm font-bold px-2.5 py-1 rounded-full">
            {selectedCount}
          </span>
          <span className="text-sm font-medium">selected</span>
        </div>

        <div className="h-6 w-px bg-primary-700" />

        <div className="flex items-center gap-2">
          {onBulkEdit && (
            <button
              onClick={onBulkEdit}
              className="flex items-center gap-2 px-4 py-2 bg-primary-800 hover:bg-primary-700 rounded-lg text-sm font-medium transition-colors"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Edit
            </button>
          )}

          {onBulkDelete && (
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          )}

          {customActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${action.className || 'bg-primary-800 hover:bg-primary-700'}`}
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-primary-700" />

        <button
          onClick={onClearSelection}
          className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
          title="Clear selection"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Checkbox component for table rows
 */
export function SelectCheckbox({ checked, onChange, indeterminate = false }) {
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 text-accent-600 border-primary-300 rounded focus:ring-accent-500 cursor-pointer"
    />
  );
}

/**
 * Hook for managing bulk selection
 */
export function useBulkSelection(items = []) {
  const [selectedIds, setSelectedIds] = React.useState(new Set());

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < items.length;

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const isSelected = (id) => selectedIds.has(id);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    selectedItems: items.filter(item => selectedIds.has(item.id))
  };
}

export default BulkActions;
