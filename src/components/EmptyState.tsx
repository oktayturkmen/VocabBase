import type { ReactNode } from 'react';
import { Text, View, type ViewProps } from 'react-native';

import { cn } from '@/utils/cn';

type EmptyStateProps = ViewProps & {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <View
      className={cn('items-center justify-center gap-sm px-md py-lg', className)}
      accessibilityRole="summary"
      accessibilityLabel={description ? `${title}. ${description}` : title}
      {...props}
    >
      <Text className="text-lg font-semibold text-foreground">{title}</Text>
      {description ? (
        <Text className="text-center text-sm text-muted-foreground">{description}</Text>
      ) : null}
      {action ? <View className="mt-sm">{action}</View> : null}
    </View>
  );
}
