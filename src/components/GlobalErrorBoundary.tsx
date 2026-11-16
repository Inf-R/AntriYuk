import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, EmptyState } from '@/components/ui';
import { logger } from '@/lib/logger';
import { captureExceptionSafely } from '@/lib/sentry';
import { colors, spacing } from '@/lib/theme';

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
          <View style={styles.inner}>
            <Card>
              <EmptyState
                illustration="empty"
                title="Terjadi Kendala pada Aplikasi"
                description="Maaf, layar mengalami gangguan tak terduga. Data akun Anda tetap aman. Silakan tekan tombol di bawah untuk memuat ulang tampilan."
                actionLabel="Coba lagi"
                onAction={this.handleRetry}
              />
            </Card>
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
    backgroundColor: colors.canvas,
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: spacing.screen,
  },
});
