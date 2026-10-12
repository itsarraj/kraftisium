import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type KeyboardAwareScreenProps = {
  children: ReactNode;
  screenClassName?: string;
  contentClassName?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
};

export function KeyboardAwareScreen({
  children,
  screenClassName,
  contentClassName,
  contentContainerStyle,
  keyboardVerticalOffset,
}: KeyboardAwareScreenProps) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const onShow = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const mergedContentStyle = useMemo(() => {
    const flattenedStyle = StyleSheet.flatten(contentContainerStyle) ?? {};
    const extraPaddingBottom =
      typeof flattenedStyle.paddingBottom === 'number' ? flattenedStyle.paddingBottom : 0;

    return [
      flattenedStyle,
      {
        paddingBottom: extraPaddingBottom + insets.bottom + 24 + keyboardHeight,
      },
    ] satisfies StyleProp<ViewStyle>;
  }, [contentContainerStyle, insets.bottom, keyboardHeight]);

  return (
    <View className={screenClassName}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset ?? headerHeight}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          contentInsetAdjustmentBehavior="always"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className={contentClassName} style={mergedContentStyle}>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
