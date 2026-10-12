import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { DEFAULT_JOBS_FILTER, type JobsFilterState } from '@/types/filters';

type Props = {
  visible: boolean;
  onClose: () => void;
  filter: JobsFilterState;
  onChange: (f: JobsFilterState) => void;
};

const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];

export function FilterModal({ visible, onClose, filter, onChange }: Props) {
  const set = (partial: Partial<JobsFilterState>) => onChange({ ...filter, ...partial });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable
          className="max-h-[85%] rounded-t-3xl px-4 pb-10 pt-4"
          style={{ backgroundColor: brand.surface }}
          onPress={(e) => e.stopPropagation()}>
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-white/20" />
          <Text className="mb-4 text-xl font-bold text-white">Filter jobs</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="mb-2 text-sm font-semibold text-white/50">Location</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {(['all', 'remote', 'onsite'] as const).map((loc) => (
                <Pressable
                  key={loc}
                  onPress={() => set({ location: loc })}
                  className="rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: filter.location === loc ? brand.accent : brand.bg,
                  }}>
                  <Text
                    className="font-medium capitalize"
                    style={{ color: filter.location === loc ? brand.bg : brand.text }}>
                    {loc}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 text-sm font-semibold text-white/50">Salary period</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {(['any', 'hourly', 'monthly', 'yearly'] as const).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => set({ salaryPeriod: p })}
                  className="rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: filter.salaryPeriod === p ? brand.accent : brand.bg,
                  }}>
                  <Text
                    className="font-medium capitalize"
                    style={{ color: filter.salaryPeriod === p ? brand.bg : brand.text }}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 text-sm font-semibold text-white/50">Employment type</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => set({ employmentType: null })}
                className="rounded-lg px-3 py-2"
                style={{
                  backgroundColor: filter.employmentType === null ? brand.accent : brand.bg,
                }}>
                <Text
                  className="font-medium"
                  style={{ color: filter.employmentType === null ? brand.bg : brand.text }}>
                  Any
                </Text>
              </Pressable>
              {EMP_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => set({ employmentType: t })}
                  className="rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: filter.employmentType === t ? brand.accent : brand.bg,
                  }}>
                  <Text
                    className="font-medium"
                    style={{ color: filter.employmentType === t ? brand.bg : brand.text }}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 text-sm font-semibold text-white/50">Posted within</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {[
                { label: 'Any', days: null as number | null },
                { label: '24h', days: 1 },
                { label: '7d', days: 7 },
                { label: '30d', days: 30 },
              ].map(({ label, days }) => (
                <Pressable
                  key={label}
                  onPress={() => set({ postedWithinDays: days })}
                  className="rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: filter.postedWithinDays === days ? brand.accent : brand.bg,
                  }}>
                  <Text
                    className="font-medium"
                    style={{ color: filter.postedWithinDays === days ? brand.bg : brand.text }}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => onChange(DEFAULT_JOBS_FILTER)}
              className="mb-6 items-center rounded-xl py-3"
              style={{ borderWidth: 1, borderColor: brand.border }}>
              <Text className="font-bold text-white">Reset filters</Text>
            </Pressable>
          </ScrollView>
          <Pressable
            onPress={onClose}
            className="items-center rounded-xl py-4"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              Done
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
