import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';

type Tone = 'success' | 'error';
interface Message {
  id: number;
  text: string;
  tone: Tone;
}

let show: ((message: Message) => void) | null = null;
let nextId = 0;

/** Mensagem rápida de confirmação no topo da tela (não cobre o botão flutuante nem as abas). */
export function toast(text: string, tone: Tone = 'success') {
  show?.({ id: ++nextId, text, tone });
  AccessibilityInfo.announceForAccessibility(text);
}

export function ToastHost() {
  const [message, setMessage] = useState<Message | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    show = setMessage;
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMessage(null));
    }, 2600);
    return () => clearTimeout(timer);
  }, [message, opacity]);

  if (!message) return null;
  const success = message.tone === 'success';
  return (
    <Animated.View style={[styles.toast, { top: insets.top + spacing.sm, opacity }]}>
      <Ionicons
        name={success ? 'checkmark-circle' : 'alert-circle'}
        size={20}
        color={success ? colors.accent : '#FFB4B4'}
      />
      <Text style={styles.text}>{message.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignSelf: 'center',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDark,
    boxShadow: '0px 10px 24px rgba(15, 27, 61, 0.28)',
    pointerEvents: 'none',
  },
  text: { flex: 1, color: colors.white, fontSize: 14, fontWeight: '600' },
});
