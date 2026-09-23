import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface BadgeProps extends ViewProps {
  variant?: 'success' | 'alert' | 'warning' | 'sync' | 'info' | 'default';
  label: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  label,
  className = '',
  ...props
}) => {
  const baseStyle = 'px-2.5 py-0.5 rounded-full self-start';

  let variantStyle = 'bg-neutral-100';
  let textStyle = 'text-neutral-500 font-semibold text-[10px]';

  if (variant === 'success') {
    variantStyle = 'bg-emerald-50';
    textStyle = 'text-[#34c759] font-semibold text-[10px]';
  } else if (variant === 'alert') {
    variantStyle = 'bg-red-50';
    textStyle = 'text-[#ff3b30] font-semibold text-[10px]';
  } else if (variant === 'warning') {
    variantStyle = 'bg-orange-50';
    textStyle = 'text-[#ff9500] font-semibold text-[10px]';
  } else if (variant === 'sync') {
    variantStyle = 'bg-blue-50';
    textStyle = 'text-[#007aff] font-semibold text-[10px]';
  } else if (variant === 'info') {
    variantStyle = 'bg-blue-50';
    textStyle = 'text-[#007aff] font-semibold text-[10px]';
  }

  return (
    <View className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
      <Text className={textStyle}>{label}</Text>
    </View>
  );
};
