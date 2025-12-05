import { useState, useRef, useEffect } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

export default function Tooltip({ content, position = 'top', children }) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const trigger = triggerRef.current.getBoundingClientRect();
      const tooltip = tooltipRef.current.getBoundingClientRect();
      const padding = 8;

      let top, left;

      switch (position) {
        case 'bottom':
          top = trigger.bottom + padding;
          left = trigger.left + (trigger.width / 2) - (tooltip.width / 2);
          break;
        case 'left':
          top = trigger.top + (trigger.height / 2) - (tooltip.height / 2);
          left = trigger.left - tooltip.width - padding;
          break;
        case 'right':
          top = trigger.top + (trigger.height / 2) - (tooltip.height / 2);
          left = trigger.right + padding;
          break;
        case 'top':
        default:
          top = trigger.top - tooltip.height - padding;
          left = trigger.left + (trigger.width / 2) - (tooltip.width / 2);
          break;
      }

      // Keep tooltip within viewport
      if (left < padding) left = padding;
      if (left + tooltip.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltip.width - padding;
      }
      if (top < padding) {
        top = trigger.bottom + padding; // Flip to bottom
      }

      setTooltipPosition({ top, left });
    }
  }, [isVisible, position]);

  return (
    <span className="relative inline-flex items-center">
      <span
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="cursor-help"
      >
        {children || (
          <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400 hover:text-primary-600 transition-colors" />
        )}
      </span>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg max-w-xs animate-fade-in"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
              position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
              position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
              'left-[-4px] top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </span>
  );
}

// Convenience component for form field help
export function FieldHelp({ text }) {
  return (
    <Tooltip content={text} position="top">
      <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400 hover:text-primary-600 transition-colors ml-1" />
    </Tooltip>
  );
}
