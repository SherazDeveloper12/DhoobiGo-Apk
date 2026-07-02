import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/typography';
import { userService } from '../services/api';

export default function RiderProfileModal({ visible, riderId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && riderId) {
      fetchProfile();
    }
  }, [visible, riderId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await userService.getPartnerProfile(riderId);
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
                  {profile.profilePictureUrl ? (
                    <Image 
                      source={{ uri: profile.profilePictureUrl.startsWith('http') ? profile.profilePictureUrl : `https://dhoobigo-dotnet-backend.onrender.com${profile.profilePictureUrl}` }} 
                      style={styles.avatarImg} 
                    />
                  ) : (
                    <LinearGradient colors={['#F1F5F9', '#E2E8F0']} style={styles.avatar}>
                      <Text style={styles.avatarText}>{profile.fullName?.charAt(0)}</Text>
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{profile.fullName}</Text>
                    <View style={styles.ratingRow}>
                      {profile.reviewsCount > 0 ? (
                        <>
                          <Ionicons name="star" size={14} color={Colors.warning} />
                          <Text style={styles.ratingText}>{profile.rating ? profile.rating.toFixed(1) : '5.0'} · Verified Rider</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
                          <Text style={styles.ratingText}>New Logistics Partner</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Logistics Information</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="bicycle" size={16} color={Colors.primary} />
                    <Text style={styles.infoText}>Vehicle No: <Text style={{fontWeight:'700', color: Colors.textPrimary}}>{profile.vehicleNumber || 'N/A'}</Text></Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="time" size={16} color={Colors.accent} />
                    <Text style={styles.infoText}>Platform Member since {new Date(profile.createdAt).getFullYear()}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="checkmark-done-circle" size={16} color="#10B981" />
                    <Text style={styles.infoText}>Background Verified by DhoobiGO</Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Performance Stats</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{profile.completedJobsCount || 0}</Text>
                        <Text style={styles.statLabel}>Completed Jobs</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statVal}>{profile.reviewsCount > 0 ? profile.rating?.toFixed(1) : 'Unrated'}</Text>
                        <Text style={styles.statLabel}>Avg. Rating</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={onClose}>
                  <Text style={styles.actionBtnText}>Close Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.errorText}>Profile not found.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  handle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 60, height: 60, borderRadius: 30 },
  avatarText: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  shopName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  closeBtn: { padding: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  infoText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  statVal: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginTop: 2 },
  actionBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  errorText: { textAlign: 'center', color: Colors.textMuted, marginVertical: 20 },
});
