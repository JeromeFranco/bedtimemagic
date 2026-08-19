import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { View } from 'react-native';

import { StoryGenerationStatusOverlay } from '@/components/story-generation-status';
import { Colors } from '@/theme';

export default function AppTabs() {
  const colors = Colors.dark;

  return (
    <View style={{ flex: 1 }}>
      <NativeTabs
        backgroundColor={colors.bgBase}
        indicatorColor={colors.bgElement}
        labelStyle={{ selected: { color: colors.textPrimary } }}>
        <NativeTabs.Trigger name="(index)" disableTransparentOnScrollEdge>
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/home.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="(vault)" disableTransparentOnScrollEdge>
          <NativeTabs.Trigger.Label>Vault</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
      <StoryGenerationStatusOverlay />
    </View>
  );
}
