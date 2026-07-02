import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/typography';
import { userService } from '../services/api';

export default function DhobiProfileModal({ visible, dhobiId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && dhobiId) {
      fetchProfile();
    }
  }, [visible, dhobiId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await userService.getPartnerProfile(dhobiId);
      setProfile(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.handle} />
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
            ) : profile ? (
              <>
                <View style={styles.header}>
                  <LinearGradient colors={Colors.gradientPrimary} style={styles.avatar}>
                    <Text style={styles.avatarText}>{profile.fullName?.charAt(0)}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{profile.fullName}</Text>
                    <View style={styles.ratingRow}>
                      {profile.reviewsCount > 0 ? (
                        <>
                          <Ionicons name="star" size={14} color={Colors.warning} />
                          <Text style={styles.ratingText}>{profile.rating ? profile.rating.toFixed(1) : '5.0'} · Partner</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
                          <Text style={styles.ratingText}>New Partner / Unrated</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Shop Information</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={16} color={Colors.primary} />
                    <Text style={styles.infoText}>{profile.address || 'Location Hidden'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={16} color={Colors.accent} />
                    <Text style={styles.infoText}>{profile.phoneNumber}</Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Performance Metrics</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' }}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.primary }}>{profile.completedJobsCount || 0}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginTop: 2 }}>Completed Jobs</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' }}>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.primary }}>{profile.reviewsCount > 0 ? profile.rating?.toFixed(1) : 'Unrated'}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginTop: 2 }}>Avg. Rating</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Service Catalog & Pricing</Text>
                  {profile.services?.length > 0 ? (
                    profile.services.map((svc, i) => (
                      <View key={i} style={styles.serviceItem}>
                         <View style={styles.serviceIcon}>
                            <Ionicons name={svc.icon || 'shirt-outline'} size={20} color={Colors.primary} />
                         </View>
                         <View style={{ flex: 1 }}>
                            <Text style={styles.serviceName}>{svc.name}</Text>
                            <Text style={styles.serviceDesc} numberOfLines={1}>{svc.description}</Text>
                         </View>
                         <Text style={styles.servicePrice}>Rs. {svc.price}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noData}>No specific price list offered yet.</Text>
                  )}
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={onClose}>
                  <Text style={styles.actionBtnText}>Close Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noData}>Could not load partner profile.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '80%' },
  handle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatar: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  shopName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoText: { fontSize: 14, color: Colors.textSecondary },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16 },
  serviceIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  serviceDesc: { fontSize: 11, color: Colors.textMuted },
  servicePrice: { fontSize: 15, fontWeight: '800', color: Colors.accent },
  noData: { textAlign: 'center', color: Colors.textMuted, marginVertical: 20 },
  actionBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
