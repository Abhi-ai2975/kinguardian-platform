import { useContext, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, RefreshControl } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { ParentBottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import { Calendar, Clock, MapPin, Plus, X, Sparkles, TrendingUp, CheckCircle2, Pill, ShieldCheck, WifiOff } from 'lucide-react-native';

export default function AppointmentsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [prepModalOpen, setPrepModalOpen] = useState(false);
  const [selectedPrepAppt, setSelectedPrepAppt] = useState<any>(null);
  const [isOfflineCopy, setIsOfflineCopy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [specialty, setSpecialty] = useState('Cardiology');
  const [doctor, setDoctor] = useState('Dr. Sharma');
  const [date, setDate] = useState('Tomorrow');
  const [time, setTime] = useState('10:30 AM');

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (context?.syncBackendData) {
        await context.syncBackendData();
      }
    } catch (e) {
      console.warn('Failed to refresh appointments:', e);
    } finally {
      setRefreshing(false);
    }
  };

  if (!context) return null;

  const apptList = context.appointments && context.appointments.length > 0
    ? context.appointments
    : [
        {
          id: 'appt-1',
          personId: 'dad',
          doctorName: 'Dr. Sharma',
          specialty: 'Cardiology',
          date: 'Tomorrow',
          time: '10:30 AM',
          location: 'Apollo Cardiology Center, Chennai',
          status: 'upcoming' as const
        }
      ];

  const handleCreateAppointment = async () => {
    if (!specialty.trim() || !doctor.trim()) {
      context.showToast('Please enter doctor name and specialty');
      return;
    }

    await context.handleAddAppointment({
      specialty: specialty.trim(),
      doctor: doctor.trim(),
      date: date.trim() || 'Tomorrow',
      time: time.trim() || '10:30 AM'
    });

    setModalOpen(false);
    context.showToast('Appointment scheduled and saved to database!');
  };

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f2f2f7]">
        {/* Header */}
        <View className="bg-white pt-6 pb-5 px-6 border-b border-neutral-100 flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold text-neutral-900 tracking-tight">
              My Appointments
            </Text>
            <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
              {context.currentUser?.name ? `${context.currentUser.name}'s Clinic Schedule` : "Clinic Schedule"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setModalOpen(true)}
            className="flex-row items-center gap-1.5 bg-[#007aff] px-3.5 py-2 rounded-xl shadow-xs"
          >
            <Plus size={14} color="#ffffff" strokeWidth={2.5} />
            <Text className="text-white text-xs font-bold">Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 p-5 space-y-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Clinical EHR Gateway Outage Simulator (APT-006 requirement) */}
          <View className="flex-row items-center justify-between px-1 pb-1">
            <Text className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
              Clinical EHR Gateway
            </Text>
            <TouchableOpacity
              onPress={() => {
                const next = !isOfflineCopy;
                setIsOfflineCopy(next);
                if (context) {
                  context.showToast(
                    next
                      ? 'Resilience Mode: Serving cached appointment schedule.'
                      : 'Live EHR gateway active.'
                  );
                }
              }}
              className={`px-3 py-1 rounded-full border flex-row items-center gap-1.5 active:scale-95 ${
                isOfflineCopy
                  ? 'bg-amber-100 border-amber-300'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full ${
                  isOfflineCopy ? 'bg-amber-600' : 'bg-emerald-500'
                }`}
              />
              <Text
                className={`text-[9px] font-black uppercase tracking-wider ${
                  isOfflineCopy ? 'text-amber-900' : 'text-emerald-700'
                }`}
              >
                {isOfflineCopy ? 'Offline Cache Active' : 'Live Gateway Active'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* OFFLINE COPY INDICATOR BANNER (APT-006 requirement) */}
          {isOfflineCopy && (
            <View className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-xs space-y-2 mb-1">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-full bg-amber-500 items-center justify-center">
                    <WifiOff size={13} color="#ffffff" />
                  </View>
                  <Text className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Offline Copy
                  </Text>
                </View>
                <View className="bg-amber-200/80 px-2 py-0.5 rounded-md">
                  <Text className="text-[9px] font-black text-amber-900 uppercase">Cached Data</Text>
                </View>
              </View>
              <Text className="text-xs text-amber-900 font-semibold leading-relaxed">
                External Apollo EHR service is currently slow or unreachable. Serving cached appointment schedule without interruption.
              </Text>
            </View>
          )}

          {apptList.map((appt) => (
            <View
              key={appt.id}
              className="bg-white rounded-2xl p-5 shadow-sm shadow-neutral-100 space-y-4 border-l-4 border-[#007aff]"
            >
              <View className="flex-row justify-between items-start">
                <View className="space-y-0.5">
                  <Text className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {appt.specialty}
                  </Text>
                  <Text className="text-xl font-bold text-neutral-900 tracking-tight">
                    {appt.doctorName}
                  </Text>
                </View>
                <View
                  className={`px-2.5 py-0.5 rounded-full border ${
                    isOfflineCopy
                      ? 'bg-amber-100 border-amber-300 flex-row items-center gap-1'
                      : 'bg-blue-50 border-blue-100/50'
                  }`}
                >
                  {isOfflineCopy && <WifiOff size={9} color="#b45309" />}
                  <Text
                    className={`text-[10px] font-bold uppercase ${
                      isOfflineCopy ? 'text-amber-800' : 'text-[#007aff]'
                    }`}
                  >
                    {isOfflineCopy ? 'Offline Copy' : (appt.status || 'Upcoming')}
                  </Text>
                </View>
              </View>

              <View className="space-y-3 pt-2 border-t border-neutral-100">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-rose-50 items-center justify-center shrink-0">
                    <Calendar size={14} color="#ff3b30" />
                  </View>
                  <View>
                    <Text className="text-[9px] font-bold text-neutral-400 uppercase">Date</Text>
                    <Text className="text-xs font-semibold text-neutral-800">{appt.date}</Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-[#eff6ff] items-center justify-center shrink-0">
                    <Clock size={14} color="#007aff" />
                  </View>
                  <View>
                    <Text className="text-[9px] font-bold text-neutral-400 uppercase">Time</Text>
                    <Text className="text-xs font-semibold text-neutral-800">{appt.time}</Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center shrink-0">
                    <MapPin size={14} color="#007aff" />
                  </View>
                  <View>
                    <Text className="text-[9px] font-bold text-neutral-400 uppercase">Clinic location</Text>
                    <Text className="text-xs font-semibold text-neutral-800 leading-snug">
                      {appt.location || 'Apollo Hospital Chennai'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setSelectedPrepAppt(appt);
                  setPrepModalOpen(true);
                }}
                className="w-full bg-[#007aff] py-3 rounded-xl items-center justify-center active:scale-95 shadow-xs mt-1"
              >
                <Text className="text-white font-bold text-xs">View preparation details</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View className="h-28" />
        </ScrollView>

        {/* Schedule Appointment Modal */}
        <Modal
          visible={modalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalOpen(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-[28px] p-6 pt-3 space-y-4 shadow-xl">
              <View className="w-10 h-1.5 bg-neutral-200 rounded-full self-center mb-1.5" />

              <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
                <View className="flex-row items-center gap-2">
                  <Calendar size={18} color="#007aff" />
                  <Text className="text-lg font-bold text-neutral-900">
                    Schedule Doctor Visit
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModalOpen(false)}
                  className="p-1.5 bg-neutral-100 rounded-full"
                >
                  <X size={16} color="#8e8e93" />
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                <View className="space-y-1">
                  <Text className="text-xs font-bold text-neutral-700">Specialty</Text>
                  <TextInput
                    value={specialty}
                    onChangeText={setSpecialty}
                    placeholder="e.g. Cardiology, Endocrinology"
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-xs font-bold text-neutral-700">Doctor Name</Text>
                  <TextInput
                    value={doctor}
                    onChangeText={setDoctor}
                    placeholder="e.g. Dr. Sharma"
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800"
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 space-y-1">
                    <Text className="text-xs font-bold text-neutral-700">Date</Text>
                    <TextInput
                      value={date}
                      onChangeText={setDate}
                      placeholder="e.g. Tomorrow"
                      className="bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800"
                    />
                  </View>
                  <View className="flex-1 space-y-1">
                    <Text className="text-xs font-bold text-neutral-700">Time</Text>
                    <TextInput
                      value={time}
                      onChangeText={setTime}
                      placeholder="e.g. 10:30 AM"
                      className="bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleCreateAppointment}
                  className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center active:scale-95 shadow-sm mt-2"
                >
                  <Text className="text-white font-bold text-sm">Save Appointment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Consultation Preparation Details Modal */}
        <Modal
          visible={prepModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setPrepModalOpen(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-[#fbfaf7] rounded-t-[32px] max-h-[85%] p-6 pt-3 shadow-2xl space-y-4">
              <View className="w-10 h-1.5 bg-neutral-300 rounded-full self-center mb-1" />

              <View className="flex-row justify-between items-center pb-2 border-b border-[#e2dfd9]">
                <View>
                  <Text className="text-base font-black text-slate-900">
                    Consultation Preparation Details
                  </Text>
                  <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {selectedPrepAppt?.doctorName || 'Dr. Sharma'} • {selectedPrepAppt?.specialty || 'Cardiology'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPrepModalOpen(false)}
                  className="p-1.5 bg-neutral-100 rounded-full"
                >
                  <X size={16} color="#8e8e93" />
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-4" showsVerticalScrollIndicator={false}>
                {/* Clinical EHR Gateway Outage Simulator inside modal (APT-006) */}
                <View className="flex-row items-center justify-between px-2.5 py-2 bg-white rounded-xl border border-neutral-200 shadow-xs">
                  <Text className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                    Clinical EHR Gateway
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const next = !isOfflineCopy;
                      setIsOfflineCopy(next);
                      if (context) {
                        context.showToast(
                          next
                            ? 'Resilience Mode: Serving cached appointment schedule.'
                            : 'Live EHR connection active.'
                        );
                      }
                    }}
                    className={`px-3 py-1 rounded-full border flex-row items-center gap-1.5 active:scale-95 ${
                      isOfflineCopy
                        ? 'bg-amber-100 border-amber-300'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    <View
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOfflineCopy ? 'bg-amber-600' : 'bg-emerald-500'
                      }`}
                    />
                    <Text
                      className={`text-[9px] font-black uppercase tracking-wider ${
                        isOfflineCopy ? 'text-amber-900' : 'text-emerald-700'
                      }`}
                    >
                      {isOfflineCopy ? 'Offline Cache Active' : 'Live Gateway Active'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* AI Suggestions for Consultation */}
                <View className="space-y-2.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Sparkles size={15} color="#2a14b4" fill="#2a14b4" />
                      <Text className="text-xs font-black uppercase text-[#2a14b4] tracking-wider">
                        AI Suggestions for Consultation
                      </Text>
                    </View>
                    {isOfflineCopy ? (
                      <View className="bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 flex-row items-center gap-1">
                        <WifiOff size={9} color="#b45309" />
                        <Text className="text-[9px] font-black text-amber-800 uppercase">Offline Copy</Text>
                      </View>
                    ) : (
                      <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Text className="text-[9px] font-black text-emerald-700 uppercase">Live EHR</Text>
                      </View>
                    )}
                  </View>

                  <View className="bg-indigo-50/70 border-2 border-[#2a14b4] rounded-2xl p-4 shadow-xs space-y-2">
                    <View className="flex-row items-start gap-2">
                      <View className="w-5 h-5 rounded-full bg-[#2a14b4] items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={11} color="#ffffff" />
                      </View>
                      <Text className="text-xs font-bold text-slate-900 flex-1 leading-relaxed">
                        "Blood pressure slightly elevated during Chennai heatwave; ask doctor about diuretic timing."
                      </Text>
                    </View>

                    <View className="bg-white rounded-xl p-3 border border-indigo-100 space-y-1.5 mt-1">
                      <View className="flex-row items-start gap-2">
                        <Text className="text-[#2a14b4] font-bold text-xs">•</Text>
                        <Text className="text-[11px] text-slate-700 flex-1 font-medium">
                          35% step activity reduction correlates with afternoon heat peaks (39°C) - evaluate veranda vs indoor exercise.
                        </Text>
                      </View>
                      <View className="flex-row items-start gap-2">
                        <Text className="text-[#2a14b4] font-bold text-xs">•</Text>
                        <Text className="text-[11px] text-slate-700 flex-1 font-medium">
                          Verify hydration and electrolyte benchmarks given consistent baseline weight (72.4 kg).
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 7-Day Vitals Card */}
                <View className="bg-white border border-[#e2dfd9] rounded-2xl p-4 shadow-xs space-y-3">
                  <Text className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Recent 7-Day Summary
                  </Text>
                  <View className="flex-row items-center justify-between border-b border-slate-50 pb-2">
                    <View className="flex-row items-center gap-2">
                      <TrendingUp size={14} color="#ba1a1a" />
                      <Text className="text-xs font-bold text-slate-800">BP 7-Day Avg</Text>
                    </View>
                    <Text className="text-xs font-black text-[#ba1a1a]">138/88 mmHg (Elevated)</Text>
                  </View>
                  <View className="flex-row items-center justify-between border-b border-slate-50 pb-2">
                    <View className="flex-row items-center gap-2">
                      <ShieldCheck size={14} color="#2a14b4" />
                      <Text className="text-xs font-bold text-slate-800">Med Adherence</Text>
                    </View>
                    <Text className="text-xs font-black text-slate-800">92%</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Pill size={14} color="#059669" />
                      <Text className="text-xs font-bold text-slate-800">Active Meds</Text>
                    </View>
                    <Text className="text-xs font-black text-[#059669]">Amlodipine 5mg, Atorvastatin 20mg</Text>
                  </View>
                </View>

                {/* Questions Checklist */}
                <View className="bg-white border border-[#e2dfd9] rounded-2xl p-4 shadow-xs space-y-2">
                  <Text className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Questions for Doctor
                  </Text>
                  <View className="flex-row items-start gap-2">
                    <CheckCircle2 size={14} color="#2a14b4" className="mt-0.5" />
                    <Text className="text-xs text-slate-700 flex-1">
                      {`Should we adjust ${context.currentUser?.name || "patient"}'s afternoon diuretic timing on days when heat peaks above 38°C?`}
                    </Text>
                  </View>
                  <View className="flex-row items-start gap-2">
                    <CheckCircle2 size={14} color="#2a14b4" className="mt-0.5" />
                    <Text className="text-xs text-slate-700 flex-1">
                      {`How does the recent 35% steps activity decline correlate with ${context.currentUser?.name ? `${context.currentUser.name}'s` : "their"} evening BP spikes?`}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setPrepModalOpen(false)}
                  className="w-full bg-[#007aff] py-3.5 rounded-xl items-center justify-center active:scale-95 shadow-sm mt-2"
                >
                  <Text className="text-white font-bold text-xs uppercase tracking-wider">Close Details</Text>
                </TouchableOpacity>

                <View className="h-6" />
              </ScrollView>
            </View>
          </View>
        </Modal>

        <ParentBottomNavBar
          activeTab="home"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(parent)');
            else if (tab === 'medicines') router.push('/(parent)/medicines');
            else if (tab === 'profile') router.push('/(parent)/profile');
            else if (tab === 'ask') router.push('/(parent)/ask');
          }}
        />
      </View>
      <SimulatorControls
        onTriggerNotification={context.handleTriggerSimulation}
        onRefreshData={context.handleWearableSyncRefresh}
        isSyncing={context.isSyncing}
        currentLoopStep={context.currentLoopStep}
        onAdvanceLoop={context.handleAdvanceLoop}
        onResetLoop={context.handleResetLoop}
      />
    </DeviceFrame>
  );
}
