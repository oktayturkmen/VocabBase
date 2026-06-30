import React, { useEffect, useState } from 'react';
import { Animated, type ViewStyle } from 'react-native';

type FadeInProps = {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
};

export function FadeIn({ children, duration = 300, delay = 0, style }: FadeInProps) {
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);

  return <Animated.View style={[{ opacity: fadeAnim }, style]}>{children}</Animated.View>;
}
