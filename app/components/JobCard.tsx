import { Image } from 'expo-image';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';

import { brand } from '@/constants/brand';
import type { Job } from '@/services/bffApi';
import { formatSalary, timeAgo } from '@/utils/jobFormat';

type Props = {
  job: Job;
  onPress?: () => void;
  onApply?: (jobId: string) => void | Promise<void>;
  applied?: boolean;
  applying?: boolean;
  saved?: boolean;
  onToggleSave?: (jobId: string) => void | Promise<void>;
};

export function JobCard({ job, onPress, onApply, applied, applying, saved, onToggleSave }: Props) {
  const isNew = Date.now() - new Date(job.posted_at).getTime() < 24 * 60 * 60 * 1000;
  const score = job.match_score != null ? Math.round(job.match_score) : null;

  const animatedApplyStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        applied ? brand.success : brand.accent,
        { duration: 300 },
      ),
      opacity: withTiming(applied || applying ? 0.8 : 1, { duration: 300 }),
      transform: [{ scale: withSpring(applying ? 0.96 : 1) }],
    };
  });

  const info = (
    <>
      <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded border border-white/10 bg-brand-bg">
        {job.company_logo_url ? (
          <Image source={{ uri: job.company_logo_url }} className="h-full w-full" contentFit="cover" />
        ) : (
          <Text className="text-2xl font-bold text-brand-accent">
            {job.company_name.charAt(0)}
          </Text>
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base text-white/70">{job.company_name}</Text>
        <View className="mt-1 flex-row flex-wrap items-center gap-2">
          <Text className="text-xl font-semibold text-white">{job.position_title}</Text>
          {job.featured && (
            <View className="rounded bg-brand-accent/20 px-1.5 py-0.5">
              <Text className="text-xs font-medium text-brand-accent">Featured</Text>
            </View>
          )}
          {isNew && (
            <View className="rounded bg-brand-accent/10 px-1.5 py-0.5">
              <Text className="text-xs font-medium text-brand-accent">New post</Text>
            </View>
          )}
        </View>
        {score != null && score > 0 ? (
          <View
            className={`mt-1 self-start rounded-full border px-3 py-1 ${
              score > 80 ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-white/10 bg-white/5'
            }`}>
            <Text className={`text-xs font-bold ${score > 80 ? 'text-brand-accent' : 'text-white/70'}`}>
              {score}% AI Match
            </Text>
          </View>
        ) : null}
        <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
          <Text className="text-base text-white/60">{job.location}</Text>
          <Text className="text-base text-white/60">{timeAgo(job.posted_at)}</Text>
        </View>
        <Text className="mt-1 text-sm text-white/50">
          {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
        </Text>
        <View className="mt-2 flex-row flex-wrap items-center gap-2">
          <View className="rounded-full bg-brand-accent/10 px-3 py-1">
            <Text className="text-xs font-semibold text-brand-accent">{job.employment_type}</Text>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <View className="rounded-xl border border-white/10 bg-brand-surface p-4">
      <View className="flex-row gap-4">
        {onPress ? (
          <Pressable onPress={onPress} className="min-w-0 flex-1 flex-row gap-4">
            {info}
          </Pressable>
        ) : (
          <View className="min-w-0 flex-1 flex-row gap-4">{info}</View>
        )}
        {onToggleSave ? (
          <Pressable
            onPress={() => onToggleSave(job.id)}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center self-start rounded-full bg-black/30">
            <Text style={{ color: saved ? brand.accent : 'rgba(255,255,255,0.6)', fontSize: 16 }}>
              {saved ? '★' : '☆'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {onApply ? (
        <Animated.View
          style={[
            animatedApplyStyle,
            { marginTop: 12, borderRadius: brand.radius.control, alignSelf: 'flex-start' },
          ]}>
          <Pressable
            onPress={() => !applied && !applying && onApply(job.id)}
            disabled={applied || applying}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              minWidth: 100,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}>
            {applying && <ActivityIndicator size="small" color={brand.bg} />}
            {!applying && (
              <Text className="text-sm font-bold" style={{ color: applied ? brand.text : brand.bg }}>
                {applied ? '✓ Applied' : 'Apply now'}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}
