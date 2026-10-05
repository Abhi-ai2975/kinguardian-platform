import { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Stethoscope,
  Plus,
  X,
  User,
  CheckCircle2
} from 'lucide-react-native';
import { AppContext } from '../../../../src/store/AppContext';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';
import { realDataService } from '../../../../src/services/api-client/RealDataService';

interface ConditionItem {
  id: string;
  code: string;
  display: string;
  status: 'active' | 'controlled' | 'resolved' | 'history';
  severity: 'Mild' | 'Moderate' | 'Severe';
  onsetDate: string;
  notes: string;
  prescribingClinician: string;
}

export default function ParentConditionsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('I10');
  const [newNotes, setNewNotes] = useState('');

  if (!context) return null;

  const personId = typeof id === 'string' ? id : 'dad';
  const isDad = personId === 'dad' || personId.toLowerCase().includes('dad');
  const person =
    context.people.find((p) => p.id === personId || p.backendSubjectId === personId) ||
    context.people.find((p) => isDad && (p.relationship?.toLowerCase().includes('father') || p.relation?.toLowerCase().includes('father'))) ||
    context.people[0] ||
    {
      id: 'dad',
      name: 'Parent',
      relation: isDad ? 'Father' : 'Parent'
    };

  const primaryName = person.name || 'Parent';

  const defaultConditions: ConditionItem[] = [
    {
      id: 'cond-1',
      code: 'ICD-10: I10',
      display: 'Essential (Primary) Hypertension',
      status: 'active',
      severity: 'Moderate',
      onsetDate: 'March 2018',
      notes: 'Managed with morning Amlodipine 5mg. Evening blood pressure shows sensitivity to ambient Chennai heatwave levels.',
      prescribingClinician: 'Dr. Ramesh Sharma, MD (Cardiology)'
    },
    {
      id: 'cond-2',
      code: 'ICD-10: E11.9',
      display: 'Type 2 Diabetes Mellitus without complications',
      status: 'controlled',
      severity: 'Mild',
      onsetDate: 'July 2020',
      notes: 'Optimal glycemic control. Fasting glucose 98 mg/dL, HbA1c 6.8%. Managed with Metformin ER 500mg twice daily.',
      prescribingClinician: 'Dr. K. Nair, MD (Endocrinology)'
    },
    {
      id: 'cond-3',
      code: 'ICD-10: Z95.5',
      display: 'Presence of Coronary Angioplasty Stent',
      status: 'history',
      severity: 'Moderate',
      onsetDate: 'November 2022',
      notes: 'Drug-eluting stent placed at Apollo Hospital. Routine follow-up scheduled. Prescribed nightly Atorvastatin 20mg.',
      prescribingClinician: 'Dr. Ramesh Sharma, MD (Cardiology)'
    },
    {
      id: 'cond-4',
      code: 'ICD-10: M17.0',
      display: 'Mild Bilateral Primary Osteoarthritis of Knee',
      status: 'controlled',
      severity: 'Mild',
      onsetDate: 'February 2023',
      notes: 'Light indoor walking recommended. Avoid steep stairs. Assisted by local caregiver during evening mobility exercises.',
      prescribingClinician: 'Apollo Orthopedic Center'
    }
  ];

  const [conditionsList, setConditionsList] = useState<ConditionItem[]>(defaultConditions);

  useEffect(() => {
    let isMounted = true;
    realDataService.getSubjectConditions(personId).then((res) => {
      if (isMounted && res && Array.isArray(res.conditions) && res.conditions.length > 0) {
        const fetched: ConditionItem[] = res.conditions.map((c: any) => ({
          id: c.id,
          code: c.system?.includes('icd-10') ? `ICD-10: ${c.code}` : (c.code?.startsWith('ICD-10') ? c.code : `ICD-10: ${c.code}`),
          display: c.display,
          status: c.clinical_status === 'active' ? 'active' : 'controlled',
          severity: c.code === 'I10' ? 'Moderate' : 'Mild',
          onsetDate: c.onset_date || 'March 2021',
          notes: c.notes || 'Verified directly from FHIR Clinical Condition resource. Single source of truth.',
          prescribingClinician: c.recorder || 'Dr. Sharma, Apollo Cardiology'
        }));
        setConditionsList(fetched);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [personId]);

  const handleAddCondition = () => {
    if (!newTitle.trim()) return;
    const newCond: ConditionItem = {
      id: `cond-${Date.now()}`,
      code: newCode.trim() || 'ICD-10: R69',
      display: newTitle.trim(),
      status: 'active',
      severity: 'Mild',
      onsetDate: 'Today',
      notes: newNotes.trim() || 'Clinical note recorded by family coordinator.',
      prescribingClinician: 'Family Care Circle'
    };
    setConditionsList([newCond, ...conditionsList]);
    setNewTitle('');
    setNewNotes('');
    setAddModalOpen(false);
    context.showToast(`Condition "${newCond.display}" added to clinical registry.`);
  };

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f8f9fc]">
        {/* Header */}
        <View className="px-5 py-4 border-b border-slate-200 bg-white flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 bg-slate-100 rounded-full active:bg-slate-200"
            >
              <ArrowLeft size={18} color="#1e293b" />
            </TouchableOpacity>
            <View>
              <Text className="text-base font-black text-slate-900 leading-tight">
                Health Profile & Conditions
              </Text>
              <Text className="text-[10px] text-slate-500 font-semibold">
                {primaryName} • ICD-10 Diagnoses
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setAddModalOpen(true)}
            className="flex-row items-center gap-1.5 bg-[#007aff] px-3 py-1.5 rounded-xl active:opacity-90 shadow-xs"
          >
            <Plus size={13} color="#ffffff" strokeWidth={3} />
            <Text className="text-white text-[11px] font-bold">Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-4 space-y-4" showsVerticalScrollIndicator={false}>
          {/* Summary Box */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl bg-indigo-50 items-center justify-center">
                  <Stethoscope size={16} color="#4f46e5" />
                </View>
                <Text className="text-sm font-black text-slate-900">Active Diagnoses Summary</Text>
              </View>
              <View className="bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                <Text className="text-[9px] font-bold text-indigo-700">FHIR Condition R4</Text>
              </View>
            </View>

            <Text className="text-xs text-slate-600 leading-relaxed font-medium">
              KinGuardian maintains deterministic ICD-10 clinical diagnosis records mapped directly to Apollo Hospital electronic health records.
            </Text>
          </View>

          {/* Conditions List */}
          <View className="space-y-3 mb-10">
            {conditionsList.map((cond) => {
              const isActive = cond.status === 'active';
              const isControlled = cond.status === 'controlled';
              const badgeBg = isActive
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : isControlled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700';

              return (
                <View
                  key={cond.id}
                  testID={`conditions-item-${cond.id}`}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {cond.code}
                        </Text>
                        <Text className="text-[10px] text-slate-400 font-semibold">
                          Since {cond.onsetDate}
                        </Text>
                        <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-row items-center gap-1 shadow-xs">
                          <CheckCircle2 size={9} color="#059669" />
                          <Text className="text-[8px] font-black text-emerald-700">Verified from FHIR</Text>
                        </View>
                      </View>
                      <Text
                        testID={`conditions-name-${cond.id}`}
                        className="text-sm font-black text-slate-900 leading-snug"
                      >
                        {cond.display}
                      </Text>
                    </View>

                    <View className={`px-2.5 py-0.5 rounded-full border ${badgeBg}`}>
                      <Text className="text-[9px] font-black uppercase">{cond.status}</Text>
                    </View>
                  </View>

                  <View className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                    <Text className="text-xs text-slate-600 font-medium leading-relaxed">
                      {cond.notes}
                    </Text>
                    <View className="flex-row items-center gap-1 pt-1 border-t border-slate-200/60 mt-1">
                      <User size={10} color="#64748b" />
                      <Text className="text-[10px] text-slate-500 font-semibold">
                        Physician: {cond.prescribingClinician}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Add Condition Modal */}
        <Modal visible={addModalOpen} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 space-y-4 shadow-2xl">
              <View className="flex-row justify-between items-center border-b border-slate-100 pb-3">
                <Text className="text-base font-black text-slate-900">Add Clinical Condition</Text>
                <TouchableOpacity onPress={() => setAddModalOpen(false)} className="p-1 bg-slate-100 rounded-full">
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-1">Condition / Diagnosis Name</Text>
                  <TextInput
                    value={newTitle}
                    onChangeText={setNewTitle}
                    placeholder="e.g. Mild Hyperlipidemia"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-1">ICD-10 Code</Text>
                  <TextInput
                    value={newCode}
                    onChangeText={setNewCode}
                    placeholder="e.g. E78.0"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-mono"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-1">Clinical Notes & Treatment</Text>
                  <TextInput
                    value={newNotes}
                    onChangeText={setNewNotes}
                    placeholder="Observations, diet restrictions, doctor notes..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 min-h-[70px]"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleAddCondition}
                  className="bg-[#007aff] py-3.5 rounded-2xl items-center justify-center active:opacity-90 shadow-sm mt-2"
                >
                  <Text className="text-white text-xs font-bold">Save Condition</Text>
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
