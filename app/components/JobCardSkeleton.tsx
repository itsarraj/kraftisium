import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { brand } from '@/constants/brand';

export default function JobCardSkeleton() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          backgroundColor: brand.surface,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: brand.border,
          gap: 12,
          marginBottom: 16,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 8, flex: 1 }}>
          <View style={{ height: 20, backgroundColor: brand.border, borderRadius: 4, width: '70%' }} />
          <View style={{ height: 14, backgroundColor: brand.border, borderRadius: 4, width: '40%' }} />
        </View>
        <View style={{ height: 24, width: 24, backgroundColor: brand.border, borderRadius: 12 }} />
      </View>
      
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <View style={{ height: 20, backgroundColor: brand.border, borderRadius: 4, width: 60 }} />
        <View style={{ height: 20, backgroundColor: brand.border, borderRadius: 4, width: 60 }} />
        <View style={{ height: 20, backgroundColor: brand.border, borderRadius: 4, width: 60 }} />
      </View>

      <View style={{ gap: 6, marginTop: 4 }}>
        <View style={{ height: 12, backgroundColor: brand.border, borderRadius: 4, width: '100%' }} />
        <View style={{ height: 12, backgroundColor: brand.border, borderRadius: 4, width: '90%' }} />
        <View style={{ height: 12, backgroundColor: brand.border, borderRadius: 4, width: '80%' }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <View style={{ height: 12, backgroundColor: brand.border, borderRadius: 4, width: 80 }} />
        <View style={{ height: 36, backgroundColor: brand.accent + '22', borderRadius: 8, width: 100 }} />
      </View>
    </Animated.View>
  );
}
