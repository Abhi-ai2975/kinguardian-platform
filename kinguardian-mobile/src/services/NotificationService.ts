import { AppNotification } from '../types';
import { DrGodlyApiClient } from './api-client/client';
import { CONFIG } from '../constants/config';
import { ApiFamilyService } from './ApiFamilyService';
import { INITIAL_NOTIFICATIONS } from '../data/mockData';

export interface NotificationService {
  getNotifications(): Promise<AppNotification[]>;
  createNotification(notif: Partial<AppNotification>): Promise<AppNotification>;
  markRead(notificationId: string): Promise<boolean>;
  clearAll(): Promise<void>;
}

export class ApiNotificationService implements NotificationService {
  private client: DrGodlyApiClient;
  private familyService: ApiFamilyService;
  private notifications: AppNotification[] = [...INITIAL_NOTIFICATIONS];

  constructor(baseUrl: string = CONFIG.apiUrl, familyService?: ApiFamilyService) {
    this.client = new DrGodlyApiClient({ baseUrl });
    this.familyService = familyService || new ApiFamilyService(baseUrl);
  }

  async getNotifications(): Promise<AppNotification[]> {
    try {
      const familyId = await this.familyService.ensureFamily();
      const backendNotifs = await this.client.notifications.list(familyId);

      if (backendNotifs && backendNotifs.length > 0) {
        const liveNotifs: AppNotification[] = backendNotifs.map((n: any) => ({
          id: n.id,
          title: n.payload?.title || n.event_type || 'Care Notification',
          message: n.payload?.message || n.payload?.body || 'New update available.',
          type: (n.event_type === 'alert' || n.event_type === 'reminder' || n.event_type === 'sync')
            ? n.event_type
            : (n.event_type === 'medication_reminder' ? 'reminder' : (n.event_type === 'checkin_submitted' ? 'alert' : 'info')),
          time: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          read: Boolean(n.read_at),
          actionScreen: n.payload?.actionScreen,
          actionText: n.payload?.actionText,
          actionData: n.payload?.actionData,
          category: n.payload?.category,
          recipient: n.payload?.recipient || (n.event_type === 'medication_reminder' ? 'parent' : 'coordinator')
        }));

        const combined = [...liveNotifs, ...this.notifications.filter((old) => !liveNotifs.some((l) => l.id === old.id))];
        this.notifications = combined;
        return combined;
      }
    } catch (err) {
      console.warn('ApiNotificationService: Failed to fetch notifications from DB:', err);
    }
    return this.notifications;
  }

  async createNotification(notif: Partial<AppNotification>): Promise<AppNotification> {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: notif.title || 'Notification',
      message: notif.message || '',
      type: notif.type || 'info',
      time: 'Just now',
      read: false,
      actionScreen: notif.actionScreen,
      actionText: notif.actionText,
      actionData: notif.actionData,
      category: notif.category,
      recipient: notif.recipient
    };

    try {
      const familyId = await this.familyService.ensureFamily();
      const res = await this.client.notifications.create(familyId, {
        event_type: notif.type || 'alert',
        payload: newNotif
      });
      console.log('ApiNotificationService: Persisted notification to PostgreSQL:', res);
      if (res?.id) newNotif.id = res.id;
    } catch (err) {
      console.warn('ApiNotificationService: Error creating notification in DB:', err);
    }

    this.notifications.unshift(newNotif);
    return newNotif;
  }

  async markRead(notificationId: string): Promise<boolean> {
    try {
      await this.client.notifications.markRead(notificationId);
      console.log(`ApiNotificationService: Marked notification ${notificationId} as read in PostgreSQL`);
      this.notifications = this.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      return true;
    } catch (err) {
      console.warn('ApiNotificationService: Error marking notification read in DB:', err);
      return false;
    }
  }

  async clearAll(): Promise<void> {
    try {
      const familyId = await this.familyService.ensureFamily();
      await this.client.notifications.clearAll(familyId);
      console.log(`ApiNotificationService: Cleared all notifications in PostgreSQL`);
    } catch (err) {
      console.warn('ApiNotificationService: Error clearing notifications in DB:', err);
    }

    this.notifications = [];
  }
}
