import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '@/lib/logger';
import { captureExceptionSafely } from '@/lib/sentry';
import { theme } from '@/lib/theme';

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

export class GlobalErrorBoundary extends React.Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('GlobalErrorBoundary', 'Terjadi kesalahan tampilan tidak terduga', {
      error,
      componentStack: errorInfo.componentStack,
    });
    captureExceptionSafely(error, 'GlobalErrorBoundary');
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
              Terjadi Kendala pada Aplikasi
            </Text>
            <Text style={styles.subtitle}>
              Maaf, layar mengalami gangguan tak terduga. Data akun Anda tetap aman.
              Silakan tekan tombol di bawah untuk memuat ulang tampilan.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              onPress={this.handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Coba lagi memuat tampilan aplikasi"
            >
              <Text style={styles.retryButtonText}>Coba lagi</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.status.cancelled.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  retryButton: {
    width: '100%',
    minHeight: theme.sizes.buttonMinHeight,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  retryButtonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  retryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.surface,
  },
});

