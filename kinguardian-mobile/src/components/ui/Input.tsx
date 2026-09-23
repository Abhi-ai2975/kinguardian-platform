import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClass?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerClass = '',
  className = '',
  ...props
}) => {
  return (
    <View className={`w-full space-y-1.5 ${containerClass}`}>
      {label && <Text className="text-xs font-semibold text-neutral-500">{label}</Text>}
      <TextInput
        placeholderTextColor="#8e8e93"
        className={`w-full bg-white text-neutral-800 text-sm px-4 py-3 rounded-xl border ${
          error ? 'border-[#ff3b30]' : 'border-neutral-200'
        } focus:border-[#007aff] ${className}`}
        {...props}
      />
      {error && <Text className="text-xs font-medium text-[#ff3b30] mt-0.5">{error}</Text>}
    </View>
  );
};
