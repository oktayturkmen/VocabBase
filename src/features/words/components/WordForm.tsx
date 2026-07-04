import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View, Pressable } from 'react-native';

import { Button, Input } from '@/components';
import { useListStore } from '@/store/list.store';

import { useGenerateExample } from '../hooks/useGenerateExample';
import { wordFormSchema, type WordFormValues } from '../schemas/word-form.schema';

type WordFormProps = {
  defaultValues?: WordFormValues;
  selectedListIds: number[];
  onToggleListSelection: (listId: number) => void;
  onSubmit: (values: WordFormValues, listIds: number[]) => Promise<void>;
  submitLabel: string;
  error?: string | null;
  onDelete?: () => void;
};

const emptyDefaultValues: WordFormValues = {
  word: '',
  meaning: '',
  example: '',
  pronunciation: '',
};

export function WordForm({
  defaultValues,
  selectedListIds,
  onToggleListSelection,
  onSubmit,
  submitLabel,
  error,
  onDelete,
}: WordFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WordFormValues>({
    resolver: zodResolver(wordFormSchema),
    defaultValues: defaultValues ?? emptyDefaultValues,
  });

  const { lists, fetchLists } = useListStore();

  const wordValue = useWatch({ control, name: 'word' });
  const meaningValue = useWatch({ control, name: 'meaning' });

  const generateExample = useGenerateExample();

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  useEffect(() => {
    void fetchLists();
  }, [fetchLists]);

  const handleGenerateExample = () => {
    if (!wordValue || !meaningValue) {
      return;
    }

    generateExample.mutate(
      { word: wordValue, meaning: meaningValue },
      {
        onSuccess: (example) => {
          setValue('example', example);
        },
        onError: (err) => {
          console.error('Failed to generate example:', err);
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="gap-md p-md">
          {error ? <Text className="text-sm text-error">{error}</Text> : null}

          <Controller
            control={control}
            name="word"
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                label="Kelime"
                placeholder="örn. apple"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.word?.message}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />

          <Controller
            control={control}
            name="meaning"
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                label="Anlam"
                placeholder="örn. elma"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.meaning?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="example"
            render={({ field: { onBlur, onChange, value } }) => (
              <View>
                <Input
                  label="Örnek"
                  placeholder="örn. She ate an apple."
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.example?.message}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="min-h-[96px]"
                />
                <Pressable
                  onPress={handleGenerateExample}
                  disabled={!wordValue || !meaningValue || generateExample.isPending}
                  className={`mt-xs py-sm px-md rounded-lg ${
                    !wordValue || !meaningValue || generateExample.isPending
                      ? 'bg-muted opacity-50'
                      : 'bg-primary'
                  }`}
                >
                  <Text className="text-sm font-semibold text-center text-primary-foreground">
                    {generateExample.isPending ? 'Oluşturuluyor...' : '✨ AI ile Oluştur'}
                  </Text>
                </Pressable>
              </View>
            )}
          />

          <Controller
            control={control}
            name="pronunciation"
            render={({ field: { onBlur, onChange, value } }) => (
              <Input
                label="Telaffuz"
                placeholder="örn. /ˈæp.əl/"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.pronunciation?.message}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />

          {lists.length > 0 && (
            <View className="mb-md">
              <Text className="text-sm font-semibold text-muted-foreground mb-sm">
                Listelere Ata
              </Text>
              <View className="flex-row flex-wrap gap-sm">
                {lists.map((list) => (
                  <Pressable
                    key={list.id}
                    onPress={() => onToggleListSelection(list.id)}
                    className={`px-sm py-xs rounded-lg border ${
                      selectedListIds.includes(list.id)
                        ? 'bg-primary border-primary'
                        : 'bg-card border-border'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        selectedListIds.includes(list.id)
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {list.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Button
            title={submitLabel}
            loading={isSubmitting}
            onPress={handleSubmit((values) => onSubmit(values, selectedListIds))}
          />

          {onDelete ? (
            <Pressable
              onPress={onDelete}
              className="mt-sm py-sm items-center"
              hitSlop={12}
            >
              <Text className="text-sm font-medium text-error">Kelimeyi Sil</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
