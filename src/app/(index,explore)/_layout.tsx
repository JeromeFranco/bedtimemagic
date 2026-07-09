import Stack from "expo-router/stack";

export const unstable_settings = {
  index: { anchor: "index" },
  explore: { anchor: "explore" },
};

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="generate" />
      <Stack.Screen name="story" />
      <Stack.Screen name="player" />
    </Stack>
  );
}
