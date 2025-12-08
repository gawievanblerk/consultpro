import { useEffect, useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const typeStyles = {
  success: {
    bg: 'bg-white border-l-4 border-l-accent-500',
    icon: 'text-accent-500',
    text: 'text-primary-700',
    Icon: CheckCircleIcon
  },
  error: {
    bg: 'bg-white border-l-4 border-l-danger-500',
    icon: 'text-danger-500',
    text: 'text-primary-700',
    Icon: XCircleIcon
  },
  warning: {
    bg: 'bg-white border-l-4 border-l-warning-500',
    icon: 'text-warning-500',
    text: 'text-primary-700',
    Icon: ExclamationTriangleIcon
  },
  info: {
    bg: 'bg-white border-l-4 border-l-info-500',
    icon: 'text-info-500',
    text: 'text-primary-700',
    Icon: InformationCircleIcon
  }
};

export default function Toast({ message, type = 'info', onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const styles = typeStyles[type] || typeStyles.info;
  const Icon = styles.Icon;

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`
        pointer-events-auto
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${styles.bg}
        border border-primary-100 rounded-lg shadow-lg p-4
        flex items-center gap-3
        min-w-[320px] max-w-md
      `}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${styles.icon}`} />
      <p className={`text-sm font-medium flex-1 ${styles.text}`}>{message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
