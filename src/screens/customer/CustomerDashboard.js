import { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, RefreshControl, Image 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { orderService, userService, SOCKET_URL } from '../../services/api';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { SectionHeader, StatusBadge } from '../../components/UIComponents';

export default function CustomerDashboard({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsData, setStatsData] = useState({ total: 0, active: 0, completed: 0 });

  const fetchData = async () => {
    try {
      // 1. Initial load from Cache for speed
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        setUser(JSON.parse(userDataStr));
      }

      // 2. Fetch Fresh Data from Server
      const profileResp = await userService.getProfile();
      const freshUser = profileResp.data;
      
      // 3. Update State & Cache
      const updatedUser = {
        ...freshUser,
        userId: freshUser.userId || freshUser.id, // Ensure identity is preserved
      };
      
      setUser(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));

      // 4. Fetch Orders
      const response = await orderService.getMyOrders();
      console.log(`[DASHBOARD DEBUG] Orders count: ${response?.data?.length || 0}`);
      
      const ordersData = Array.isArray(response?.data) ? response.data : [];
      setOrders(ordersData);

      const safeStats = {
        total: ordersData.length,
        active: ordersData.filter(o => o && (o.status !== 'Completed' && o.status !== 'Cancelled')).length,
        completed: ordersData.filter(o => o && o.status === 'Completed').length
      };
      setStatsData(safeStats);
    } catch (error) {
      console.error('[DASHBOARD SYNC ERROR]:', error);
      if (error.response?.status === 401) navigation.replace('Login');
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

  const currentStats = [
    { label: 'Total Orders', value: statsData.total.toString(), icon: 'receipt-outline', color: Colors.primary },
    { label: 'Active', value: statsData.active.toString(), icon: 'pricetag-outline', color: Colors.warning },
    { label: 'Completed', value: statsData.completed.toString(), icon: 'checkmark-circle-outline', color: Colors.success },
  ];

  return (
    <LinearGradient colors={Colors.gradientWhite} style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning</Text>
            <Text style={styles.username}>{user?.fullName || 'User'}</Text>
            <Text style={styles.headerSub}>What needs a fresh clean today?</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={[styles.avatar, { backgroundColor: Colors.surface, overflow: 'hidden' }]}>
              {user?.profilePictureUrl ? (
                <Image 
                  source={{ uri: user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : `${SOCKET_URL}${user.profilePictureUrl}` }} 
                  style={styles.avatarImg} 
                />
              ) : (
                <LinearGradient colors={Colors.gradientPrimary} style={styles.avatar}>
                  <Text style={styles.avatarText}>{(user?.fullName || 'U').charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Create Order CTA */}
          <TouchableOpacity onPress={() => navigation.navigate('CreateOrder')} activeOpacity={0.9}>
            <LinearGradient 
              colors={['#0EA5E9', '#2DD4BF']} 
              style={styles.heroBanner} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.heroOrb, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>New Laundry Order</Text>
                <Text style={styles.heroSub}>Professional cleaning with real-time bidding</Text>
                <View style={[styles.heroCta, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.heroCtaText, { color: Colors.primary }]}>Get Started</Text>
                  <Ionicons name="add-circle" size={18} color={Colors.primary} />
                </View>
              </View>
              <Ionicons name="water" size={100} color="rgba(255,255,255,0.15)" style={styles.heroIcon} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {currentStats.map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, elevation: 4 }]}>
                <View style={[styles.statIconWrap, { backgroundColor: i === 0 ? 'rgba(14,165,233,0.1)' : i === 1 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)' }]}>
                  <Ionicons name={s.icon} size={20} color={i === 0 ? Colors.primary : i === 1 ? Colors.warning : Colors.accent} />
                </View>
                <Text style={styles.statValue}>{String(s.value)}</Text>
                <Text style={styles.statLabel}>{String(s.label)}</Text>
              </View>
            ))}
          </View>

          {/* Recent Orders */}
          <SectionHeader title="Recent Orders" subtitle="Your latest laundry requests" />
          
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : orders.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, marginTop: 10 }}>No orders yet. Start by creating one!</Text>
            </View>
          ) : (
            orders.map((order) => (
              <TouchableOpacity 
                key={order.id} 
                onPress={() => navigation.navigate('TrackOrder', { orderId: order.id })} 
                style={styles.orderCard}
              >
                <View style={styles.orderTop}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.orderId}>ORDER #{String(order?.id || '?')}</Text>
                    <Text style={styles.orderService} numberOfLines={1}>{String(order?.serviceDescription || '')}</Text>
                  </View>
                  <StatusBadge status={order?.status} />
                </View>
                <View style={styles.orderBottom}>
                  <View style={styles.orderMeta}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.orderMetaText}>{order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Date N/A'}</Text>
                  </View>
                  <View style={styles.orderMeta}>
                    <Ionicons name="layers-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.orderMetaText}>{String(order?.itemsCount || 0)} pieces</Text>
                  </View>
                  {(order?.totalAmount || 0) > 0 && (
                    <View style={styles.orderMeta}>
                      <Ionicons name="cash-outline" size={13} color={Colors.accent} />
                      <Text style={[styles.orderMetaText, { color: Colors.accent }]}>Rs. {String(order.totalAmount)}</Text>
                    </View>
                  )}
                </View>
                {order.status === 'PendingBidding' && (
                  <View style={styles.pendingActionRow}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ViewBids', { orderId: order.id })}
                      style={styles.viewBidsBtn}
                    >
                      <Text style={styles.viewBidsText}>Check Dhobi Bids →</Text>
                    </TouchableOpacity>
                    {(order.bidCount || 0) > 0 && (
                      <View style={styles.bidBadge}>
                        <Text style={styles.bidBadgeText}>{String(order.bidCount)} Bids Received</Text>
                      </View>
                    )}
                  </View>
                )}
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 28,
  },
  greeting: { fontSize: 13, color: Colors.textMuted, marginBottom: 2 },
  username: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2 },
  headerSub: { fontSize: 13, color: Colors.textSecondary },
  avatarBtn: { borderRadius: 28, overflow: 'hidden' },
  avatar: { width: 52, height: 52, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  heroBanner: { 
    borderRadius: 32, 
    padding: 24, 
    minHeight: 180, 
    overflow: 'hidden', 
    position: 'relative',
    marginBottom: 24,
  },
  heroOrb: { position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: 70 },
  heroContent: { flex: 1, justifyContent: 'flex-end', zIndex: 1 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 20, maxWidth: '80%', lineHeight: 18 },
  heroCta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, gap: 8 },
  heroCtaText: { fontSize: 14, fontWeight: '800' },
  heroIcon: { position: 'absolute', bottom: -10, right: -10, zIndex: 0 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { width: '31%', padding: 14, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  statIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', fontWeight: '500' },
  orderCard: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, width: '100%' },
  orderId: { fontSize: 11, color: Colors.primary, fontWeight: '700', marginBottom: 3, letterSpacing: 0.5 },
  orderService: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  orderBottom: { flexDirection: 'row', gap: 14 },
  orderMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderMetaText: { fontSize: 12, color: Colors.textMuted },
  viewBidsBtn: {
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(108,99,255,0.1)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.25)', alignSelf: 'flex-start',
  },
  viewBidsText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  pendingActionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: 12 
  },
  bidBadge: { 
    backgroundColor: 'rgba(16,185,129,0.1)', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(16,185,129,0.2)' 
  },
  bidBadgeText: { 
    fontSize: 11, 
    color: Colors.accent, 
    fontWeight: '700' 
  },
});
