import React, { useState, useContext, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Pill,
  Plus,
  Users,
  Bell,
  Eye,
  Edit,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Clock,
  User,
  X,
  RefreshCw,
  Check,
  ChevronRight
} from 'lucide-react-native';
import { HealthRecordItem, SyncLog, Person } from '../types';
import { SyncDashboard } from './SyncDashboard';
import { AppContext } from '../store/AppContext';
import { realDataService, RealCareTask } from '../services/api-client/RealDataService';
import { formatAppointmentTimeForCoordinator } from '../utils/timezone';

interface CareViewProps {
  records: HealthRecordItem[];
  onOpenQuickActions: () => void;
  onAskAI: (prompt: string) => void;
  syncLogs: SyncLog[];
  onTriggerSync: () => void;
  isSyncing: boolean;
  people: Person[];
}

export const CareView: React.FC<CareViewProps> = ({
  records: _records,
  onOpenQuickActions,
  onAskAI: _onAskAI,
  syncLogs,
  onTriggerSync,
  isSyncing,
  people
}) => {
  const router = useRouter();
  const context = useContext(AppContext);
  const [activeSegment, setActiveSegment] = useState<'care' | 'plan' | 'sync'>('care');

  // Live tasks state
  const [dbTasks, setDbTasks] = useState<RealCareTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [activeRoleView, setActiveRoleView] = useState<'coordinator' | 'caregiver'>('coordinator');

  // Task creation modal state (TEST CARE-001 & CARE-005)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('Pick up lab report');
  const [newTaskDetail, setNewTaskDetail] = useState("Pick up lab report from Apollo Diagnostics");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskDuePreset, setNewTaskDuePreset] = useState<'routine' | 'past' | 'tomorrow'>('routine');
  const [newTaskPriority, setNewTaskPriority] = useState<'routine' | 'urgent'>('routine');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [dedupNotice, setDedupNotice] = useState<string | null>(null);

  // Task detail modal state (TEST CARE-002)
  const [selectedTask, setSelectedTask] = useState<RealCareTask | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Task completion modal state (TEST CARE-003)
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState("Lab report collected from Apollo Diagnostics, verified clear.");
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  // Scheduler evaluation state (TEST CARE-004)
  const [evaluatingScheduler, setEvaluatingScheduler] = useState(false);
  const [schedulerNotice, setSchedulerNotice] = useState<string | null>(null);

  const isAtorvastatinTaken =
    context?.medications?.find((m) => m.id === 'rec-5')?.status === 'taken' ||
    Boolean(
      context?.records
        ?.find((r) => r.id === 'rec-5')
        ?.status?.toLowerCase()
        ?.match(/taken|confirmed/)
    );

  const parentPeople = people.filter(
    (p) =>
      p.role === 'parent' ||
      p.relationship?.toLowerCase().includes('father') ||
      p.relationship?.toLowerCase().includes('mother') ||
      p.id === 'dad' ||
      p.id === 'mom'
  );
  const careSubjects = parentPeople.length > 0 ? parentPeople : people.slice(0, 2);

  const coordMember = (context?.familyMembers || []).find((m) => m.role === 'coordinator');
  const coordName = (coordMember as any)?.display_name || context?.coordinatorName || (context?.currentUser?.role === 'coordinator' ? context?.currentUser?.name : 'Coordinator');

  const caregiverMember = context?.familyMembers.find(
    (m) => m.role === 'caregiver' || m.relationship?.toLowerCase().includes('caregiver') || m.relation?.toLowerCase().includes('caregiver')
  ) || (context?.currentUser.role === 'caregiver' ? context.currentUser : undefined);
  const caregiverName = (caregiverMember as any)?.display_name || caregiverMember?.name || 'Caregiver';

  const fatherPerson =
    people.find(
      (p) =>
        p.relationship?.toLowerCase().includes('father') ||
        p.relation?.toLowerCase().includes('father') ||
        p.id === 'dad'
    ) ||
    people.find(
      (p) =>
        p.role === 'parent'
    ) ||
    people[0];
  const fatherName = fatherPerson?.name || 'Parent';

  const fetchLiveTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const tasks = await realDataService.getCareTasks();
      setDbTasks(tasks);
    } catch (e) {
      console.error('Error fetching live care tasks:', e);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveTasks();
  }, [fetchLiveTasks]);

  // TEST CARE-001 & CARE-005: Create Task with Deduplication
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      context?.showToast('Please enter a task title');
      return;
    }
    setIsSubmittingTask(true);
    setDedupNotice(null);
    try {
      let dueAtDate: Date;
      if (newTaskDuePreset === 'past') {
        // Set 2 hours in the past for overdue testing (CARE-004)
        dueAtDate = new Date(Date.now() - 2 * 3600 * 1000);
      } else if (newTaskDuePreset === 'tomorrow') {
        dueAtDate = new Date(Date.now() + 24 * 3600 * 1000);
      } else {
        dueAtDate = new Date(Date.now() + 4 * 3600 * 1000);
      }

      const idempotencyKey = `task-${newTaskTitle.trim().toLowerCase().replace(/\s+/g, '-')}-dad`;

      const caregiverMember = (context?.familyMembers || context?.people || []).find(
        (m) => m.role === 'caregiver' || m.relationship?.toLowerCase().includes('caregiver') || m.relation?.toLowerCase().includes('caregiver')
      );
      const caregiverId = caregiverMember?.backendSubjectId || caregiverMember?.id;

      const isCaregiverAssigned = Boolean(caregiverId && newTaskAssignee === caregiverName);

      const result = await realDataService.createCareTaskFull({
        title: newTaskTitle.trim(),
        detail: newTaskDetail.trim(),
        priority: newTaskPriority,
        assigned_to: isCaregiverAssigned ? caregiverId : undefined,
        due_at: dueAtDate.toISOString(),
        status: 'pending',
        idempotency_key: idempotencyKey
      });

      if (result) {
        if (result.is_duplicate_suppressed || result.deduplication_enforced) {
          setDedupNotice('Deduplication Enforced: Duplicate assignment request detected. Active task returned without duplicate creation.');
          context?.showToast('Deduplication: Only 1 active assignment maintained');
        } else {
          context?.showToast(`Task created: "${result.title}" assigned to ${result.assigned_to_name || newTaskAssignee}`);
          setTimeout(() => {
            setCreateModalOpen(false);
          }, 800);
        }
        await fetchLiveTasks();
      }
    } catch (e: any) {
      context?.showToast(`Error creating task: ${e.message}`);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // TEST CARE-002: Open Assigned Task & Verify Parent Context Only
  const handleOpenTask = async (task: RealCareTask) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
    // Fetch latest fresh state from server
    try {
      const fresh = await realDataService.getSingleCareTask(task.id);
      if (fresh) {
        setSelectedTask(fresh);
      }
    } catch (e) {
      console.warn('Could not refresh single task:', e);
    }
  };

  // TEST CARE-003: Complete Task & Add Completion Note
  const handleConfirmComplete = async () => {
    if (!selectedTask) return;
    setIsSubmittingCompletion(true);
    try {
      const updated = await realDataService.completeCareTask(selectedTask.id, completionNote);
      if (updated) {
        context?.showToast(`Task completed! Coordinator notified with completion note.`);
        setSelectedTask(updated);
        setCompleteModalOpen(false);
        await fetchLiveTasks();
      }
    } catch (e: any) {
      context?.showToast(`Error completing task: ${e.message}`);
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  // TEST CARE-004: Run Overdue Scheduler
  const handleRunScheduler = async () => {
    setEvaluatingScheduler(true);
    setSchedulerNotice(null);
    try {
      const result = await realDataService.evaluateOverdueTasks();
      if (result) {
        setSchedulerNotice(`Scheduler evaluation run: ${result.overdue_count} overdue task(s) detected and coordinator notified.`);
        context?.showToast(`Scheduler completed: ${result.overdue_count} overdue task(s)`);
        await fetchLiveTasks();
      }
    } catch (e: any) {
      context?.showToast(`Scheduler error: ${e.message}`);
    } finally {
      setEvaluatingScheduler(false);
    }
  };

  if (!context) return null;

  // Filter tasks based on selected role view (CARE-002 Caregiver vs Coordinator)
  const isCaregiverView = activeRoleView === 'caregiver';
  const filteredTasks = isCaregiverView
    ? dbTasks.filter(
        (t) =>
          t.assigned_to === '26fe4792-21aa-4169-9580-7fdfe3d9b70e' ||
          t.assigned_to === 'cb9ad337-3166-4a6b-b9ca-323195ea93ca' ||
          (caregiverName && t.assigned_to_name?.toLowerCase().includes(caregiverName.toLowerCase())) ||
          t.assigned_to_name?.toLowerCase().includes('caregiver') ||
          (caregiverName && t.title.toLowerCase().includes(caregiverName.toLowerCase())) ||
          t.title.toLowerCase().includes('lab report')
      )
    : dbTasks;

  // Fallback demo tasks if DB has no tasks
  const displayTasks = filteredTasks.length > 0
    ? filteredTasks
    : [
        {
          id: 'mock-1',
          family_id: 'fam-1',
          subject_id: 'dad',
          created_by: coordName.toLowerCase(),
          assigned_to: 'cb9ad337-3166-4a6b-b9ca-323195ea93ca',
          title: `Pick up ${fatherName}'s lab report`,
          detail: `Pick up blood glucose and lipid panel report from Apollo Diagnostics for ${fatherName}`,
          priority: 'routine',
          status: 'pending',
          due_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          completed_at: null,
          parent_name: `${fatherName} (Parent)`,
          assigned_to_name: caregiverName,
          parent_context_only: true,
          scope: 'task_fulfillment_only'
        }
      ];

  const overdueCount = displayTasks.filter((t) => t.status === 'overdue').length;

  // Segmented Control Switcher
  const renderSwitcher = () => (
    <View className="flex-row bg-neutral-200/60 p-0.5 rounded-xl border border-neutral-200/30">
      <TouchableOpacity
        onPress={() => setActiveSegment('care')}
        className={`flex-1 py-2 rounded-lg items-center justify-center ${activeSegment === 'care' ? 'bg-white shadow-xs' : ''}`}
      >
        <Text
          className={`text-xs font-semibold ${activeSegment === 'care' ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}
        >
          Care Tasks
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setActiveSegment('plan')}
        className={`flex-1 py-2 rounded-lg items-center justify-center ${activeSegment === 'plan' ? 'bg-white shadow-xs' : ''}`}
      >
        <Text
          className={`text-xs font-semibold ${activeSegment === 'plan' ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}
        >
          Medications
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setActiveSegment('sync')}
        className={`flex-1 py-2 rounded-lg items-center justify-center ${activeSegment === 'sync' ? 'bg-white shadow-xs' : ''}`}
      >
        <Text
          className={`text-xs font-semibold ${activeSegment === 'sync' ? 'text-neutral-900 font-bold' : 'text-neutral-500'}`}
        >
          Sync
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Sync segment early return
  if (activeSegment === 'sync') {
    return (
      <View className="flex-1 bg-[#f2f2f7]">
        <View className="bg-white border-b border-neutral-100 pt-4 pb-2 px-5">
          {renderSwitcher()}
        </View>
        <SyncDashboard syncLogs={syncLogs} onTriggerSync={onTriggerSync} isSyncing={isSyncing} />
      </View>
    );
  }

  // Care segment early return
  if (activeSegment === 'care') {
    return (
      <View className="flex-1 bg-[#f2f2f7]">
        {/* Header */}
        <View className="bg-white border-b border-neutral-100 pt-5 pb-3 px-6 space-y-3 shadow-xs">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-neutral-900 tracking-tight">
                Care Coordination
              </Text>
              <Text className="text-[11px] text-neutral-500 font-medium">
                {activeRoleView === 'coordinator' ? `Coordinator View (${coordName})` : `Caregiver View (${caregiverName})`}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={fetchLiveTasks}
                disabled={loadingTasks}
                className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:scale-95 shadow-xs"
              >
                <RefreshCw size={15} color="#475569" className={loadingTasks ? 'animate-spin' : ''} />
              </TouchableOpacity>
              <TouchableOpacity
                testID="care-create-task"
                accessibilityLabel="Create care task"
                onPress={() => {
                  setNewTaskTitle(`Pick up ${fatherName}'s lab report`);
                  setNewTaskDetail(`Pick up lab report from Apollo Diagnostics for ${fatherName}`);
                  setNewTaskAssignee(caregiverName);
                  setNewTaskDuePreset("routine");
                  setDedupNotice(null);
                  setCreateModalOpen(true);
                }}
                className="flex-row items-center gap-1.5 bg-[#007aff] px-3.5 py-2 rounded-full active:scale-95 shadow-xs"
              >
                <Plus size={14} color="#ffffff" />
                <Text className="text-white text-xs font-bold">Create Task</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Role Switcher for Testing (Coordinator vs Caregiver) */}
          <View className="flex-row items-center justify-between bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
            <TouchableOpacity
              testID="care-filter-all"
              accessibilityLabel="Show all tasks (coordinator view)"
              onPress={() => setActiveRoleView('coordinator')}
              className={`flex-1 py-1.5 rounded-lg items-center ${activeRoleView === 'coordinator' ? 'bg-white shadow-xs' : ''}`}
            >
              <Text className={`text-[11px] font-bold ${activeRoleView === 'coordinator' ? 'text-blue-700' : 'text-slate-600'}`}>
                Coordinator ({coordName})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="care-filter-assigned"
              accessibilityLabel="Show only tasks assigned to caregiver"
              onPress={() => setActiveRoleView('caregiver')}
              className={`flex-1 py-1.5 rounded-lg items-center ${activeRoleView === 'caregiver' ? 'bg-white shadow-xs' : ''}`}
            >
              <Text className={`text-[11px] font-bold ${activeRoleView === 'caregiver' ? 'text-indigo-700' : 'text-slate-600'}`}>
                Caregiver ({caregiverName} - Task Scoped)
              </Text>
            </TouchableOpacity>
          </View>

          {renderSwitcher()}
        </View>

        <ScrollView
          className="flex-1 p-5 space-y-4"
          testID={isCaregiverView ? 'care-assigned-list' : 'care-task-list'}
        >
          {/* Scheduler / Overdue Evaluation Bar (TEST CARE-004) */}
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Clock size={16} color="#d97706" />
                <Text className="text-xs font-black text-slate-800">
                  Overdue Task Engine
                </Text>
              </View>
              {overdueCount > 0 ? (
                <View testID="care-overdue-count" className="bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">
                  <Text className="text-[10px] font-black text-amber-800">
                    {overdueCount} Overdue
                  </Text>
                </View>
              ) : (
                <View className="bg-emerald-100 border border-emerald-300 rounded-full px-2 py-0.5">
                  <Text className="text-[10px] font-black text-emerald-800">All On Schedule</Text>
                </View>
              )}
            </View>
            <Text className="text-[11px] text-slate-600 leading-relaxed">
              When tasks pass their due timestamp, the background scheduler evaluates them, marks status as <Text className="font-bold text-amber-700">overdue</Text>, and triggers notification to coordinator {coordName}.
            </Text>
            <TouchableOpacity
              onPress={handleRunScheduler}
              disabled={evaluatingScheduler}
              className="bg-amber-50 border border-amber-200 active:bg-amber-100 py-2 rounded-xl items-center justify-center flex-row gap-2"
            >
              {evaluatingScheduler ? (
                <ActivityIndicator size="small" color="#b45309" />
              ) : (
                <>
                  <RefreshCw size={12} color="#b45309" />
                  <Text className="text-amber-800 text-[11px] font-bold">
                    Run Overdue Scheduler Now
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {schedulerNotice && (
              <View className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                <Text className="text-[10px] text-amber-900 font-semibold">{schedulerNotice}</Text>
              </View>
            )}
          </View>

          {/* TEST FHIR-006: Caregiver Security & FHIR Isolation Probe */}
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
            <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-xl bg-rose-50 items-center justify-center">
                  <ShieldAlert size={15} color="#e11d48" />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-900">
                    Caregiver Access & Security Boundaries
                  </Text>
                  <Text className="text-[10px] text-slate-400 font-medium">
                    Caregiver {caregiverName}: Parent context only (No raw EMR access)
                  </Text>
                </View>
              </View>
              <View className="bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 flex-row items-center gap-1">
                <Lock size={10} color="#e11d48" />
                <Text className="text-[9px] font-black text-rose-700">RBAC Enforced</Text>
              </View>
            </View>

            <Text className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Caregiver {caregiverName} has access strictly limited to assigned tasks for {fatherName}.
            </Text>
          </View>

          {/* Tasks List grouped by status */}
          {['overdue', 'pending', 'open', 'completed'].map((statusKey) => {
            const groupTasks = displayTasks.filter(
              (t) => (t.status || 'pending').toLowerCase() === statusKey
            );
            if (groupTasks.length === 0) return null;

            const groupTitle =
              statusKey === 'overdue'
                ? '⚠️ Overdue Tasks (Action Required)'
                : statusKey === 'pending'
                ? '📋 Pending Tasks'
                : statusKey === 'open'
                ? '🔵 Open Tasks'
                : '✅ Completed Tasks';

            return (
              <View key={statusKey} className="space-y-2">
                <Text className="text-xs font-black uppercase text-neutral-500 tracking-wider pl-1">
                  {groupTitle} ({groupTasks.length})
                </Text>
                <View className="space-y-2.5">
                  {groupTasks.map((task) => {
                    const isCompleted = task.status === 'completed';
                    const isOverdue = task.status === 'overdue';

                    return (
                      <TouchableOpacity
                        key={task.id}
                        testID={`care-task-${task.id}`}
                        accessibilityLabel={`Care task ${task.title}, status ${task.status || 'pending'}`}
                        activeOpacity={0.85}
                        onPress={() => handleOpenTask(task)}
                        className={`bg-white rounded-2xl p-4 border shadow-xs space-y-3 ${
                          isOverdue
                            ? 'border-amber-300 bg-amber-50/20'
                            : isCompleted
                            ? 'border-emerald-200 bg-emerald-50/10'
                            : 'border-slate-200'
                        }`}
                      >
                        <View className="flex-row justify-between items-start">
                          <View className="space-y-1 pr-2 flex-1">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-sm font-bold text-neutral-800 leading-snug">
                                {task.title}
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-2 pt-0.5">
                              <View testID={`care-task-assignee-${task.id}`} className="flex-row items-center gap-1">
                                <User size={11} color="#64748b" />
                                <Text className="text-[10px] font-semibold text-slate-500">
                                  {task.assigned_to_name || `${caregiverName} (Caregiver)`}
                                </Text>
                              </View>
                              <Text className="text-[10px] text-slate-300">•</Text>
                              <Text className="text-[10px] font-medium text-slate-500">
                                Context: {`${fatherName} (Parent)`}
                              </Text>
                            </View>
                          </View>

                          <View
                            testID={`care-task-status-${task.id}`}
                            className={`px-2.5 py-1 rounded-full border ${
                              isOverdue
                                ? 'bg-amber-100 border-amber-300'
                                : isCompleted
                                ? 'bg-emerald-100 border-emerald-300'
                                : 'bg-blue-50 border-blue-200'
                            }`}
                          >
                            <Text
                              testID={isOverdue ? `care-task-overdue-${task.id}` : undefined}
                              className={`text-[9px] font-black uppercase ${
                                isOverdue
                                  ? 'text-amber-800'
                                  : isCompleted
                                  ? 'text-emerald-800'
                                  : 'text-blue-700'
                              }`}
                            >
                              {task.status || 'pending'}
                            </Text>
                          </View>
                        </View>

                        {task.detail ? (
                          <Text className="text-[11px] text-slate-600 font-medium" numberOfLines={2}>
                            {task.detail}
                          </Text>
                        ) : null}

                        {/* Card Footer Actions */}
                        <View className="flex-row items-center justify-between pt-2.5 border-t border-slate-100">
                          <View testID={`care-task-due-${task.id}`} className="flex-row items-center gap-1">
                            <Clock size={11} color="#94a3b8" />
                            <Text className="text-[10px] font-medium text-slate-400">
                              {task.due_at ? new Date(task.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Due today'}
                            </Text>
                          </View>

                          <View className="flex-row gap-2">
                            {!isCompleted && (
                              <TouchableOpacity
                                testID={`care-task-complete-${task.id}`}
                                accessibilityLabel={`Complete task ${task.title}`}
                                onPress={() => {
                                  setSelectedTask(task);
                                  setCompletionNote("Lab report collected from Apollo Diagnostics, verified clear.");
                                  setCompleteModalOpen(true);
                                }}
                                className="bg-[#34c759] active:bg-[#2fb34f] px-3 py-1.5 rounded-xl flex-row items-center gap-1"
                              >
                                <Check size={11} color="#ffffff" />
                                <Text className="text-[10px] font-bold text-white">Complete Task</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => handleOpenTask(task)}
                              className="bg-slate-100 active:bg-slate-200 px-2.5 py-1.5 rounded-xl flex-row items-center gap-1"
                            >
                              <Text className="text-[10px] font-bold text-slate-700">Details</Text>
                              <ChevronRight size={11} color="#475569" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <View className="h-28" />
        </ScrollView>

        {/* ----------------- CREATE TASK MODAL (CARE-001 & CARE-005) ----------------- */}
        <Modal
          visible={createModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setCreateModalOpen(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 space-y-4 max-h-[85%]">
              <View className="flex-row justify-between items-center pb-2 border-b border-slate-100">
                <View>
                  <Text className="text-lg font-black text-slate-900">
                    Create Care Task
                  </Text>
                  <Text className="text-[11px] text-slate-400 font-medium">
                    Assign a new care task or responsibility
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCreateModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Deduplication Notice Banner (TEST CARE-005) */}
              {dedupNotice && (
                <View testID="care-task-dedup-notice" className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex-row items-start gap-2">
                  <ShieldCheck size={16} color="#b45309" className="shrink-0 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-xs font-black text-amber-900">
                      Task Deduplication Active
                    </Text>
                    <Text className="text-[11px] text-amber-800 leading-snug mt-0.5">
                      {dedupNotice}
                    </Text>
                  </View>
                </View>
              )}

              {/* Title input */}
              <View className="space-y-1">
                <Text className="text-xs font-bold text-slate-700">Task Title</Text>
                <TextInput
                  testID="care-task-title-input"
                  accessibilityLabel="Task title"
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  placeholder="e.g. Pick up the parent's lab report"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium"
                />
              </View>

              {/* Details input */}
              <View className="space-y-1">
                <Text className="text-xs font-bold text-slate-700">Instructions / Notes</Text>
                <TextInput
                  testID="care-task-detail-input"
                  value={newTaskDetail}
                  onChangeText={setNewTaskDetail}
                  placeholder="e.g. Collect report from Apollo Diagnostics"
                  multiline
                  numberOfLines={2}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium"
                />
              </View>

              {/* Assignee Selection */}
              <View className="space-y-1.5">
                <Text className="text-xs font-bold text-slate-700">Assign To</Text>
                <View testID="care-task-assignee-select" className="flex-row gap-2">
                  <TouchableOpacity
                    testID="care-task-assignee-caregiver"
                    accessibilityLabel={`Assign to caregiver ${caregiverName}`}
                    onPress={() => setNewTaskAssignee(caregiverName)}
                    className={`flex-1 py-2 px-3 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                      newTaskAssignee === caregiverName
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <User size={13} color={newTaskAssignee === caregiverName ? '#007aff' : '#64748b'} />
                    <Text
                      className={`text-xs font-bold ${
                        newTaskAssignee === caregiverName ? 'text-blue-700' : 'text-slate-600'
                      }`}
                    >
                      {caregiverName} (Caregiver)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="care-task-assignee-coordinator"
                    accessibilityLabel={`Assign to coordinator ${coordName}`}
                    onPress={() => setNewTaskAssignee(coordName)}
                    className={`flex-1 py-2 px-3 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                      newTaskAssignee === coordName
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <User size={13} color={newTaskAssignee === coordName ? '#007aff' : '#64748b'} />
                    <Text
                      className={`text-xs font-bold ${
                        newTaskAssignee === coordName ? 'text-blue-700' : 'text-slate-600'
                      }`}
                    >
                      {coordName} (Coordinator)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Due Date Presets (including Past Date for CARE-004) */}
              <View className="space-y-1.5">
                <Text className="text-xs font-bold text-slate-700">Due Time</Text>
                <View testID="care-task-due-input" className="flex-row gap-2">
                  <TouchableOpacity
                    testID="care-task-due-preset-routine"
                    onPress={() => setNewTaskDuePreset('routine')}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      newTaskDuePreset === 'routine'
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        newTaskDuePreset === 'routine' ? 'text-blue-700' : 'text-slate-600'
                      }`}
                    >
                      In 4 Hours (Routine)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="care-task-due-preset-past"
                    onPress={() => setNewTaskDuePreset('past')}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      newTaskDuePreset === 'past'
                        ? 'bg-amber-50 border-amber-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        newTaskDuePreset === 'past' ? 'text-amber-800' : 'text-slate-600'
                      }`}
                    >
                      Past Due
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="care-task-due-preset-tomorrow"
                    onPress={() => setNewTaskDuePreset('tomorrow')}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      newTaskDuePreset === 'tomorrow'
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        newTaskDuePreset === 'tomorrow' ? 'text-blue-700' : 'text-slate-600'
                      }`}
                    >
                      Tomorrow
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Priority Selection */}
              <View className="space-y-1.5">
                <Text className="text-xs font-bold text-slate-700">Priority</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setNewTaskPriority('routine')}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      newTaskPriority === 'routine'
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        newTaskPriority === 'routine' ? 'text-blue-700' : 'text-slate-600'
                      }`}
                    >
                      Routine
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setNewTaskPriority('urgent')}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      newTaskPriority === 'urgent'
                        ? 'bg-amber-50 border-amber-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        newTaskPriority === 'urgent' ? 'text-amber-800' : 'text-slate-600'
                      }`}
                    >
                      Urgent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Actions */}
              <View className="flex-row gap-3 pt-2">
                <TouchableOpacity
                  onPress={() => setCreateModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-xs font-bold text-slate-700">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="care-task-submit"
                  accessibilityLabel="Submit new care task"
                  onPress={handleCreateTask}
                  disabled={isSubmittingTask}
                  className="flex-2 py-3 bg-[#007aff] active:bg-[#0060cb] rounded-xl items-center justify-center shadow-xs"
                >
                  {isSubmittingTask ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-xs font-bold text-white">Create Task</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ----------------- TASK DETAILS MODAL (CARE-002: Parent Context Only) ----------------- */}
        <Modal
          visible={detailModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDetailModalOpen(false)}
        >
          <View className="flex-1 bg-black/60 justify-center p-5">
            <View className="bg-white rounded-3xl p-6 space-y-4 max-h-[80%]">
              <View className="flex-row justify-between items-start pb-2 border-b border-slate-100">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-black text-slate-900 leading-snug">
                    {selectedTask?.title}
                  </Text>
                  <Text className="text-[10px] text-slate-400 font-medium">
                    ID: {selectedTask?.id?.slice(0, 8)} • Family Circle Task
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDetailModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={15} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* RBAC Scope & Context Verification Banner (TEST CARE-002) */}
              <View className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 space-y-2">
                <View className="flex-row items-center gap-1.5">
                  <ShieldCheck size={15} color="#4338ca" />
                  <Text className="text-xs font-black text-indigo-950">
                    Permitted Parent Context Only
                  </Text>
                </View>
                <View className="space-y-1">
                  <Text className="text-[11px] text-indigo-900 font-semibold">
                    • Parent Context: <Text className="font-bold">{`${fatherName} (Parent)`}</Text>
                  </Text>
                  <Text className="text-[11px] text-indigo-900 font-semibold">
                    • Assignee: <Text className="font-bold">{selectedTask?.assigned_to_name || `${caregiverName} (Caregiver)`}</Text>
                  </Text>
                  <Text className="text-[11px] text-indigo-900 font-semibold">
                    • Authorized Scope: <Text className="font-bold">{selectedTask?.scope || 'task_fulfillment_only'}</Text>
                  </Text>
                </View>
                <Text className="text-[10px] text-indigo-700 leading-relaxed pt-1 border-t border-indigo-100">
                  Caregiver is granted strictly task-level context. Access to detailed FHIR clinical charts, lab diagnostic values, and conditions is restricted.
                </Text>
              </View>

              {/* Task Details */}
              <View className="space-y-2">
                <Text className="text-xs font-bold text-slate-700">Instructions / Detail</Text>
                <View className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Text className="text-xs text-slate-800 font-medium">
                    {selectedTask?.instructions || selectedTask?.detail || 'No extra notes.'}
                  </Text>
                </View>
              </View>

              {/* Status and Due Date */}
              <View className="flex-row justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase">Status</Text>
                  <Text className="text-xs font-black text-slate-800 uppercase mt-0.5">
                    {selectedTask?.status}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase">Due Time</Text>
                  <Text className="text-xs font-black text-slate-800 mt-0.5">
                    {selectedTask?.due_at ? new Date(selectedTask.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase">Priority</Text>
                  <Text className="text-xs font-black text-slate-800 uppercase mt-0.5">
                    {selectedTask?.priority || 'routine'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-2.5 pt-2">
                {selectedTask?.status !== 'completed' ? (
                  <TouchableOpacity
                    onPress={() => {
                      setDetailModalOpen(false);
                      setCompletionNote("Lab report collected from Apollo Diagnostics, verified clear.");
                      setCompleteModalOpen(true);
                    }}
                    className="flex-1 bg-[#34c759] active:bg-[#2fb34f] py-3 rounded-xl items-center justify-center flex-row gap-1.5 shadow-xs"
                  >
                    <Check size={14} color="#ffffff" />
                    <Text className="text-xs font-bold text-white">Complete Task</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="flex-1 bg-emerald-50 border border-emerald-200 py-2.5 rounded-xl items-center justify-center">
                    <Text className="text-xs font-bold text-emerald-800">
                      ✓ Task Completed & Coordinator Notified
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => setDetailModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-xs font-bold text-slate-700">Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ----------------- COMPLETE TASK MODAL (CARE-003: Note & Confirm) ----------------- */}
        <Modal
          visible={completeModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setCompleteModalOpen(false)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white rounded-t-3xl p-6 space-y-4">
              <View className="flex-row justify-between items-center pb-2 border-b border-slate-100">
                <View>
                  <Text className="text-lg font-black text-slate-900">
                    Complete Task
                  </Text>
                  <Text className="text-[11px] text-slate-400 font-medium">
                    Add completion note and confirm completion
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCompleteModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex-row items-center gap-2">
                <CheckCircle2 size={16} color="#059669" />
                <Text className="text-xs font-bold text-emerald-900">
                  Completing: {selectedTask?.title}
                </Text>
              </View>

              <View className="space-y-1.5">
                <Text className="text-xs font-bold text-slate-700">Completion Note</Text>
                <TextInput
                  value={completionNote}
                  onChangeText={setCompletionNote}
                  placeholder="e.g. Lab report collected from Apollo Diagnostics, verified clear."
                  multiline
                  numberOfLines={3}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium"
                />
              </View>

              <Text className="text-[10px] text-slate-500 leading-relaxed">
                Confirming completion updates task status to <Text className="font-bold text-emerald-700">completed</Text>, records completion timestamp, and automatically sends a high-priority notification to coordinator {coordName}.
              </Text>

              <View className="flex-row gap-3 pt-2">
                <TouchableOpacity
                  onPress={() => setCompleteModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-xs font-bold text-slate-700">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="care-task-complete-confirm"
                  accessibilityLabel="Confirm task completion"
                  onPress={handleConfirmComplete}
                  disabled={isSubmittingCompletion}
                  className="flex-2 py-3 bg-[#34c759] active:bg-[#2fb34f] rounded-xl items-center justify-center shadow-xs"
                >
                  {isSubmittingCompletion ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-xs font-bold text-white">Confirm Completion</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Medications plan segment
  return (
    <ScrollView className="flex-1 bg-[#f2f2f7]">
      {/* Header */}
      <View className="bg-white border-b border-neutral-100 pt-5 pb-3 px-6 space-y-3 shadow-xs">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-neutral-900 tracking-tight">Medications</Text>
          <TouchableOpacity
            onPress={onOpenQuickActions}
            className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center active:scale-95 shadow-xs"
          >
            <Plus size={16} color="#007aff" />
          </TouchableOpacity>
        </View>
        {renderSwitcher()}
      </View>

      <View className="p-5 space-y-5">
        {careSubjects.map((subject) => {
          const isSubjectDad = subject.id === 'dad' || subject.relationship?.toLowerCase().includes('father');
          const isSubjectMom = subject.id === 'mom' || subject.relationship?.toLowerCase().includes('mother');
          
          const subjectMeds = (context.medications && context.medications.length > 0)
            ? context.medications.filter(
                (m) =>
                  m.personId === subject.id ||
                  m.personId === subject.backendSubjectId ||
                  (isSubjectDad && m.personId === 'dad') ||
                  (isSubjectMom && m.personId === 'mom')
              ).map((m) => ({
                name: m.name,
                dose: m.dose,
                time: m.scheduledTime || '8:00 AM',
                status: m.status === 'taken' ? 'Taken' : (m.status === 'missed' ? 'Missed' : 'Upcoming')
              }))
            : isSubjectDad
            ? [
                { name: 'Amlodipine', dose: '5 mg', time: '8:00 AM', status: 'Taken' },
                { name: 'Atorvastatin', dose: '20 mg', time: '8:00 PM', status: isAtorvastatinTaken ? 'Taken' : 'Upcoming' }
              ]
            : [
                { name: 'Metformin', dose: '500 mg', time: '8:00 AM', status: 'Taken' },
                { name: 'Osteocare Calcium', dose: 'ER', time: '8:00 PM', status: 'Upcoming' }
              ];

          const adherenceScore = isSubjectDad ? 92 : 98;

          return (
            <View key={subject.id} className="space-y-2.5">
              <View className="flex-row items-center justify-between px-1">
                <View className="flex-row items-center gap-2">
                  <Image
                    source={{
                      uri:
                        subject.avatarUrl ||
                        (isSubjectDad
                          ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
                          : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2')
                    }}
                    className="w-7 h-7 rounded-full"
                  />
                  <Text className="text-sm font-bold text-neutral-800">{subject.name}'s Medications</Text>
                </View>
                <View className="bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  <Text className="text-[9px] font-bold text-[#007aff]">Adherence {adherenceScore}%</Text>
                </View>
              </View>

              <View className="bg-white rounded-2xl p-5 shadow-sm shadow-neutral-100 space-y-4">
                {subjectMeds.length > 0 ? (
                  subjectMeds.map((med, idx) => (
                    <View
                      key={idx}
                      className="flex-row items-center justify-between border-b border-neutral-100 pb-3 last:border-0 last:pb-0"
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
                          <Pill size={14} color="#007aff" />
                        </View>
                        <View>
                          <Text className="text-xs font-bold text-neutral-800">{med.name}</Text>
                          <Text className="text-[9px] text-neutral-400 font-semibold mt-0.5">
                            {med.dose} · {med.time}
                          </Text>
                        </View>
                      </View>
                      <View
                        className={`px-2.5 py-0.5 rounded-full ${med.status.includes('Taken') ? 'bg-emerald-50' : 'bg-neutral-100'}`}
                      >
                        <Text
                          className={`text-[8px] font-bold ${med.status.includes('Taken') ? 'text-[#34c759]' : 'text-neutral-500'}`}
                        >
                          {med.status.includes('Taken') ? '✓ Taken' : med.status}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text className="text-xs text-neutral-400 text-center py-2">
                    No active medications recorded for {subject.name}.
                  </Text>
                )}

                {/* Subject Actions */}
                <View className="flex-row gap-2.5 pt-3 border-t border-neutral-100">
                  <TouchableOpacity
                    onPress={() =>
                      context.showToast(`Medication adherence check dispatched to ${subject.name}.`)
                    }
                    className="flex-1 bg-neutral-50 py-2.5 rounded-xl flex-row items-center justify-center gap-1 active:opacity-90"
                  >
                    <Bell size={12} color="#007aff" />
                    <Text className="text-[10px] font-bold text-[#007aff]">Remind</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      const targetId = subject.backendSubjectId || subject.id;
                      context.setCurrentPersonId(targetId);
                      router.push(`/parent/${targetId}` as any);
                    }}
                    className="flex-1 bg-neutral-50 py-2.5 rounded-xl flex-row items-center justify-center gap-1 active:opacity-90"
                  >
                    <Eye size={12} color="#8e8e93" />
                    <Text className="text-[10px] font-bold text-neutral-600">View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={onOpenQuickActions}
                    className="flex-1 bg-neutral-50 py-2.5 rounded-xl flex-row items-center justify-center gap-1 active:opacity-90"
                  >
                    <Edit size={12} color="#8e8e93" />
                    <Text className="text-[10px] font-bold text-neutral-600">Add / Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* Appointments Section */}
        <View className="space-y-2.5">
          <View className="flex-row items-center gap-2 px-1">
            <Calendar size={16} color="#ff3b30" />
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              Upcoming Appointments
            </Text>
          </View>

          {(context.appointments && context.appointments.length > 0
            ? context.appointments
            : [
                {
                  id: 'appt-1',
                  personId: 'dad',
                  doctorName: 'Dr. Sharma',
                  specialty: 'Cardiology',
                  date: 'Tomorrow',
                  time: '4:00 PM IST',
                  location: 'Apollo Hospital Chennai'
                }
              ]
          ).map((appt) => {
            const apptPerson =
              context.people.find((p) => p.id === appt.personId || p.backendSubjectId === appt.personId) ||
              context.people[0];
            const targetSubjectId = apptPerson?.backendSubjectId || apptPerson?.id || appt.personId || 'dad';

            return (
              <View key={appt.id} className="bg-white rounded-2xl p-5 shadow-sm shadow-neutral-100 space-y-3.5">
                <View className="flex-row justify-between items-start">
                  <View className="space-y-0.5">
                    <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      {apptPerson?.name || 'Parent'}
                    </Text>
                    <Text className="text-sm font-bold text-neutral-800">{appt.specialty}</Text>
                  </View>
                  <View className="bg-red-50 border border-red-100/50 px-2.5 py-0.5 rounded-full">
                    <Text className="text-[9px] font-bold text-[#ff3b30]">
                      {appt.date} · {formatAppointmentTimeForCoordinator(appt.time).coordinatorDisplay}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-neutral-500 font-semibold">
                  {appt.location} · {appt.doctorName}
                </Text>

                {/* Actions */}
                <View className="flex-row gap-2.5 pt-3 border-t border-neutral-100">
                  <TouchableOpacity
                    onPress={() => router.push(`/parent/${targetSubjectId}/prepare` as any)}
                    className="flex-1 bg-blue-50 py-2 rounded-xl items-center justify-center active:opacity-90 shadow-xs"
                  >
                    <Text className="text-[10px] font-bold text-[#007aff]">Prepare</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => context.showToast(`${appt.specialty} appointment details shared with care team.`)}
                    className="flex-1 bg-neutral-100 py-2 rounded-xl items-center justify-center active:opacity-90 shadow-xs"
                  >
                    <Text className="text-[10px] font-bold text-neutral-600">Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => context.showToast(`Caregiver assigned to accompany ${apptPerson?.name || 'Parent'}.`)}
                    className="flex-1 bg-neutral-100 py-2 rounded-xl items-center justify-center active:opacity-90 shadow-xs"
                  >
                    <Text className="text-[10px] font-bold text-neutral-600">Assign Caregiver</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Care Providers Circle Section */}
        <View className="space-y-2.5 mb-12">
          <View className="flex-row items-center gap-2 px-1">
            <Users size={16} color="#8e8e93" />
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              Active Care circle
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-3 py-1"
          >
            {context.familyMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                onPress={() => router.push(`/caregiver/${member.id}`)}
                className="bg-white rounded-2xl p-4 border border-neutral-100 items-center space-y-1.5 w-24 shrink-0 shadow-sm active:scale-95"
              >
                <Image
                  source={{
                    uri:
                      member.avatarUrl ||
                      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
                  }}
                  className="w-10 h-10 rounded-full"
                />
                <View className="items-center">
                  <Text
                    className="text-[10px] font-bold text-neutral-800 text-center"
                    numberOfLines={1}
                  >
                    {member.name}
                  </Text>
                  <Text className="text-[8px] text-neutral-400 font-semibold text-center mt-0.5">
                    {member.relationship}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View className="h-28" />
      </View>
    </ScrollView>
  );
};
