import { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, TextInput } from 'react-native';
import { AppContext } from '../../src/store/AppContext';
import { BottomNavBar } from '../../src/components/Navigation';
import { DeviceFrame } from '../../src/components/DeviceFrame';
import { SimulatorControls } from '../../src/components/SimulatorControls';
import { useRouter } from 'expo-router';
import { ChevronRight, Clock, Pill, Calendar, Plus, X, UserPlus } from 'lucide-react-native';

export default function CoordinatorParentsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('ramesh@example.com');
  const [newRelationship, setNewRelationship] = useState('Father');
  const [newCity, setNewCity] = useState('Chennai');
  const [newAge, setNewAge] = useState('68');

  if (!context) return null;

  const handleCreateParent = async () => {
    if (!newName.trim()) return;
    if (newEmail.trim()) {
      await context.inviteMember({
        name: newName.trim(),
        email: newEmail.trim(),
        role: 'parent',
        relationship: newRelationship,
        city: newCity.trim() || 'Chennai',
        age: parseInt(newAge, 10) || 65
      });
    } else {
      await context.addParent({
        name: newName.trim(),
        relationship: newRelationship,
        city: newCity.trim() || 'Chennai',
        age: parseInt(newAge, 10) || 65
      });
    }
    setNewName('');
    setAddModalOpen(false);
  };

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f2f2f7]">
        {/* Header */}
        <View className="px-6 py-6 border-b border-neutral-100 bg-white flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Connected Profiles
            </Text>
            <Text className="text-2xl font-bold text-neutral-900 tracking-tight mt-0.5">Parents</Text>
          </View>

          <TouchableOpacity
            onPress={() => setAddModalOpen(true)}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5 bg-gradient-to-r from-[#007aff] to-[#0055ff] px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/30"
          >
            <Plus size={15} color="#ffffff" strokeWidth={2.5} />
            <Text className="text-white text-xs font-bold">Add Parent</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-4 space-y-4">
          {context.people.map((p) => {
            const isActive = context.currentPersonId === p.id || context.currentPersonId === p.backendSubjectId;
            const isDad = p.id === 'dad' || p.relation?.toLowerCase() === 'father' || p.relationship?.toLowerCase() === 'father';
            const relationDisplay = p.relationship || p.relation || (isDad ? 'Father' : 'Mother');
            const locationDisplay = p.location || p.city || 'Chennai, India';

            // Vitals check for alert status
            const bpSystolic = parseInt(context.currentBP.split('/')[0] || '120', 10);
            const isDadSpiked = isDad && bpSystolic >= 140;
            const isUnwell = p.wellbeingStatus === 'attention' || p.currentStatus?.toLowerCase().includes('unwell') || isDadSpiked;
            const statusText = isUnwell ? 'Needs attention' : 'Doing well';
            const statusColor = isUnwell ? 'text-[#ff3b30] bg-red-50' : 'text-[#34c759] bg-emerald-50';

            // Meds check
            const personMeds = (context.medications || []).filter(
              (m) => m.personId === p.id || m.personId === p.backendSubjectId || (isDad && m.personId === 'dad')
            );
            const pendingCount = personMeds.filter((m) => m.status !== 'taken').length;
            const medStatus = personMeds.length === 0 ? 'All Taken' : (pendingCount === 0 ? 'All Taken' : `${pendingCount} pending`);

            // Appointment check
            const personAppt = (context.appointments || []).find(
              (a) => a.personId === p.id || a.personId === p.backendSubjectId || (isDad && a.personId === 'dad')
            );
            const nextAppt = personAppt
              ? `${personAppt.specialty}, ${personAppt.date} ${personAppt.time}`
              : 'No upcoming visits';

            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => {
                  context.setCurrentPersonId(p.id);
                  context.showToast(`Switched active focus to ${p.name}`);
                  router.push('/(coordinator)');
                }}
                activeOpacity={0.8}
                className={`bg-white rounded-3xl p-5 border-2 ${
                  isActive ? 'border-[#007aff] shadow-lg shadow-blue-100/50' : 'border-neutral-200 shadow-md'
                } flex-row items-start gap-4`}
              >
                <View className="relative">
                  <Image
                    source={{
                      uri:
                        p.avatarUrl ||
                        (isDad
                          ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
                          : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2')
                    }}
                    className="w-14 h-14 rounded-full border-2 border-white shadow-md"
                  />
                  <View
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                      isUnwell ? 'bg-[#ff3b30]' : 'bg-[#34c759]'
                    }`}
                  />
                </View>

                <View className="flex-1 space-y-2">
                  <View className="flex-row items-center justify-between flex-wrap gap-1">
                    <View className="space-y-0.5">
                      <Text className="text-base font-bold text-neutral-900 leading-none">
                        {p.name}
                      </Text>
                      <Text className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                        {p.age} • {relationDisplay} • {locationDisplay}
                      </Text>
                    </View>

                    <View className={`px-2 py-0.5 rounded-full ${statusColor}`}>
                      <Text className="text-[8px] font-bold uppercase">{statusText}</Text>
                    </View>
                  </View>

                  {/* Vitals detail list stubs */}
                  <View className="space-y-1.5 pt-2 border-t border-neutral-100">
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={11} color="#8e8e93" />
                      <Text className="text-[10px] text-neutral-500 font-semibold">
                        Last check-in: {p.lastCheckIn || 'Recently'}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      <Pill size={11} color="#8e8e93" />
                      <Text className="text-[10px] text-neutral-500 font-semibold">
                        Medication status:{' '}
                        <Text
                          className={
                            medStatus.includes('Taken')
                              ? 'text-[#34c759] font-bold'
                              : 'text-[#ff9500] font-bold'
                          }
                        >
                          {medStatus}
                        </Text>
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      <Calendar size={11} color="#8e8e93" />
                      <Text className="text-[10px] text-neutral-500 font-semibold">
                        Next: {nextAppt}
                      </Text>
                    </View>
                  </View>

                  {/* FHIR Clinical Quick Links */}
                  <View className="flex-row flex-wrap gap-2 pt-3 border-t border-neutral-100">
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        router.push(`/(coordinator)/parent/${p.id}/profile` as any);
                      }}
                      className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl active:scale-95 shadow-sm"
                    >
                      <Text className="text-[10px] font-bold text-blue-700">FHIR Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        router.push(`/(coordinator)/parent/${p.id}/vitals` as any);
                      }}
                      className="bg-gradient-to-r from-rose-50 to-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl active:scale-95 shadow-sm"
                    >
                      <Text className="text-[10px] font-bold text-rose-700">Vitals</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        router.push(`/(coordinator)/parent/${p.id}/conditions` as any);
                      }}
                      className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl active:scale-95 shadow-sm"
                    >
                      <Text className="text-[10px] font-bold text-indigo-700">Conditions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        router.push(`/(coordinator)/parent/${p.id}/medications` as any);
                      }}
                      className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl active:scale-95 shadow-sm"
                    >
                      <Text className="text-[10px] font-bold text-amber-700">Meds</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        router.push(`/(coordinator)/parent/${p.id}/labs` as any);
                      }}
                      className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl active:scale-95 shadow-sm"
                    >
                      <Text className="text-[10px] font-bold text-emerald-700">Labs</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="self-center pl-1">
                  <ChevronRight size={16} color={isActive ? '#007aff' : '#8e8e93'} />
                </View>
              </TouchableOpacity>
            );
          })}

          <View className="h-24" />
        </ScrollView>

        <BottomNavBar
          activeTab="parents"
          currentScreen="health_dashboard"
          onTabChange={(tab) => {
            if (tab === 'home') router.push('/(coordinator)');
            else if (tab === 'parents') router.push('/(coordinator)/parents');
            else if (tab === 'ask') context.setAskAIOpen(true);
            else if (tab === 'care') router.push('/(coordinator)/care');
            else if (tab === 'profile') router.push('/(coordinator)/profile');
          }}
          onOpenQuickActions={() => context.setQuickActionsOpen(true)}
          onOpenAskAI={() => context.setAskAIOpen(true)}
        />

        {/* Add Parent Modal */}
        <Modal
          visible={addModalOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setAddModalOpen(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/60 px-6">
            <View className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-neutral-100 space-y-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <UserPlus size={18} color="#007aff" />
                  <Text className="text-base font-bold text-neutral-900">Add Parent Profile</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAddModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-neutral-100 items-center justify-center"
                >
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Full Name
                  </Text>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="e.g. Full Name"
                    placeholderTextColor="#8e8e93"
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:border-[#007aff]"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Parent Email (For Account & Telemetry Access)
                  </Text>
                  <TextInput
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="e.g. ramesh@example.com"
                    placeholderTextColor="#8e8e93"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:border-[#007aff]"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Relationship
                  </Text>
                  <View className="flex-row gap-2">
                    {['Father', 'Mother', 'Grandparent'].map((rel) => (
                      <TouchableOpacity
                        key={rel}
                        onPress={() => setNewRelationship(rel)}
                        className={`flex-1 py-2 rounded-xl items-center border ${
                          newRelationship === rel
                            ? 'bg-[#eff6ff] border-[#007aff]'
                            : 'bg-neutral-50 border-neutral-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            newRelationship === rel ? 'text-[#007aff]' : 'text-neutral-600'
                          }`}
                        >
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 space-y-1">
                    <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Age
                    </Text>
                    <TextInput
                      value={newAge}
                      onChangeText={setNewAge}
                      placeholder="68"
                      keyboardType="numeric"
                      placeholderTextColor="#8e8e93"
                      className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:border-[#007aff]"
                    />
                  </View>

                  <View className="flex-1 space-y-1">
                    <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      City (India)
                    </Text>
                    <TextInput
                      value={newCity}
                      onChangeText={setNewCity}
                      placeholder="Chennai"
                      placeholderTextColor="#8e8e93"
                      className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:border-[#007aff]"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleCreateParent}
                  className="w-full bg-[#007aff] py-3 rounded-xl items-center justify-center mt-2 active:scale-95 shadow-sm"
                >
                  <Text className="text-white font-bold text-xs">Save & Connect to Database</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
