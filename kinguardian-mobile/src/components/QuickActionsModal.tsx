import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { X, Heart, Sparkles, MessageSquare, Upload, Activity, Calendar, CheckSquare } from 'lucide-react-native';
import { CareTask } from '../types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const medSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  dosage: z.string().min(2, 'Dosage must be at least 2 characters')
});

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: 'ask' | 'family' | 'report') => void;
  onLogVitalSuccess: (vital: { systolic: number; diastolic: number; note: string }) => void;
  onAddMedicationSuccess: (med: { name: string; dosage: string; person: string }) => void;
  onAddContextSuccess: (note: string) => void;
  onAddAppointmentSuccess?: (appt: {
    specialty: string;
    doctor: string;
    date: string;
    time: string;
  }) => void;
  onAddTaskSuccess?: (task: CareTask) => void;
  initialTab?: 'menu' | 'log_bp' | 'add_med' | 'add_context' | 'add_appt' | 'add_task';
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  onLogVitalSuccess,
  onAddMedicationSuccess,
  onAddContextSuccess,
  onAddAppointmentSuccess,
  onAddTaskSuccess,
  initialTab = 'menu'
}) => {
  const [subAction, setSubAction] = useState<
    'menu' | 'log_bp' | 'add_med' | 'add_context' | 'add_appt' | 'add_task'
  >('menu');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [medPerson] = useState('Dad (Ramesh)');
  const [contextNote, setContextNote] = useState('');

  // Task states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'medium' | 'high'>('medium');
  const [taskAssignee, setTaskAssignee] = useState('Care Team');

  // Appointment states
  const [apptSpecialty, setApptSpecialty] = useState('');
  const [apptDoctor, setApptDoctor] = useState('');
  const [apptDate, setApptDate] = useState('Tomorrow');
  const [apptTime, setApptTime] = useState('4:00 PM');

  useEffect(() => {
    if (isOpen) {
      setSubAction(initialTab);
    }
  }, [isOpen, initialTab]);

  // Form Configuration
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(medSchema),
    defaultValues: { name: '', dosage: '' }
  });

  const handleLogVital = () => {
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    if (sys && dia) {
      onLogVitalSuccess({ systolic: sys, diastolic: dia, note: 'Quick Actions Ingest' });
      setSystolic('');
      setDiastolic('');
      setSubAction('menu');
      onClose();
    }
  };

  const handleAddMed = (data: { name: string; dosage: string }) => {
    onAddMedicationSuccess({ name: data.name, dosage: data.dosage, person: medPerson });
    reset();
    setSubAction('menu');
    onClose();
  };

  const handleAddContext = () => {
    if (contextNote.trim()) {
      onAddContextSuccess(contextNote);
      setContextNote('');
      setSubAction('menu');
      onClose();
    }
  };

  const handleAddAppt = () => {
    if (apptSpecialty.trim() && apptDoctor.trim()) {
      if (onAddAppointmentSuccess) {
        onAddAppointmentSuccess({
          specialty: apptSpecialty,
          doctor: apptDoctor,
          date: apptDate,
          time: apptTime
        });
      }
      setApptSpecialty('');
      setApptDoctor('');
      setSubAction('menu');
      onClose();
    }
  };

  const handleAddTask = () => {
    if (taskTitle.trim()) {
      if (onAddTaskSuccess) {
        onAddTaskSuccess({
          id: `task-${Date.now()}`,
          personId: 'dad',
          title: taskTitle.trim(),
          status: 'pending',
          dueAt: 'Today · 6 PM',
          priority: taskPriority,
          assignedTo: taskAssignee.trim() || 'Care Team'
        });
      }
      setTaskTitle('');
      setSubAction('menu');
      onClose();
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-[28px] p-6 pt-3 space-y-4 shadow-xl">
          {/* iOS Grabber Handle */}
          <View className="w-10 h-1.5 bg-neutral-200 rounded-full self-center mb-1.5" />

          {/* Header */}
          <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
            <Text className="text-lg font-bold text-neutral-900 tracking-tight">Quick Actions</Text>
            <TouchableOpacity
              onPress={() => {
                setSubAction('menu');
                onClose();
              }}
              className="p-1.5 bg-neutral-100 rounded-full active:scale-90"
            >
              <X size={16} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          {subAction === 'menu' && (
            <View className="space-y-4">
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onSelectAction('ask');
                  }}
                  className="flex-1 p-4 bg-neutral-50 rounded-2xl items-center border border-neutral-100 active:bg-neutral-100"
                >
                  <Sparkles size={20} color="#af52de" fill="#af52de" />
                  <Text className="text-[10px] font-semibold text-neutral-700 mt-2">Ask AI</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onSelectAction('family');
                  }}
                  className="flex-1 p-4 bg-neutral-50 rounded-2xl items-center border border-neutral-100 active:bg-neutral-100"
                >
                  <MessageSquare size={20} color="#007aff" />
                  <Text className="text-[10px] font-semibold text-neutral-700 mt-2">
                    Chat Group
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onSelectAction('report');
                  }}
                  className="flex-1 p-4 bg-neutral-50 rounded-2xl items-center border border-neutral-100 active:bg-neutral-100"
                >
                  <Upload size={20} color="#34c759" />
                  <Text className="text-[10px] font-semibold text-neutral-700 mt-2">Doc Vault</Text>
                </TouchableOpacity>
              </View>

              {/* Grouped Table View List */}
              <View className="bg-neutral-50 rounded-2xl border border-neutral-100 overflow-hidden divide-y divide-neutral-200/80">
                <TouchableOpacity
                  onPress={() => setSubAction('log_bp')}
                  className="w-full p-4 flex-row items-center justify-between active:bg-neutral-100"
                >
                  <View className="flex-row items-center gap-3">
                    <Heart size={16} color="#ff3b30" fill="#ff3b30" />
                    <Text className="text-sm font-semibold text-neutral-800">
                      Log Blood Pressure (Dad)
                    </Text>
                  </View>
                  <Text className="text-xs text-neutral-400 font-bold">&rarr;</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSubAction('add_med')}
                  className="w-full p-4 flex-row items-center justify-between active:bg-neutral-100"
                >
                  <View className="flex-row items-center gap-3">
                    <Activity size={16} color="#ff9500" />
                    <Text className="text-sm font-semibold text-neutral-800">
                      Add New Prescription
                    </Text>
                  </View>
                  <Text className="text-xs text-neutral-400 font-bold">&rarr;</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSubAction('add_appt')}
                  className="w-full p-4 flex-row items-center justify-between active:bg-neutral-100"
                >
                  <View className="flex-row items-center gap-3">
                    <Calendar size={16} color="#ff3b30" />
                    <Text className="text-sm font-semibold text-neutral-800">
                      Add New Appointment
                    </Text>
                  </View>
                  <Text className="text-xs text-neutral-400 font-bold">&rarr;</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSubAction('add_task')}
                  className="w-full p-4 flex-row items-center justify-between active:bg-neutral-100"
                >
                  <View className="flex-row items-center gap-3">
                    <CheckSquare size={16} color="#34c759" />
                    <Text className="text-sm font-semibold text-neutral-800">
                      Assign Care Task
                    </Text>
                  </View>
                  <Text className="text-xs text-neutral-400 font-bold">&rarr;</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSubAction('add_context')}
                  className="w-full p-4 flex-row items-center justify-between active:bg-neutral-100"
                >
                  <View className="flex-row items-center gap-3">
                    <MessageSquare size={16} color="#007aff" />
                    <Text className="text-sm font-semibold text-neutral-800">
                      Log Caregiver Context Note
                    </Text>
                  </View>
                  <Text className="text-xs text-neutral-400 font-bold">&rarr;</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {subAction === 'log_bp' && (
            <View className="space-y-4">
              <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wider pl-1">
                Log Dad's Blood Pressure
              </Text>
              <View className="flex-row gap-3">
                <TextInput
                  value={systolic}
                  onChangeText={setSystolic}
                  placeholder="Systolic (120)"
                  placeholderTextColor="#8e8e93"
                  keyboardType="numeric"
                  className="flex-1 bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm"
                />
                <TextInput
                  value={diastolic}
                  onChangeText={setDiastolic}
                  placeholder="Diastolic (80)"
                  placeholderTextColor="#8e8e93"
                  keyboardType="numeric"
                  className="flex-1 bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm"
                />
              </View>
              <TouchableOpacity
                onPress={handleLogVital}
                className="w-full py-4.5 bg-[#ff3b30] rounded-2xl items-center justify-center active:opacity-90"
              >
                <Text className="text-white font-bold text-sm">Confirm Log</Text>
              </TouchableOpacity>
            </View>
          )}

          {subAction === 'add_med' && (
            <View className="space-y-4">
              <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wider pl-1">
                Add Prescription
              </Text>

              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Medication name (e.g. Lipitor)"
                    placeholderTextColor="#8e8e93"
                    className="w-full bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm text-neutral-800"
                  />
                )}
              />
              {errors.name && (
                <Text className="text-[#ff3b30] text-xs font-medium pl-1">
                  ⚠️ {errors.name.message}
                </Text>
              )}

              <Controller
                control={control}
                name="dosage"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Dosage (e.g. 10mg morning)"
                    placeholderTextColor="#8e8e93"
                    className="w-full bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm text-neutral-800"
                  />
                )}
              />
              {errors.dosage && (
                <Text className="text-[#ff3b30] text-xs font-medium pl-1">
                  ⚠️ {errors.dosage.message}
                </Text>
              )}

              <TouchableOpacity
                onPress={handleSubmit(handleAddMed)}
                className="w-full py-4.5 bg-[#34c759] rounded-2xl items-center justify-center active:opacity-90"
              >
                <Text className="text-white font-bold text-sm">Confirm Medication</Text>
              </TouchableOpacity>
            </View>
          )}

          {subAction === 'add_appt' && (
            <View className="space-y-4">
              <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wider pl-1">
                Add New Appointment
              </Text>

              <TextInput
                value={apptSpecialty}
                onChangeText={setApptSpecialty}
                placeholder="Specialty / Department (e.g. Cardiology)"
                placeholderTextColor="#8e8e93"
                className="w-full bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm text-neutral-800"
              />

              <TextInput
                value={apptDoctor}
                onChangeText={setApptDoctor}
                placeholder="Doctor Name (e.g. Dr. Sharma)"
                placeholderTextColor="#8e8e93"
                className="w-full bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm text-neutral-800"
              />

              <View className="flex-row gap-3">
                <TextInput
                  value={apptDate}
                  onChangeText={setApptDate}
                  placeholder="Date (e.g. Tomorrow)"
                  placeholderTextColor="#8e8e93"
                  className="flex-1 bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm text-neutral-800"
                />
                <TextInput
                  value={apptTime}
                  onChangeText={setApptTime}
                  placeholder="Time (e.g. 4:00 PM)"
                  placeholderTextColor="#8e8e93"
                  className="flex-1 bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm text-neutral-800"
                />
              </View>

              <TouchableOpacity
                onPress={handleAddAppt}
                className="w-full py-4.5 bg-[#007aff] rounded-2xl items-center justify-center active:opacity-90"
              >
                <Text className="text-white font-bold text-sm">Confirm Appointment</Text>
              </TouchableOpacity>
            </View>
          )}

          {subAction === 'add_context' && (
            <View className="space-y-4">
              <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wider pl-1">
                Caregiver Context Note
              </Text>
              <TextInput
                value={contextNote}
                onChangeText={setContextNote}
                placeholder="e.g. Checked Ramesh sir, took walk inside verandas today."
                placeholderTextColor="#8e8e93"
                multiline
                className="w-full bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm text-neutral-800 h-20"
              />
              <TouchableOpacity
                onPress={handleAddContext}
                className="w-full py-4.5 bg-[#007aff] rounded-2xl items-center justify-center active:opacity-90"
              >
                <Text className="text-white font-bold text-sm">Inject Context</Text>
              </TouchableOpacity>
            </View>
          )}

          {subAction === 'add_task' && (
            <View className="space-y-4">
              <Text className="text-xs font-semibold text-neutral-500 uppercase tracking-wider pl-1">
                Assign Care Task
              </Text>
              <TextInput
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="Task title (e.g. Schedule fasting lipid panel)"
                placeholderTextColor="#8e8e93"
                className="w-full bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm text-neutral-800"
              />
              <View className="flex-row gap-3">
                <TextInput
                  value={taskAssignee}
                  onChangeText={setTaskAssignee}
                  placeholder="Assignee (e.g. Suresh Kumar)"
                  placeholderTextColor="#8e8e93"
                  className="flex-1 bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl text-sm text-neutral-800"
                />
                <TouchableOpacity
                  onPress={() => setTaskPriority((prev) => (prev === 'high' ? 'medium' : 'high'))}
                  className={`px-4 py-3 rounded-xl border items-center justify-center ${
                    taskPriority === 'high'
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      taskPriority === 'high' ? 'text-rose-600' : 'text-neutral-600'
                    }`}
                  >
                    {taskPriority === 'high' ? '🔥 High Priority' : 'Normal Priority'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={handleAddTask}
                className="w-full py-4.5 bg-[#34c759] rounded-2xl items-center justify-center active:opacity-90"
              >
                <Text className="text-white font-bold text-sm">Assign Care Task</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
