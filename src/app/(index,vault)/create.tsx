import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet } from 'react-native';
import { router, useNavigation } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSelectedChild } from '@/contexts/SelectedChildContext';
import { useStoryGeneration } from '@/contexts/StoryGenerationContext';
import { CATEGORY_COLORS, Colors, FontWeights, Layout, Spacing } from '@/theme';
import {
  CHALLENGE_CATEGORIES,
  CHALLENGE_TRIGGERS,
  type ChallengeCategory,
  type ChallengeTrigger,
} from '@/types';
import { Chip } from '@/ui/chip';
import { SelectionRow } from '@/ui/selection-row';

export default function CreateStoryScreen() {
  const navigation = useNavigation();
  const { selectedProfile } = useSelectedChild();
  const { startGeneration, resumeWaiting } = useStoryGeneration();
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | null>(null);
  const allowNextRemovalRef = useRef(false);
  const announcedCategoryRef = useRef<ChallengeCategory | null>(null);

  const categories = CHALLENGE_CATEGORIES.filter((category) => (
    CHALLENGE_TRIGGERS.some((trigger) => trigger.category === category.id)
  ));
  const selectedCategoryInfo = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)
    : null;
  const triggers = selectedCategory
    ? CHALLENGE_TRIGGERS.filter((trigger) => trigger.category === selectedCategory)
    : [];

  useEffect(() => {
    if (!selectedCategory) {
      announcedCategoryRef.current = null;
      return;
    }
    if (announcedCategoryRef.current === selectedCategory) return;

    const category = CHALLENGE_CATEGORIES.find((item) => item.id === selectedCategory);
    if (!category) return;

    announcedCategoryRef.current = selectedCategory;
    AccessibilityInfo.announceForAccessibility(`${category.label} selected. What happened?`);
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedCategory) return;

    return navigation.addListener('beforeRemove', (event) => {
      if (allowNextRemovalRef.current) {
        allowNextRemovalRef.current = false;
        return;
      }

      event.preventDefault();
      setSelectedCategory(null);
    });
  }, [navigation, selectedCategory]);

  const handleTriggerPress = (trigger: ChallengeTrigger) => {
    if (!selectedCategory || !selectedProfile) return;

    const result = startGeneration({
      childId: selectedProfile.id,
      childName: selectedProfile.name,
      protagonist: selectedProfile.protagonist,
      developmentalStage: selectedProfile.developmental_stage,
      category: selectedCategory,
      trigger,
    });

    if (result.status === 'already-generating') {
      resumeWaiting();
    }

    allowNextRemovalRef.current = true;
    router.replace('/generate');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="body" themeColor="textSecondary">
          {selectedProfile ? `A story for ${selectedProfile.name}` : 'Choose a story'}
        </ThemedText>

        {selectedCategory && selectedCategoryInfo ? (
          <ThemedView style={styles.section}>
            <Chip
              contentStyle={styles.categoryChipContent}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: CATEGORY_COLORS[selectedCategory].tint,
                  borderColor: CATEGORY_COLORS[selectedCategory].border,
                },
              ]}
            >
              <ThemedText type="small" style={styles.categoryChipLabel}>
                {selectedCategoryInfo.label}
              </ThemedText>
            </Chip>
            <ThemedText type="heading">What happened?</ThemedText>
            <ThemedView style={styles.triggerList}>
              {triggers.map((trigger) => (
                <Chip
                  key={trigger.id}
                  onPress={() => handleTriggerPress(trigger.id)}
                  accessibilityLabel={trigger.label}
                  accessibilityRole="button"
                  contentStyle={styles.triggerChipContent}
                  style={styles.triggerChip}
                  testID={`trigger-${trigger.id}`}
                >
                  <ThemedText type="body" style={styles.triggerLabel}>
                    {trigger.label}
                  </ThemedText>
                </Chip>
              ))}
            </ThemedView>
          </ThemedView>
        ) : (
          <ThemedView style={styles.section}>
            <ThemedText type="heading">What needs a story tonight?</ThemedText>
            <ThemedView style={styles.categoryList}>
              {categories.map((category) => (
                <SelectionRow
                  key={category.id}
                  label={category.label}
                  onPress={() => setSelectedCategory(category.id)}
                  accessibilityHint="Choose a challenge for this story"
                  testID={`category-${category.id}`}
                />
              ))}
            </ThemedView>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    width: '100%',
  },
  section: {
    gap: Spacing.lg,
    backgroundColor: 'transparent',
  },
  categoryList: {
    gap: Spacing.sm,
    backgroundColor: 'transparent',
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
  categoryChipContent: {
    paddingHorizontal: Spacing.lg,
  },
  categoryChipLabel: {
    color: Colors.dark.textPrimary,
    fontWeight: FontWeights.medium,
  },
  triggerList: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    backgroundColor: 'transparent',
  },
  triggerChip: {
    maxWidth: '100%',
  },
  triggerChipContent: {
    paddingHorizontal: Spacing.lg,
  },
  triggerLabel: {
    color: Colors.dark.textSecondary,
    fontWeight: FontWeights.medium,
    paddingVertical: Spacing.sm,
  },
});
