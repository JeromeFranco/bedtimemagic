import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { CATEGORY_COLORS, Colors, Spacing } from "@/theme";
import { CHALLENGE_CATEGORIES, CHALLENGE_TRIGGERS, ChallengeCategory, ChallengeTrigger } from "@/types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChallengeMatrixProps {
  onGenerate: (category: ChallengeCategory, trigger: ChallengeTrigger) => void;
  showHeading?: boolean;
}

interface CategoryCardProps {
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

function CategoryCard({ label, isSelected, categoryId, onPress }: CategoryCardProps) {
  const colors = CATEGORY_COLORS[categoryId];
  const bgColor = useSharedValue<string>(Colors.dark.bgSurface);

  useEffect(() => {
    bgColor.set(withTiming(isSelected ? colors.tintSelected : Colors.dark.bgSurface, { duration: 150 }));
  }, [isSelected, colors.tintSelected, bgColor]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (!isSelected) {
          bgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }));
        }
      }}
      onPressOut={() => {
        if (!isSelected) {
          bgColor.set(withTiming(Colors.dark.bgSurface, { duration: 150 }));
        }
      }}
      style={[
        styles.categoryCard,
        animatedStyle,
        {
          borderColor: isSelected ? colors.border : Colors.dark.borderSubtle,
        },
      ]}
    >
      <ThemedText style={[styles.categoryLabel, { color: isSelected ? colors.primary : Colors.dark.textPrimary }]}>
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

function TriggerChip({ label, isSelected, categoryId, onPress }: TriggerChipProps) {
  const colors = CATEGORY_COLORS[categoryId];
  const bgColor = useSharedValue<string>(isSelected ? colors.tintSelected : Colors.dark.bgElement);

  useEffect(() => {
    bgColor.set(withTiming(isSelected ? colors.tintSelected : Colors.dark.bgElement, { duration: 150 }));
  }, [isSelected, colors.tintSelected, bgColor]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (!isSelected) {
          bgColor.set(withTiming(Colors.dark.bgElementHover, { duration: 150 }));
        }
      }}
      onPressOut={() => {
        if (!isSelected) {
          bgColor.set(withTiming(Colors.dark.bgElement, { duration: 150 }));
        }
      }}
      style={[
        styles.triggerChip,
        animatedStyle,
        {
          borderColor: isSelected ? colors.border : Colors.dark.borderSubtle,
        },
      ]}
    >
      <ThemedText style={[styles.triggerLabel, { color: isSelected ? Colors.dark.textPrimary : Colors.dark.textSecondary }]}>
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

export function ChallengeMatrix({ onGenerate, showHeading = false }: ChallengeMatrixProps) {
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<ChallengeTrigger | null>(null);

  const triggersForCategory = selectedCategory ? CHALLENGE_TRIGGERS.filter((t) => t.category === selectedCategory) : [];

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
    if (canGenerate && selectedCategory && selectedTrigger) {
      onGenerate(selectedCategory, selectedTrigger);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {showHeading && (
        <ThemedText style={styles.heading}>What&apos;s on your mind tonight?</ThemedText>
      )}

      <ThemedView style={styles.categoryGrid}>
        {CHALLENGE_CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
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
          entering={FadeInDown.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.triggersContainer}
        >
          <ThemedView style={styles.triggerRow}>
            {triggersForCategory.map((trigger, index) => (
              <Animated.View key={trigger.id} entering={FadeInDown.delay(index * 60).duration(200)}>
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
        <Animated.View entering={FadeInDown.duration(200)}>
          <Pressable
            onPress={handleGenerate}
            style={({ pressed }) => [
              styles.generateButton,
              pressed && { backgroundColor: Colors.dark.bgElementHover },
            ]}
          >
            <ThemedText style={styles.generateButtonText}>Create Tonight&apos;s Story</ThemedText>
          </Pressable>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xl,
    backgroundColor: 'transparent',
  },
  heading: {
    textAlign: "left",
    fontWeight: "700",
    fontSize: 24,
    letterSpacing: -0.24,
    color: Colors.dark.textPrimary,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "space-between",
    backgroundColor: 'transparent',
  },
  categoryCard: {
    width: "48%",
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  categoryLabel: {
    textAlign: "center",
    fontWeight: "500",
    fontSize: 15,
    lineHeight: 20,
  },
  triggersContainer: {
    marginTop: Spacing.xs,
    backgroundColor: 'transparent',
  },
  triggerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "flex-start",
    backgroundColor: 'transparent',
  },
  triggerChip: {
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  triggerLabel: {
    fontWeight: "400",
    fontSize: 15,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  generateButton: {
    alignSelf: "stretch",
    backgroundColor: Colors.dark.bgElement,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    alignItems: "center",
    marginTop: Spacing.sm,
    minHeight: 48,
    justifyContent: "center",
  },
  generateButtonText: {
    color: Colors.dark.textPrimary,
    fontWeight: "500",
    fontSize: 17,
  },
});
