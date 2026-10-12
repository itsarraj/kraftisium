import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, TextInput, View } from 'react-native';

import { brand } from '@/constants/brand';
import { appIdentity } from '@/constants/appIdentity';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';

export default function ContactScreen() {
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const [subject, setSubject] = useState('');

  useEffect(() => {
    if (intent === 'upgrade') setSubject('Upgrade - Recruiter');
    else if (intent === 'recruiter-plan') setSubject('Employer subscription / pricing');
  }, [intent]);

  const openEmail = () => {
    const q = subject ? `?subject=${encodeURIComponent(subject)}` : '';
    Linking.openURL(`mailto:${appIdentity.supportEmail}${q}`);
  };

  const send = () => {
    Alert.alert(
      'Contact',
      `Use your email app to reach ${appIdentity.supportEmail}, or visit ${appIdentity.webUrl}/contact`,
      [
        { text: 'Open email', onPress: openEmail },
        { text: 'OK', style: 'cancel' },
      ],
    );
  };

  return (
    <KeyboardAwareScreen screenClassName="flex-1 bg-[#2b2b2b]" contentClassName="px-4 py-8">
      <Text className="text-center text-3xl font-bold" style={{ color: brand.accent }}>
        Contact us
      </Text>
      <View className="mt-8 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
        <Text className="text-sm text-white/80">Name</Text>
        <TextInput className="mt-1 rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-3 text-white" />
        <Text className="mt-4 text-sm text-white/80">Email</Text>
        <TextInput
          className="mt-1 rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-3 text-white"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text className="mt-4 text-sm text-white/80">Subject</Text>
        <TextInput
          className="mt-1 rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-3 text-white"
          value={subject}
          onChangeText={setSubject}
        />
        <Text className="mt-4 text-sm text-white/80">Message</Text>
        <TextInput
          className="mt-1 min-h-[120px] rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-3 text-white"
          multiline
        />
        <Pressable
          onPress={send}
          className="mt-6 items-center rounded-xl py-4"
          style={{ backgroundColor: brand.accent }}>
          <Text className="font-bold" style={{ color: brand.bg }}>
            Send message
          </Text>
        </Pressable>
      </View>
      <Text className="mt-10 text-center text-lg font-bold" style={{ color: brand.accent }}>
        Other ways to reach us
      </Text>
      <Pressable onPress={openEmail} className="mt-4">
        <Text className="text-center text-white/70">{appIdentity.supportEmail}</Text>
      </Pressable>
      <Pressable onPress={() => Linking.openURL(appIdentity.webUrl)} className="mt-2">
        <Text className="text-center" style={{ color: brand.accent }}>
          {appIdentity.webUrl}
        </Text>
      </Pressable>
    </KeyboardAwareScreen>
  );
}
