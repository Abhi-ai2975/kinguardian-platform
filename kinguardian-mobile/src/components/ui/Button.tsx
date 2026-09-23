import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'parent' | 'alert' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  title: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  title,
  className = '',
  ...props
}) => {
  const baseStyle = 'flex-row items-center justify-center active:opacity-80';

  let variantStyle = 'bg-[#007aff] border border-transparent';
  let textStyle = 'text-white font-semibold';

  if (variant === 'secondary') {
    variantStyle = 'bg-neutral-100 border border-transparent';
    textStyle = 'text-[#007aff] font-semibold';
  } else if (variant === 'parent') {
    variantStyle = 'bg-[#34c759] border border-transparent';
    textStyle = 'text-white font-bold';
  } else if (variant === 'alert') {
    variantStyle = 'bg-[#ff3b30] border border-transparent';
    textStyle = 'text-white font-semibold';
  } else if (variant === 'outline') {
    variantStyle = 'bg-transparent border border-neutral-250';
    textStyle = 'text-neutral-800 font-semibold';
  }

  let sizeStyle = 'px-4.5 py-3.5 rounded-xl';
  let textSizeStyle = 'text-xs md:text-sm';

  if (size === 'sm') {
    sizeStyle = 'px-3 py-2 rounded-lg';
    textSizeStyle = 'text-[11px]';
  } else if (size === 'lg') {
    sizeStyle = 'px-6 py-4.5 rounded-2xl';
    textSizeStyle = 'text-base';
  }

  const combinedClass = `${baseStyle} ${variantStyle} ${sizeStyle} ${className}`;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={combinedClass}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'outline' ? '#007aff' : '#ffffff'}
        />
      ) : (
        <Text className={`${textStyle} ${textSizeStyle} text-center`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
