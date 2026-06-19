import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  CHALLENGE_CATEGORIES,
  CHALLENGE_TRIGGERS,
  ChallengeCategory,
  ChallengeTrigger,
} from '@/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChallengeMatrixProps {
  onGenerate: (category: ChallengeCategory, trigger: ChallengeTrigger) => void;
}

interface CategoryCardProps {
  emoji: string;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

interface TriggerChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

function CategoryCard({ emoji, label, isSelected, onPress }: CategoryCardProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
    >
      <ThemedText style={styles.categoryEmoji}>{emoji}</ThemedText>
      <ThemedText
        style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}
      >
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

function TriggerChip({ label, isSelected, onPress }: TriggerChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.triggerChip, isSelected && styles.triggerChipSelected]}
    >
      <ThemedText
        style={[styles.triggerLabel, isSelected && styles.triggerLabelSelected]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function ChallengeMatrix({ onGenerate }: ChallengeMatrixProps) {
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<ChallengeTrigger | null>(null);

  const triggersForCategory = selectedCategory
    ? CHALLENGE_TRIGGERS.filter((t) => t.category === selectedCategory)
    : [];

  const handleCategoryPress = (category: ChallengeCategory) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setSelectedTrigger(null);
    } else {
      setSelectedCategory(category);
      setSelectedTrigger(null);
    }
  };

  const handleTriggerPress = (trigger: ChallengeTrigger) => {
    if (selectedTrigger === trigger) {
      setSelectedTrigger(null);
    } else {
      setSelectedTrigger(trigger);
    }
  };

  const canGenerate = selectedCategory !== null && selectedTrigger !== null;

  const handleGenerate = () => {
    if (canGenerate) {
      onGenerate(selectedCategory, selectedTrigger);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.heading}>What's on your mind tonight?</ThemedText>

      <ThemedView style={styles.tier1Grid}>
        {CHALLENGE_CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            emoji={category.emoji}
            label={category.label}
            isSelected={selectedCategory === category.id}
            onPress={() => handleCategoryPress(category.id)}
          />
        ))}
      </ThemedView>

      {selectedCategory && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          layout={Layout.springify()}
          style={styles.tier2Container}
        >
          <ThemedView style={styles.tier2Row}>
            {triggersForCategory.map((trigger) => (
              <TriggerChip
                key={trigger.id}
                label={trigger.label}
                isSelected={selectedTrigger === trigger.id}
                onPress={() => handleTriggerPress(trigger.id)}
              />
            ))}
          </ThemedView>
        </Animated.View>
      )}

      {canGenerate && (
        <Animated.View entering={FadeIn}>
          <Pressable
            onPress={handleGenerate}
            style={styles.generateButton}
          >
            <ThemedText style={styles.generateButtonText}>Generate</ThemedText>
          </Pressable>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  heading: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  tier1Grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  categoryCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderColor: 'rgba(99,102,241,0.6)',
  },
  categoryEmoji: {
    fontSize: 32,
  },
  categoryLabel: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
  },
  categoryLabelSelected: {
    color: '#ffffff',
  },
  tier2Container: {
    marginTop: Spacing.two,
  },
  tier2Row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  triggerChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: Spacing.one + 4,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  triggerChipSelected: {
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderColor: 'rgba(99,102,241,0.5)',
  },
  triggerLabel: {
    color: 'rgba(255,255,255,0.7)',
  },
  triggerLabelSelected: {
    color: '#ffffff',
  },
  generateButton: {
    backgroundColor: 'rgba(99,102,241,0.9)',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  generateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 18,
  },
});
