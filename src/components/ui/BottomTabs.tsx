/**
 * BottomTabs — bilah navigasi bawah kustom untuk Expo Router Tabs.
 * Bar putih bersudut atas membulat dengan bayangan lembut:
 * - Menu aktif: ikon di dalam pil primarySoft + garis aksen atas + label #063C92 (primary).
 * - Menu nonaktif: ikon muted + label slateText.
 * - Rute di dalam hiddenRoutes (mis. 'onboarding' atau 'usaha/[id]') tidak ditampilkan
 *   di deretan menu, dan bila rute aktif ada di hideBarOnRoutes maka seluruh bar disembunyikan.
 *
 * Contoh:
 *   <Tabs tabBar={(props) => (
 *     <BottomTabs {...props} items={CUSTOMER_TABS} hideBarOnRoutes={['usaha/[id]']} />
 *   )} />
 */
import React, { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { colors, radii, shadows, sizes, spacing, typography } from '@/lib/theme';
import { Icon, IconName } from './Icon';

type ExpoTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export interface BottomTabItemConfig {
  /** Nama file rute di dalam grup, mis. 'index', 'tiket', 'riwayat', 'profil'. */
  routeName: string;
  label: string;
  activeIcon: IconName;
  inactiveIcon: IconName;
  accessibilityLabel?: string;
}

export interface BottomTabsProps extends ExpoTabBarProps {
  items: readonly BottomTabItemConfig[];
  /** Sembunyikan seluruh bilah tab ketika berada di salah satu rute ini. */
  hideBarOnRoutes?: readonly string[];
}

export function BottomTabs({
  state,
  emitter,
  navigateToTab,
  insets,
  items,
  hideBarOnRoutes = [],
}: BottomTabsProps) {
  const activeRoute = state.routes[state.index];
  if (activeRoute && hideBarOnRoutes.includes(activeRoute.name)) {
    return null;
  }

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
      accessibilityRole="tablist"
    >
      {items.map((item) => {
        const routeIndex = state.routes.findIndex((r) => r.name === item.routeName);
        if (routeIndex === -1) {
          return null;
        }
        const route = state.routes[routeIndex];
        if (!route) {
          return null;
        }
        const isFocused = state.index === routeIndex;

        const handlePress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigateToTab(route.key);
          }
        };

        return (
          <Pressable
            key={item.routeName}
            onPress={handlePress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            style={({ pressed }) => [
              styles.tabItem,
              pressed ? styles.tabItemPressed : null,
            ]}
          >
            <View style={[styles.topIndicator, isFocused ? styles.topIndicatorActive : null]} />
            <View style={[styles.iconPill, isFocused ? styles.iconPillActive : null]}>
              <Icon
                name={isFocused ? item.activeIcon : item.inactiveIcon}
                size={20}
                color={isFocused ? colors.primary : colors.muted}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    ...shadows.soft,
  },
  tabItem: {
    flex: 1,
    minHeight: sizes.touchMin + 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  tabItemPressed: {
    opacity: 0.75,
  },
  topIndicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  topIndicatorActive: {
    backgroundColor: colors.accent,
  },
  iconPill: {
    minWidth: 48,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  iconPillActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    ...typography.captionStrong,
    fontSize: 12,
    lineHeight: 16,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  labelInactive: {
    color: colors.slateText,
    fontWeight: '500',
  },
});
