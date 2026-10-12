import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { RecruiterDashboard } from '@/components/RecruiterDashboard';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';

export default function RecruiterTabScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: brand.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={brand.accent} />
      </View>
    );
  }

  if (user?.role !== 'recruiter' && user?.role !== 'admin') {
    return <Redirect href="/unauthorized" />;
  }

  return <RecruiterDashboard />;
}
