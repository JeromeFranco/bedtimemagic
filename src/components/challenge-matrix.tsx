import { useState } from "react";
import { StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { CATEGORY_COLORS, Colors, Spacing } from "@/theme";
import { CHALLENGE_CATEGORIES, CHALLENGE_TRIGGERS, ChallengeCategory, ChallengeTrigger } from "@/types";
import { Card } from "@/ui/card";
import { Chip } from "@/ui/chip";

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

  return (
    <Card
      onPress={onPress}
      style={[
        styles.categoryCard,
        {
          backgroundColor: isSelected ? colors.tintSelected : Colors.dark.bgSurface,
          borderColor: isSelected ? colors.border : Colors.dark.borderSubtle,
        },
      ]}
    >
      <ThemedText style={[styles.categoryLabel, { color: isSelected ? colors.primary : Colors.dark.textPrimary }]}>
        {label}
      </ThemedText>
    </Card>
  );
}

function TriggerChip({ label, isSelected, categoryId, onPress }: TriggerChipProps) {
  const colors = CATEGORY_COLORS[categoryId];

  return (
    <Chip
      onPress={onPress}
      style={[
        styles.triggerChip,
        {
          backgroundColor: isSelected ? colors.tintSelected : Colors.dark.bgElement,
          borderColor: isSelected ? colors.border : Colors.dark.borderSubtle,
        },
      ]}
    >
      <ThemedText style={[styles.triggerLabel, { color: isSelected ? Colors.dark.textPrimary : Colors.dark.textSecondary }]}>
        {label}
      </ThemedText>
    </Chip>
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
          <Button
            label="Create Tonight's Story"
            fullWidth
            onPress={handleGenerate}
          />
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
  triggerChip: {},
  triggerLabel: {
    fontWeight: "400",
    fontSize: 15,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
});
