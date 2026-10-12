import { Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { FoundingBanner } from '@/components/FoundingBanner';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const isRecruiter = user?.role === 'recruiter' || user?.role === 'admin';

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: brand.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={brand.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    {/* <FoundingBanner /> */}
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brand.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarStyle: { backgroundColor: brand.bg, borderTopColor: brand.border },
        headerShown: true,
        headerStyle: { backgroundColor: brand.bg },
        headerTintColor: brand.accent,
        headerTitleStyle: { color: brand.text, fontWeight: '700' },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="briefcase.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'AI Matches',
          href: isRecruiter ? null : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="sparkles" color={color} />,
        }}
      />
      <Tabs.Screen
        name="recruiter"
        options={{
          title: 'Dashboard',
          href: isRecruiter ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="square.grid.2x2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
    </View>
  );
}
