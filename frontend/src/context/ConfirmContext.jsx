import { createContext, useContext, useState, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary',
    resolve: null
  });

  const confirm = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary'
  } = {}) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        variant,
        resolve
      });
    });
  }, []);

  const handleConfirm = () => {
    dialogState.resolve?.(true);
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    dialogState.resolve?.(false);
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        variant={dialogState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
