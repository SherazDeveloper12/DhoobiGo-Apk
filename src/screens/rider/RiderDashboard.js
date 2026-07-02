import { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, RefreshControl, Modal, TextInput, Image, Linking 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { PrimaryButton, SectionHeader } from '../../components/UIComponents';
import { orderService, userService, SOCKET_URL } from '../../services/api';
import { useSignalR } from '../../context/SignalRContext';

export default function RiderDashboard({ navigation }) {
  const { connection, isConnected, lastMarketUpdate } = useSignalR();
  const [user, setUser] = useState(null);

  // ... rest of the code ...

  useEffect(() => {
    if (lastMarketUpdate > 0) {
      // Riders should only refresh if they are on a marketplace screen 
      // or if the signal is relevant to logistics.
      console.log('[RIDER] Master update received');
      fetchData();
    }
  }, [lastMarketUpdate]);
  const [marketTasks, setMarketTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState({ balance: 0, pending: 0, completed: 0 });
  
  // Bidding Modal State
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [bidAmount, setBidAmount] = useState('200');

  const fetchData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) setUser(JSON.parse(userDataStr));

      const [marketRes, activeRes, walletRes] = await Promise.all([
        orderService.getRiderMarketplace(),
        orderService.getMyRiderOrders(),
        orderService.getRiderStats()
      ]);

      const userId = userDataStr ? JSON.parse(userDataStr).userId : null;
      
      console.log('[RIDER SYNC] Marketplace Raw Count:', marketRes.data?.length);
      
      const filteredMarket = marketRes.data.filter(t => {
        // ALWAYS show return delivery tasks (Stage 2) regardless of Stage 1 bids
        if (t.status === 'ReadyForDelivery') return true;
        
        // For pickup tasks, hide if already bid
        return !t.riderBids || !t.riderBids.some(rb => rb.riderId.toString() === userId?.toString());
      });

      console.log('[RIDER SYNC] Marketplace Filtered Count:', filteredMarket.length);

      setMarketTasks(filteredMarket);
      
      // FIX: Only set ACTIVE tasks (exclude Completed/Cancelled)
      const activeTasks = activeRes.data.filter(o => 
        o.status !== 'Completed' && o.status !== 'Cancelled'
      );
      setMyTasks(activeTasks);
      
      // Normalize backend keys (Balance -> balance, etc)
      const wData = walletRes.data;
      setWallet({
        balance: wData.balance || wData.Balance || 0,
        pending: wData.pending || wData.Pending || 0,
        completed: wData.completedCount || wData.CompletedCount || 0
      });
    } catch (error) {
      console.error('[RIDER SYNC ERROR]:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openBidModal = (order) => {
    setSelectedOrder(order);
    setBidModalVisible(true);
  };

  const submitProposal = async () => {
    if (!bidAmount || isNaN(bidAmount)) {
      Alert.alert('Invalid Amount', 'Please enter a valid numeric delivery fee.');
      return;
    }

    try {
      setLoading(true);
      setBidModalVisible(false);
      const userDataStr = await AsyncStorage.getItem('userData');
      const { userId } = JSON.parse(userDataStr);

      await orderService.bidOnTask(selectedOrder.id, userId, parseFloat(bidAmount));
      Alert.alert('Proposal Manifested', 'The customer has been notified of your delivery offer.');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.Message || 'Bid submission failed.';
      Alert.alert('Logistics Conflict', msg);
    } finally {
      setLoading(false);
    }
  };

  const riderStats = [
    { label: 'Pending', value: `Rs. ${wallet.pending}`, icon: 'time-outline' },
    { label: 'Active Jobs', value: myTasks.length, icon: 'bicycle-outline' },
    { label: 'Summary', value: `Rs. ${wallet.balance}`, icon: 'wallet-outline' },
  ];

  const handleStatPress = (item) => {
    if (item.label === 'Pending') {
      navigation.navigate('Marketplace'); 
    } else if (item.label === 'Summary') {
      navigation.navigate('Wallet');
    } else if (myTasks.length > 0) {
      // Navigate to the first active task for quick update
      navigation.navigate('UpdateStatus', { taskId: myTasks[0].id });
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', backgroundColor: '#fff' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          {/* ... Header Content ... */}
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>On Duty</Text>
            <Text style={styles.username}>{user?.fullName || 'Rider'}</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineIndicator} />
              <Text style={styles.statusText}>Accepting Tasks</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.sosBtn} 
            onPress={() => {
              Alert.alert(
                'Emergency SOS',
                'Do you want to call Police (15)?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'CALL NOW', style: 'destructive', onPress: () => Linking.openURL('tel:15') }
                ]
              );
            }}
          >
            <Ionicons name="warning" size={20} color="#fff" />
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={[styles.avatar, { backgroundColor: '#F1F5F9', overflow: 'hidden' }]}>
              {user?.profilePictureUrl ? (
                <Image 
                  source={{ uri: user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : `${SOCKET_URL}${user.profilePictureUrl}` }} 
                  style={styles.avatarImg} 
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
                   <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{(user?.fullName || 'R').charAt(0)}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Marketplace Sync Reminder */}
          {(!user?.latitude || user?.latitude === 0) && (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => navigation.navigate('LocationPicker')}
              style={styles.locationWarning}
            >
              <LinearGradient 
                colors={[Colors.primary, Colors.primaryDark]} 
                start={{x:0, y:0}} end={{x:1, y:0}} 
                style={styles.warningGradient}
              >
                <View style={styles.warningIcon}>
                  <Ionicons name="location-sharp" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Pin Your Rider Location</Text>
                  <Text style={styles.warningSub}>Tag your current position to see exact distances for delivery jobs.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={styles.statsRow}>
            {riderStats.map((s, i) => (
              <TouchableOpacity key={i} style={styles.statCard} onPress={() => handleStatPress(s)}>
                <View style={[styles.statIconWrap, { backgroundColor: i === 2 ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.1)' }]}>
                  <Ionicons name={s.icon} size={20} color={i === 2 ? Colors.accent : Colors.primary} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <SectionHeader title="Available Delivery Jobs" subtitle="Claim active trips" />
          {marketTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="map-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>No delivery jobs available right now.</Text>
            </View>
          ) : (
            marketTasks.map((t) => (
              <View key={t.id} style={styles.taskCard}>
                <View style={styles.taskTop}>
                   <View style={styles.distBadge}>
                      <Ionicons name="location" size={12} color={Colors.primary} />
                      <Text style={styles.distText}>{t.distanceKm?.toFixed(1) || '0.0'} KM</Text>
                   </View>
                   <Text style={styles.basePrice}>#{t.id}</Text>
                </View>
                <Text style={styles.taskTitle}>{t.serviceDescription}</Text>
                <View style={styles.routeBox}>
                   <View style={styles.routeStep}>
                      <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                      <Text style={styles.addrText} numberOfLines={1}>
                        {t.status === 'ReadyForDelivery' ? `From: ${t.dhobiAddress}` : `From: ${t.pickupAddress}`}
                      </Text>
                   </View>
                   <View style={[styles.line, { backgroundColor: '#E2E8F0' }]} />
                   <View style={styles.routeStep}>
                      <View style={[styles.dot, { backgroundColor: Colors.accent }]} />
                      <Text style={styles.addrText} numberOfLines={1}>
                        {t.status === 'ReadyForDelivery' ? `To: ${t.pickupAddress}` : `To: ${t.dhobiAddress || 'Dhobi Location'}`}
                      </Text>
                   </View>
                </View>
                <TouchableOpacity style={styles.claimBtn} onPress={() => openBidModal(t)}>
                   <Text style={styles.claimBtnText}>Send Proposal</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <SectionHeader title="My Ongoing Orders" subtitle="Your active deliveries" />
          {myTasks.length === 0 ? (
             <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active jobs in your queue.</Text>
             </View>
          ) : (
             myTasks.map((t) => (
                <TouchableOpacity 
                   key={t.id} 
                   style={[styles.taskCard, { borderColor: Colors.primary, borderLeftWidth: 4 }]}
                   onPress={() => navigation.navigate('UpdateStatus', { taskId: t.id })}
                >
                   <View style={styles.taskTop}>
                      <View style={[styles.statusBadge, { backgroundColor: Colors.primary + '15' }]}>
                         <Text style={{ color: Colors.primary, fontSize: 10, fontWeight: '800' }}>{t.status}</Text>
                      </View>
                      <Text style={styles.orderId}>#ORD-{t.id}</Text>
                   </View>
                   <Text style={styles.taskTitle}>{t.serviceDescription}</Text>
                    {(() => {
                      const s = t.status;
                      const isRiderTurn = ['BidSelected', 'PickupScheduled', 'ReadyForDelivery', 'OutForDelivery'].includes(s);
                      
                      return (
                        <PrimaryButton 
                           title={isRiderTurn ? "Update Status" : (s === 'PickedUp' || s === 'InLaundry' ? "With Shop" : "Waiting")} 
                           onPress={() => isRiderTurn && navigation.navigate('UpdateStatus', { taskId: t.id })} 
                           style={{ marginTop: 12, opacity: isRiderTurn ? 1 : 0.6 }} 
                        />
                      );
                    })()}
                </TouchableOpacity>
             ))
          )}
        </View>

        {/* Bidding Modal */}
        <Modal
          visible={bidModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setBidModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delivery Proposal</Text>
                <TouchableOpacity onPress={() => setBidModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalDesc}>
                Set your total fee for this two-way logistics task (Pickup + Delivery).
              </Text>

              <View style={styles.bidInputArea}>
                <Text style={styles.currency}>Rs.</Text>
                <TextInput
                  style={styles.bidInput}
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  autoFocus
                />
              </View>

              <TouchableOpacity style={styles.submitBidBtn} onPress={submitProposal}>
                <Text style={styles.submitBidText}>Confirm Proposal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 24, flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 13, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  username: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  onlineIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  statusText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  sosBtn: { backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 12, elevation: 4 },
  sosText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  avatarBtn: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', elevation: 4 },
  avatar: { flex: 1 },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  body: { paddingHorizontal: 24, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 20, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  emptyCard: { padding: 32, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyText: { fontSize: 13, color: '#64748B', marginTop: 8 },
  taskCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  distBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(14,165,233,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  distText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  basePrice: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  taskTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16 },
  routeBox: { gap: 4, marginBottom: 20 },
  routeStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, height: 12, marginLeft: 3 },
  addrText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  claimBtn: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  claimBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  orderId: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  modalDesc: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24, lineHeight: 20 },
  bidInputArea: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 20, height: 64, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  currency: { fontSize: 18, fontWeight: '800', color: Colors.primary, marginRight: 12 },
  bidInput: { flex: 1, fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  submitBidBtn: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 4 },
  submitBidText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  locationWarning: { marginBottom: 24, borderRadius: 20, overflow: 'hidden', elevation: 4 },
  warningGradient: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  warningIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  warningTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  warningSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2, lineHeight: 15 },
});
