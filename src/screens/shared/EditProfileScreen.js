import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { userService } from '../../services/api';
import MapComponent from '../../components/MapComponent';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

export default function EditProfileScreen({ navigation }) {
  const [profile, setProfile] = useState({ fullName: '', phoneNumber: '', address: '', latitude: 0, longitude: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userService.getProfile();
      setProfile(response.data);
      if (response.data.latitude && response.data.longitude) {
        setCurrentRegion({
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      Alert.alert('Error', 'Could not load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickLocation = async () => {
    if (!currentRegion) return;
    setSaving(true);
    try {
      const { latitude, longitude } = currentRegion;
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`, {
        headers: { 'User-Agent': 'DhoobiGO-App' }
      });
      const data = await response.json();
      const addr = data.address || {};
      const cleanAddress = [
        addr.road,
        addr.neighbourhood || addr.suburb || addr.residential,
        addr.city || addr.town || addr.village
      ].filter(Boolean).join(', ') || data.display_name;

      setProfile(prev => ({
        ...prev,
        address: cleanAddress,
        latitude,
        longitude
      }));
      Alert.alert('Success', 'Location pinned successfully!');
    } catch (e) {
      Alert.alert('Error', 'Could not fetch address for this location.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!profile.fullName || !profile.phoneNumber) {
      Alert.alert('Validation Error', 'Name and Phone are required.');
      return;
    }

    setSaving(true);
    try {
      await userService.updateProfile(profile);
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Update failed:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={profile.fullName}
            onChangeText={(txt) => setProfile({ ...profile, fullName: txt })}
            placeholder="Enter your full name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={profile.phoneNumber}
            onChangeText={(txt) => setProfile({ ...profile, phoneNumber: txt })}
            placeholder="e.g. +92 300 0000000"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Location & Address</Text>
            <TouchableOpacity 
              onPress={() => {
                navigation.navigate('AddressBook', {
                  onSelect: (item) => {
                    setProfile(prev => ({ 
                      ...prev, 
                      address: item.addressLine || item.address,
                      latitude: item.latitude || 0,
                      longitude: item.longitude || 0
                    }));
                  }
                });
              }}
              style={styles.linkBtn}
            >
              <Text style={styles.linkBtnText}>Saved Places →</Text>
            </TouchableOpacity>
          </View>

          {/* Integrated Map */}
          <View style={styles.mapContainer}>
            <MapComponent 
              onLocationChange={setCurrentRegion}
              initialRegion={currentRegion}
            />
            <TouchableOpacity 
              style={styles.pickBtn}
              onPress={handlePickLocation}
            >
              <LinearGradient colors={[Colors.primary, '#0284C7']} style={styles.pickGradient}>
                <Ionicons name="pin" size={16} color="#fff" />
                <Text style={styles.pickText}>Confirm Pin Location</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top', marginTop: 12 }]}
            value={profile.address}
            onChangeText={(txt) => setProfile({ ...profile, address: txt })}
            placeholder="Your precise address will appear here..."
            multiline
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
          onPress={handleUpdate}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8F9FD', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  scroll: { padding: Spacing.lg },
  inputGroup: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  linkBtn: { paddingVertical: 4 },
  linkBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  input: { backgroundColor: '#F8F9FD', borderRadius: 16, padding: 16, fontSize: 13, color: Colors.textPrimary, borderWidth: 1, borderColor: '#EDF2F7' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, backgroundColor: 'rgba(14,165,233,0.05)', borderRadius: 12 },
  secondaryBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  mapContainer: { height: 220, borderRadius: 20, overflow: 'hidden', marginTop: 8, borderWidth: 1, borderColor: '#EDF2F7', backgroundColor: '#F8FAFC' },
  pickBtn: { position: 'absolute', bottom: 12, right: 12, borderRadius: 12, overflow: 'hidden', elevation: 4 },
  pickGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  pickText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
