import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { StatusBarScrim } from '@/components/ui/status-bar-scrim';
import { useTopChromeInset } from '@/components/ui/use-top-chrome-inset';
import { useProfileDraft } from '@/contexts/ProfileDraftContext';
import { getNicknameValidationError, normalizeNickname } from '@/lib/nickname';
import {
  BorderRadius,
  Colors,
  Layout,
  Spacing,
  Typography,
} from '@/theme';
import { DEVELOPMENTAL_STAGES } from '@/types';
import { SelectionRow } from '@/ui/selection-row';

type ProfileDetailsScreenProps = {
  onContinue: () => void;
};

export function ProfileDetailsScreen({ onContinue }: ProfileDetailsScreenProps) {
  const { draft, setNickname, setDevelopmentalStage } = useProfileDraft();
  const topChromeInset = useTopChromeInset({ hasNativeHeader: true });
  const [nicknameTouched, setNicknameTouched] = useState(false);
  const validationError = getNicknameValidationError(draft.nickname);
  const canContinue = validationError === null && draft.developmentalStage !== null;

  const handleContinue = () => {
    setNicknameTouched(true);
    if (!canContinue) return;
    setNickname(normalizeNickname(draft.nickname));
    onContinue();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'android' && { paddingTop: topChromeInset + Spacing.xl },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <ThemedText type="title">Who is tonight’s story for?</ThemedText>
          <View style={styles.field}>
            <ThemedText type="smallBold">Bedtime nickname</ThemedText>
            <TextInput
              value={draft.nickname}
              onChangeText={setNickname}
              onBlur={() => setNicknameTouched(true)}
              placeholder="Sparky, Rocket, or Buddy"
              placeholderTextColor={Colors.dark.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="none"
              accessibilityLabel="Bedtime nickname"
              accessibilityHint="Use a nickname, not a real name"
              style={styles.input}
              testID="nickname-input"
            />
            <ThemedText type="small" themeColor="textSecondary">
              Use a nickname, not a real name.
            </ThemedText>
            {nicknameTouched && validationError ? (
              <ThemedText
                type="small"
                themeColor="error"
                accessibilityLiveRegion="polite"
              >
                {validationError}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            We never ask for real names or birthdates.
          </ThemedText>
        </View>

        <View style={styles.section} accessibilityRole="radiogroup">
          <ThemedText type="heading">Choose a developmental level</ThemedText>
          <View style={styles.choices}>
            {DEVELOPMENTAL_STAGES.map((stage) => (
              <SelectionRow
                key={stage.id}
                label={stage.label}
                selected={draft.developmentalStage === stage.id}
                onPress={() => setDevelopmentalStage(stage.id)}
                testID={`stage-${stage.id}`}
              />
            ))}
          </View>
        </View>

        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={!canContinue}
          fullWidth
          testID="profile-details-continue"
        />
      </ScrollView>
      <StatusBarScrim height={topChromeInset} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bgBase,
  },
  content: {
    alignSelf: 'center',
    gap: Spacing['2xl'],
    maxWidth: Layout.maxContentWidth,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    width: '100%',
  },
  section: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  input: {
    ...Typography.body,
    minHeight: Layout.minTouchTarget,
    backgroundColor: Colors.dark.bgElement,
    borderColor: Colors.dark.borderDefault,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    color: Colors.dark.textPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  choices: {
    gap: Spacing.sm,
  },
});
