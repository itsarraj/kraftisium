import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { appIdentity } from '@/constants/appIdentity';
import { brand } from '@/constants/brand';

const MARK = require('@/assets/images/brand-mark.png');

type Props = {
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const MARK_ASPECT = 179 / 290;
const sizes = { sm: 24, md: 32, lg: 48 } as const;
const textSizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' } as const;

export function BrandLogo({ showName = true, size = 'md' }: Props) {
  const px = sizes[size];
  return (
    <View className="flex-row items-center gap-3">
      <Image source={MARK} style={{ height: px, width: px * MARK_ASPECT }} contentFit="contain" />
      {showName ? (
        <Text className={`font-bold text-white ${textSizes[size]}`}>{appIdentity.displayName}</Text>
      ) : null}
    </View>
  );
}

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const px = sizes[size];
  return <Image source={MARK} style={{ height: px, width: px * MARK_ASPECT }} contentFit="contain" accessibilityLabel={appIdentity.displayName} />;
}
