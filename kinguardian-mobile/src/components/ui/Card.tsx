import React from 'react';
import { View, TouchableOpacity, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'warm' | 'alert' | 'gradient';
  onPress?: () => void;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  onPress,
  children,
  className = '',
  ...props
}) => {
  const baseStyle = 'rounded-3xl border p-4';

  let variantStyle = 'bg-white border-[#dee9fc] shadow-sm shadow-[#dee9fc]/40';
  if (variant === 'warm') {
    variantStyle = 'bg-[#fffdf5] border-[#fef3c7] shadow-sm shadow-[#fcd34d]/20';
  } else if (variant === 'alert') {
    variantStyle = 'bg-[#fffbfa] border-[#fcc8c8]';
  } else if (variant === 'gradient') {
    variantStyle = 'bg-[#f4f7fe] border-[#e2eafc]';
  }

  const combinedClass = `${baseStyle} ${variantStyle} ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className={combinedClass}
        {...(props as any)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={combinedClass} {...props}>
      {children}
    </View>
  );
};
