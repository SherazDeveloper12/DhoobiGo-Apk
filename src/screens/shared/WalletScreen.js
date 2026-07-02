import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { paymentService, userService } from '../../services/api';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';

export default function WalletScreen({ navigation }) {
  const [wallet, setWallet] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [walletRes, userRes] = await Promise.all([
        paymentService.getWalletOverview(),
        userService.getProfile()
      ]);
      setWallet(walletRes.data);
      setProfile(userRes.data);
    } catch (error) {
      console.error('Wallet Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleWithdraw = async () => {
    if ((wallet?.balance || 0) < 100) {
      Alert.alert('Insufficient Balance', 'A minimum balance of Rs. 100 is required for settlement.');
      return;
    }

    try {
      setActionLoading(true);
      const methodsRes = await paymentService.getSavedCards();
      const payoutMethods = methodsRes.data;
      setActionLoading(false);

      if (payoutMethods.length === 0) {
        Alert.alert(
          'No Account Linked',
          'You need to link your JazzCash or EasyPaisa account in "Payment Methods" first to get your money.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Link Now', onPress: () => navigation.navigate('PaymentMethods') }
          ]
        );
        return;
      }

      Alert.alert(
        'Withdraw Money',
        'Choose where you want to receive your money:',
        [
          { text: 'Cancel', style: 'cancel' },
          ...payoutMethods.map(m => ({
            text: `${m.brand} (•••• ${m.last4})`,
            onPress: () => showWithdrawPrompt(m.brand, m.last4)
          }))
        ]
      );
    } catch (err) {
      setActionLoading(false);
      Alert.alert('Error', 'Could not get your accounts.');
    }
  };

  const showWithdrawPrompt = (method, last4) => {
    Alert.alert(
      `${method} Payout`,
      `Are you sure you want to send Rs. ${wallet.balance.toLocaleString()} to your ${method} account (•••• ${last4})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Send Money', 
          onPress: async () => {
            setActionLoading(true);
            try {
              await paymentService.withdraw({ amount: wallet.balance, method });
              Alert.alert(
                'Money is on the way', 
                `Your Rs. ${wallet.balance.toLocaleString()} has been sent to your ${method} account. It should arrive within 24 hours.`
              );
              fetchData();
            } catch (err) {
              Alert.alert('Error', 'Server is busy. Please try again.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const quickTopUp = async (amount) => {
    setActionLoading(true);
    try {
      await paymentService.topUp(amount);
      Alert.alert('Success', `Rs. ${amount.toLocaleString()} Added to your wallet!`);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Financial Hub connection lost.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTopUp = () => {
    Alert.alert(
      'Top Up Wallet',
      'Choose a mobile wallet to add credit to your ledger:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'JazzCash', 
          onPress: () => navigation.navigate('MockPaymentGateway', { method: 'JazzCash', amount: 0 }) 
        },
        { 
          text: 'EasyPaisa', 
          onPress: () => navigation.navigate('MockPaymentGateway', { method: 'EasyPaisa', amount: 0 }) 
        },
        { 
          text: 'Custom Amount', 
          onPress: () => navigation.navigate('PaymentMethods') 
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Financial HUB</Text>
            <Text style={styles.headerSub}>Real-time Ledger & Activity</Text>
          </View>
        </View>

        <View style={styles.mainBalanceSection}>
          <LinearGradient 
            colors={wallet?.balance < 0 ? [Colors.error, '#DC2626'] : ['#0F172A', '#1E293B']} 
            style={styles.balanceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.balanceLabel}>
                  {wallet?.balance < 0 ? 'LIABILITY RECONCILIATION' : 'AVAILABLE SETTLEMENT BALANCE'}
                </Text>
                <View style={styles.balanceRow}>
                  <Text style={styles.currency}>Rs.</Text>
                  <Text style={styles.balanceAmount}>{Math.abs(wallet?.balance || 0).toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.shieldWrap}>
                <Ionicons name="shield-checkmark" size={24} color="rgba(255,255,255,0.4)" />
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleTopUp} disabled={actionLoading}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Add Credit</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionBtn} onPress={handleWithdraw} disabled={actionLoading}>
                <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Settlement</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Simplified Instructions */}
        <View style={styles.testHub}>
          <View style={styles.testHubHeader}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.testHubTitle}>HOW IT WORKS</Text>
          </View>
          <Text style={styles.testInfo}>
            1. Select "Add Credit" and choose JazzCash or EasyPaisa.{"\n"}
            2. Enter the amount you wish to transfer.{"\n"}
            3. Funds are instantly added to your DhoobiGO Wallet for all transactions.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>IDENTITY ROLE</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{profile?.role || 'Guest'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>LEDGER STATUS</Text>
            <Text style={[styles.statValue, { color: Colors.accent }]}>SECURED</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Transactional Manifest</Text>
          </View>

          {wallet?.transactions?.map((t) => (
            <View key={t.id} style={styles.transactionCard}>
              <View style={[styles.transactionIcon, { backgroundColor: t.type === 'Credit' ? '#ECFDF5' : '#FEF2F2' }]}>
                <Ionicons 
                  name={t.type === 'Credit' ? 'arrow-down' : 'arrow-up'} 
                  size={18} 
                  color={t.type === 'Credit' ? Colors.accent : Colors.error} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.transactionSource}>{t.description}</Text>
                <Text style={styles.transactionDate}>
                  {new Date(t.timestamp).toLocaleDateString()} • {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={[styles.transactionAmount, { color: t.type === 'Credit' ? Colors.accent : Colors.error }]}>
                {t.type === 'Credit' ? '+' : '-'} {t.amount.toLocaleString()}
              </Text>
            </View>
          ))}
          
          {(!wallet?.transactions || wallet.transactions.length === 0) && (
            <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>Ledger is clean. No activity found.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 60, marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: 1 },
  headerSub: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  
  mainBalanceSection: { paddingHorizontal: 24, marginBottom: 24 },
  balanceCard: { borderRadius: 32, padding: 28, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  balanceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '800', letterSpacing: 1.5 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  currency: { fontSize: 18, color: '#fff', fontWeight: '800', marginTop: 8 },
  balanceAmount: { fontSize: 40, fontWeight: '900', color: '#fff' },
  shieldWrap: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 12 },
  
  cardActions: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },

  testHub: { marginHorizontal: 24, backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  testHubHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  testHubTitle: { fontSize: 11, fontWeight: '900', color: '#0EA5E9', letterSpacing: 1 },
  testChipsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  testChip: { flex: 1, backgroundColor: 'rgba(14,165,233,0.08)', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14,165,233,0.2)' },
  testChipText: { fontSize: 11, fontWeight: '800', color: '#0EA5E9' },
  testInfo: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  statLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '900' },

  body: { paddingHorizontal: 24, paddingBottom: 100 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  hyperlink: { fontSize: 13, color: '#0EA5E9', fontWeight: '700' },
  
  transactionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  transactionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  transactionSource: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  transactionDate: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  transactionAmount: { fontSize: 15, fontWeight: '900' },
  
  emptyState: { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' }
});
