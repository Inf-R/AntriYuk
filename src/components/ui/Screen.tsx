/**
 * Screen — kerangka layar: area aman, latar canvas, scroll opsional,
 * penanganan keyboard, slot header tetap dan footer menempel di bawah.
 *
 * Contoh:
 *   <Screen header={<ScreenHeader title="Masuk" />}
 *           footer={<Button label="Masuk" onPress={submit} />}>
 *     <Input label="Email" ... />
 *   </Screen>
 *
 *   // Daftar dengan FlatList sendiri: matikan scroll bawaan
 *   <Screen scroll={false} padded={false}>
 *     <FlatList ... />
 *   </Screen>
 */
import React, { ReactElement, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/lib/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Bungkus isi dengan ScrollView. Default true. */
  scroll?: boolean;
  /** Padding horizontal 20 dan vertikal dasar. Default true. */
  padded?: boolean;
  /** Konten tetap di atas (tidak ikut scroll), mis. ScreenHeader. */
  header?: ReactNode;
  /** Konten menempel di bawah (mis. tombol utama), ikut naik saat keyboard muncul. */
  footer?: ReactNode;
  /** Sisi area aman. Default top, left, right (tab bar menangani bawah). */
  edges?: Edge[];
  backgroundColor?: string;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  header,
  footer,
  edges = ['top', 'left', 'right'],
  backgroundColor = colors.canvas,
  refreshControl,
  contentContainerStyle,
  style,
  testID,
}: ScreenProps) {
  const paddingStyle = padded ? styles.padded : null;

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor }, style]} testID={testID}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {header ? <View style={padded ? styles.headerPadded : null}>{header}</View> : null}
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, paddingStyle, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, paddingStyle, contentContainerStyle]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerPadded: {
    paddingHorizontal: spacing.screen,
  },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
});

