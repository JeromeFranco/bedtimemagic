import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { GlassView } from 'expo-glass-effect';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORY_COLORS, Spacing } from '@/constants/theme';
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
  categoryId: ChallengeCategory;
  isSelected: boolean;
  onPress: () => void;
}

interface TriggerChipProps {
  label: string;
  isSelected: boolean;
  categoryId: ChallengeCategory;
  onPress: () => void;
}

function CategoryCard({ emoji, label, isSelected, categoryId, onPress }: CategoryCardProps) {
  const colors = CATEGORY_COLORS[categoryId];

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.categoryCard,
        isSelected && {
          backgroundColor: colors.tintStrong,
          borderColor: colors.border,
        },
      ]}
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={isSelected ? colors.tint : undefined}
        style={styles.categoryCardGlass}
      >
        <ThemedText style={styles.categoryEmoji}>{emoji}</ThemedText>
        <ThemedText
          style={[styles.categoryLabel, isSelected && { color: '#ffffff' }]}
        >
          {label}
        </ThemedText>
      </GlassView>
    </AnimatedPressable>
  );
}

function TriggerChip({ label, isSelected, categoryId, onPress }: TriggerChipProps) {
  const colors = CATEGORY_COLORS[categoryId];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.triggerChip,
        {
          backgroundColor: isSelected ? colors.tintStrong : colors.tint,
          borderColor: isSelected ? colors.borderSubtle : 'transparent',
        },
      ]}
    >
      <ThemedText
        style={[
          styles.triggerLabel,
          { color: isSelected ? '#ffffff' : colors.primary },
        ]}
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
      <ThemedText style={styles.heading}>What&apos;s on your mind tonight?</ThemedText>

      <ThemedView style={styles.tier1Grid}>
        {CHALLENGE_CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            emoji={category.emoji}
            label={category.label}
            categoryId={category.id}
            isSelected={selectedCategory === category.id}
            onPress={() => handleCategoryPress(category.id)}
          />
        ))}
      </ThemedView>

      {selectedCategory && (
        <Animated.View
          key={selectedCategory}
          entering={FadeInDown.duration(300)}
          exiting={FadeOut.duration(200)}
          layout={Layout.springify()}
          style={styles.tier2Container}
        >
          <ThemedView style={styles.tier2Row}>
            {triggersForCategory.map((trigger, index) => (
              <Animated.View
                key={trigger.id}
                entering={FadeInDown.delay(index * 80).duration(300)}
              >
                <TriggerChip
                  label={trigger.label}
                  isSelected={selectedTrigger === trigger.id}
                  categoryId={selectedCategory}
                  onPress={() => handleTriggerPress(trigger.id)}
                />
              </Animated.View>
            ))}
          </ThemedView>
        </Animated.View>
      )}

      {canGenerate && selectedCategory && (
        <Animated.View entering={FadeInUp.duration(250)}>
          <Pressable
            onPress={handleGenerate}
            style={[
              styles.generateButton,
              { backgroundColor: CATEGORY_COLORS[selectedCategory].primary },
            ]}
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
    gap: Spacing.two + 4,
    justifyContent: 'center',
  },
  categoryCard: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  categoryCardGlass: {
    padding: Spacing.three + 4,
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 16,
  },
  categoryEmoji: {
    fontSize: 40,
  },
  categoryLabel: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
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
    borderRadius: 20,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
  },
  triggerLabel: {
    fontWeight: '500',
  },
  generateButton: {
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
