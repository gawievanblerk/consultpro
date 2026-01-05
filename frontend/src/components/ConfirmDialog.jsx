import { useEffect, useState } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      document.body.style.overflow = 'unset';
      setIsVisible(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-primary-900/20 backdrop-blur-sm transition-opacity duration-200
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`
            relative bg-white rounded-xl shadow-xl max-w-md w-full
            transform transition-all duration-200
            ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          `}
        >
          {/* Header */}
          <div className="flex items-start gap-4 p-6">
            {variant === 'danger' && (
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-danger-50">
                <ExclamationTriangleIcon className="h-5 w-5 text-danger-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-primary-900 tracking-tight">{title}</h3>
              <p className="mt-2 text-sm text-primary-500 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="flex-shrink-0 p-1.5 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-primary-100">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                variant === 'danger'
                  ? 'bg-danger-600 text-white hover:bg-danger-700'
                  : 'bg-primary-900 text-white hover:bg-primary-800'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
