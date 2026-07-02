import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { PrimaryButton } from '../../components/UIComponents';
import { paymentService } from '../../services/api';

export default function PaymentScreen({ navigation, route }) {
  const { orderId, bidId, bid } = route?.params || { 
    orderId: 0, 
    bid: { price: 0, dhobiName: 'Service Provider' } 
  };

  const totalAmount = (bid?.price || 0) + 50;
  const [selectedMethod, setSelectedMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [fetchingBalance, setFetchingBalance] = useState(true);

  useEffect(() => {
    const getBalance = async () => {
      try {
        const res = await paymentService.getWalletBalance();
        setWalletBalance(res.data.balance);
      } catch (e) {
        console.error('Balance fetch failed');
      } finally {
        setFetchingBalance(false);
      }
    };
    getBalance();
  }, []);

  const handlePay = async () => {
    if (selectedMethod === 'wallet' && walletBalance < totalAmount) {
      Alert.alert('Insufficient Balance', 'You do not have enough wallet credit. Please use COD or Top Up your wallet.');
      return;
    }

    setLoading(true);
    try {
      await paymentService.processPayment({
        orderId,
        amount: totalAmount,
        paymentMethod: selectedMethod === 'wallet' ? 'Wallet' : selectedMethod === 'cod' ? 'CashOnDelivery' : 'Card'
      });
      
      Alert.alert('Success', 'Payment configuration Manifested successfully!');
      navigation.replace('TrackOrder', { orderId });
    } catch (error) {
      Alert.alert('Payment Failed', 'Communication with the financial hub was interrupted.');
    } finally {
      setLoading(false);
    }
  };

  const methods = [
    { id: 'wallet', name: 'DhoobiGO Wallet', icon: 'wallet', color: Colors.primary, desc: `Available: Rs. ${walletBalance.toLocaleString()}`, disabled: walletBalance < totalAmount },
    { id: 'cod', name: 'Cash on Delivery', icon: 'cash', color: '#F59E0B', desc: 'Pay Cash to Rider', disabled: false },
  ];

  if (fetchingBalance) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Review & Pay</Text>
            <Text style={styles.headerSub}>Transaction ID: #{orderId}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Order Snapshot */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>ORDER SUMMARY</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Booking: {bid?.dhobiName}</Text>
              <Text style={styles.summaryValue}>Rs. {bid?.price}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Service Platform Fee</Text>
              <Text style={styles.summaryValue}>Rs. 50</Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.cardBorder }]}>
              <Text style={styles.totalLabel}>Payable Total</Text>
              <Text style={styles.totalValue}>Rs. {totalAmount}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Select Settlement Method</Text>
          {methods.map((m) => (
            <TouchableOpacity
              key={m.id}
              disabled={m.disabled}
              onPress={() => setSelectedMethod(m.id)}
              style={[
                styles.methodCard, 
                selectedMethod === m.id && { borderColor: m.color, backgroundColor: m.color + '08' },
                m.disabled && { opacity: 0.5 }
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: m.color + '15' }]}>
                <Ionicons name={m.icon} size={22} color={m.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodName, selectedMethod === m.id && { color: m.color }]}>{m.name}</Text>
                <Text style={styles.methodDesc}>{m.desc}</Text>
              </View>
              <View style={[styles.radio, selectedMethod === m.id && { backgroundColor: m.color, borderColor: m.color }]}>
                {selectedMethod === m.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}

          {selectedMethod === 'wallet' && walletBalance < totalAmount && (
            <TouchableOpacity 
              style={styles.insolvencyAlert}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.insolvencyText}>Insufficient Balance. Top Up Wallet now →</Text>
            </TouchableOpacity>
          )}

          <PrimaryButton
            title={selectedMethod === 'cod' ? 'Confirm Dispatch' : 'Authorize Payment'}
            onPress={handlePay}
            loading={loading}
            style={{ marginTop: 24 }}
          />

          <View style={styles.securityBox}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.textMuted} />
            <Text style={styles.securityText}>Payment processed securely by DhoobiGO Hub</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 24, gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textSecondary },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  summaryCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: Colors.cardBorder },
  summaryLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryText: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '800', color: Colors.accent },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginBottom: 14 },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: Colors.cardBorder },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodName: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  methodDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  insolvencyAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.05)', padding: 12, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: 'rgba(239,68,68,0.1)' },
  insolvencyText: { fontSize: 12, color: Colors.error, fontWeight: '600' },
  securityBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, opacity: 0.5 },
  securityText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
});
