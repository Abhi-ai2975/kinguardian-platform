import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { X, Heart, MessageSquare } from 'lucide-react-native';
import { Person } from '../types';
import { AppContext } from '../store/AppContext';

interface CheckInModalProps {
  isOpen: boolean;
  person: Person;
  onClose: () => void;
  onSendCheckIn: (msg: string) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  person,
  onClose,
  onSendCheckIn
}) => {
  const context = useContext(AppContext);
  const coordName = context?.coordinatorName || 'Coordinator';

  const options = [
    `Everything is going well here, ${coordName}!`,
    'Had a healthy lunch and feeling fine.',
    'Weather is hot today, staying comfortably indoors.',
    'Confirming that evening medicines are taken.'
  ];

  return (
    <Modal visible={isOpen} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-[28px] p-6 pt-3 space-y-4 shadow-xl">
          {/* iOS Grabber Handle */}
          <View className="w-10 h-1.5 bg-neutral-200 rounded-full self-center mb-1.5" />

          {/* Header */}
          <View className="flex-row justify-between items-center pb-2 border-b border-neutral-100">
            <View className="flex-row items-center gap-2">
              <Heart size={18} color="#ff3b30" fill="#ff3b30" />
              <Text className="text-lg font-bold text-neutral-900 tracking-tight">
                Check in with {person.name.split(' ')[0]}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="p-1.5 bg-neutral-100 rounded-full active:scale-90"
            >
              <X size={16} color="#8e8e93" />
            </TouchableOpacity>
          </View>

          {/* Quick choices list */}
          <View className="space-y-2.5">
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  onSendCheckIn(opt);
                  onClose();
                }}
                className="w-full p-4 bg-neutral-50 hover:bg-neutral-100 rounded-2xl flex-row items-center gap-3 active:scale-98"
              >
                <MessageSquare size={14} color="#007aff" />
                <Text className="text-xs font-semibold text-neutral-700 flex-1 leading-normal">
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};
