import { ChatMessage } from '../types';
import { DrGodlyApiClient } from './api-client/client';
import { CONFIG } from '../constants/config';
import { ApiFamilyService } from './ApiFamilyService';

export interface ChatService {
  getMessages(): Promise<ChatMessage[]>;
  sendMessage(text: string): Promise<ChatMessage>;
  askAI(query: string): Promise<any>;
}

export class ApiChatService implements ChatService {
  private client: DrGodlyApiClient;
  private familyService: ApiFamilyService;
  private conversationId: string | null = null;
  private messages: ChatMessage[] = [];

  constructor(baseUrl: string = CONFIG.apiUrl, familyService?: ApiFamilyService) {
    this.client = new DrGodlyApiClient({ baseUrl });
    this.familyService = familyService || new ApiFamilyService(baseUrl);
  }

  private async ensureConversation(): Promise<string> {
    if (this.conversationId) return this.conversationId;
    const familyId = await this.familyService.ensureFamily();
    const conv = await this.client.conversations.getOrCreate(familyId);
    this.conversationId = conv.id;
    return this.conversationId!;
  }

  async getMessages(): Promise<ChatMessage[]> {
    try {
      const familyId = await this.familyService.ensureFamily();
      const convId = await this.ensureConversation();
      const backendMessages = await this.client.conversations.listMessages(familyId, convId);

      if (backendMessages && backendMessages.length > 0) {
        const liveMessages: ChatMessage[] = backendMessages.map((m: any) => {
          const isCoordinator = m.sender_role === 'coordinator' || m.sender_name?.toLowerCase().includes('anjali');
          return {
            id: m.id,
            sender: isCoordinator ? 'user' : 'family',
            senderName: m.sender_name || 'Care Team',
            senderAvatar: isCoordinator
              ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjb58pDYmLPOvRb2C93qIwVmN3Z3qZ__ljM1T9ZSdVoVI9ovH8x3UkvVX2km1jcc-lJDB8XKVXGhKX0bZL8qDi2s9jgC8eOKs1TubpaykQObp6xTg11e7t9fDFBiO9G_knt_Iu91RQ6oYuQGrd_EwUBKvQprl0XXO1mrgZ2LripRVXQ9ztlZOQr21ScUbgnP5iva9lVWOYFTQ4E6180FpDmnFn1lhIDcG8awhKsT88RjoTEgkPxtmV'
              : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
            text: m.body,
            timestamp: m.created_at
              ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently'
          };
        });
        this.messages = liveMessages;
        return liveMessages;
      }
    } catch (err) {
      console.warn('ApiChatService: Failed to fetch messages from DB:', err);
    }
    return this.messages;
  }

  async sendMessage(text: string): Promise<ChatMessage> {
    const familyId = await this.familyService.ensureFamily();
    const convId = await this.ensureConversation();

    let createdId = Date.now().toString();
    try {
      const res = await this.client.conversations.sendMessage(familyId, convId, text);
      console.log('ApiChatService: Persisted message to PostgreSQL messages table:', res);
      if (res?.id) createdId = res.id;
    } catch (err) {
      console.warn('ApiChatService: Error saving message to DB:', err);
    }

    const newMsg: ChatMessage = {
      id: createdId,
      sender: 'user',
      senderName: 'You',
      senderAvatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBjb58pDYmLPOvRb2C93qIwVmN3Z3qZ__ljM1T9ZSdVoVI9ovH8x3UkvVX2km1jcc-lJDB8XKVXGhKX0bZL8qDi2s9jgC8eOKs1TubpaykQObp6xTg11e7t9fDFBiO9G_knt_Iu91RQ6oYuQGrd_EwUBKvQprl0XXO1mrgZ2LripRVXQ9ztlZOQr21ScUbgnP5iva9lVWOYFTQ4E6180FpDmnFn1lhIDcG8awhKsT88RjoTEgkPxtmV',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.messages.push(newMsg);
    return newMsg;
  }

  async askAI(query: string): Promise<any> {
    try {
      const convId = await this.ensureConversation();
      const res = await this.client.conversations.sendAIMessage(convId, query);
      console.log('ApiChatService: AI response saved to DB insights:', res);
      return res;
    } catch (err) {
      console.warn('ApiChatService: Error asking AI on backend:', err);
      return null;
    }
  }
}
