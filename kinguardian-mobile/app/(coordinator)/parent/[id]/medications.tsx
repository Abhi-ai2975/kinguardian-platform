import { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Pill,
  CheckCircle2,
  Bell,
  Plus,
  X,
  User,
  FileCheck2,
  ShieldOff
} from 'lucide-react-native';
import { AppContext } from '../../../../src/store/AppContext';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';
import { realDataService } from '../../../../src/services/api-client/RealDataService';

export default function ParentMedicationsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('8:00 PM');
  const [permissionDenied, setPermissionDenied] = useState(false);

  if (!context) return null;

  // MED-007: medication-definition changes require medication-management permission.
  // Caregivers/observers (FAM-007 limited scope) are denied; enforcement stays on the
  // backend, this gate only prevents an unauthorized local record change and surfaces it.
  const currentUserRole = (context.currentUser?.role || '').toLowerCase();
  const canManageMedications = currentUserRole !== 'caregiver' && currentUserRole !== 'observer';

  const personId = typeof id === 'string' ? id : 'dad';
  const person =
    context.people.find((p) => p.id === personId || p.backendSubjectId === personId) ||
    context.people[0] ||
    {
      id: 'dad',
      name: 'Parent',
      relation: 'Father'
    };

  const primaryName = person.name || 'Parent';
  const caregiverName = context.familyMembers.find(
    (member) => member.role === 'caregiver' || member.relation?.toLowerCase().includes('caregiver')
  )?.name || 'Caregiver';

  const [fhirMedData, setFhirMedData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    realDataService.getSubjectMedications(personId).then((res) => {
      if (isMounted && res && Array.isArray(res.medications)) {
        setFhirMedData(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [personId]);

  // Filter medications for this parent
  const parentMeds = context.medications.filter(
    (m) =>
      m.personId === personId ||
      m.personId === 'dad' ||
      (personId === 'dad' && !m.personId)
  );

  const fallbackMeds = parentMeds.length > 0 ? parentMeds : context.medications;
  const activeMeds = fhirMedData?.medications && fhirMedData.medications.length > 0
    ? fhirMedData.medications
    : fallbackMeds;

  // Calculate adherence
  const takenCount = activeMeds.filter((m: any) => m.status === 'taken' || m.adherence === 'taken' || m.compliance_status === 'taken').length;
  const adherenceScore = activeMeds.length > 0 ? Math.round((takenCount / activeMeds.length) * 100) : 94;

  const handleTakeMed = (medId: string) => {
    // Optimistically flip the locally-rendered FHIR medication list so the card
    // reflects "Taken" immediately (the displayed list is fhirMedData, not context.medications).
    setFhirMedData((prev: any) => {
      if (!prev || !Array.isArray(prev.medications)) return prev;
      return {
        ...prev,
        medications: prev.medications.map((m: any) =>
          m.id === medId ? { ...m, status: 'taken', adherence: 'taken', compliance_status: 'taken' } : m
        )
      };
    });
    context.handleConfirmMedication(medId, 'Medication', true);
    context.showToast('Medication verified as taken and logged in adherence registry.');
  };

  const handleRemindMed = (medId: string) => {
    context.sendMedicationReminder(medId);
    context.showToast(`Medication reminder dispatched to ${primaryName} & designated caregiver ${caregiverName}.`);
  };

  const handleAddNewMed = () => {
    if (!newMedName.trim()) return;
    if (!canManageMedications) {
      // Denied: do NOT alter any clinical medication record.
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);
    context.handleAddMedication({
      name: newMedName.trim(),
      dosage: newDosage.trim() || '1 tablet',
      person: personId
    });
    setNewMedName('');
    setNewDosage('');
    setAddModalOpen(false);
    context.showToast(`Prescription "${newMedName}" added successfully.`);
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
                Medications & Adherence
              </Text>
              <Text className="text-[10px] text-slate-500 font-semibold">
                {primaryName} • FHIR MedicationRequest
              </Text>
            </View>
          </View>

          <TouchableOpacity
            testID="coordinator-medications-add-button"
            accessibilityLabel="Add medication"
            onPress={() => {
              setPermissionDenied(false);
              setAddModalOpen(true);
            }}
            className="flex-row items-center gap-1.5 bg-[#007aff] px-3 py-1.5 rounded-xl active:opacity-90 shadow-xs"
          >
            <Plus size={13} color="#ffffff" strokeWidth={3} />
            <Text className="text-white text-[11px] font-bold">Add Med</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          testID="coordinator-medications-list"
          className="flex-1 px-5 pt-4 space-y-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Adherence Score Card */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center">
                  <Pill size={16} color="#d97706" />
                </View>
                <Text className="text-sm font-black text-slate-900">7-Day Compliance Score</Text>
              </View>
              <View className="bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Text
                  testID="coordinator-medications-adherence-score"
                  accessibilityLabel={`${adherenceScore} percent compliant`}
                  className="text-[9px] font-black text-emerald-700"
                >
                  {adherenceScore}% COMPLIANT
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <View
                style={{ width: `${adherenceScore}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </View>

            <View className="flex-row justify-between items-center pt-1 border-t border-slate-100">
              <Text className="text-[10px] text-slate-500 font-semibold">
                {takenCount} of {activeMeds.length} daily doses confirmed
              </Text>
              <Text className="text-[10px] text-blue-600 font-bold">
                Designated Verifier: {caregiverName} (Caregiver)
              </Text>
            </View>
          </View>

          {/* Source Separation & FHIR Badge */}
          {fhirMedData?.verified_from_fhir && (
            <View className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <FileCheck2 size={16} color="#4338ca" />
                <View>
                  <Text className="text-xs font-black text-indigo-900">
                    FHIR MedicationRequest (HL7 R4)
                  </Text>
                  <Text className="text-[10px] text-indigo-700 font-semibold">
                    Adherence joined from KinGuardian DB • Zero duplication
                  </Text>
                </View>
              </View>
              <View className="bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                <Text className="text-[9px] font-black text-emerald-800">FHIR + DB</Text>
              </View>
            </View>
          )}

          {/* Active Prescriptions */}
          <View className="space-y-3 mb-10">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Active Prescriptions ({activeMeds.length})
            </Text>

            {activeMeds.map((med: any) => {
              const isTaken = med.status === 'taken' || med.adherence === 'taken' || med.compliance_status === 'taken';

              return (
                <View
                  key={med.id}
                  testID={`coordinator-medications-item-${med.id}`}
                  accessibilityLabel={`${med.name}, ${isTaken ? 'taken' : 'scheduled'}`}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          {med.dose || med.dosage || '1 dose'}
                        </Text>
                        <Text className="text-[10px] text-slate-400 font-semibold">
                          {med.scheduledTime || med.timing || med.schedule || 'Scheduled'}
                        </Text>
                        {med.verified_from_fhir && (
                          <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                            <CheckCircle2 size={9} color="#059669" />
                            <Text className="text-[8px] font-black text-emerald-700">FHIR Definition</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-base font-black text-slate-900 leading-snug">
                        {med.name}
                      </Text>
                      {med.definition ? (
                        <Text className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                          {med.definition}
                        </Text>
                      ) : (
                        <Text className="text-xs text-slate-500 font-medium mt-0.5">
                          {med.frequency || 'Once daily with meals'}
                        </Text>
                      )}
                    </View>

                    <View
                      testID={`coordinator-medications-status-${med.id}`}
                      accessibilityLabel={isTaken ? 'Taken' : (med.adherence || 'Scheduled')}
                      className={`px-2.5 py-1 rounded-full border ${
                        isTaken
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-black uppercase ${
                          isTaken ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {isTaken ? 'Taken' : (med.adherence || 'Scheduled')}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <User size={11} color="#64748b" />
                      <Text className="text-[10px] text-slate-500 font-semibold">
                        {med.prescriber || 'Dr. Sharma (Cardiology)'}
                      </Text>
                    </View>
                    <Text className="text-[10px] font-black text-blue-700">
                      {med.adherence_rate || med.adherencePercent || '94%'} adherence
                    </Text>
                  </View>

                  {/* Actions */}
                  <View className="flex-row gap-2 pt-1">
                    {!isTaken ? (
                      <TouchableOpacity
                        testID={`coordinator-medications-mark-taken-${med.id}`}
                        accessibilityLabel={`Mark ${med.name} as taken`}
                        onPress={() => handleTakeMed(med.id)}
                        className="flex-1 bg-emerald-600 py-2.5 rounded-xl items-center justify-center active:scale-95 flex-row gap-1.5"
                      >
                        <CheckCircle2 size={13} color="#ffffff" />
                        <Text className="text-white text-[11px] font-bold">Mark Taken</Text>
                      </TouchableOpacity>
                    ) : (
                      <View
                        testID={`coordinator-medications-confirmed-${med.id}`}
                        accessibilityLabel={`${med.name} confirmed taken`}
                        className="flex-1 bg-emerald-50 border border-emerald-200 py-2.5 rounded-xl items-center justify-center flex-row gap-1.5"
                      >
                        <CheckCircle2 size={13} color="#059669" />
                        <Text className="text-emerald-700 text-[11px] font-bold">Confirmed Taken</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      testID={`coordinator-medications-remind-${med.id}`}
                      accessibilityLabel={`Send medication reminder for ${med.name}`}
                      onPress={() => handleRemindMed(med.id)}
                      className="bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl items-center justify-center active:bg-slate-200 flex-row gap-1.5"
                    >
                      <Bell size={13} color="#007aff" />
                      <Text className="text-slate-700 text-[11px] font-bold">Remind</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Add Medication Modal */}
        <Modal visible={addModalOpen} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
            <View
              testID="coordinator-medications-add-modal"
              className="bg-white rounded-t-3xl p-6 space-y-4 shadow-2xl"
            >
              <View className="flex-row justify-between items-center border-b border-slate-100 pb-3">
                <Text className="text-base font-black text-slate-900">Add Medication</Text>
                <TouchableOpacity
                  testID="coordinator-medications-add-close"
                  accessibilityLabel="Close add medication"
                  onPress={() => {
                    setPermissionDenied(false);
                    setAddModalOpen(false);
                  }}
                  className="p-1 bg-slate-100 rounded-full"
                >
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-1">Medication Name</Text>
                  <TextInput
                    testID="coordinator-medications-add-name-input"
                    accessibilityLabel="Medication name"
                    value={newMedName}
                    onChangeText={setNewMedName}
                    placeholder="e.g. Telmisartan"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-1">Dosage & Strength</Text>
                  <TextInput
                    testID="coordinator-medications-add-dosage-input"
                    accessibilityLabel="Dosage and strength"
                    value={newDosage}
                    onChangeText={setNewDosage}
                    placeholder="e.g. 40mg"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800"
                  />
                </View>

                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-1">Scheduled Time</Text>
                  <TextInput
                    testID="coordinator-medications-add-time-input"
                    accessibilityLabel="Scheduled time"
                    value={newTime}
                    onChangeText={setNewTime}
                    placeholder="e.g. 8:00 AM"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800"
                  />
                </View>

                {/* MED-007: permission-denied notice — no clinical record was changed */}
                {permissionDenied && (
                  <View
                    testID="med-permission-denied"
                    className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex-row items-start gap-2.5"
                  >
                    <ShieldOff size={16} color="#e11d48" className="mt-0.5" />
                    <View className="flex-1">
                      <Text testID="med-permission-denied-title" className="text-xs font-bold text-rose-900">
                        Access denied — medication management permission required
                      </Text>
                      <Text className="text-[11px] text-rose-800 font-medium leading-relaxed mt-0.5">
                        Your role cannot alter {primaryName}'s clinical medication definitions. No record was changed. This action is authorized by the care coordinator and enforced on the server.
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  testID="coordinator-medications-add-save"
                  accessibilityLabel="Save prescription"
                  onPress={handleAddNewMed}
                  className="bg-[#007aff] py-3.5 rounded-2xl items-center justify-center active:opacity-90 shadow-sm mt-2"
                >
                  <Text className="text-white text-xs font-bold">Save Prescription</Text>
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
