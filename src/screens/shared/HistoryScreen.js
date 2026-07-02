import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { orderService } from '../../services/api';

export default function HistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('Customer');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUserRole(userData.role);
      }
      await fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await orderService.getMyOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#10B981';
      case 'PendingBidding': return '#F59E0B';
      case 'PickupScheduled': return '#3B82F6';
      case 'InLaundry': return '#8B5CF6';
      default: return Colors.textMuted;
    }
  };

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
        <Text style={styles.title}>{userRole === 'Dhobi' ? 'Service Archive' : 'Order History'}</Text>
        <Text style={styles.subtitle}>
          {userRole === 'Dhobi' ? 'View your completed and active client jobs' : 'Track your past laundry requests'}
        </Text>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptyText}>When you {userRole === 'Dhobi' ? 'complete a job' : 'place an order'}, it will appear here.</Text>
          </View>
        ) : (
          orders.map((order, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.orderCard}
              onPress={() => navigation.navigate(userRole === 'Dhobi' ? 'MyOrders' : 'TrackOrder', { orderId: order.id })}
            >
              <View style={styles.orderHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.orderId}>#ORD-{order.id}</Text>
                  <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
                </View>
              </View>
              
              <Text style={styles.serviceDesc} numberOfLines={1}>{order.serviceDescription}</Text>
              
              <View style={styles.metaRow}>
                <Ionicons name="person-circle-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.metaText}>
                  {userRole === 'Dhobi' ? `Client: ${order.customerName}` : `Shop: ${order.dhobiName || 'Pending'}`}
                </Text>
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.itemCount}>{order.itemsCount} Items</Text>
                <Text style={styles.price}>Rs. {order.selectedBidPrice}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  scroll: { flexGrow: 1, padding: Spacing.lg },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 32, backgroundColor: 'rgba(14,165,233,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: 20 },
  orderNowBtn: { marginTop: 32, backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 20, elevation: 4 },
  orderNowText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  orderCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  orderId: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  orderDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  serviceDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  itemCount: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  price: { fontSize: 16, fontWeight: '800', color: Colors.primary },
});
