import { ActivityIndicator, Text, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { cn } from '@/utils/cn';

type LoadingProps = ViewProps & {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
  className?: string;
};

export function Loading({
  message,
  fullScreen = false,
  size = 'large',
  className,
  ...props
}: LoadingProps) {
  const { colors } = useTheme();

  return (
    <View
      className={cn(
        'items-center justify-center gap-sm',
        fullScreen && 'flex-1 bg-background',
        className,
      )}
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'Loading'}
      accessibilityLiveRegion="polite"
      {...props}
    >
      <ActivityIndicator size={size} color={colors.primary} />
      {message ? <Text className="text-sm text-muted-foreground">{message}</Text> : null}
    </View>
  );
}
