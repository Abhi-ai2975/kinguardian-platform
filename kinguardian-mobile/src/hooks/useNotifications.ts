import { useContext } from 'react';
import { AppContext } from '../store/AppContext';

export function useNotifications() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useNotifications must be used within AppProvider');

  return {
    notifications: context.notifications,
    markRead: context.handleMarkRead,
    clearAll: context.handleClearAllNotifications,
    triggerSimulation: context.handleTriggerSimulation
  };
}
