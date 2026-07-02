import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Alert, ActivityIndicator, Modal, Pressable 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { userService, orderService, getImageUrl } from '../../services/api';
import { Colors, Spacing, BorderRadius, AppShadows } from '../../theme/typography';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await userService.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Connection to the Financial Hub failed.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const processImage = async (source) => {
    setShowPicker(false);
    let result;
    const options = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    };

    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is required for identity verification.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          name: `profile_${profile.id}.jpg`,
          type: 'image/jpeg',
        });

        const uploadResp = await orderService.uploadImage(formData);
        const photoUrl = uploadResp.data.imageUrl;

        await userService.updateProfile({ 
          fullName: profile.fullName,
          phoneNumber: profile.phoneNumber,
          address: profile.address,
          profilePictureUrl: photoUrl 
        });

        Alert.alert('Success', 'Professional identity Manifested!');
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Photo Manifestation failed.');
    } finally {
      setUploading(false);
    }
  };

  const logout = async () => {
    Alert.alert('Logout', 'Are you sure you want to end your session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['userToken', 'userData']);
          navigation.replace('Login');
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isDhobi = profile?.role?.toLowerCase() === 'dhobi';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.headerHero}>
          <View style={styles.profileBadgeArea}>
            <TouchableOpacity style={styles.avatarWrap} onPress={() => setShowPicker(true)}>
              {profile?.profilePictureUrl ? (
                <Image source={{ uri: getImageUrl(profile.profilePictureUrl) }} style={styles.avatar} />
              ) : (
                <View style={styles.initialsWrap}>
                  <Text style={styles.initialsText}>
                    {profile?.fullName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.cameraIconBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            
            <Text style={styles.userName}>{profile?.fullName}</Text>
            <Text style={styles.userEmail}>{profile?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profile?.role?.toUpperCase() || 'MEMBER'}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Logistics & Business</Text>
          <View style={styles.card}>
            <ProfileItem 
              icon="list-outline" 
              title="My Orders" 
              subtitle="Track your active and past activity"
              onPress={() => navigation.navigate('MyOrders')} 
            />
            {isDhobi && (
              <ProfileItem 
                icon="briefcase-outline" 
                title="Service Portfolio" 
                subtitle="Manage your prices and offerings"
                onPress={() => navigation.navigate('ManageServices')} 
              />
            )}
            {isDhobi && profile?.dhobiType === 0 && (
              <ProfileItem 
                icon="trending-up-outline" 
                title="Upgrade Account" 
                subtitle="Grow to Full-Time Shop status"
                color={Colors.accent}
                onPress={() => navigation.navigate('DhobiUpgrade')} 
              />
            )}
            <ProfileItem 
              icon="location-outline" 
              title="Address Book" 
              subtitle="Manage your pickup locations"
              onPress={() => navigation.navigate('AddressBook')} 
            />
          </View>

          <Text style={styles.sectionTitle}>Account Intelligence</Text>
          <View style={styles.card}>
            <ProfileItem 
              icon="person-outline" 
              title="Identity Details" 
              subtitle="Update your name and phone"
              onPress={() => navigation.navigate('EditProfile', { profile })} 
            />
            <ProfileItem 
              icon="card-outline" 
              title="Payment Methods" 
              subtitle="Manage cards and payment options"
              onPress={() => navigation.navigate('PaymentMethods')} 
            />
            <ProfileItem 
              icon="wallet-outline" 
              title="Financial Wallet" 
              subtitle="Real-time balance and transactions"
              onPress={() => navigation.navigate('Wallet')} 
            />
            <ProfileItem 
              icon="notifications-outline" 
              title="Notifications" 
              subtitle="Alerts and marketplace pings"
              onPress={() => navigation.navigate('Notifications')} 
            />
          </View>

          <Text style={styles.sectionTitle}>Legal & Support</Text>
          <View style={styles.card}>
            <ProfileItem 
              icon="help-buoy-outline" 
              title="Help & Support" 
              subtitle="FAQs and platform assistance"
              onPress={() => navigation.navigate('HelpSupport')} 
            />
            <ProfileItem 
              icon="document-text-outline" 
              title="Terms & Conditions" 
              subtitle="Rules and platform usage guidelines"
              onPress={() => navigation.navigate('TermsConditions')} 
            />
            <ProfileItem 
              icon="shield-outline" 
              title="Privacy Settings" 
              subtitle="Manage your data and visibility"
              onPress={() => navigation.navigate('PrivacySettings')} 
            />
          </View>

          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <ProfileItem 
              icon="log-out-outline" 
              title="Terminal Session" 
              subtitle="Sign out of the platform"
              color={Colors.error}
              onPress={logout} 
            />
          </View>
        </View>
      </ScrollView>

      {/* CUSTOM THEMED PICKER MODAL */}
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Update Identity Photo</Text>
            <Text style={styles.pickerSubtitle}>Choose how to Manifest your professional appearance</Text>
            
            <View style={styles.pickerOptions}>
              <TouchableOpacity 
                style={styles.pickerOptionCard} 
                onPress={() => processImage('camera')}
              >
                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.optionOrb}>
                   <Ionicons name="camera" size={32} color="#fff" />
                </LinearGradient>
                <Text style={styles.optionLabel}>Snap Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.pickerOptionCard} 
                onPress={() => processImage('library')}
              >
                <LinearGradient colors={[Colors.accent, '#10B981']} style={styles.optionOrb}>
                   <Ionicons name="images" size={32} color="#fff" />
                </LinearGradient>
                <Text style={styles.optionLabel}>Pick Gallery</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.pickerCancel} 
              onPress={() => setShowPicker(false)}
            >
              <Text style={styles.pickerCancelText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function ProfileItem({ icon, title, subtitle, onPress, color = Colors.primary }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={[styles.itemIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerHero: { paddingTop: 80, paddingBottom: 60, paddingHorizontal: 20, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  profileBadgeArea: { alignItems: 'center' },
  avatarWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#fff', padding: 4, ...AppShadows.card, position: 'relative' },
  avatar: { width: '100%', height: '100%', borderRadius: 60 },
  initialsWrap: { width: '100%', height: '100%', borderRadius: 60, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  initialsText: { fontSize: 36, fontWeight: '800', color: Colors.primary },
  cameraIconBadge: { position: 'absolute', bottom: 5, right: 5, width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  uploadOverlay: { position: 'absolute', inset: 0, borderRadius: 60, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 16 },
  userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  roleBadge: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  actionSection: { padding: 20, marginTop: -30 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 10, marginTop: 24 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 8, ...AppShadows.card },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 14 },
  itemIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  itemSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30, paddingBottom: 50 },
  pickerHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 25 },
  pickerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  pickerSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 30 },
  pickerOptions: { flexDirection: 'row', justifyContent: 'space-around', gap: 20 },
  pickerOptionCard: { flex: 1, alignItems: 'center', gap: 12 },
  optionOrb: { width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...AppShadows.card },
  optionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  pickerCancel: { marginTop: 30, paddingVertical: 12, alignItems: 'center' },
  pickerCancelText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
});
