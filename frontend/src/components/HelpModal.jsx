import { useEffect, useState } from 'react';
import {
  XMarkIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function HelpModal({ isOpen, onClose, title, content }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black transition-opacity duration-200
          ${isVisible ? 'bg-opacity-50' : 'bg-opacity-0'}
        `}
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`
            relative bg-white rounded-xl shadow-xl max-w-lg w-full
            transform transition-all duration-200
            ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          `}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-5 border-b border-gray-100">
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-primary-100">
              <QuestionMarkCircleIcon className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 flex-1">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {typeof content === 'string' ? (
              <p className="text-gray-600">{content}</p>
            ) : (
              content
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-50 rounded-b-xl">
            <button onClick={onClose} className="btn-primary w-full">
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pre-styled help content components
export function HelpSection({ title, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
      <div className="text-sm text-gray-600">{children}</div>
    </div>
  );
}

export function HelpList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
          <CheckCircleIcon className="h-5 w-5 text-accent-500 flex-shrink-0 mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function HelpTip({ children }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
      <LightBulbIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800">{children}</p>
    </div>
  );
}

// Trigger button component
export function HelpButton({ onClick, label = 'Help' }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
    >
      <QuestionMarkCircleIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
