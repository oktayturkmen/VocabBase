import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundaryComponent extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary yakaladı:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      return <DefaultErrorFallback error={error} onReset={this.handleReset} />;
    }

    return children;
  }
}

function DefaultErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-background p-lg">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-sm text-2xl font-bold text-foreground">Bir şeyler ters gitti</Text>
        <Text className="mb-lg text-center text-sm text-muted-foreground">
          Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
        </Text>

        <View className="mb-lg w-full max-w-md rounded-xl border border-border bg-card p-md">
          <Text className="text-xs font-semibold uppercase text-muted-foreground mb-xs">
            Hata Detayı
          </Text>
          <Text className="text-sm text-error">{error.message}</Text>
        </View>

        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Tekrar dene"
          className="rounded-xl bg-primary px-lg py-md active:opacity-80"
        >
          <Text className="text-base font-semibold text-primary-foreground">Tekrar Dene</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export const ErrorBoundary = ErrorBoundaryComponent;