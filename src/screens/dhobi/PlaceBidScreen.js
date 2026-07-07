import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, Image 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { authService, orderService, getImageUrl } from '../../services/api';
import { PrimaryButton } from '../../components/UIComponents';

export default function PlaceBidScreen({ navigation, route }) {
  const { order } = route?.params || {};
  const [amount, setAmount] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('1');
  const [loading, setLoading] = useState(false);

  const handlePlaceBid = async () => {
  if (!amount || isNaN(amount)) {
    Alert.alert('Invalid Amount', 'Please enter a valid bid amount.');
    return;
  }

  setLoading(true);
  try {
    const userDataStr = await AsyncStorage.getItem('userData');
    if (!userDataStr) {
      Alert.alert('Session Expired', 'Please log in again.');
      navigation.replace('Login');
      return;
    }
    const { userId, reviewsCount } = JSON.parse(userDataStr);

    // NEW: New-dhobi bidding limit check
    const isNewDhobi = (reviewsCount ?? 0) < 5;
    if (isNewDhobi && order.itemsCount > 6) {
      setLoading(false);
      Alert.alert(
        'Bidding Restricted',
        'New dhobi partners can only bid on orders with up to 6 items. Complete more orders to unlock this limit.'
      );
      return;
    }

    await orderService.placeBid({
      orderId: order.id,
      dhobiId: userId,
      price: parseFloat(amount),
      deliveryDays: parseInt(deliveryDays)
    });

    setLoading(false);
    Alert.alert(
      'Bid Placed!',
      'Your bid has been submitted. You will be notified if the customer selects you.',
      [{ text: 'OK', onPress: () => navigation.replace('DhobiTabs') }]
    );
  } catch (error) {
    setLoading(false);
    const data = error.response?.data;
    const msg = data?.Message || data?.message || (typeof data === 'string' ? data : null) || 'Failed to place bid. You may have already bid on this order.';
    Alert.alert('Bidding Error', msg);
  }
};

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.headerTitle, { color: '#fff' }]}>Place a Bid</Text>
            <View style={styles.headerIdBadge}>
              <Text style={styles.headerSub}>ID: {order.id}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Order Snapshot */}
          <View style={styles.snapCard}>
            <Text style={styles.snapLabel}>CUSTOMER REQUEST</Text>
            <Text style={styles.snapService}>{order?.serviceDescription}</Text>
            <View style={styles.snapMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{order?.customerName || 'Customer'}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="layers-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{order?.itemsCount} items</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{order?.pickupAddress}</Text>
              </View>
            </View>
            {order?.clothImageUrl && (
              <View style={styles.clothImageContainer}>
                <Text style={styles.clothImageLabel}>Customer's Items Photo</Text>
                <Image source={{ uri: getImageUrl(order.clothImageUrl) }} style={styles.clothImage} />
              </View>
            )}
          </View>

          {/* Bid Form */}
          <Text style={styles.sectionLabel}>Your Offer</Text>
          <View style={styles.formCard}>
            {/* Bid Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bid Amount (PKR)</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>
              {/*<Text style={styles.inputHint}>Suggestion: Average bid is Rs. 800</Text>*/}
            </View>

            {/* Delivery Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expected Delivery (Days)</Text>
              <View style={styles.daysRow}>
                {['1', '2', '3', '4+'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDeliveryDays(d)}
                    style={[styles.dayBtn, deliveryDays === d && styles.dayBtnActive]}
                  >
                    <Text style={[styles.dayBtnText, deliveryDays === d && styles.dayBtnTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Note */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoText}>The customer will compare your bid with other dhobis based on price and your rating.</Text>
            </View>

            <PrimaryButton
              title="Submit Bid"
              onPress={handlePlaceBid}
              loading={loading}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerIdBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 12 },
  headerSub: { fontSize: 13, color: '#fff', fontWeight: '800' },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: 100, paddingTop: 16 },
  snapCard: { backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, elevation: 4, width: '100%', overflow: 'hidden' },
  snapLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  snapService: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  snapMeta: { gap: 12, width: '100%' },
  metaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, width: '100%', flexWrap: 'wrap' },
  metaText: { fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginBottom: 14 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, elevation: 5 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 16, height: 56 },
  currencyPrefix: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginRight: 8 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  inputHint: { fontSize: 11, color: Colors.textMuted, marginTop: 6, fontStyle: 'italic' },
  daysRow: { flexDirection: 'row', gap: 10 },
  dayBtn: { flex: 1, height: 48, borderRadius: BorderRadius.md, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  dayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  dayBtnTextActive: { color: '#fff' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(14,165,233,0.08)', borderRadius: BorderRadius.md, padding: 14, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  clothImageContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  clothImageLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  clothImage: { width: '100%', height: 160, borderRadius: BorderRadius.md, backgroundColor: '#E2E8F0' },
});
