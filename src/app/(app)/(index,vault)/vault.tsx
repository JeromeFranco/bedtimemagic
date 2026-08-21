import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { StoryHistoryCard } from '@/components/story-history-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { StatusBarScrim } from '@/components/ui/status-bar-scrim';
import { useTopChromeInset } from '@/components/ui/use-top-chrome-inset';
import { useStories } from '@/hooks/use-story';
import { Colors, MaxContentWidth, Spacing } from '@/theme';

function VaultHeader() {
  return (
    <View style={styles.header}>
      <ThemedText style={styles.title}>Your stories</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        Stories you’ve made together.
      </ThemedText>
    </View>
  );
}

function InitialLoadingState() {
  return (
    <View style={styles.listState}>
      <ActivityIndicator
        size="large"
        color={Colors.dark.textPrimary}
        accessibilityLabel="Loading stories"
      />
      <ThemedText themeColor="textSecondary" style={styles.loadingText}>
        Loading stories…
      </ThemedText>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.listState}>
      <ThemedText style={styles.stateTitle}>Create your first story</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.stateText}>
        It’ll be here whenever you’re ready to listen again.
      </ThemedText>
      <Button label="Create a story" onPress={() => router.push('/')} />
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.listState}>
      <ThemedText style={styles.stateTitle}>We couldn&apos;t load your stories.</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.stateText}>
        Please try again.
      </ThemedText>
      <Button label="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

function StorySeparator() {
  return <View style={styles.separator} />;
}

export default function VaultScreen() {
  const topChromeInset = useTopChromeInset({ hasNativeHeader: false });
  const { data, isError, isPending, isRefetching, refetch } = useStories();
  const stories = data ?? [];

  const renderEmptyState = () => {
    if (isPending) return <InitialLoadingState />;
    if (isError) return <ErrorState onRetry={() => { void refetch(); }} />;
    return <EmptyState />;
  };

  return (
    <ThemedView collapsable={false} style={styles.container}>
      <FlatList
        data={stories}
        keyExtractor={(story) => story.id}
        renderItem={({ item: story }) => (
          <StoryHistoryCard
            story={story}
            onPress={() => router.push({ pathname: '/story', params: { id: story.id } })}
          />
        )}
        ListHeaderComponent={VaultHeader}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={StorySeparator}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={(
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { void refetch(); }}
            tintColor={Colors.dark.textPrimary}
          />
        )}
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'android' && { paddingTop: topChromeInset + Spacing.xl },
        ]}
      />
      <StatusBarScrim height={topChromeInset} />
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
    maxWidth: MaxContentWidth,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    width: '100%',
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  title: {
    color: Colors.dark.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.24,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
  },
  separator: {
    height: Spacing.lg,
  },
  listState: {
    alignItems: 'center',
    gap: Spacing.lg,
    justifyContent: 'center',
    minHeight: 320,
  },
  loadingText: {
    fontSize: 16,
  },
  stateTitle: {
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    fontSize: 15,
    paddingHorizontal: Spacing.xl,
    textAlign: 'center',
  },
});
