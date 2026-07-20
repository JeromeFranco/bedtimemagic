import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { CATEGORY_COLORS, Colors, Spacing } from "@/constants/theme";
import { CHALLENGE_CATEGORIES, CHALLENGE_TRIGGERS, ChallengeCategory, ChallengeTrigger } from "@/types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChallengeMatrixProps {
  onGenerate: (category: ChallengeCategory, trigger: ChallengeTrigger) => void;
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
  const bgColor = useSharedValue<string>(Colors.dark.bgElement);

  useEffect(() => {
    bgColor.value = withTiming(isSelected ? colors.tintStrong : Colors.dark.bgElement, { duration: 150 });
  }, [isSelected, colors.tintStrong, bgColor]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (!isSelected) {
          // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
          bgColor.value = withTiming(Colors.dark.bgElementHover, { duration: 150 });
        }
      }}
      onPressOut={() => {
        if (!isSelected) {
          // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
          bgColor.value = withTiming(Colors.dark.bgElement, { duration: 150 });
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
      <ThemedText style={[styles.categoryLabel, isSelected && { color: "#ffffff" }]}>{label}</ThemedText>
    </AnimatedPressable>
  );
}

function TriggerChip({ label, isSelected, categoryId, onPress }: TriggerChipProps) {
  const colors = CATEGORY_COLORS[categoryId];
  const bgColor = useSharedValue<string>(colors.tintLight);

  useEffect(() => {
    bgColor.value = withTiming(isSelected ? colors.tintSelected : colors.tintLight, { duration: 150 });
  }, [isSelected, colors.tintSelected, colors.tintLight, bgColor]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (!isSelected) {
          // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
          bgColor.value = withTiming(Colors.dark.bgElementHover, { duration: 150 });
        }
      }}
      onPressOut={() => {
        if (!isSelected) {
          // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
          bgColor.value = withTiming(colors.tintLight, { duration: 150 });
        }
      }}
      style={[
        styles.triggerChip,
        animatedStyle,
        {
          borderColor: isSelected ? colors.borderSubtle : "transparent",
        },
      ]}
    >
      <ThemedText style={[styles.triggerLabel, { color: isSelected ? "#ffffff" : colors.textMuted }]}>
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

export function ChallengeMatrix({ onGenerate }: ChallengeMatrixProps) {
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
    if (canGenerate) {
      onGenerate(selectedCategory, selectedTrigger);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.heading}>What&apos;s on your mind tonight?</ThemedText>

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
                  key={trigger.id}
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
            style={({ pressed }) => [styles.generateButton, pressed && { backgroundColor: Colors.dark.bgElementHover }]}
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
    gap: Spacing.four,
  },
  heading: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 24,
    letterSpacing: -0.24,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "center",
  },
  categoryCard: {
    width: "47%",
    minHeight: 80,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  categoryLabel: {
    textAlign: "center",
    fontWeight: "500",
    fontSize: 15,
  },
  triggersContainer: {
    marginTop: Spacing.two,
  },
  triggerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "center",
  },
  triggerChip: {
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  triggerLabel: {
    fontWeight: "400",
    fontSize: 15,
    paddingVertical: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
  },
  generateButton: {
    alignSelf: "stretch",
    backgroundColor: Colors.dark.bgElement,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 12,
    alignItems: "center",
    marginTop: Spacing.two,
  },
  generateButtonText: {
    color: Colors.dark.textPrimary,
    fontWeight: "500",
    fontSize: 17,
  },
});
