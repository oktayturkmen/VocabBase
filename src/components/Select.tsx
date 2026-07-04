import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/useTheme';

type SelectOption = {
  value: string | number | null;
  label: string;
  subtitle?: string;
};

type SelectProps = {
  options: SelectOption[];
  value: string | number | null;
  onSelect: (value: string | number | null) => void;
  placeholder?: string;
  className?: string;
};

export function Select({ options, value, onSelect, placeholder = 'Seçiniz', className = '' }: SelectProps) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View className={className}>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="flex-row items-center justify-between rounded-lg border border-border bg-card p-sm"
      >
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {selectedOption?.label || placeholder}
          </Text>
          {selectedOption?.subtitle && (
            <Text className="text-sm text-muted-foreground">{selectedOption.subtitle}</Text>
          )}
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          onPress={() => setIsOpen(false)}
          className="flex-1 bg-black/50"
        >
          <View className="mt-auto bg-background rounded-t-3xl p-md">
            <View className="mb-md flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">Liste Seç</Text>
              <Pressable onPress={() => setIsOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView className="max-h-80">
              {options.map((option) => (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                  className={`mb-sm rounded-lg border p-md ${
                    value === option.value ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">{option.label}</Text>
                      {option.subtitle && (
                        <Text className="text-sm text-muted-foreground">{option.subtitle}</Text>
                      )}
                    </View>
                    {value === option.value && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
