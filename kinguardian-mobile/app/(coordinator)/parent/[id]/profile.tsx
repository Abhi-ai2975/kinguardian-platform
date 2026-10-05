import { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  CheckCircle2,
  MapPin,
  FileCode,
  Building,
  HeartPulse
} from 'lucide-react-native';
import { AppContext } from '../../../../src/store/AppContext';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';
import { realDataService } from '../../../../src/services/api-client/RealDataService';

export default function ParentFhirProfileRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [showRawFhir, setShowRawFhir] = useState(false);
  const [backendProfile, setBackendProfile] = useState<any>(null);

  if (!context) return null;

  const personId = typeof id === 'string' ? id : 'dad';
  const person =
    context.people.find((p) => p.id === personId || p.backendSubjectId === personId) ||
    context.familyMembers.find((p) => p.id === personId || p.backendSubjectId === personId) ||
    context.people[0] ||
    {
      id: 'dad',
      name: 'Parent',
      relation: 'Father',
      relationship: 'Father',
      age: 68,
      city: 'Chennai',
      country: 'India',
      location: 'Chennai, India'
    };

  const isDad =
    person.relation?.toLowerCase().includes('father') ||
    person.relationship?.toLowerCase().includes('father');

  const primaryName = person.name || 'Parent';

  // Resolve caregiver identity from the family data.
  const caregiver =
    context.familyMembers.find(
      (m) => m.role === 'caregiver' || m.relationship?.toLowerCase().includes('caregiver') || m.relation?.toLowerCase().includes('caregiver')
    );

  // Coordinator details
  const coordinatorName = context.currentUser?.name || context.coordinatorName || 'Coordinator';

  useEffect(() => {
    let isMounted = true;
    realDataService.getParentSummary(personId).then((res) => {
      if (isMounted && res && !res.error) {
        setBackendProfile(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [personId]);

  const fhirIdentifier = (() => {
    const raw = backendProfile?.external_patient_ref;
    if (!raw) return 'Not provided';
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed?.fhir_identifier || 'Not provided';
    } catch {
      return typeof raw === 'string' ? raw : 'Not provided';
    }
  })();

  const fhirPatientResource = {
    resourceType: 'Patient',
    id: backendProfile?.fhir_patient_id?.replace('Patient/', '') || person.backendSubjectId || person.id,
    identifier: [
      {
        system: 'http://hospital.kinguardian.com/mrn',
        value: fhirIdentifier
      }
    ],
    active: true,
    name: [
      {
        use: 'official',
        family: (backendProfile?.demographics?.name || primaryName).split(' ').slice(1).join(' '),
        given: [(backendProfile?.demographics?.name || primaryName).split(' ')[0] || 'Parent']
      }
    ],
    gender: 'male',
    birthDate: '1958-04-12',
    address: [
      {
        use: 'home',
        city: backendProfile?.demographics?.location || person.city || 'Chennai',
        state: 'Tamil Nadu',
        country: 'India'
      }
    ],
    telecom: [
      { system: 'phone', value: '+91 98765 12345', use: 'home' }
    ],
    managingOrganization: {
      display: 'Apollo Hospitals Chennai (Cardiology Dept)'
    }
  };

  return (
    <DeviceFrame>
      <View className="flex-1 relative bg-[#f8f9fc]">
        {/* Header Bar */}
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
                FHIR Patient Profile
              </Text>
              <Text className="text-[10px] text-slate-500 font-semibold">
                Verified Clinical Identity & Grants
              </Text>
            </View>
          </View>

          <View className="bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 flex-row items-center gap-1 shadow-xs">
            <CheckCircle2 size={11} color="#059669" />
            <Text className="text-[9px] font-black text-emerald-700 uppercase">
              {backendProfile?.fhir_identity_resolved ? 'FHIR Identity Resolved' : 'HL7 R4 Validated'}
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-5 pt-4 space-y-4" showsVerticalScrollIndicator={false}>
          {/* Patient Identity Banner */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <View className="flex-row items-center gap-4">
              <View className="relative">
                <Image
                  source={{
                    uri:
                      person.avatarUrl ||
                      (isDad
                        ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
                        : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2')
                  }}
                  className="w-16 h-16 rounded-full border-2 border-blue-200"
                />
                <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 border-2 border-white">
                  <User size={10} color="#ffffff" />
                </View>
              </View>

              <View className="flex-1 space-y-0.5">
                <Text className="text-xl font-black text-slate-900">
                  {backendProfile?.demographics?.name || primaryName}
                </Text>
                <Text className="text-xs text-slate-500 font-medium">
                  {backendProfile?.demographics?.age || person.age || 68} yrs • Male • {backendProfile?.demographics?.relationship || person.relationship || 'Father'}
                </Text>
                <View className="flex-row items-center gap-1.5 pt-1">
                  <MapPin size={11} color="#64748b" />
                  <Text className="text-[11px] text-slate-600 font-semibold">
                    {backendProfile?.demographics?.location || person.city || 'Chennai'}, India ({backendProfile?.preferred_timezone || 'Asia/Kolkata'})
                  </Text>
                </View>
              </View>
            </View>

            {/* Medical Record IDs & Care Subject Link */}
            <View className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-[10px] font-bold text-slate-400 uppercase">FHIR Patient ID</Text>
                <Text className="font-mono text-xs font-black text-blue-700">
                  {backendProfile?.fhir_patient_id || `Patient/${person.backendSubjectId || person.id}`}
                </Text>
              </View>
              <View className="flex-row justify-between items-center pt-1 border-t border-slate-200/60">
                <Text className="text-[10px] font-bold text-slate-400 uppercase">Care Subject Link</Text>
                <Text className="font-mono text-[11px] font-bold text-slate-700">
                  {backendProfile?.care_subject_link || `/api/v1/subjects/${person.backendSubjectId || personId}`}
                </Text>
              </View>
              <View className="flex-row justify-between items-center pt-1 border-t border-slate-200/60">
                <Text className="text-[10px] font-bold text-slate-400 uppercase">Hospital MRN</Text>
                <Text className="font-mono text-xs font-black text-slate-800">
                  {fhirIdentifier}
                </Text>
              </View>
              <View className="flex-row justify-between items-center pt-1 border-t border-slate-200/60">
                <Text className="text-[10px] font-bold text-slate-400 uppercase">Managing Hospital</Text>
                <Text className="text-xs font-bold text-slate-700">Apollo Hospitals Chennai</Text>
              </View>
            </View>
          </View>

          {/* Care Team Circle */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Assigned Care Team
              </Text>
              <Text className="text-[10px] font-bold text-blue-600">3 Authorized Contacts</Text>
            </View>

            {/* Signed-in coordinator */}
            <View className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-blue-600 items-center justify-center">
                  <User size={16} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-900">{coordinatorName} (You)</Text>
                  <Text className="text-[10px] text-blue-700 font-semibold">
                    Primary Coordinator • Family Admin
                  </Text>
                </View>
              </View>
              <View className="bg-blue-100 px-2.5 py-0.5 rounded-full">
                <Text className="text-[9px] font-black text-blue-800">FULL ACCESS</Text>
              </View>
            </View>

            {/* Assigned caregiver */}
            {caregiver && <TouchableOpacity
              onPress={() => router.push(`/(coordinator)/caregiver/${caregiver.id}` as any)}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex-row items-center justify-between active:bg-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center">
                  <HeartPulse size={16} color="#059669" />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-900">{caregiver.name}</Text>
                  <Text className="text-[10px] text-slate-500 font-semibold">
                    Designated Local Caregiver{caregiver.city ? ` • ${caregiver.city}` : ''}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <Text className="text-[9px] font-black text-emerald-700">TASK ACCESS</Text>
                </View>
              </View>
            </TouchableOpacity>}

            {/* Doctor: Dr. Sharma */}
            <View className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center">
                  <Building size={16} color="#7c3aed" />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-900">Dr. Sharma, MD</Text>
                  <Text className="text-[10px] text-slate-500 font-semibold">
                    Attending Cardiologist • Apollo Greams Rd
                  </Text>
                </View>
              </View>
              <View className="bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                <Text className="text-[9px] font-black text-purple-700">CLINICIAN</Text>
              </View>
            </View>
          </View>

          {/* Consent & Data Governance */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Consent & Data Grants
              </Text>
              <View className="bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Text className="text-[9px] font-black text-emerald-700">ACTIVE CONSENT</Text>
              </View>
            </View>

            <Text className="text-xs text-slate-600 leading-relaxed font-medium">
              Consent recorded on 2026-01-10 with patient digital authorization. Grants allow continuous sensor telemetry ingestion (Google Fit), vital observations, and FHIR MedicationRequest verification.
            </Text>

            <View className="flex-row gap-2 pt-1 flex-wrap">
              {['Vitals Access', 'Medication Schedule', 'Lab Reports', 'Care Tasks'].map((g, gIdx) => (
                <View key={gIdx} className="bg-slate-100 px-2.5 py-1 rounded-xl flex-row items-center gap-1">
                  <CheckCircle2 size={11} color="#059669" />
                  <Text className="text-[10px] font-bold text-slate-700">{g}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* FHIR JSON Inspector Toggle */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 mb-10">
            <TouchableOpacity
              onPress={() => setShowRawFhir(!showRawFhir)}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2">
                <FileCode size={16} color="#007aff" />
                <Text className="text-xs font-black text-slate-900">
                  {showRawFhir ? 'Hide Raw FHIR Resource' : 'Inspect HL7 FHIR JSON Resource'}
                </Text>
              </View>
              <Text className="text-[10px] font-bold text-blue-600">
                {showRawFhir ? 'Collapse' : 'Expand'}
              </Text>
            </TouchableOpacity>

            {showRawFhir && (
              <View className="bg-slate-900 rounded-2xl p-4 mt-2">
                <Text className="font-mono text-[10px] text-emerald-400 leading-relaxed">
                  {JSON.stringify(backendProfile || fhirPatientResource, null, 2)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
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
