import React from 'react';
import { Tabs } from 'expo-router';
import { BottomTabs, type BottomTabItemConfig } from '@/components/ui';
import { theme } from '@/lib/theme';

const CUSTOMER_TAB_ITEMS: readonly BottomTabItemConfig[] = [
  {
    routeName: 'index',
    label: 'Beranda',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
    accessibilityLabel: 'Tab Beranda',
  },
  {
    routeName: 'tiket',
    label: 'Antrean',
    activeIcon: 'ticket',
    inactiveIcon: 'ticket-outline',
    accessibilityLabel: 'Tab Antrean Saya',
  },
  {
    routeName: 'riwayat',
    label: 'Riwayat',
    activeIcon: 'time',
    inactiveIcon: 'time-outline',
    accessibilityLabel: 'Tab Riwayat Antrean',
  },
  {
    routeName: 'profil',
    label: 'Profil',
    activeIcon: 'person-circle',
    inactiveIcon: 'person-circle-outline',
    accessibilityLabel: 'Tab Profil Pelanggan',
  },
];

export default function PelangganLayout() {
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
          items={CUSTOMER_TAB_ITEMS}
          hideBarOnRoutes={['usaha/[id]']}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="tiket" options={{ title: 'Antrean Saya' }} />
      <Tabs.Screen name="riwayat" options={{ title: 'Riwayat Antrean' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
      <Tabs.Screen
        name="usaha/[id]"
        options={{
          title: 'Detail Usaha',
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
