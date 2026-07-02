import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme/typography';
import { paymentService } from '../../services/api';

export default function PaymentMethodsScreen({ navigation }) {
  const [balance, setBalance] = useState(0);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [balanceRes, methodsRes] = await Promise.all([
        paymentService.getWalletBalance(),
        paymentService.getSavedCards()
      ]);
      setBalance(balanceRes.data.balance);
      setMethods(methodsRes.data);
    } catch (error) {
      console.error('Failed to fetch payment info:', error);
    } finally {
      setLoading(false);
    }
  };

  // Instant refresh when returning to this screen
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleTopUp = () => {
    // Navigate to a direct flow or show options
    Alert.alert(
      'Add Funds',
      'Select a method to top up your DhoobiGO wallet:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'JazzCash', onPress: () => navigation.navigate('MockPaymentGateway', { method: 'JazzCash', amount: 0 }) },
        { text: 'EasyPaisa', onPress: () => navigation.navigate('MockPaymentGateway', { method: 'EasyPaisa', amount: 0 }) }
      ]
    );
  };

  const mobileWallets = [
    { name: 'Easypaisa', icon: 'wallet-outline', color: '#10B981' },
    { name: 'JazzCash', icon: 'phone-portrait-outline', color: '#F59E0B' }
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
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
        <Text style={styles.title}>Payment Methods</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Unified Wallet & Statement */}
        <View style={[styles.walletCard, balance < 0 && { backgroundColor: Colors.error }]}>
          <Text style={styles.walletLabel}>{balance < 0 ? 'Money you owe' : 'Available Money'}</Text>
          <Text style={styles.walletAmount}>Rs. {Math.abs(balance).toLocaleString()}</Text>
          <View style={styles.walletActionRow}>
            <TouchableOpacity style={styles.topUpBtn} onPress={handleTopUp}>
              <Text style={styles.topUpText}>Add Money to Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.historyBtn} 
              onPress={() => navigation.navigate('Wallet')}
            >
              <Ionicons name="receipt-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Saved for Withdrawals</Text>
        {methods.map((m, i) => (
          <View key={i} style={styles.methodCard}>
            <View style={[styles.iconWrap, { backgroundColor: m.brand === 'Easypaisa' ? '#10B98120' : '#F59E0B20' }]}>
              <Ionicons name="phone-portrait-outline" size={22} color={m.brand === 'Easypaisa' ? '#10B981' : '#F59E0B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>{m.brand} Account</Text>
              <Text style={styles.methodSub}>Verified: •••• {m.last4}</Text>
            </View>
            <View style={styles.activeDot} />
          </View>
        ))}

        {methods.length === 0 && (
          <View style={styles.emptyMethods}>
            <Text style={styles.emptyMethodsText}>No accounts saved yet.</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Add New Way to Pay/Receive</Text>
        
        {/* Mobile Wallets - Integrated */}
        {mobileWallets.map((w, i) => (
          <TouchableOpacity 
            key={i} 
            style={styles.methodCard} 
            onPress={() => {
              Alert.alert(
                w.name,
                `What would you like to do with ${w.name}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Save for Withdrawals', onPress: () => navigation.navigate('AddPaymentMethod', { type: 'Wallet', brand: w.name }) },
                  { text: 'Just Add Money', onPress: () => navigation.navigate('MockPaymentGateway', { method: w.name, amount: 0 }) }
                ]
              );
            }}
          >
            <View style={[styles.iconWrap, { backgroundColor: w.color + '20' }]}>
              <Ionicons name={w.icon} size={22} color={w.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>{w.name}</Text>
              <Text style={styles.methodSub}>Link or Top up via {w.name}</Text>
            </View>
            <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={18} color="#64748B" />
          <Text style={styles.securityText}>Financial integrity guaranteed by DhoobiGO Hub</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff' },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8F9FD', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  scroll: { padding: Spacing.lg },
  walletCard: { backgroundColor: Colors.primary, borderRadius: 32, padding: 24, marginBottom: 32, elevation: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  walletLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  walletAmount: { fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 24 },
  walletActionRow: { flexDirection: 'row', gap: 12 },
  topUpBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  topUpText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  historyBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  iconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  methodName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  methodSub: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginLeft: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, backgroundColor: 'rgba(14,165,233,0.05)', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.primary, marginTop: 4 },
  addBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '800' },
  emptyMethods: { padding: 20, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 20, marginBottom: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyMethodsText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  infoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, opacity: 0.5 },
  securityText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
});
