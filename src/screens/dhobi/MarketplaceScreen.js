import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert, Dimensions 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { orderService } from '../../services/api';
import { Colors, Spacing, BorderRadius, AppShadows } from '../../theme/typography';

const { width } = Dimensions.get('window');

const getServiceColor = (desc) => {
  if (desc.includes('Dry')) return Colors.accent;
  if (desc.includes('Iron')) return Colors.warning;
  return Colors.primary;
};

const getServiceIcon = (desc) => {
  if (desc.includes('Dry')) return 'star';
  if (desc.includes('Iron')) return 'flash';
  if (desc.includes('Wash')) return 'water';
  return 'shirt';
};

export default function MarketplaceScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const [res, userDataStr] = await Promise.all([
        orderService.getPending(),
        AsyncStorage.getItem('userData')
      ]);

      const userId = userDataStr ? JSON.parse(userDataStr).userId : null;
      
      const filtered = res.data.filter(o => {
        const isPending = o.status === 'PendingBidding' || o.status === '0';
        const hasMyBid = o.bids?.some(b => b.dhobiId.toString() === userId?.toString());
        return isPending && !hasMyBid;
      });
      
      setOrders(filtered);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Financial Hub communication failed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const handleBidPress = async (order) => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      const user = userDataStr ? JSON.parse(userDataStr) : null;
      
      if (!user?.address || user.address.trim() === '') {
        Alert.alert(
          'Shop Setup Required',
          'Please set your shop address in your profile before bidding so we can calculate rider distances.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') }
          ]
        );
        return;
      }
      
      navigation.navigate('PlaceBid', { order });
    } catch (e) {
      navigation.navigate('PlaceBid', { order });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Premium Header */}
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleArea}>
            <Text style={styles.title}>Order Market</Text>
            <View style={styles.marketStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Market Live</Text>
            </View>
          </View>
        </View>
        <Text style={styles.subtitle}>Discover new requests and Manifest your bids</Text>
      </LinearGradient>
      
      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={Colors.primary} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <LinearGradient colors={['rgba(0,212,170,0.05)', 'rgba(14,165,233,0.05)']} style={styles.iconBox}>
              <Ionicons name="earth-outline" size={48} color={Colors.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>The Market is Quiet</Text>
            <Text style={styles.emptyText}>New laundry orders will Manifest here soon. Keep your equipment ready!</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => { setRefreshing(true); fetchOrders(); }}>
              <Text style={styles.refreshText}>Refresh Market</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map((order) => {
            const sColor = getServiceColor(order.serviceDescription);
            const sIcon = getServiceIcon(order.serviceDescription);
            
            return (
              <TouchableOpacity 
                key={order.id} 
                activeOpacity={0.9}
                style={styles.orderCard}
                onPress={() => handleBidPress(order)}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.serviceOrb, { backgroundColor: sColor + '15' }]}>
                    <Ionicons name={sIcon} size={22} color={sColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                       <View style={[styles.marketBadge, { backgroundColor: sColor + '10' }]}>
                         <Text style={[styles.marketBadgeText, { color: sColor }]}>NEW REQUEST</Text>
                       </View>
                       <Text style={styles.timeLabel}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <Text style={styles.serviceTitle} numberOfLines={1}>{order.serviceDescription}</Text>
                  </View>
                </View>

                <View style={styles.cardMeta}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="layers" size={14} color={Colors.textMuted} />
                    <Text style={styles.metaLabel}>{order.itemsCount} Items</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Ionicons name="location" size={14} color={Colors.textMuted} />
                    <Text style={styles.metaLabel} numberOfLines={1}>{order.pickupAddress.split(',')[0]} (Near you)</Text>
                  </View>
                </View>

                <LinearGradient 
                  colors={[Colors.primary, Colors.primaryDark]} 
                  style={styles.bidAction}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.bidActionText}>View Details & Manifest Bid</Text>
                  <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 64, paddingBottom: 32, paddingHorizontal: Spacing.lg, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  titleArea: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  marketStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  statusText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
  orderCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', ...AppShadows.card },
  cardTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  serviceOrb: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  marketBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  marketBadgeText: { fontSize: 10, fontWeight: '800' },
  timeLabel: { fontSize: 11, color: Colors.textMuted },
  serviceTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  cardMeta: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 20 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flex: 1 },
  metaLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  bidAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, gap: 10 },
  bidActionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 28, padding: 40, alignItems: 'center', marginTop: 40, borderWidth: 1, borderColor: '#F1F5F9', ...AppShadows.card },
  iconBox: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 12, marginBottom: 30, lineHeight: 20 },
  refreshBtn: { backgroundColor: Colors.accent, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 16 },
  refreshText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
