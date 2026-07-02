import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, Image 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { userService, orderService } from '../../services/api';
import { PrimaryButton } from '../../components/UIComponents';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DhobiUpgradeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [targetType, setTargetType] = useState(1); // Default to Full-Time Shop
  const [shopName, setShopName] = useState('');
  const [ntn, setNtn] = useState('');
  const [licenseImg, setLicenseImg] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const resp = await userService.getProfile();
      const userData = resp.data;
      setUser(userData);
      setShopName(userData.shopName || '');
      setNtn(userData.ntnNumber || '');
      if (userData.businessLicenseUrl) {
        setLicenseImg(userData.businessLicenseUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      setLicenseImg(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!shopName || !ntn || !licenseImg) {
      Alert.alert('Incomplete', 'Please provide Shop Name, NTN, and License photo.');
      return;
    }

    setLoading(true);
    try {
      let docUrl = licenseImg;

      // Only upload if it's a NEW local file (not a server URL)
      if (licenseImg && (licenseImg.startsWith('file://') || licenseImg.startsWith('content://'))) {
        const formData = new FormData();
        formData.append('file', {
          uri: licenseImg,
          name: `upgrade_doc_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        const uploadResp = await orderService.uploadImage(formData);
        docUrl = uploadResp.data.imageUrl;
      }

      // 2. Submit Request
      await userService.requestUpgrade({
        userId: user.userId,
        requestedType: targetType,
        shopName: shopName,
        ntnNumber: ntn,
        upgradeDocsUrl: docUrl
      });

      Alert.alert(
        'Request Submitted',
        'Your upgrade request has been sent to Admin for review. You will be notified once approved.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <ActivityIndicator style={{ flex: 1 }} />;

  if (user.isUpgradePending) {
    return (
      <View style={styles.container}>
        <View style={styles.pendingCard}>
          <Ionicons name="time-outline" size={64} color={Colors.warning} />
          <Text style={styles.pendingTitle}>Upgrade Pending</Text>
          <Text style={styles.pendingText}>
            Admin is currently reviewing your shop documents. This usually takes 24-48 hours.
          </Text>
          <PrimaryButton title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={Colors.gradientPrimary} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grow Your Business</Text>
        <Text style={styles.headerSub}>Upgrade from Home-based to Professional Shop</Text>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.label}>Select Target Status</Text>
        <View style={styles.typeRow}>
          {['Full-Time Shop', 'Premium Store'].map((t, i) => (
            <TouchableOpacity 
              key={t} 
              onPress={() => setTargetType(i + 1)}
              style={[styles.typeBtn, targetType === (i + 1) && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, targetType === (i + 1) && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shop Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter your registered shop name" 
            value={shopName}
            onChangeText={setShopName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>NTN Number</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 1234567-8" 
            value={ntn}
            onChangeText={setNtn}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.label}>Business License / Shop Proof</Text>
        <TouchableOpacity onPress={pickImage} style={styles.uploadBox}>
          {licenseImg ? (
            <Image source={{ uri: licenseImg }} style={styles.preview} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.uploadText}>Upload License Photo</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>
            {targetType === 1 ? "Full-Time Benefits" : "Premium Store Benefits"}
          </Text>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
            <Text style={styles.benefitText}>{targetType === 1 ? "Reduced 5% Commission" : "0% Commission (Unlimited Earnings)"}</Text>
          </View>
          <View style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
            <Text style={styles.benefitText}>{targetType === 1 ? "Official Shop Badge" : "💎 Premium Diamond Badge"}</Text>
          </View>
          {targetType === 2 && (
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={styles.benefitText}>Top placement in customer search</Text>
            </View>
          )}
        </View>

        <PrimaryButton 
          title={targetType === 2 ? "Pay Rs. 1,000 & Upgrade" : "Submit for Verification"} 
          onPress={() => {
            if (targetType === 2) {
              navigation.navigate('MockPaymentGateway', { 
                method: 'JazzCash', 
                amount: 1000,
                onSuccess: handleSubmit 
              });
            } else {
              handleSubmit();
            }
          }}
          loading={loading}
          style={{ marginTop: 24 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  body: { padding: 24 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, marginTop: 16 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  inputGroup: { marginTop: 16 },
  input: { 
    height: 52, backgroundColor: '#F8FAFC', borderRadius: 12, 
    borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, fontSize: 15 
  },
  uploadBox: { 
    height: 160, backgroundColor: '#F8FAFC', borderRadius: 12, borderStyle: 'dashed', 
    borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginTop: 8 
  },
  uploadText: { color: Colors.textMuted, marginTop: 8, fontSize: 13 },
  preview: { width: '100%', height: '100%', borderRadius: 12 },
  pendingCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  pendingTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 20 },
  pendingText: { textAlign: 'center', color: Colors.textSecondary, marginTop: 12, lineHeight: 22 },
  benefitsCard: { backgroundColor: '#F0F9FF', borderRadius: 16, padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#BAE6FD' },
  benefitsTitle: { fontSize: 14, fontWeight: '800', color: '#0369A1', marginBottom: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  benefitText: { fontSize: 13, color: '#0C4A6E', fontWeight: '500' }
});
