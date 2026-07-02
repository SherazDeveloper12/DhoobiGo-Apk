import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Image, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as signalR from '@microsoft/signalr';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { orderService, reviewService, SOCKET_URL } from '../../services/api';
import { useSignalR } from '../../context/SignalRContext';
import MapComponent from '../../components/MapComponent';
import ReviewModal from '../../components/ReviewModal';
import RiderProfileModal from '../../components/RiderProfileModal';
import DhobiProfileModal from '../../components/DhobiProfileModal';

const STAGE_CONFIG = [
  { label: 'Finding Bids', icon: 'search-outline', status: 'PendingBidding' },
  { label: 'Dhobi Selected', icon: 'checkmark-circle-outline', status: 'BidSelected' },
  { label: 'Rider Pickup', icon: 'bicycle-outline', status: 'PickupScheduled' },
  { label: 'In Transit', icon: 'navigate-outline', status: 'PickedUp' },
  { label: 'Washing/Processing', icon: 'shirt-outline', status: 'InLaundry' },
  { label: 'Ready for Dispatch', icon: 'briefcase-outline', status: 'ReadyForDelivery' },
  { label: 'On the Way', icon: 'car-outline', status: 'OutForDelivery' },
  { label: 'Delivered', icon: 'star-outline', status: 'Completed' },
];

export default function TrackOrderScreen({ navigation, route }) {
  const { orderId } = route.params;
  const { 
    connection, isConnected, 
    lastBidUpdate, lastStatusUpdate, lastMessageUpdate 
  } = useSignalR();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState(null);
  const [dhobiModalVisible, setDhobiModalVisible] = useState(false);

  useEffect(() => {
    if (connection && isConnected) {
      console.log('[SIGNALR] Joined Order Room:', orderId);
      connection.invoke('JoinGroup', `Order_${orderId}`).catch(err => console.error(err));
    }
  }, [connection, isConnected, orderId]);

  const fetchOrder = useCallback(async () => {
    try {
      // Refresh both Order and Bids together
      const [orderRes, bidsRes] = await Promise.all([
        orderService.getById(orderId),
        orderService.getBids(orderId)
      ]);

      // Combine them into one object
      const updatedOrder = {
        ...orderRes.data,
        bids: bidsRes.data
      };

      setOrder(updatedOrder);
      console.log('[TRACKING] Order & Bids synced:', orderId);
    } catch (error) {
      console.error('[TRACKING ERROR]:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Sync with Master Signals
  useEffect(() => {
    if (lastBidUpdate.time > 0) {
      const match = String(lastBidUpdate.id) === String(orderId);
      console.log(`[SYNC DEBUG] Bid for #${lastBidUpdate.id} vs Current #${orderId} | Match: ${match}`);
      
      if (match) {
        console.log('[TRACKING] Master Bid Trigger - Executing Refresh (1.5s delay)...');
        setTimeout(fetchOrder, 1500); 
      }
    }
  }, [lastBidUpdate, orderId, fetchOrder]);

  useEffect(() => {
    if (lastStatusUpdate.time > 0) {
      const match = String(lastStatusUpdate.id) === String(orderId);
      console.log(`[SYNC DEBUG] Status for #${lastStatusUpdate.id} vs Current #${orderId} | Match: ${match}`);

      if (match) {
        console.log('[TRACKING] Master Status Trigger - Executing Refresh (1.5s delay)...');
        setTimeout(fetchOrder, 1500);
      }
    }
  }, [lastStatusUpdate, orderId, fetchOrder]);

  useFocusEffect(
    useCallback(() => {
      fetchOrder();
    }, [fetchOrder])
  );

  const coords = order?.latitude && order?.longitude ? {
    latitude: order.latitude,
    longitude: order.longitude
  } : null;

  const handleAcceptRiderBid = async (bidId) => {
    try {
      setRefreshing(true);
      await orderService.acceptRiderBid(orderId, bidId);
      Alert.alert('Success', 'Rider accepted! They are on their way.');
      fetchOrder();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept rider.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancelOrder = () => {
    Alert.alert('Void Order', 'Terminate this request?', [
      { text: 'No' }, { text: 'Void', style: 'destructive', onPress: () => orderService.cancel(orderId).then(() => navigation.goBack()) }
    ]);
  };

  const handleRaiseDispute = () => {
    Alert.alert(
      'Raise Dispute', 
      'This will involve an Admin to resolve the issue with your clothes. Continue?',
      [
        { text: 'No' },
        { 
          text: 'Yes, Open Support', 
          onPress: async () => {
            try {
              await orderService.raiseDispute(orderId, 'Customer requested dispute from tracking screen.');
              // Redirect to Chat with Admin (User ID 1)
              navigation.navigate('ChatRoom', { 
                chat: { name: 'DhoobiGO Support', id: 1, userId: 1, role: 'Admin', orderId: orderId.toString() } 
              });
            } catch (e) {
              Alert.alert('Error', 'Failed to reach support.');
            }
          } 
        }
      ]
    );
  };

  const dhobiBid = order?.bids?.find(b => b.isSelected);
  const riderBid = order?.riderBids?.find(r => r.isAccepted);

  const startReviewProcess = () => {
    if (dhobiBid) {
      setReviewTarget('dhobi');
      setReviewVisible(true);
    } else if (riderBid) {
      setReviewTarget('rider');
      setReviewVisible(true);
    }
  };

  const handleReviewSubmit = async ({ rating, comment }) => {
    try {
      setIsSubmittingReview(true);
      const payload = {
        orderId: orderId,
        rating,
        comment
      };
      
      if (reviewTarget === 'dhobi') {
        payload.dhobiId = dhobiBid.dhobiId;
      } else {
        payload.riderId = riderBid.riderId;
      }

      await reviewService.postReview(payload);
      Alert.alert('Success', 'Thank you for your feedback!');

      if (reviewTarget === 'dhobi' && riderBid) {
        setReviewTarget('rider');
      } else {
        setReviewVisible(false);
        setReviewTarget(null);
        setOrder(prev => ({ ...prev, isReviewed: true }));
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const getStatusIndex = (status) => {
    const map = {
      'PendingBidding': 0, 
      'BidSelected': 1, 
      'PickupScheduled': 2,
      'PickedUp': 3, 
      'InLaundry': 4, 
      'ReadyForDelivery': 5,
      'OutForDelivery': 6, 
      'Completed': 7
    };
    const idx = map[status] ?? 0;
    return idx;
  };

  const currentIndex = getStatusIndex(order?.status);
  // Total steps in the UI timeline is 8 (0-7). So if idx is 7, progress should be 100%.
  const progressPercent = order?.status === 'Completed' ? 100 : ((currentIndex + 1) / 8) * 100;

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrder(); }} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Order Tracking</Text>
            <Text style={styles.headerSub}>ORDER #{orderId}</Text>
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
        </View>

        <View style={styles.body}>
          {/* Status Banner */}
          <View style={styles.statusBanner}>
            <View style={styles.statusIconRow}>
              <LinearGradient colors={Colors.gradientPrimary} style={styles.statusIcon}>
                <Ionicons name={order?.status === 'PendingBidding' ? 'search' : 'shirt'} size={24} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                   <Text style={styles.statusLabel}>Current Status</Text>
                   {order?.isInsured && (
                      <View style={styles.insuredBadge}>
                         <Ionicons name="shield-checkmark" size={10} color="#fff" />
                         <Text style={styles.insuredBadgeText}>INSURED</Text>
                      </View>
                   )}
                </View>
                <Text style={styles.statusValue}>{order?.status === 'PendingBidding' ? 'Finding Bids' : order?.status}</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={Colors.gradientPrimary}
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progressText}>
              {order?.status === 'PendingBidding' ? 'Waiting for Dhobi responses...' : `${Math.round(progressPercent)}% Processed`}
            </Text>
          </View>

          {/* Map Preview */}
          <View style={styles.mapContainer}>
             <MapComponent 
               pickupLocation={coords} 
               riderLocation={order?.riderLatitude ? { latitude: order.riderLatitude, longitude: order.riderLongitude } : null}
               showRoute={true} 
             />
          </View>

          {/* Partner Info */}
          <View style={styles.dhobiCard}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.dhobiAvatar}>
              <Text style={styles.dhobiAvatarText}>{(order?.dhobiName || 'D').charAt(0)}</Text>
            </LinearGradient>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => { if (dhobiBid?.dhobiId) setDhobiModalVisible(true); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.dhobiName}>{order?.dhobiName || 'Scanning Marketplace'}</Text>
                  {order?.dhobiType === 2 && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name="diamond" size={10} color="#fff" />
                      <Text style={styles.premiumText}>PREMIUM</Text>
                    </View>
                  )}
                </View>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {order?.dhobiName ? `${order.dhobiRating || '5.0'} (${order.dhobiReviewsCount || 0} Reviews)` : 'Finding best offers...'}
                  </Text>
                </View>
            </TouchableOpacity>
            
            {order?.dhobiName && (
              <TouchableOpacity style={styles.callBtn} onPress={() => navigation.navigate('ChatRoom', { 
                chat: { 
                  id: `${orderId}_Dhobi`,
                  orderId: orderId.toString(),
                  name: order?.dhobiName, 
                  role: 'Dhobi', 
                  initial: (order?.dhobiName || 'D').charAt(0)
                } 
              })}>
                <Ionicons name="chatbubble-ellipses" size={18} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Rider Info (Once Accepted) */}
          {riderBid && (
            <View style={[styles.dhobiCard, { marginTop: -12, borderTopWidth: 1, borderTopColor: '#F1F5F9', borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
              <LinearGradient colors={['#F1F5F9', '#E2E8F0']} style={styles.dhobiAvatar}>
                <Ionicons name="bicycle" size={20} color={Colors.primary} />
              </LinearGradient>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => { setSelectedRiderId(riderBid.riderId); setRiderModalVisible(true); }}>
                <Text style={styles.dhobiName}>{riderBid.riderName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name={riderBid.riderReviewsCount > 0 ? "star" : "shield-checkmark"} size={12} color={riderBid.riderReviewsCount > 0 ? Colors.accent : Colors.primary} />
                  <Text style={styles.ratingText}>
                    {riderBid.riderReviewsCount > 0 ? `${riderBid.riderRating} Rating` : "Logistics Partner"}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.callBtn} onPress={() => navigation.navigate('ChatRoom', { 
                chat: { 
                  id: `${orderId}_Rider`,
                  orderId: orderId.toString(),
                  name: riderBid.riderName, 
                  role: 'Rider', 
                  initial: (riderBid.riderName || 'R').charAt(0)
                } 
              })}>
                <Ionicons name="chatbubble-ellipses" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Timeline */}
          <Text style={styles.sectionLabel}>Service Lifecycle</Text>
          <View style={styles.timeline}>
            {STAGE_CONFIG.map((stage, index) => {
              const isDone = index < currentIndex || (order?.status === 'Completed');
              const isActive = index === currentIndex && order?.status !== 'Completed';
              return (
                <View key={index} style={styles.timelineItem}>
                  {index < STAGE_CONFIG.length - 1 && (
                    <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />
                  )}
                  <View style={[styles.timelineIconWrap, isDone && styles.timelineIconDone, isActive && styles.timelineIconActive]}>
                    <Ionicons name={stage.icon} size={16} color={isDone ? '#fff' : isActive ? Colors.primary : Colors.textMuted} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, (isDone || isActive) && { color: Colors.textPrimary, fontWeight: '700' }]}>{stage.label}</Text>
                    {isActive && <Text style={styles.timelineActive}>Active State...</Text>}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Rider Negotiations */}
          {order?.riderBids?.length > 0 && (order?.status === 'BidSelected' || order?.status === 'ReadyForDelivery') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rider Pickup Offers</Text>
              {order.riderBids.map((rb) => (
                <View key={rb.id} style={styles.riderBidCard}>
                   <TouchableOpacity style={{ flex: 1 }} onPress={() => { setSelectedRiderId(rb.riderId); setRiderModalVisible(true); }}>
                     <Text style={styles.riderName}>{rb.riderName}</Text>
                     <View style={styles.ratingRow}>
                        <Ionicons name={rb.riderReviewsCount > 0 ? "star" : "shield-checkmark"} size={10} color={rb.riderReviewsCount > 0 ? Colors.accent : Colors.primary} />
                        <Text style={styles.riderMeta}>
                          {rb.riderReviewsCount > 0 ? `${rb.riderRating} (${rb.riderReviewsCount} reviews)` : "New Partner"}
                        </Text>
                     </View>
                   </TouchableOpacity>
                   <View style={{ alignItems: 'flex-end' }}>
                     <Text style={styles.offeredFee}>Rs. {rb.offeredFee}</Text>
                     <TouchableOpacity style={styles.acceptRiderBtn} onPress={() => handleAcceptRiderBid(rb.id)}>
                       <Text style={styles.acceptRiderText}>Accept</Text>
                     </TouchableOpacity>
                   </View>
                </View>
              ))}
            </View>
          )}

          {/* Handover Proofs (Chain of Custody) */}
          {(order?.pickupProofUrl || order?.dhobiDropProofUrl || order?.dhobiPickupProofUrl || order?.deliveryProofUrl || order?.proofImageUrl) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chain of Custody Evidence</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10, gap: 12 }}>
                
                {order?.pickupProofUrl && (
                  <View style={styles.evidenceCardSmall}>
                    <Image source={{ uri: order.pickupProofUrl.startsWith('http') ? order.pickupProofUrl : `https://dhoobigo-dotnet-backend.onrender.com${order.pickupProofUrl}` }} style={styles.evidenceImageSmall} />
                    <Text style={styles.evidenceLabel}>Picked Up</Text>
                  </View>
                )}
                {order?.dhobiDropProofUrl && (
                  <View style={styles.evidenceCardSmall}>
                    <Image source={{ uri: order.dhobiDropProofUrl.startsWith('http') ? order.dhobiDropProofUrl : `https://dhoobigo-dotnet-backend.onrender.com${order.dhobiDropProofUrl}` }} style={styles.evidenceImageSmall} />
                    <Text style={styles.evidenceLabel}>Dhobi Intake</Text>
                  </View>
                )}
                {order?.washProofUrl && (
                  <View style={styles.evidenceCardSmall}>
                    <Image source={{ uri: order.washProofUrl.startsWith('http') ? order.washProofUrl : `https://dhoobigo-dotnet-backend.onrender.com${order.washProofUrl}` }} style={styles.evidenceImageSmall} />
                    <Text style={styles.evidenceLabel}>Wash Complete</Text>
                  </View>
                )}
                {order?.dhobiPickupProofUrl && (
                  <View style={styles.evidenceCardSmall}>
                    <Image source={{ uri: order.dhobiPickupProofUrl.startsWith('http') ? order.dhobiPickupProofUrl : `https://dhoobigo-dotnet-backend.onrender.com${order.dhobiPickupProofUrl}` }} style={styles.evidenceImageSmall} />
                    <Text style={styles.evidenceLabel}>Dhobi Pickup</Text>
                  </View>
                )}
                {(order?.deliveryProofUrl || (!order?.pickupProofUrl && order?.proofImageUrl)) && (
                  <View style={styles.evidenceCardSmall}>
                    <Image source={{ uri: (order?.deliveryProofUrl || order?.proofImageUrl).startsWith('http') ? (order?.deliveryProofUrl || order?.proofImageUrl) : `https://dhoobigo-dotnet-backend.onrender.com${order?.deliveryProofUrl || order?.proofImageUrl}` }} style={styles.evidenceImageSmall} />
                    <Text style={styles.evidenceLabel}>Final Delivery</Text>
                  </View>
                )}

              </ScrollView>
            </View>
          )}

          {currentIndex < 3 ? (
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={handleCancelOrder}
            >
              <Text style={styles.cancelBtnText}>Terminate Request</Text>
            </TouchableOpacity>
          ) : order?.status === 'Completed' ? (
            !order?.isReviewed ? (
              <TouchableOpacity 
                style={[styles.cancelBtn, { marginTop: 20, backgroundColor: Colors.primary, borderRadius: 16 }]} 
                onPress={startReviewProcess}
              >
                <Text style={[styles.cancelBtnText, { color: '#fff' }]}>Rate Your Experience</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.cancelBtn, { marginTop: 20, backgroundColor: '#F0FDF4', borderRadius: 16, borderColor: '#DCFCE7', borderWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  <Text style={{ color: '#16A34A', fontWeight: '700' }}>Feedback Submitted</Text>
                </View>
              </View>
            )
          ) : (
            <TouchableOpacity 
              style={[styles.cancelBtn, { marginTop: 20 }]} 
              onPress={handleRaiseDispute}
            >
              <View style={styles.disputeRow}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.error} />
                <Text style={styles.cancelBtnText}>Raise Handover Dispute</Text>
              </View>
              <Text style={styles.disputeNote}>Clothes are in custody. Admin support required.</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <ReviewModal
        visible={reviewVisible}
        targetName={reviewTarget === 'dhobi' ? dhobiBid?.dhobiName : riderBid?.riderName}
        targetRole={reviewTarget === 'dhobi' ? 'Dhobi' : 'Logistics Partner'}
        onClose={() => setReviewVisible(false)}
        onSubmit={handleReviewSubmit}
        isSubmitting={isSubmittingReview}
      />

      {/* Rider Profile Modal */}
      <RiderProfileModal
        visible={riderModalVisible}
        riderId={selectedRiderId}
        onClose={() => setRiderModalVisible(false)}
      />

      {/* Dhobi Profile Modal */}
      <DhobiProfileModal
        visible={dhobiModalVisible}
        dhobiId={dhobiBid?.dhobiId}
        onClose={() => setDhobiModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24, gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  sosBtn: { backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, elevation: 4 },
  sosText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  body: { paddingHorizontal: 20, paddingBottom: 60 },
  statusBanner: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 4 },
  statusIconRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  statusIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusLabel: { fontSize: 11, color: Colors.textMuted },
  statusValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  progressBar: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, color: Colors.textSecondary },
  mapContainer: { height: 200, borderRadius: 24, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  dhobiCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  dhobiAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dhobiAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  dhobiName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11, color: Colors.textSecondary },
  callBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.08)', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textMuted, marginBottom: 14 },
  timeline: { marginBottom: 24 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, position: 'relative' },
  timelineLine: { position: 'absolute', left: 19, top: 38, width: 2, height: 30, backgroundColor: '#F1F5F9' },
  timelineLineDone: { backgroundColor: Colors.accent },
  timelineIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  timelineIconDone: { backgroundColor: Colors.accent },
  timelineIconActive: { borderWidth: 2, borderColor: Colors.primary },
  timelineContent: { paddingTop: 10 },
  timelineLabel: { fontSize: 14, color: Colors.textMuted },
  timelineActive: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  section: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F8FAFC' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16 },
  riderBidCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  riderName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  riderMeta: { fontSize: 11, color: Colors.textMuted },
  offeredFee: { fontSize: 16, fontWeight: '800', color: Colors.accent },
  acceptRiderBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 4 },
  acceptRiderText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  evidenceCardSmall: { width: 140, height: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
  evidenceImageSmall: { width: '100%', height: 140, resizeMode: 'cover' },
  evidenceLabel: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginTop: 8 },
  cancelBtn: { padding: 20, alignItems: 'center' },
  cancelBtnText: { color: Colors.error, fontSize: 14, fontWeight: '700' },
  disputeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disputeNote: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  premiumBadge: { backgroundColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  premiumText: { color: '#fff', fontSize: 8, fontWeight: '900' },
});
