import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { StatusBarScrim } from '@/components/ui/status-bar-scrim';
import { useTopChromeInset } from '@/components/ui/use-top-chrome-inset';
import { useProfileDraft } from '@/contexts/ProfileDraftContext';
import { getNicknameValidationError, normalizeNickname } from '@/lib/nickname';
import { Colors, Layout, Spacing } from '@/theme';
import { PROTAGONISTS, type DevelopmentalStage, type Protagonist } from '@/types';
import { SelectionRow } from '@/ui/selection-row';

export type ProfileSubmissionInput = {
  nickname: string;
  developmentalStage: DevelopmentalStage;
  protagonist: Protagonist;
};

type ProtagonistSelectionScreenProps = {
  onSubmit: (input: ProfileSubmissionInput) => Promise<void>;
};

export function ProtagonistSelectionScreen({
  onSubmit,
}: ProtagonistSelectionScreenProps) {
  const { draft, setProtagonist } = useProfileDraft();
  const topChromeInset = useTopChromeInset({ hasNativeHeader: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const submissionInFlightRef = useRef(false);
  const buttonLabel = isSubmitting
    ? 'Saving…'
    : draft.mode === 'onboarding'
      ? 'Finish Setup'
      : 'Add Profile';

  const handleSubmit = async () => {
    if (
      submissionInFlightRef.current
      || !draft.developmentalStage
      || !draft.protagonist
      || getNicknameValidationError(draft.nickname)
    ) {
      return;
    }

    submissionInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      await onSubmit({
        nickname: normalizeNickname(draft.nickname),
        developmentalStage: draft.developmentalStage,
        protagonist: draft.protagonist,
      });
    } catch {
      setSubmissionError("We couldn't save this profile. Try again.");
    } finally {
      submissionInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'android' && { paddingTop: topChromeInset + Spacing.xl },
        ]}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.section}>
          <ThemedText type="title">Choose a story friend</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            Pick who will lead the stories.
          </ThemedText>
        </View>

        <View style={styles.choices} accessibilityRole="radiogroup">
          {PROTAGONISTS.map((protagonist) => (
            <SelectionRow
              key={protagonist.id}
              label={protagonist.name}
              supportingText={protagonist.species}
              selected={draft.protagonist === protagonist.id}
              disabled={isSubmitting}
              onPress={() => {
                setProtagonist(protagonist.id);
                setSubmissionError(null);
              }}
              testID={`protagonist-${protagonist.id}`}
            />
          ))}
        </View>

        {submissionError ? (
          <ThemedText
            type="small"
            themeColor="error"
            accessibilityLiveRegion="polite"
          >
            {submissionError}
          </ThemedText>
        ) : null}

        <Button
          label={buttonLabel}
          onPress={() => void handleSubmit()}
          disabled={!draft.protagonist || isSubmitting}
          fullWidth
          testID="profile-submit"
        />
      </ScrollView>
      <StatusBarScrim height={topChromeInset} />
    </View>
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
    gap: Spacing.sm,
  },
  choices: {
    gap: Spacing.sm,
  },
});
