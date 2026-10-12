import { Pressable, Text, TextInput, View } from 'react-native';

import { brand } from '@/constants/brand';
import { promoDurationLabel } from '@/lib/promoCode';
import type { ValidatePromoResponse } from '@/types/subscription';

type Props = {
  code: string;
  onCodeChange: (code: string) => void;
  onApply: () => void;
  onClear: () => void;
  validation: ValidatePromoResponse | null;
  loading: boolean;
  error: string | null;
  variant?: 'default' | 'hero';
  yearlyPrice?: number;
};

export function PromoCodeRedeem({
  code,
  onCodeChange,
  onApply,
  onClear,
  validation,
  loading,
  error,
  variant = 'default',
  yearlyPrice,
}: Props) {
  const isValid = validation?.is_valid === true;
  const isFree = isValid && validation.final_price_usd === 0;
  const isHero = variant === 'hero';

  if (isValid) {
    return (
      <View
        className={`overflow-hidden rounded-2xl border p-6 ${isHero ? 'border-[#fcc636]/40' : 'border-[#fcc636]/25'}`}
        style={{ backgroundColor: brand.surface }}>
        <View className="items-center">
          <View
            className="h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${brand.accent}26` }}>
            <Text className="text-2xl" style={{ color: brand.accent }}>
              ✦
            </Text>
          </View>
          <Text className="mt-4 text-xs font-bold uppercase tracking-widest" style={{ color: brand.accent }}>
            {isFree ? 'Gift unlocked' : 'Promo applied'}
          </Text>
          <Text className="mt-2 text-center text-2xl font-bold text-white">
            {isFree
              ? `${promoDurationLabel(validation.duration_months)} of Premium — on us`
              : `$${validation.discount_amount_usd} off Yearly Premium`}
          </Text>
          {yearlyPrice != null && (
            <View className="mt-4 flex-row items-center gap-3">
              <Text className="text-lg text-white/40 line-through">${yearlyPrice}</Text>
              <Text className="text-3xl font-bold" style={{ color: brand.accent }}>
                {isFree ? '$0' : `$${validation.final_price_usd}`}
              </Text>
              <Text className="text-white/50">/ year</Text>
            </View>
          )}
          <Text className="mt-3 font-mono text-sm tracking-widest text-white/60">{code}</Text>
          <Pressable onPress={onClear} className="mt-5">
            <Text className="text-sm text-white/40 underline">Use a different code</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      className={`rounded-2xl border p-5 ${isHero ? 'border-[#fcc636]/40' : 'border-[#fcc636]/25'}`}
      style={{ backgroundColor: brand.surface }}>
      <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: brand.accent }}>
        {isHero ? "You've been invited" : 'Promo code'}
      </Text>
      {isHero && (
        <Text className="mt-2 text-white/70">
          Enter the code you received to unlock your Premium gift.
        </Text>
      )}
      <View className={`flex-row gap-2 ${isHero ? 'mt-6' : 'mt-3'}`}>
        <TextInput
          value={code}
          onChangeText={onCodeChange}
          onSubmitEditing={onApply}
          editable={!loading}
          placeholder="YOUR-CODE"
          placeholderTextColor="#666"
          autoCapitalize="characters"
          autoCorrect={false}
          className="flex-1 rounded-xl border border-white/10 bg-[#2b2b2b] px-4 py-3 font-mono uppercase tracking-wider text-white"
        />
        <Pressable
          onPress={onApply}
          disabled={loading || !code.trim()}
          className="items-center justify-center rounded-xl px-5 py-3"
          style={{
            backgroundColor: brand.accent,
            opacity: loading || !code.trim() ? 0.5 : 1,
          }}>
          <Text className="font-bold" style={{ color: brand.bg }}>
            {loading ? '…' : 'Apply'}
          </Text>
        </Pressable>
      </View>
      {error ? (
        <Text className="mt-3 text-sm text-red-400" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
