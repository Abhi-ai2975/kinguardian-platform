import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Pill, Plus, Users, Bell, Eye, Edit, Calendar } from 'lucide-react-native';
import { HealthRecordItem, SyncLog, Person } from '../types';
import { SyncDashboard } from './SyncDashboard';
import { AppContext } from '../store/AppContext';

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

  if (!context) return null;

  // Care dashboard state with database sync
  const careTasks = context.careTasks || [];
  const displayTasks = careTasks.length > 0
    ? careTasks.map((t) => {
        let section = 'Today';
        if (t.status === 'completed') {
          section = 'Completed';
        } else if (t.priority === 'high' || (t.priority as string) === 'urgent') {
          section = 'Needs attention';
        } else if (t.dueAt?.toLowerCase().includes('tomorrow')) {
          section = 'Upcoming';
        }
        return {
          id: t.id,
          title: t.title,
          assignee: t.assignedTo || 'Care Team',
          time: t.dueAt || 'Today',
          section,
          status: t.status
        };
      })
    : [
        {
          id: 'task-1',
          title: "Log Dad's midday blood pressure",
          assignee: 'Anjali',
          time: 'Today · 2:00 PM IST',
          section: 'Needs attention',
          status: 'pending'
        },
        {
          id: 'task-2',
          title: "Pick up Dad's lab report",
          assignee: 'Priya',
          time: 'Today · 5:00 PM IST',
          section: 'Today',
          status: 'pending'
        },
        {
          id: 'task-3',
          title: 'Accompany Mom to diabetic eye screening',
          assignee: 'Suresh Kumar',
          time: 'Tomorrow · 10:00 AM IST',
          section: 'Upcoming',
          status: 'pending'
        },
        {
          id: 'task-5',
          title: 'Verify Metformin morning dose',
          assignee: 'Priya',
          time: 'Today · 8:05 AM IST',
          section: 'Completed',
          status: 'completed'
        }
      ];

  const handleCompleteTask = async (id: string) => {
    await context.completeCareTask(id);
    const t = displayTasks.find((x) => x.id === id);
    context.showToast(`Task "${t?.title || 'Care task'}" marked as completed in database.`);
  };

  const handleReassignTask = (_id: string) => {
    context.showToast('Reassigned task to Priya.');
  };

  const handleMessageTask = (assignee: string) => {
    context.showToast(`Message reminder dispatched to ${assignee}.`);
  };

  const isAtorvastatinTaken =
    context.records
      .find((r) => r.id === 'rec-5')
      ?.status?.toLowerCase()
      .includes('taken') || false;

  const parentPeople = people.filter(
    (p) =>
      p.role === 'parent' ||
      p.relationship?.toLowerCase().includes('father') ||
      p.relationship?.toLowerCase().includes('mother') ||
      p.id === 'dad' ||
      p.id === 'mom'
  );
  const careSubjects = parentPeople.length > 0 ? parentPeople : people.slice(0, 2);

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
          Care
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
            <Text className="text-2xl font-bold text-neutral-900 tracking-tight">
              Care Dashboard
            </Text>
            <TouchableOpacity
              onPress={onOpenQuickActions}
              className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center active:scale-95 shadow-xs"
            >
              <Plus size={16} color="#007aff" />
            </TouchableOpacity>
          </View>
          {renderSwitcher()}
        </View>

        <ScrollView className="flex-1 p-5 space-y-5">
          {['Needs attention', 'Today', 'Upcoming', 'Waiting for someone', 'Completed'].map(
            (sec) => {
              const secTasks = displayTasks.filter((t) => t.section === sec);
              if (secTasks.length === 0) return null;
              return (
                <View key={sec} className="space-y-2.5">
                  <Text className="text-xs font-bold uppercase text-neutral-400 tracking-wider pl-1">
                    {sec}
                  </Text>
                  <View className="space-y-3">
                    {secTasks.map((task) => (
                      <View
                        key={task.id}
                        className="bg-white rounded-2xl p-5 shadow-sm shadow-neutral-100 space-y-4"
                      >
                        <View className="flex-row justify-between items-start">
                          <View className="space-y-1 pr-2 flex-1">
                            <Text className="text-sm font-bold text-neutral-800 leading-snug">
                              {task.title}
                            </Text>
                            <Text className="text-[10px] font-semibold text-neutral-400">
                              Assigned to {task.assignee}
                            </Text>
                          </View>
                          <View className="bg-neutral-50 px-2.5 py-0.5 rounded-full shrink-0 border border-neutral-100/50">
                            <Text className="text-[9px] font-semibold text-neutral-500">
                              {task.time}
                            </Text>
                          </View>
                        </View>

                        {/* Actions */}
                        <View className="flex-row gap-2.5 pt-3 border-t border-neutral-100">
                          {task.status !== 'completed' && (
                            <TouchableOpacity
                              onPress={() => handleCompleteTask(task.id)}
                              className="flex-1 bg-[#34c759] py-2 rounded-xl items-center justify-center active:opacity-90"
                            >
                              <Text className="text-[10px] font-bold text-white">Complete</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => handleReassignTask(task.id)}
                            className="flex-1 bg-neutral-100 py-2 rounded-xl items-center justify-center active:opacity-90"
                          >
                            <Text className="text-[10px] font-bold text-neutral-700">Reassign</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleMessageTask(task.assignee)}
                            className="flex-1 bg-blue-50 py-2 rounded-xl items-center justify-center active:opacity-90"
                          >
                            <Text className="text-[10px] font-bold text-[#007aff]">Message</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            }
          )}
          <View className="h-24" />
        </ScrollView>
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
          const isSubjectMom = subject.id === 'mom' || subject.relationship?.toLowerCase().includes('mother') || subject.name.toLowerCase() === 'vandana';
          
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
                    <Text className="text-[9px] font-bold text-[#ff3b30]">{appt.date} · {appt.time}</Text>
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
