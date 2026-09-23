export type ActiveTab = 'home' | 'parents' | 'ask' | 'care' | 'profile';

export type ScreenView =
  | 'onboarding'
  | 'health_dashboard'
  | 'transparency_insight'
  | 'search_records'
  | 'category_view'
  | 'doctor_consult'
  | 'chat_view'
  | 'care_view'
  | 'vitals_detail'
  | 'parent_dashboard';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'sync' | 'reminder';
  category?:
    | 'medication'
    | 'health_change'
    | 'appointment'
    | 'parent_check-in'
    | 'document'
    | 'care_task'
    | 'family_message'
    | 'ai_insight'
    | 'medication_reminder'
    | 'appointment_reminder'
    | 'message_from_family'
    | 'kinguardian_request';
  recipient?: 'coordinator' | 'parent';
  time: string;
  read: boolean;
  actionText?: string;
  actionScreen?: ScreenView;
  actionData?: any;
}
