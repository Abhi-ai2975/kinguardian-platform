import { useContext } from 'react';
import { AppContext } from '../store/AppContext';

export function useAI() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAI must be used within AppProvider');

  return {
    chatMessages: context.chatMessages,
    sendMessage: context.handleSendMessage,
    askAIOpen: context.askAIOpen,
    setAskAIOpen: context.setAskAIOpen,
    askAIQuery: context.askAIQuery,
    setAskAIQuery: context.setAskAIQuery
  };
}
