import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { AppContext } from '../store/AppContext';
import {
  ShieldCheck,
  Heart,
  Compass,
  Smartphone,
  CheckCircle2,
  MapPin,
  Users,
  Send
} from 'lucide-react-native';

interface OnboardingScreenProps {
  onComplete: (config: { userLoc: string; parentLoc: string }) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const context = useContext(AppContext);
  const [step, setStep] = useState(1);
  const [userLoc, setUserLoc] = useState('UK');
  const [parentLoc, setParentLoc] = useState('India');
  const [careTarget, setCareTarget] = useState<'Mom' | 'Dad' | 'Both'>('Both');

  // Parent details
  const [parentName, setParentName] = useState('');
  const [parentAge, setParentAge] = useState('');
  const [parentCity, setParentCity] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Invite parent channel
  const [inviteMethod, setInviteMethod] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp');

  const handleNext = () => {
    if (step === 5 && parentName.trim()) {
      context?.addParent({
        name: parentName.trim(),
        relationship: careTarget === 'Mom' ? 'Mother' : careTarget === 'Dad' ? 'Father' : 'Parent',
        city: parentCity.trim() || 'Chennai',
        age: parseInt(parentAge, 10) || 65,
        phone: parentPhone.trim()
      });
    }

    if (step < 7) {
      setStep(step + 1);
    } else {
      onComplete({ userLoc, parentLoc });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#f2f2f7] px-4 py-8">
      <View className="items-center justify-center py-4 space-y-5">
        {/* Step Indicator Dots */}
        <View className="flex-row justify-center gap-1.5 mb-2">
          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
            <View
              key={s}
              className={`w-3.5 h-1 rounded-full ${s === step ? 'bg-[#007aff]' : 'bg-neutral-300'}`}
            />
          ))}
        </View>

        {/* Core Screen Card */}
        <View className="w-full bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
          {/* STEP 1: Welcome */}
          {step === 1 && (
            <View className="space-y-4 items-center w-full py-4">
              <View className="w-14 h-14 rounded-full bg-[#eff6ff] items-center justify-center shadow-xs">
                <Heart size={28} color="#007aff" fill="#007aff" />
              </View>
              <Text className="text-2xl font-bold text-neutral-900 tracking-tight text-center">
                KinGuardian
              </Text>
              <Text className="text-base font-semibold text-neutral-700 text-center leading-snug px-2">
                “Be there for your parents, even when you're far away.”
              </Text>
              <Text className="text-xs text-neutral-400 text-center leading-normal mt-1">
                Cross-border health coordination that connects adult children living abroad with
                their ageing parents and local caregivers in India.
              </Text>
            </View>
          )}

          {/* STEP 2: Where do you live? */}
          {step === 2 && (
            <View className="space-y-4 w-full py-2">
              <View className="items-center">
                <Compass size={40} color="#007aff" />
              </View>
              <Text className="text-lg font-bold text-neutral-900 tracking-tight text-center">
                Where do you live?
              </Text>
              <Text className="text-xs font-semibold text-neutral-400 text-center uppercase tracking-wider">
                Child's current residence
              </Text>

              <View className="space-y-2 mt-2">
                {['UK', 'UAE', 'USA', 'Singapore', 'Canada'].map((country) => (
                  <TouchableOpacity
                    key={country}
                    onPress={() => setUserLoc(country)}
                    className={`p-3.5 rounded-xl border flex-row items-center justify-between ${
                      userLoc === country
                        ? 'border-[#007aff] bg-[#007aff]/5'
                        : 'border-neutral-200 bg-neutral-50'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${userLoc === country ? 'text-[#007aff]' : 'text-neutral-700'}`}
                    >
                      {country === 'UK'
                        ? 'United Kingdom (London)'
                        : country === 'UAE'
                          ? 'United Arab Emirates (Dubai)'
                          : country === 'USA'
                            ? 'United States'
                            : country}
                    </Text>
                    {userLoc === country && <CheckCircle2 size={16} color="#007aff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 3: Where do your parents live? */}
          {step === 3 && (
            <View className="space-y-4 w-full py-2">
              <View className="items-center">
                <MapPin size={40} color="#007aff" />
              </View>
              <Text className="text-lg font-bold text-neutral-900 tracking-tight text-center">
                Where do your parents live?
              </Text>
              <Text className="text-xs font-semibold text-neutral-400 text-center uppercase tracking-wider">
                Primary telemetry source region
              </Text>

              <TouchableOpacity
                onPress={() => setParentLoc('India')}
                className="p-4 rounded-xl border border-[#007aff] bg-[#007aff]/5 flex-row items-center justify-between mt-2"
              >
                <View className="space-y-0.5">
                  <Text className="text-sm font-bold text-[#007aff]">India</Text>
                  <Text className="text-[10px] text-neutral-400">
                    Fully optimized timezone mapping active
                  </Text>
                </View>
                <CheckCircle2 size={18} color="#007aff" />
              </TouchableOpacity>

              <Text className="text-[10px] text-neutral-400 text-center font-semibold px-4 leading-normal mt-4">
                KinGuardian is currently optimized for cross-border care delivery between the West/Gulf
                regions and parents residing in India.
              </Text>

            </View>
          )}

          {/* STEP 4: Who do you care for? */}
          {step === 4 && (
            <View className="space-y-4 w-full py-2">
              <View className="items-center">
                <Users size={40} color="#007aff" />
              </View>
              <Text className="text-lg font-bold text-neutral-900 tracking-tight text-center">
                Who do you care for?
              </Text>
              <Text className="text-xs font-semibold text-neutral-400 text-center uppercase tracking-wider">
                Profile checklist configuration
              </Text>

              <View className="flex-row gap-2 mt-2">
                {(['Mom', 'Dad', 'Both'] as const).map((target) => (
                  <TouchableOpacity
                    key={target}
                    onPress={() => setCareTarget(target)}
                    className={`flex-1 p-4 rounded-xl border items-center ${
                      careTarget === target
                        ? 'border-[#007aff] bg-[#007aff]/5'
                        : 'border-neutral-200 bg-neutral-50'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${careTarget === target ? 'text-[#007aff]' : 'text-neutral-700'}`}
                    >
                      {target}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 5: Add parent */}
          {step === 5 && (
            <View className="space-y-3 w-full py-2">
              <View className="items-center">
                <Smartphone size={40} color="#007aff" />
              </View>
              <Text className="text-lg font-bold text-neutral-900 tracking-tight text-center">
                Add Parent details
              </Text>

              <View className="space-y-3 mt-2">
                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Full Name
                  </Text>
                  <TextInput
                    value={parentName}
                    onChangeText={setParentName}
                    placeholder="e.g. Ramesh Kumar"
                    placeholderTextColor="#8e8e93"
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-800 focus:border-[#007aff]"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Age
                  </Text>
                  <TextInput
                    value={parentAge}
                    onChangeText={setParentAge}
                    placeholder="e.g. 68"
                    placeholderTextColor="#8e8e93"
                    keyboardType="numeric"
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-800 focus:border-[#007aff]"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    City (India)
                  </Text>
                  <TextInput
                    value={parentCity}
                    onChangeText={setParentCity}
                    placeholder="e.g. Chennai"
                    placeholderTextColor="#8e8e93"
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-800 focus:border-[#007aff]"
                  />
                </View>

                <View className="space-y-1">
                  <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Phone Number
                  </Text>
                  <TextInput
                    value={parentPhone}
                    onChangeText={setParentPhone}
                    placeholder="+91 XXXXX XXXXX"
                    placeholderTextColor="#8e8e93"
                    keyboardType="phone-pad"
                    className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-800 focus:border-[#007aff]"
                  />
                </View>
              </View>
            </View>
          )}

          {/* STEP 6: Invite parent */}
          {step === 6 && (
            <View className="space-y-4 w-full py-2">
              <View className="items-center">
                <Send size={40} color="#007aff" />
              </View>
              <Text className="text-lg font-bold text-neutral-900 tracking-tight text-center">
                Invite Parent
              </Text>
              <Text className="text-xs text-neutral-400 text-center leading-normal px-2">
                Send Ramesh a reassuring invitation message to link their wearable health sensors.
              </Text>

              <View className="space-y-2 mt-2">
                {(['WhatsApp', 'SMS', 'Email'] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setInviteMethod(method)}
                    className={`p-3.5 rounded-xl border flex-row items-center justify-between ${
                      inviteMethod === method
                        ? 'border-[#007aff] bg-[#007aff]/5'
                        : 'border-neutral-200 bg-neutral-50'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${inviteMethod === method ? 'text-[#007aff]' : 'text-neutral-700'}`}
                    >
                      Invite via {method}
                    </Text>
                    {inviteMethod === method && <CheckCircle2 size={16} color="#007aff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 7: Complete */}
          {step === 7 && (
            <View className="space-y-4 items-center w-full py-4">
              <View className="w-14 h-14 rounded-full bg-[#eefdf4] items-center justify-center shadow-xs">
                <ShieldCheck size={28} color="#34c759" />
              </View>
              <Text className="text-2xl font-bold text-neutral-900 tracking-tight text-center">
                Connected!
              </Text>
              <Text className="text-base font-semibold text-neutral-700 text-center leading-snug px-4">
                “You're now connected to your family.”
              </Text>
              <Text className="text-xs text-neutral-400 text-center leading-normal px-6">
                Connected health monitors and vital telemetry devices will now transmit
                updates automatically. {context?.coordinatorName || 'Coordinator'} is active as primary coordinator.
              </Text>
            </View>
          )}

          {/* Navigation Actions */}
          <View className="w-full flex-row gap-3 mt-6">
            {step > 1 && (
              <TouchableOpacity
                onPress={handleBack}
                className="flex-1 py-3 bg-neutral-100 rounded-xl items-center justify-center"
              >
                <Text className="text-[#007aff] font-bold text-sm">Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleNext}
              className={`py-3 rounded-xl items-center justify-center active:scale-95 bg-[#007aff] ${
                step > 1 ? 'flex-1' : 'w-full'
              }`}
            >
              <Text className="text-white font-bold text-sm px-4">
                {step === 7 ? 'Connect Parents' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View className="h-10" />
    </ScrollView>
  );
};
