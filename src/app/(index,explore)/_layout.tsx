import Stack from "expo-router/stack";

export const unstable_settings = {
  index: { anchor: "index" },
  explore: { anchor: "explore" },
};

export default function Layout({ segment }: { segment: string }) {
  const activeTab = segment.match(/\((.*)\)/)?.[1]!;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={activeTab} />
      <Stack.Screen name="generate" />
      <Stack.Screen name="story" />
      <Stack.Screen name="player" />
    </Stack>
  );
}
