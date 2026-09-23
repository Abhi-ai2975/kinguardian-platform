export interface AIInsight {
  id: string;
  personId: string;
  title: string;
  summary: string;
  type: 'observation' | 'recommendation' | 'guardian-moment';
  severity: 'info' | 'attention' | 'important';
  timeframe: string;
  sources: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user' | 'family';
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
  citations?: string[];
  suggestedFollowUps?: string[];
}
