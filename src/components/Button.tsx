import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { colors } from '@/theme/colors';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
  textClassName?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:opacity-90',
  secondary: 'bg-muted active:opacity-90',
  outline: 'border border-border bg-background active:bg-muted',
  ghost: 'bg-transparent active:bg-muted',
  destructive: 'bg-error active:opacity-90',
};

const textVariantClasses: Record<ButtonVariant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  destructive: 'text-primary-foreground',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-sm py-xs',
  md: 'px-md py-sm',
  lg: 'px-lg py-md',
};

const textSizeClasses: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const indicatorColors: Record<ButtonVariant, string> = {
  primary: colors.primaryForeground,
  secondary: colors.foreground,
  outline: colors.foreground,
  ghost: colors.foreground,
  destructive: colors.primaryForeground,
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={cn(
        'flex-row items-center justify-center rounded-lg',
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && 'opacity-50',
        className,
      )}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColors[variant]} />
      ) : (
        <Text
          className={cn(
            'font-semibold',
            textVariantClasses[variant],
            textSizeClasses[size],
            textClassName,
          )}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
