import { Linking, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { PRIVACY_URL, TERMS_CANDIDATE_URL, TERMS_EMPLOYER_URL } from '@/constants/terms';

type Props = {
  role: 'candidate' | 'employer';
  className?: string;
};

export function TermsAgreement({ role, className = '' }: Props) {
  const roleLabel = role === 'candidate' ? 'candidate' : 'employer';
  const termsUrl = role === 'candidate' ? TERMS_CANDIDATE_URL : TERMS_EMPLOYER_URL;

  return (
    <View className={className}>
      <Text className="text-center text-sm text-white/60">
        By continuing as a {roleLabel}, you agree to our{' '}
        <Text
          className="text-sm underline"
          style={{ color: brand.accent }}
          onPress={() => Linking.openURL(termsUrl)}
          accessibilityRole="link">
          T&amp;C
        </Text>{' '}
        and{' '}
        <Text
          className="text-sm underline"
          style={{ color: brand.accent }}
          onPress={() => Linking.openURL(PRIVACY_URL)}
          accessibilityRole="link">
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}
