/**
 * TicketCard — kartu tiket utama pelanggan dengan kepala primary (#063C92),
 * nomor antrean putih berukuran besar (displayHero), pemisah tiket bergaris
 * putus-putus dengan lekuk lingkaran kiri-kanan berwarna canvas, tiga metrik
 * sejajar (Di depan Anda, Estimasi, Sedang dilayani), dan baris waktu.
 *
 * Contoh:
 *   <TicketCard
 *     businessName="Kopi Nusantara"
 *     ticketNumber={42}
 *     status="waiting"
 *     ahead={3}
 *     estMinutes={10}
 *     currentNumber={39}
 *     timeLabel="Diperbarui pukul 14:30 WIB"
 *   />
 */
import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme';
import { Icon } from './Icon';
import { PillStatus, StatusPill } from './StatusPill';

export interface TicketCardProps {
  businessName: string;
  ticketNumber: number;
  status: PillStatus;
  statusLabel?: string;
  ahead: number;
  estMinutes: number;
  currentNumber: number;
  /** Keterangan waktu ambil / pembaruan, mis. "14:30 WIB". */
  timeLabel?: string;
  /** Sisa kuota tunda opsional, mis. "Sisa tunda 2x". */
  deferQuotaLabel?: string;
  /** Konten tambahan di bagian bawah kartu (mis. kartu dipanggil atau tombol). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const NOTCH_SIZE = 22;
const DASH_COUNT = 18;

export function TicketCard({
  businessName,
  ticketNumber,
  status,
  statusLabel,
  ahead,
  estMinutes,
  currentNumber,
  timeLabel,
  deferQuotaLabel,
  children,
  style,
}: TicketCardProps) {
  const estText = estMinutes <= 0 ? 'Sebentar lagi' : `± ${estMinutes} mnt`;

  return (
    <View style={[styles.card, style]}>
      {/* Baris identitas usaha & status */}
      <View style={styles.businessHeader}>
        <View style={styles.businessIconWrap}>
          <Icon name="storefront-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.businessTextWrap}>
          <Text style={styles.businessLabel}>Usaha Tujuan</Text>
          <Text style={styles.businessName} numberOfLines={2}>
            {businessName}
          </Text>
        </View>
        <StatusPill status={status} label={statusLabel} />
      </View>

      {/* Kepala kartu nomor (#063C92) */}
      <View
        style={styles.numberBanner}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`Nomor Anda ${ticketNumber}`}
      >
        <Text style={styles.numberCaption}>Nomor Anda</Text>
        <Text style={styles.numberValue} adjustsFontSizeToFit numberOfLines={1}>
          {ticketNumber}
        </Text>
      </View>

      {/* Pemisah tiket: lekuk kiri-kanan + garis putus-putus */}
      <View style={styles.perforationRow} pointerEvents="none">
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dashTrack}>
          {Array.from({ length: DASH_COUNT }, (_, idx) => (
            <View key={idx} style={styles.dashSegment} />
          ))}
        </View>
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      {/* Tiga metrik sejajar */}
      <View style={styles.metricsRow}>
        <View
          style={styles.metricCol}
          accessible
          accessibilityLabel={`Di depan Anda: ${ahead} orang`}
        >
          <View style={styles.metricHeader}>
            <Icon name="people-outline" size={14} color={colors.accent} />
            <Text style={styles.metricLabel} numberOfLines={1}>
              Di depan Anda
            </Text>
          </View>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {ahead} <Text style={styles.metricUnit}>org</Text>
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View
          style={styles.metricCol}
          accessible
          accessibilityLabel={`Estimasi: ${estText}`}
        >
          <View style={styles.metricHeader}>
            <Icon name="time-outline" size={14} color={colors.accent} />
            <Text style={styles.metricLabel} numberOfLines={1}>
              Estimasi
            </Text>
          </View>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {estText}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View
          style={styles.metricCol}
          accessible
          accessibilityLabel={`Sedang dilayani: nomor ${currentNumber}`}
        >
          <View style={styles.metricHeader}>
            <Icon name="megaphone-outline" size={14} color={colors.accent} />
            <Text style={styles.metricLabel} numberOfLines={1}>
              Sedang dilayani
            </Text>
          </View>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {currentNumber}
          </Text>
        </View>
      </View>

      {/* Keterangan waktu & kuota tunda */}
      {timeLabel || deferQuotaLabel ? (
        <View style={styles.metaBox}>
          {timeLabel ? (
            <View style={styles.metaItem}>
              <Icon name="calendar-outline" size={16} color={colors.accent} />
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaCaption}>Waktu Pembaruan</Text>
                <Text style={styles.metaValue}>{timeLabel}</Text>
              </View>
            </View>
          ) : null}
          {deferQuotaLabel ? (
            <View style={styles.deferBadge}>
              <Text style={styles.deferBadgeText}>{deferQuotaLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {children ? <View style={styles.childrenSlot}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.screen,
    ...shadows.soft,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  businessIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.button,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessTextWrap: {
    flex: 1,
    gap: 2,
  },
  businessLabel: {
    ...typography.caption,
  },
  businessName: {
    ...typography.subtitle,
    fontSize: 17,
  },
  numberBanner: {
    backgroundColor: colors.primary,
    borderRadius: radii.tile,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberCaption: {
    ...typography.label,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  numberValue: {
    ...typography.displayHero,
    color: colors.white,
  },
  perforationRow: {
    height: NOTCH_SIZE + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -spacing.screen,
    marginVertical: spacing.xs,
  },
  notch: {
    width: NOTCH_SIZE,
    height: NOTCH_SIZE,
    borderRadius: NOTCH_SIZE / 2,
    backgroundColor: colors.canvas,
  },
  notchLeft: {
    marginLeft: -NOTCH_SIZE / 2,
  },
  notchRight: {
    marginRight: -NOTCH_SIZE / 2,
  },
  dashTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  dashSegment: {
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.border,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.sm,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    ...typography.caption,
    textAlign: 'center',
  },
  metricValue: {
    ...typography.subtitle,
    fontSize: 19,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  metricUnit: {
    ...typography.captionStrong,
    color: colors.slateText,
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: spacing.xs,
  },
  metaBox: {
    marginTop: spacing.md,
    backgroundColor: colors.canvas,
    borderRadius: radii.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  metaTextWrap: {
    flex: 1,
    gap: 1,
  },
  metaCaption: {
    ...typography.caption,
  },
  metaValue: {
    ...typography.bodyBold,
    color: colors.ink,
  },
  deferBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  deferBadgeText: {
    ...typography.captionStrong,
    color: colors.primary,
  },
  childrenSlot: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});
