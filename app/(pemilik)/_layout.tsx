import React from 'react';
import { Tabs } from 'expo-router';
import { BottomTabs, type BottomTabItemConfig } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { theme } from '@/lib/theme';

const OWNER_TAB_ITEMS: readonly BottomTabItemConfig[] = [
  {
    routeName: 'index',
    label: 'Antrean',
    activeIcon: 'list',
    inactiveIcon: 'list-outline',
    accessibilityLabel: 'Tab Kelola Antrean',
  },
  {
    routeName: 'ringkasan',
    label: 'Ringkasan',
    activeIcon: 'bar-chart',
    inactiveIcon: 'bar-chart-outline',
    accessibilityLabel: 'Tab Ringkasan Harian',
  },
  {
    routeName: 'pengaturan',
    label: 'Pengaturan',
    activeIcon: 'settings',
    inactiveIcon: 'settings-outline',
    accessibilityLabel: 'Tab Pengaturan Usaha',
  },
  {
    routeName: 'profil',
    label: 'Profil',
    activeIcon: 'person-circle',
    inactiveIcon: 'person-circle-outline',
    accessibilityLabel: 'Tab Profil Pemilik',
  },
];

export default function PemilikLayout() {
  const { ownerBusinessId } = useSession();
  const hideBarOnRoutes = ownerBusinessId
    ? (['onboarding'] as const)
    : (['onboarding', 'profil'] as const);

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.canvas },
      }}
      tabBar={(props) => (
        <BottomTabs
          {...props}
          items={OWNER_TAB_ITEMS}
          hideBarOnRoutes={hideBarOnRoutes}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Kelola Antrean' }} />
      <Tabs.Screen name="ringkasan" options={{ title: 'Ringkasan Harian' }} />
      <Tabs.Screen name="pengaturan" options={{ title: 'Pengaturan Usaha' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil Pemilik' }} />
      <Tabs.Screen
        name="onboarding"
        options={{
          title: 'Pendaftaran Usaha',
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
