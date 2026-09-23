import { CareTask } from '../types';
import { DrGodlyApiClient } from './api-client/client';
import { CONFIG } from '../constants/config';
import { ApiFamilyService } from './ApiFamilyService';
import { authService } from './auth/authService';

export interface TaskService {
  getTasks(personId?: string): Promise<CareTask[]>;
  createTask(task: CareTask): Promise<CareTask>;
  completeTask(taskId: string): Promise<void>;
}

export class ApiTaskService implements TaskService {
  private client: DrGodlyApiClient;
  private familyService: ApiFamilyService;
  private tasks: CareTask[] = [];

  constructor(baseUrl: string = CONFIG.apiUrl, familyService?: ApiFamilyService) {
    this.client = new DrGodlyApiClient({ baseUrl });
    this.familyService = familyService || new ApiFamilyService(baseUrl);
  }

  async getTasks(personId?: string): Promise<CareTask[]> {
    try {
      const familyId = await this.familyService.ensureFamily();
      const subjectId = personId ? await this.familyService.resolveSubjectId(personId) : undefined;
      const backendTasks = await this.client.careTasks.list(familyId, subjectId || undefined);

      if (backendTasks && backendTasks.length > 0) {
        const liveTasks: CareTask[] = backendTasks.map((t: any) => ({
          id: t.id,
          personId: personId || 'dad',
          title: t.title,
          status: t.status === 'completed' ? 'completed' : 'pending',
          dueAt: t.due_at ? new Date(t.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
          priority: t.priority === 'urgent' ? 'high' : (t.priority === 'high' ? 'high' : 'medium'),
          assignedTo: t.assigned_to_name || 'Care Team'
        }));
        this.tasks = liveTasks;
        return liveTasks;
      }
    } catch (err) {
      console.warn('ApiTaskService: Failed to fetch tasks from DB:', err);
    }
    return this.tasks;
  }

  async createTask(task: CareTask): Promise<CareTask> {
    try {
      const familyId = await this.familyService.ensureFamily();
      let subjectId = await this.familyService.resolveSubjectId(task.personId || 'dad');
      if (!subjectId) {
        const members = await this.familyService.getFamilyMembers();
        subjectId = members[0]?.backendSubjectId || '';
      }

      // Look up family members to get coordinator profile ID for assigned_to
      const members = await this.client.families.listMembers(familyId);
      const storedUser = await authService.getStoredUser();
      const assigneeId = members[0]?.profile_id || members[0]?.id || storedUser?.id;

      if (subjectId && assigneeId) {
        const created = await this.client.careTasks.create({
          family_id: familyId,
          subject_id: subjectId,
          assigned_to: assigneeId,
          title: task.title,
          detail: `Created via mobile companion app`,
          priority: task.priority === 'high' ? 'high' : 'routine',
          due_at: new Date(Date.now() + 3600000 * 4).toISOString()
        });
        console.log('ApiTaskService: Persisted task to PostgreSQL care_tasks table:', created);

        const newTask: CareTask = {
          ...task,
          id: created?.id || task.id
        };
        this.tasks.push(newTask);
        return newTask;
      }
    } catch (err) {
      console.warn('ApiTaskService: Error creating task in DB:', err);
    }
    this.tasks.push(task);
    return task;
  }

  async completeTask(taskId: string): Promise<void> {
    try {
      await this.client.careTasks.complete(taskId);
      console.log(`ApiTaskService: Updated task ${taskId} status to completed in PostgreSQL`);
    } catch (err) {
      console.warn('ApiTaskService: Error completing task in DB:', err);
    }

    this.tasks = this.tasks.map((t) => (t.id === taskId ? { ...t, status: 'completed' } : t));
  }
}
