export interface CareTask {
  id: string;
  personId: string;
  title: string;
  description?: string;
  dueAt: string;
  assignedTo: string;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
}

export interface SyncLog {
  id: string;
  time: string;
  device: string;
  status: 'success' | 'warning' | 'synced';
  value: string;
  user: string;
}
