import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { StatusBadge } from '../../components/UIComponents';
import { orderService } from '../../services/api';

export default function MyOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [user, setUser] = useState(null);

  const fetchOrders = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return;
      const parsedUser = JSON.parse(userDataStr);
      const { userId } = parsedUser;
      setUser(parsedUser);
      
      console.log('[IDENTITY TRACE] Mobile sending UserId:', userId);
      const response = await orderService.getDhobiOrders(userId);
      console.log('[DATA TRACE] Received Orders:', response.data.length);
      setOrders(response.data);
    } catch (err) {
      console.error('Fetch Orders Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );
  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: '#fff' }]}>{isSelectionMode ? `${selectedIds.length} Selected` : 'Active Orders'}</Text>
            <Text style={[styles.headerSub, { color: 'rgba(255,255,255,0.8)' }]}>
              {isSelectionMode ? 'Select orders to create a batch' : 'Orders you are currently processing'}
            </Text>
          </View>
          {orders.length > 0 && user?.dhobiType === 'Premium' && (
            <TouchableOpacity 
              onPress={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedIds([]);
              }} 
              style={styles.batchModeBtn}
            >
              <Ionicons name={isSelectionMode ? "close" : "list-outline"} size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
          ) : orders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').length > 0 ? (
            orders
              .filter(o => o.status !== 'Completed' && o.status !== 'Cancelled')
              .map((order) => (
              <TouchableOpacity
                key={order.id}
                onLongPress={() => {
                  if (!isSelectionMode && user?.dhobiType === 'Premium') {
                    setIsSelectionMode(true);
                    setSelectedIds([order.id]);
                  }
                }}
                onPress={() => {
                  if (isSelectionMode) {
                    const exists = selectedIds.includes(order.id);
                    if (exists) {
                      setSelectedIds(selectedIds.filter(id => id !== order.id));
                    } else {
                      setSelectedIds([...selectedIds, order.id]);
                    }
                  } else {
                    // Normal tap functionality if not in selection mode
                    navigation.navigate('UpdateStatus', { taskId: order.id });
                  }
                }}
                style={[
                  styles.orderCard,
                  isSelectionMode && selectedIds.includes(order.id) && styles.selectedCard
                ]}
              >
                {isSelectionMode && (
                  <View style={styles.checkboxContainer}>
                    <Ionicons 
                      name={selectedIds.includes(order.id) ? "checkbox" : "square-outline"} 
                      size={24} 
                      color={selectedIds.includes(order.id) ? Colors.primary : Colors.textMuted} 
                    />
                  </View>
                )}
                <View style={styles.orderTop}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.orderId}>ORDER #{order.id}</Text>
                    <Text style={styles.orderService} numberOfLines={2}>{order.serviceDescription}</Text>
                  </View>
                  <StatusBadge status={order.status} />
                </View>

                <View style={styles.orderDetail}>
                  <Ionicons name="person-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.detailText}>Customer: {order.customerName}</Text>
                </View>

                <View style={styles.orderDetail}>
                  <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.detailText} numberOfLines={1}>{order.pickupAddress}</Text>
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.price}>Rs. {order.selectedBidPrice}</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity 
                      style={styles.chatBtn} 
                      onPress={() => navigation.navigate('ChatRoom', { 
                        chat: { 
                          name: order.customerName || 'Customer', 
                          role: 'Customer', 
                          initial: (order.customerName || 'C').charAt(0),
                          id: `${order.id}_Dhobi`,
                          orderId: order.id.toString(),
                        } 
                      })}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    {(() => {
                      const s = order.status;
                      const isDhobiTurn = ['PickedUp', 'InLaundry'].includes(s);
                      
                      return (
                        <TouchableOpacity 
                          style={[styles.updateBtn, { opacity: isDhobiTurn ? 1 : 0.6, backgroundColor: isDhobiTurn ? Colors.primary : Colors.textMuted }]}
                          onPress={() => isDhobiTurn && navigation.navigate('UpdateStatus', { taskId: order.id })}
                        >
                          <Text style={styles.updateBtnText}>{isDhobiTurn ? "Update Status" : "In Transit"}</Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={64} color={Colors.surface} />
              <Text style={styles.emptyText}>No active orders at the moment.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {isSelectionMode && selectedIds.length > 0 && (
        <View style={styles.batchActionBar}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.batchGradient}>
            <View style={styles.batchInfo}>
              <Text style={styles.batchCountText}>{selectedIds.length} Orders Ready</Text>
              <Text style={styles.batchSubText}>Assign to staff or post to market</Text>
            </View>
            <TouchableOpacity 
              style={styles.assignBatchBtn}
              onPress={() => {
                Alert.alert(
                  'Batch Actions',
                  'What would you like to do with these orders?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Assign to Staff', onPress: () => navigation.navigate('ManageStaff', { batchIds: selectedIds }) },
                    { text: 'Post to Marketplace', onPress: () => Alert.alert('Coming Soon', 'Logistics Marketplace bidding for batches will be in Phase 2.') }
                  ]
                );
              }}
            >
              <Text style={styles.assignBatchText}>CREATE BATCH</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 24, gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textSecondary },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: 100, paddingTop: 20 },
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, elevation: 5 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  orderId: { fontSize: 11, color: Colors.primary, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  orderService: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  orderDetail: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, width: '100%' },
  detailText: { fontSize: 13, color: Colors.textSecondary, flex: 1, paddingRight: 10 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  price: { fontSize: 18, fontWeight: '800', color: Colors.accent },
  chatBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(14,165,233,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(14,165,233,0.15)' },
  updateBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, justifyContent: 'center' },
  updateBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { color: Colors.textMuted, marginTop: 16, fontSize: 15 },
  batchModeBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  selectedCard: { borderColor: Colors.primary, backgroundColor: 'rgba(14,165,233,0.02)', borderWidth: 2 },
  checkboxContainer: { position: 'absolute', top: 12, right: 12, zIndex: 10 },
  batchActionBar: { position: 'absolute', bottom: 30, left: 20, right: 20, zIndex: 100 },
  batchGradient: { borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  batchInfo: { flex: 1 },
  batchCountText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  batchSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
  assignBatchBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignBatchText: { color: Colors.primary, fontWeight: '800', fontSize: 12 },
});
