import { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Calendar,
  Download,
  Upload,
  User,
  ShieldCheck
} from 'lucide-react-native';
import { AppContext } from '../../../../src/store/AppContext';
import { DeviceFrame } from '../../../../src/components/DeviceFrame';
import { SimulatorControls } from '../../../../src/components/SimulatorControls';
import { realDataService } from '../../../../src/services/api-client/RealDataService';

interface LabMetric {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'optimal' | 'normal' | 'borderline' | 'abnormal';
  category: string;
}

export default function ParentLabsRoute() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [fhirLabs, setFhirLabs] = useState<any>(null);

  if (!context) return null;

  const personId = typeof id === 'string' ? id : 'dad';

  useEffect(() => {
    let isMounted = true;
    realDataService.getSubjectLabs(personId).then((res) => {
      if (isMounted && res && Array.isArray(res.reports) && res.reports.length > 0) {
        setFhirLabs(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [personId]);

  const person =
    context.people.find((p) => p.id === personId || p.backendSubjectId === personId) ||
    context.people[0] ||
    {
      id: 'dad',
      name: 'Parent',
      relation: 'Father'
    };

  const primaryName = person.name || 'Parent';

  const labMetrics: LabMetric[] = [
    {
      name: 'Fasting Blood Glucose',
      value: '98',
      unit: 'mg/dL',
      referenceRange: '70 - 99 mg/dL',
      status: 'optimal',
      category: 'Metabolic'
    },
    {
      name: 'Hemoglobin A1c (HbA1c)',
      value: '6.8',
      unit: '%',
      referenceRange: '< 6.5% standard (< 7.0% elderly)',
      status: 'optimal',
      category: 'Metabolic'
    },
    {
      name: 'Total Cholesterol',
      value: '182',
      unit: 'mg/dL',
      referenceRange: '< 200 mg/dL',
      status: 'normal',
      category: 'Lipid'
    },
    {
      name: 'LDL Cholesterol',
      value: '104',
      unit: 'mg/dL',
      referenceRange: '< 100 mg/dL',
      status: 'borderline',
      category: 'Lipid'
    },
    {
      name: 'HDL Cholesterol',
      value: '48',
      unit: 'mg/dL',
      referenceRange: '> 40 mg/dL',
      status: 'normal',
      category: 'Lipid'
    },
    {
      name: 'Serum Creatinine',
      value: '1.1',
      unit: 'mg/dL',
      referenceRange: '0.7 - 1.2 mg/dL',
      status: 'normal',
      category: 'Renal'
    },
    {
      name: 'eGFR (Calculated)',
      value: '78',
      unit: 'mL/min/1.73m²',
      referenceRange: '> 60 mL/min',
      status: 'optimal',
      category: 'Renal'
    }
  ];

  const reportId = fhirLabs?.reports?.[0]?.id || 0;

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
                Diagnostic Reports
              </Text>
              <Text className="text-[10px] text-slate-500 font-semibold">
                {primaryName} • Metropolis Labs Chennai
              </Text>
            </View>
          </View>

          <View className="bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 flex-row items-center gap-1">
            <CheckCircle2 size={11} color="#059669" />
            <Text className="text-[9px] font-black text-emerald-700 uppercase">NABL Validated</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-5 pt-4 space-y-4" showsVerticalScrollIndicator={false}>
          {/* FHIR DiagnosticReport Banner */}
          {fhirLabs?.verified_from_fhir && (
            <View className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <ShieldCheck size={16} color="#4338ca" />
                <View>
                  <Text className="text-xs font-black text-indigo-900">
                    FHIR DiagnosticReport (HL7 R4)
                  </Text>
                  <Text className="text-[10px] text-indigo-700 font-semibold">
                    Linked to document: {fhirLabs.filenest_file_id || 'lab_report.pdf'}
                  </Text>
                </View>
              </View>
              <View className="bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                <Text className="text-[9px] font-black text-emerald-800">FHIR Verified</Text>
              </View>
            </View>
          )}

          {/* Diagnostic Report Header Card */}
          <View testID={`labs-report-${reportId}`} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <View className="flex-row justify-between items-start">
              <View className="flex-row items-center gap-2.5">
                <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center">
                  <FileText size={18} color="#059669" />
                </View>
                <View>
                  <Text className="text-sm font-black text-slate-900">
                    {fhirLabs?.reports?.[0]?.name || 'Comprehensive Fasting Metabolic & Lipid Panel'}
                  </Text>
                  <Text testID={`labs-source-${reportId}`} className="text-[10px] text-slate-500 font-medium">
                    {fhirLabs?.reports?.[0]?.performer || 'Apollo Diagnostics, Chennai'}
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex-row justify-between items-center text-xs">
              <View className="flex-row items-center gap-1.5">
                <Calendar size={12} color="#64748b" />
                <Text testID={`labs-date-${reportId}`} className="text-[11px] text-slate-600 font-medium">
                  Date: {fhirLabs?.reports?.[0]?.date || 'Aug 14, 2026'}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <User size={12} color="#64748b" />
                <Text className="text-[11px] text-slate-600 font-medium">
                  Status: {fhirLabs?.reports?.[0]?.status?.toUpperCase() || 'FINAL'}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2 pt-1">
              <TouchableOpacity
                testID="labs-download-pdf"
                onPress={() => context.showToast('Downloading verified clinical PDF from Apollo Diagnostics...')}
                className="flex-1 bg-[#007aff] py-2.5 rounded-xl items-center justify-center active:scale-95 flex-row gap-1.5 shadow-xs"
              >
                <Download size={13} color="#ffffff" />
                <Text className="text-white text-[11px] font-bold">Download PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="labs-upload"
                onPress={() => router.push('/(coordinator)/records')}
                className="bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl items-center justify-center active:bg-slate-200 flex-row gap-1.5"
              >
                <Upload size={13} color="#007aff" />
                <Text className="text-slate-700 text-[11px] font-bold">Upload Lab</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Test Metrics List */}
          <View className="space-y-3 mb-10">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Test Biomarkers & Reference Ranges ({fhirLabs?.reports?.[0]?.observations?.length || labMetrics.length})
            </Text>

            {(fhirLabs?.reports?.[0]?.observations || labMetrics).map((item: any, idx: number) => {
              const refRange = item.reference_range || item.referenceRange || 'Normal clinical threshold';
              const interp = item.interpretation || (item.status === 'optimal' ? 'Controlled' : 'In Range');

              return (
                <View
                  key={idx}
                  testID={`labs-result-${item.id ?? idx}`}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2"
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1 pr-2">
                      <Text className="text-xs font-black text-slate-900">{item.name}</Text>
                      <Text className="text-[10px] text-slate-400 font-medium">
                        Reference: {refRange}
                      </Text>
                    </View>

                    <View className="items-end">
                      <View className="flex-row items-baseline gap-1">
                        <Text testID={`labs-value-${item.id ?? idx}`} className="text-base font-black text-slate-900">{item.value}</Text>
                        <Text testID={`labs-unit-${item.id ?? idx}`} className="text-[10px] text-slate-400 font-semibold">{item.unit}</Text>
                      </View>
                      <View
                        className="px-2 py-0.5 rounded-full border mt-0.5 bg-emerald-50 border-emerald-200"
                      >
                        <Text
                          className="text-[8px] font-black uppercase text-emerald-700"
                        >
                          {interp}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
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
