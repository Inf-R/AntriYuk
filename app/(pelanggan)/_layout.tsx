import React from 'react';
import { type ColorValue, Pressable, Text, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { theme } from '@/lib/theme';

function TabBadgeIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={[styles.tabIcon, { color }]}>{symbol}</Text>;
}

export default function PelangganLayout() {
  const router = useRouter();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          headerTitle: 'Daftar Usaha',
          tabBarIcon: ({ color }) => <TabBadgeIcon symbol="⌂" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tiket"
        options={{
          title: 'Tiket',
          headerTitle: 'Tiket Antrean Saya',
          tabBarIcon: ({ color }) => <TabBadgeIcon symbol="♯" color={color} />,
        }}
      />
      <Tabs.Screen
        name="riwayat"
        options={{
          title: 'Riwayat',
          headerTitle: 'Riwayat Antrean',
          tabBarIcon: ({ color }) => <TabBadgeIcon symbol="◷" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          headerTitle: 'Profil Pelanggan',
          tabBarIcon: ({ color }) => <TabBadgeIcon symbol="◉" color={color} />,
        }}
      />
      <Tabs.Screen
        name="usaha/[id]"
        options={{
          title: 'Detail Usaha',
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
          headerLeft: () => (
            <Pressable
              style={styles.backButton}
              onPress={() => router.navigate('/(pelanggan)')}
            >
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});
