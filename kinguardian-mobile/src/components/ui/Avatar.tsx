import React from 'react';
import { View, Image, Text, ViewProps } from 'react-native';

interface AvatarProps extends ViewProps {
  url?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'idle' | 'none';
}

export const Avatar: React.FC<AvatarProps> = ({
  url,
  initials = 'KG',
  size = 'md',
  status = 'none',
  className = '',
  ...props
}) => {
  let sizeClass = 'w-10 h-10';
  let textSizeClass = 'text-xs';
  let statusDotSize = 'w-2.5 h-2.5';

  if (size === 'sm') {
    sizeClass = 'w-8 h-8';
    textSizeClass = 'text-[9px]';
    statusDotSize = 'w-2 h-2';
  } else if (size === 'lg') {
    sizeClass = 'w-16 h-16';
    textSizeClass = 'text-base';
    statusDotSize = 'w-3.5 h-3.5';
  }

  return (
    <View className={`relative shrink-0 ${sizeClass} ${className}`} {...props}>
      {url ? (
        <Image
          source={{ uri: url }}
          className={`w-full h-full rounded-full border border-neutral-100`}
        />
      ) : (
        <View className="w-full h-full rounded-full bg-blue-50 items-center justify-center border border-neutral-100">
          <Text className={`font-bold text-[#007aff] ${textSizeClass}`}>{initials}</Text>
        </View>
      )}

      {status !== 'none' && (
        <View
          className={`absolute bottom-0 right-0 rounded-full border border-white ${
            status === 'online' ? 'bg-[#34c759]' : 'bg-[#ff9500]'
          } ${statusDotSize}`}
        />
      )}
    </View>
  );
};
