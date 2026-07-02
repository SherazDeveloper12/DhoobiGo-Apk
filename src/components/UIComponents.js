import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, AppShadows, Typography, Spacing } from '../theme/typography';

export const PrimaryButton = ({ title, onPress, loading, style, icon }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.buttonWrap, style]}>
    <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
      {Boolean(loading) ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

export const AccentButton = ({ title, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.buttonWrap, style]}>
    <LinearGradient colors={Colors.gradientAccent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
      <Text style={styles.buttonText}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

export const OutlineButton = ({ title, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.outlineBtn, style]}>
    <Text style={styles.outlineBtnText}>{title}</Text>
  </TouchableOpacity>
);

export const GlassCard = ({ children, style }) => (
  <View style={[styles.glassCard, style]}>{children}</View>
);

export const StatusBadge = ({ status }) => {
  const getStatusConfig = (rawStatus) => {
    const s = rawStatus?.toLowerCase() || '';
    
    // Status Logic Mapping
    if (s.includes('pendingbidding')) return { label: 'Open for Bids', color: Colors.pending, bg: 'rgba(255,181,71,0.1)' };
    if (s.includes('bidselected')) return { label: 'Partner Assigned', color: Colors.primary, bg: 'rgba(14,165,233,0.1)' };
    if (s.includes('pickupscheduled')) return { label: 'Collection Scheduled', color: Colors.primary, bg: 'rgba(14,165,233,0.1)' };
    if (s.includes('pickedup')) return { label: 'In Transit (Collection)', color: Colors.accent, bg: 'rgba(16,185,129,0.1)' };
    if (s.includes('inlaundry')) return { label: 'Laundering', color: Colors.accent, bg: 'rgba(16,185,129,0.1)' };
    if (s.includes('readyfordelivery')) return { label: 'Awaiting Return', color: Colors.primary, bg: 'rgba(14,165,233,0.1)' };
    if (s.includes('outfordelivery')) return { label: 'In Transit (Return)', color: Colors.accent, bg: 'rgba(16,185,129,0.1)' };
    if (s.includes('completed')) return { label: 'Delivered', color: Colors.success || Colors.accent, bg: 'rgba(16,185,129,0.1)' };
    if (s.includes('cancelled')) return { label: 'Voided', color: Colors.error, bg: 'rgba(239,68,68,0.1)' };

    return { label: rawStatus || 'Unknown', color: Colors.textSecondary, bg: 'rgba(148,163,184,0.1)' };
  };

  const config = getStatusConfig(status);

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.color }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

export const SectionHeader = ({ title, subtitle }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {Boolean(subtitle) && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  buttonWrap: { borderRadius: BorderRadius.lg, overflow: 'hidden', ...AppShadows.primary },
  button: { paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { color: '#fff', fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.bold, letterSpacing: 0.5 },
  outlineBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' },
  outlineBtnText: { color: Colors.primary, fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.semibold },
  glassCard: {
    backgroundColor: Colors.glass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    ...AppShadows.card,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  badgeText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, textTransform: 'capitalize' },
  sectionHeader: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  sectionSubtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
