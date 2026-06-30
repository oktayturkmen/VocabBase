import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/colors';
import { cn } from '@/utils/cn';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerClassName?: string;
  className?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, containerClassName, className, ...props },
  ref,
) {
  const accessibilityLabel = props.accessibilityLabel ?? label ?? props.placeholder;

  return (
    <View className={cn('gap-xs', containerClassName)}>
      {label ? <Text className="text-sm font-medium text-foreground">{label}</Text> : null}
      <TextInput
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-background px-md py-sm text-base text-foreground',
          error && 'border-error',
          className,
        )}
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={error}
        accessibilityState={{ disabled: props.editable === false }}
        {...props}
      />
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
    </View>
  );
});
