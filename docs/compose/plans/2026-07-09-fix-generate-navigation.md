# Fix Generate Button Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Generate button by restructuring routes to use a Stack layout inside NativeTabs, enabling push navigation for non-tab screens.

**Architecture:** Move all route files into an `(index,explore)` group with a Stack layout. This creates a pushable Stack for each tab, allowing `router.push('/generate')` to work.

**Tech Stack:** Expo Router v56, NativeTabs from `expo-router/unstable-native-tabs`

## Global Constraints

- Follow the `(tab1,tab2)` array route pattern from the building-native-ui skill
- Use `unstable_settings` to anchor each tab's entry route
- Keep all existing route paths and params unchanged
- No functional code changes — only file moves and layout restructuring

---

### Task 1: Create group route directory and Stack layout

**Files:**
- Create: `src/app/(index,explore)/_layout.tsx`

**Interfaces:**
- Produces: Stack layout that wraps all routes in the group

- [ ] **Step 1: Create the group layout file**

Create `src/app/(index,explore)/_layout.tsx`:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(index,explore)/_layout.tsx"
git commit -m "feat: add Stack layout for tab group route"
```

---

### Task 2: Move route files into the group

**Files:**
- Move: `src/app/index.tsx` → `src/app/(index,explore)/index.tsx`
- Move: `src/app/explore.tsx` → `src/app/(index,explore)/explore.tsx`
- Move: `src/app/generate.tsx` → `src/app/(index,explore)/generate.tsx`
- Move: `src/app/story.tsx` → `src/app/(index,explore)/story.tsx`
- Move: `src/app/player.tsx` → `src/app/(index,explore)/player.tsx`

**Interfaces:**
- All route paths remain the same (Expo Router handles group routes transparently)

- [ ] **Step 1: Move all route files**

```bash
mv src/app/index.tsx "src/app/(index,explore)/index.tsx"
mv src/app/explore.tsx "src/app/(index,explore)/explore.tsx"
mv src/app/generate.tsx "src/app/(index,explore)/generate.tsx"
mv src/app/story.tsx "src/app/(index,explore)/story.tsx"
mv src/app/player.tsx "src/app/(index,explore)/player.tsx"
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor: move route files into (index,explore) group"
```

---

### Task 3: Update root layout NativeTabs triggers

**Files:**
- Modify: `src/components/app-tabs.tsx`

**Interfaces:**
- Consumes: Group routes `(index)` and `(explore)` from the new structure

- [ ] **Step 1: Update trigger names to reference group routes**

In `src/components/app-tabs.tsx`, change the trigger `name` props:

```tsx
<NativeTabs.Trigger name="(index)">
```

```tsx
<NativeTabs.Trigger name="(explore)">
```

- [ ] **Step 2: Commit**

```bash
git add src/components/app-tabs.tsx
git commit -m "fix: update NativeTabs triggers to reference group routes"
```

---

### Task 4: Verify the app builds and navigation works

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No new errors (existing test mock errors are pre-existing)

- [ ] **Step 2: Run tests**

```bash
npm test -- --watchAll=false 2>&1 | tail -20
```

Expected: No new test failures

- [ ] **Step 3: Commit final state**

```bash
git add -A
git commit -m "fix: restructure routes to enable push navigation from tabs"
```
