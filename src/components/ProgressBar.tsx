import { View, type ViewProps } from 'react-native';

import { cn } from '@/utils/cn';

type ProgressBarProps = ViewProps & {
  progress: number;
  className?: string;
  barClassName?: string;
};

function clampProgress(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

export function ProgressBar({ progress, className, barClassName, ...props }: ProgressBarProps) {
  const clampedProgress = clampProgress(progress);

  return (
    <View className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)} {...props}>
      <View
        className={cn('h-full rounded-full bg-primary', barClassName)}
        style={{ width: `${clampedProgress}%` }}
      />
    </View>
  );
}
