import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
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
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withTiming(1.02, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
    }
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.categoryCard,
        animatedStyle,
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
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withTiming(1.03, { duration: 75 }),
        withTiming(1, { duration: 75 })
      );
    }
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.triggerChip,
        animatedStyle,
        {
          backgroundColor: isSelected ? colors.tintSelected : colors.tintLight,
          borderColor: isSelected ? colors.borderSubtle : 'transparent',
        },
      ]}
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={isSelected ? colors.tintStrong : colors.tintLight}
        style={styles.triggerChipGlass}
      >
        <ThemedText
          style={[
            styles.triggerLabel,
            { color: isSelected ? '#ffffff' : colors.textMuted },
          ]}
        >
          {label}
        </ThemedText>
      </GlassView>
    </AnimatedPressable>
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
            style={({ pressed }) => [
              styles.generateButton,
              { backgroundColor: CATEGORY_COLORS[selectedCategory].primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
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
    borderWidth: 1,
  },
  triggerChipGlass: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: 20,
  },
  triggerLabel: {
    fontWeight: '500',
  },
  generateButton: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  generateButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
  },
});
