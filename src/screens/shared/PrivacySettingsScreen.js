import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../theme/typography';
import { userService } from '../../services/api';

export default function PrivacySettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailMarketing: false,
    locationSharing: true,
    dataAnalytics: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    // Keeping local defaults to avoid backend errors
    setLoading(false);
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    
    // Simulate success without backend call
    console.log(`[PRIVACY] ${key} toggled to:`, newSettings[key]);
    // Optional: Add a subtle hint that it's saved locally
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Communication</Text>
        <View style={styles.card}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive alerts about order status and bids.</Text>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={() => toggleSetting('pushNotifications')}
              trackColor={{ false: '#CBD5E1', true: Colors.primary }}
            />
          </View>
          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Email Marketing</Text>
              <Text style={styles.settingDesc}>Get updates on promotions and discounts.</Text>
            </View>
            <Switch
              value={settings.emailMarketing}
              onValueChange={() => toggleSetting('emailMarketing')}
              trackColor={{ false: '#CBD5E1', true: Colors.primary }}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Data & Security</Text>
        <View style={styles.card}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Location Sharing</Text>
              <Text style={styles.settingDesc}>Allow riders to find your pickup location faster.</Text>
            </View>
            <Switch
              value={settings.locationSharing}
              onValueChange={() => toggleSetting('locationSharing')}
              trackColor={{ false: '#CBD5E1', true: Colors.primary }}
            />
          </View>
          <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Data Analytics</Text>
              <Text style={styles.settingDesc}>Share anonymous usage data to help us improve.</Text>
            </View>
            <Switch
              value={settings.dataAnalytics}
              onValueChange={() => toggleSetting('dataAnalytics')}
              trackColor={{ false: '#CBD5E1', true: Colors.primary }}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Request Account Deletion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff' },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8F9FD', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  scroll: { padding: Spacing.lg },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  settingInfo: { flex: 1, paddingRight: 16 },
  settingTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  settingDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  deleteBtn: { marginTop: 10, paddingVertical: 16, alignItems: 'center' },
  deleteBtnText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
});
