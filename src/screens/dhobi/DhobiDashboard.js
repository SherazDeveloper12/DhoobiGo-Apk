import { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Switch, Alert, ActivityIndicator, RefreshControl, Image 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as signalR from '@microsoft/signalr';
import { orderService, userService, SOCKET_URL } from '../../services/api';
import { useSignalR } from '../../context/SignalRContext';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { SectionHeader } from '../../components/UIComponents';

export default function DhobiDashboard({ navigation }) {
  const { connection, isConnected, lastMarketUpdate } = useSignalR();
  const [isOnline, setIsOnline] = useState(true);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });

  const fetchData = useCallback(async () => {
    try {
      // 1. Initial load from Cache
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        setUser(JSON.parse(userDataStr));
      }

      // 2. Fetch Fresh Profile
      const profileResp = await userService.getProfile();
      const freshUser = profileResp.data;
      const updatedUser = {
        ...freshUser,
        userId: freshUser.userId || freshUser.id,
      };

      setUser(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));

      // 3. Fetch Orders
      const [marketRes, activeRes] = await Promise.all([
        orderService.getPending(),
        orderService.getDhobiOrders(updatedUser.userId)
      ]);

      const filteredOrders = marketRes.data.filter(order => 
        !order.bids || !order.bids.some(b => b.dhobiId.toString() === updatedUser.userId.toString())
      );
      
      setOrders(filteredOrders); 
      
      setStats({
        total: activeRes.data.filter(o => o.status === 'Completed').length, 
        active: activeRes.data.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').length, 
        pending: filteredOrders.length
      });
    } catch (error) {
      console.error('[DHOBI SYNC ERROR]:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    if (lastMarketUpdate > 0) {
      console.log('[DASHBOARD] Reacting to master marketplace update');
      fetchData();
    }
  }, [lastMarketUpdate, fetchData]);

  useEffect(() => {
    if (connection && isConnected) {
      console.log('[SIGNALR] System Ready (Dhobi Dashboard)');
      connection.invoke('JoinGroup', 'Dhobis').catch(err => console.error(err));
      
      // Listen for profile/upgrade updates
      connection.on('UpgradeUpdate', (msg) => {
        console.log('[SIGNALR] Profile Upgrade Signal Received:', msg);
        Alert.alert('Account Update', msg);
        fetchData(); // This refreshes the user profile and storage
      });

      return () => {
        connection.off('UpgradeUpdate');
      };
    }
  }, [connection, isConnected]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const currentEarnings = [
    { label: 'Market Orders', value: stats.pending.toString(), icon: 'today-outline', color: Colors.accent },
    { label: 'Active Jobs', value: stats.active.toString(), icon: 'briefcase-outline', color: Colors.primary },
    { label: 'Total Finished', value: stats.total.toString(), icon: 'receipt-outline', color: Colors.warning },
  ];

  return (
    <LinearGradient colors={Colors.gradientWhite} style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.username}>{user?.shopName || user?.fullName || 'Dhobi Partner'}</Text>
              {(user?.dhobiType === 'Premium' || user?.dhobiType === 2 || user?.dhobiType === '2') && (
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.premiumBadgeSmall}>
                  <Ionicons name="diamond" size={10} color="#fff" />
                  <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={Colors.warning} />
              <Text style={styles.ratingText}>
                {stats.total === 0 ? 'New Partner' : `(${stats.total}+ Orders)`} • {(user?.dhobiType === 'Premium' || user?.dhobiType === 2 || user?.dhobiType === '2') ? 'Premium Partner' : (user?.dhobiType === 'FullTime' || user?.dhobiType === 1 || user?.dhobiType === '1') ? 'Full-Time Shop' : 'Professional'}
              </Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={Colors.accent} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={[styles.avatar, { backgroundColor: Colors.surface, overflow: 'hidden' }]}>
              {user?.profilePictureUrl ? (
                <Image 
                  source={{ uri: user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : `${SOCKET_URL}${user.profilePictureUrl}` }} 
                  style={styles.avatarImg} 
                />
              ) : (
                <LinearGradient colors={Colors.gradientAccent} style={styles.avatar}>
                  <Text style={styles.avatarText}>{(user?.fullName || 'D').charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
            </View>
          </TouchableOpacity>
          {/* Online Toggle */}
          <View style={styles.onlineToggle}>
            <Text style={[styles.onlineLabel, { color: isOnline ? Colors.success : Colors.textMuted }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={!!isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: '#E2E8F0', true: 'rgba(16,185,129,0.3)' }}
              thumbColor={isOnline ? Colors.accent : '#94A3B8'}
            />
          </View>
        </View>

        <View style={styles.body}>
          {/* Premium Growth Banner */}
          {user?.dhobiType !== 'Premium' && user?.dhobiType !== 2 && user?.dhobiType !== '2' && (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => navigation.navigate('DhobiUpgrade')}
              style={[styles.locationWarning, { marginBottom: 12 }]}
            >
              <LinearGradient 
                colors={['#8B5CF6', '#7C3AED']} 
                start={{x:0, y:0}} end={{x:1, y:0}} 
                style={styles.warningGradient}
              >
                <View style={[styles.warningIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="trending-up" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Grow Your Business</Text>
                  <Text style={styles.warningSub}>Upgrade to Premium to get Insurance coverage, 0% commission, and Priority Listing!</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Market Position Warning */}
          {(!user?.latitude || user?.latitude === 0) && (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => navigation.navigate('LocationPicker')}
              style={styles.locationWarning}
            >
              <LinearGradient 
                colors={[Colors.accent, '#10B981']} 
                start={{x:0, y:0}} end={{x:1, y:0}} 
                style={styles.warningGradient}
              >
                <View style={styles.warningIcon}>
                  <Ionicons name="location-sharp" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Pin Your Market Position</Text>
                  <Text style={styles.warningSub}>Tag your shop location to enable exact delivery distance for riders.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Earnings / Summary Cards */}
          <View style={styles.earningsRow}>
            {currentEarnings.map((e, i) => (
              <TouchableOpacity 
                key={i} 
                onPress={() => {
                  if (e.label === 'Market Orders') navigation.navigate('Market');
                  else if (e.label === 'Active Jobs') {
                    navigation.navigate('MyOrders');
                  }
                  else if (e.label === 'Total Finished') navigation.navigate('History');
                  else navigation.navigate('Wallet');
                }} 
                style={[styles.earningCard, { backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, elevation: 4 }]}
              >
                <View style={[styles.earningIconWrap, { backgroundColor: i === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.1)' }]}>
                  <Ionicons name={e.icon} size={18} color={i === 0 ? Colors.accent : Colors.primary} />
                </View>
                <Text style={styles.earningValue}>{e.value}</Text>
                <Text style={styles.earningLabel}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {[
              { label: 'Services', icon: 'list', screen: 'ManageServices', color: Colors.primary, bg: 'rgba(14,165,233,0.1)' },
              { label: 'My Staff', icon: 'people', screen: 'ManageStaff', color: Colors.warning, bg: 'rgba(245,158,11,0.1)', premium: true },
              { label: 'Orders', icon: 'briefcase', screen: 'MyOrders', color: Colors.accent, bg: 'rgba(16,185,129,0.1)' },
            ].map((a, i) => (
              <TouchableOpacity 
                key={i} 
                onPress={() => {
                  const isPremium = user?.dhobiType === 'Premium' || user?.dhobiType === 2 || user?.dhobiType === '2';
                  if (a.premium && !isPremium) {
                    Alert.alert(
                      'Premium Feature',
                      'Staff management and Batch logistics are only available for Premium Partners. Grow your business and unlock these tools!',
                      [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Upgrade Now', onPress: () => navigation.navigate('DhobiUpgrade') }
                      ]
                    );
                    return;
                  }
                  navigation.navigate(a.screen);
                }} 
                style={[styles.quickBtn, { backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10 }]}
              >
                <View style={[styles.quickBtnIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={[styles.quickBtnLabel, { color: Colors.textPrimary }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Available Orders */}
          <SectionHeader title="Market Opportunities" subtitle="New requests nearby" />
          
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : orders.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <Ionicons name="basket-outline" size={40} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, marginTop: 10 }}>Market is quiet right now.</Text>
            </View>
          ) : (
            orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => navigation.navigate('PlaceBid', { order })}
                style={styles.orderCard}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderIdBadge}>
                    <Text style={styles.orderIdText}>ORDER #{order.id}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ChatRoom', { chat: { name: order.customerName || 'Customer', role: 'Customer', initial: (order.customerName || 'C')[0] } })}
                      style={styles.msgIconBtn}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                </View>
                <Text style={styles.orderService}>{order.serviceDescription}</Text>
                <View style={styles.orderMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{order.customerName || 'Customer'}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="layers-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{order.itemsCount} pieces</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{order.pickupAddress?.split(',')[0]}</Text>
                  </View>
                </View>
                <View style={[styles.bidCta, { backgroundColor: 'rgba(14,165,233,0.08)', borderColor: 'rgba(14,165,233,0.15)' }]}>
                  <TouchableOpacity 
                    onPress={() => {
                      if (!user?.address || user.address.trim() === '') {
                        Alert.alert(
                          'Shop Setup Required',
                          'Please set your shop address in Profile before bidding so we can calculate logistics.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Edit Profile', onPress: () => navigation.navigate('Profile') }
                          ]
                        );
                        return;
                      }
                      navigation.navigate('PlaceBid', { order });
                    }}
                  >
                    <Text style={styles.bidCtaText}>Place Bid →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 24, flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 13, color: Colors.textMuted, marginBottom: 2 },
  username: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { fontSize: 12, color: Colors.textSecondary },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  verifiedText: { fontSize: 11, color: Colors.accent, fontWeight: '600' },
  premiumBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  premiumBadgeText: { fontSize: 9, color: '#fff', fontWeight: '900', letterSpacing: 0.5 },
  onlineToggle: { alignItems: 'center', gap: 4 },
  onlineLabel: { fontSize: 11, fontWeight: '700' },
  avatarBtn: { borderRadius: 12, overflow: 'hidden', marginRight: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  earningsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  earningCard: { flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: 14, alignItems: 'center', gap: 5, borderWidth: 1 },
  earningValue: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  earningLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickBtn: { flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1 },
  quickBtnIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickBtnLabel: { fontSize: 12, fontWeight: '700' },
  orderCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderIdBadge: { backgroundColor: 'rgba(14,165,233,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  orderIdText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  earningIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  orderDate: { fontSize: 11, color: Colors.textMuted },
  orderService: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  orderMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  bidCta: { backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  bidCtaText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  msgIconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(14,165,233,0.08)', alignItems: 'center', justifyContent: 'center' },
  locationWarning: { marginBottom: 24, borderRadius: 20, overflow: 'hidden', elevation: 4 },
  warningGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  warningIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  warningTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  warningSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2, lineHeight: 15 },
});
