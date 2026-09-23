import { useContext } from 'react';
import { AppContext } from '../store/AppContext';

export function useMedications() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useMedications must be used within AppProvider');

  const medications = context.records.filter((r) => r.category === 'medications');

  return {
    medications,
    confirmMedication: context.handleConfirmMedication,
    addMedication: context.handleAddMedication
  };
}
