import { Text, View, type ViewProps } from 'react-native';

import { cn } from '@/utils/cn';

type CardProps = ViewProps & {
  title?: string;
  description?: string;
  className?: string;
};

export function Card({ title, description, className, children, ...props }: CardProps) {
  return (
    <View className={cn('rounded-xl border border-border bg-card p-md', className)} {...props}>
      {title ? <Text className="text-lg font-semibold text-card-foreground">{title}</Text> : null}
      {description ? (
        <Text className="mt-xs text-sm text-muted-foreground">{description}</Text>
      ) : null}
      {children}
    </View>
  );
}
