import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { appIdentity } from '@/constants/appIdentity';
import { brand } from '@/constants/brand';

export default function AboutScreen() {
  return (
    <ScrollView className="flex-1 bg-[#2b2b2b] px-4 py-8">
      <View className="items-center mb-6">
        <BrandLogo size="lg" />
      </View>
      <Text className="text-center text-3xl font-bold" style={{ color: brand.accent }}>
        About {appIdentity.displayName}
      </Text>
      <Text className="mt-6 text-lg leading-7 text-white/90">
        {appIdentity.displayName} helps you find jobs by matching your resume to the right opportunities with AI —
        not just keywords.
      </Text>
      <Text className="mt-6 text-xl font-bold" style={{ color: brand.accent }}>
        Our mission
      </Text>
      <Text className="mt-2 text-base leading-6 text-white/80">
        To make job searching easier, faster, and more effective for everyone.
      </Text>
      <Text className="mt-8 text-sm uppercase tracking-wide" style={{ color: brand.accent }}>
        Built by
      </Text>
      <Text className="mt-2 text-lg font-bold text-white">Animesh Raj</Text>
      <Text className="mt-2 text-base leading-6 text-white/80">
        The app is built and maintained by Animesh Raj. For support, use Contact in this app or visit{' '}
        {appIdentity.webUrl.replace(/^https:\/\//, '')}.
      </Text>
      <Link href="/contact" asChild>
        <Text className="mt-6 text-center text-base" style={{ color: brand.accent }}>
          Contact us
        </Text>
      </Link>
    </ScrollView>
  );
}
