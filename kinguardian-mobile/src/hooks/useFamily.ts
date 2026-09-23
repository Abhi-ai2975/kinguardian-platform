import { useContext } from 'react';
import { AppContext } from '../store/AppContext';

export function useFamily() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useFamily must be used within AppProvider');
  return {
    people: context.people,
    currentPersonId: context.currentPersonId,
    setCurrentPersonId: context.setCurrentPersonId,
    appMode: context.appMode,
    setAppMode: context.setAppMode
  };
}
