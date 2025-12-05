import { createContext, useContext, useState, useCallback } from 'react';
import HelpModal, { HelpSection, HelpList, HelpTip } from '../components/HelpModal';
import { helpContent } from '../data/helpContent';

const HelpContext = createContext(null);

export function HelpProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentHelp, setCurrentHelp] = useState(null);

  const showHelp = useCallback((sectionKey) => {
    const content = helpContent[sectionKey];
    if (content) {
      setCurrentHelp(content);
      setIsOpen(true);
    }
  }, []);

  const hideHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Render help content with proper components
  const renderHelpContent = () => {
    if (!currentHelp) return null;

    return (
      <div className="space-y-4">
        {/* Overview */}
        {currentHelp.overview && (
          <p className="text-gray-600">{currentHelp.overview}</p>
        )}

        {/* Sections */}
        {currentHelp.sections && (
          <HelpSection title="Sections">
            <ul className="space-y-2">
              {Object.entries(currentHelp.sections).map(([key, description]) => (
                <li key={key} className="flex items-start gap-2">
                  <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span>{description}</span>
                </li>
              ))}
            </ul>
          </HelpSection>
        )}

        {/* Tips */}
        {currentHelp.tips && currentHelp.tips.length > 0 && (
          <HelpSection title="Tips">
            <HelpList items={currentHelp.tips} />
          </HelpSection>
        )}

        {/* Fields (if available) */}
        {currentHelp.fields && Object.keys(currentHelp.fields).length > 0 && (
          <HelpSection title="Field Reference">
            <div className="space-y-2 text-sm">
              {Object.entries(currentHelp.fields).map(([field, description]) => (
                <div key={field} className="flex">
                  <span className="font-medium text-gray-700 w-32 flex-shrink-0 capitalize">
                    {field.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-gray-600">{description}</span>
                </div>
              ))}
            </div>
          </HelpSection>
        )}
      </div>
    );
  };

  return (
    <HelpContext.Provider value={{ showHelp, hideHelp }}>
      {children}
      <HelpModal
        isOpen={isOpen}
        onClose={hideHelp}
        title={currentHelp?.title || 'Help'}
        content={renderHelpContent()}
      />
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}
