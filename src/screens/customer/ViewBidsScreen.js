import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { AccentButton } from '../../components/UIComponents';

const mockBids = [
  { id: 1, dhobi: 'Ahmed Laundry', rating: 4.8, reviews: 127, price: 750, time: '1-2 days', distance: '1.2 km', verified: true, speciality: 'Washing & Ironing' },
  { id: 2, dhobi: 'Super Clean Services', rating: 4.5, reviews: 89, price: 900, time: 'Same day', distance: '0.8 km', verified: true, speciality: 'All Services' },
  { id: 3, dhobi: 'Fresh Press Studio', rating: 4.2, reviews: 45, price: 650, time: '2-3 days', distance: '2.5 km', verified: false, speciality: 'Ironing Expert' },
];

import { useEffect, useCallback } from 'react';
import { Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { orderService, getImageUrl } from '../../services/api';
import { useSignalR } from '../../context/SignalRContext';
import DhobiProfileModal from '../../components/DhobiProfileModal';

export default function ViewBidsScreen({ route, navigation }) {
  const { orderId } = route.params;
  const { 
    isConnected, 
    lastBidUpdate, lastStatusUpdate 
  } = useSignalR();

  const [order, setOrder] = useState(null);
  const [bids, setBids] = useState([]);
  const [selectedBidId, setSelectedBidId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { connection } = useSignalR();

  useEffect(() => {
    if (connection && isConnected) {
      console.log('[SIGNALR] Joining Order Room:', orderId);
      connection.invoke('JoinGroup', `Order_${orderId}`).catch(err => console.error(err));
    }
  }, [connection, isConnected, orderId]);
  
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedDhobiId, setSelectedDhobiId] = useState(null);

  const fetchBids = useCallback(async () => {
    try {
      const orderResp = await orderService.getById(orderId);
      const orderData = orderResp.data;
      setOrder(orderData);
      
      if (orderData.status === 'ReadyForDelivery' || orderData.status === 'BidSelected') {
        const formattedBids = (orderData.riderBids || []).map(rb => ({
          id: rb.id,
          dhobiId: rb.riderId,
          dhobiName: rb.riderName,
          price: rb.offeredFee,
          deliveryDays: 'Same day',
          isRider: true,
          isAccepted: rb.isAccepted
        }));
        setBids(formattedBids);
        const accepted = formattedBids.find(b => b.isAccepted);
        if (accepted) setSelectedBidId(accepted.id);
      } else {
        const bidsResp = await orderService.getBids(orderId);
        setBids(bidsResp.data);
        if (orderData.selectedBidId) {
          setSelectedBidId(orderData.selectedBidId);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load bids.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  const [isSyncing, setIsSyncing] = useState(false);

  // Sync with Master Signals
  useEffect(() => {
    if (lastBidUpdate.time > 0) {
      const match = String(lastBidUpdate.id) === String(orderId);
      if (match) {
        console.log('[BIDS] Real-time Bid Received. Syncing (1.5s delay)...');
        setIsSyncing(true);
        setTimeout(() => {
          fetchBids();
          setIsSyncing(false);
        }, 1500);
      }
    }
  }, [lastBidUpdate, orderId, fetchBids]);

  useEffect(() => {
    if (lastStatusUpdate.time > 0) {
      const match = String(lastStatusUpdate.id) === String(orderId);
      if (match) {
        console.log('[BIDS] Real-time Status Change. Syncing...');
        fetchBids();
      }
    }
  }, [lastStatusUpdate, orderId, fetchBids]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBids();
  };

  const handleSelect = async (bidId) => {
    setSelectedBidId(bidId);
    try {
      if (order.status === 'ReadyForDelivery' || order.status === 'BidSelected') {
        // This is a Rider Bid for logistics
        await orderService.acceptRiderBid(orderId, bidId);
        Alert.alert('Rider Selected', 'The rider has been notified to start the trip.');
        fetchBids(); // Refresh to show track button
      } else {
        // This is a Dhobi Bid for laundry service
        await orderService.selectBid(orderId, bidId);
        Alert.alert('Bid Selected', 'Proceeding to payment...');
        navigation.navigate('Payment', { 
  orderId, 
  bidId, 
  bid: bids.find(b => b.id === bidId),
  isInsured: order?.isInsured || false
});
      }
    } catch (error) {
      setSelectedBidId(null);
      Alert.alert('Error', 'Could not select bid. Please try again.');
    }
  };

  const openDhobiProfile = (dhobiId) => {
    setSelectedDhobiId(dhobiId);
    setProfileModalVisible(true);
  };

  return (
    <LinearGradient colors={Colors.gradientWhite} style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Available Bids</Text>
            <Text style={styles.headerSub}>ORDER #{orderId}</Text>
          </View>
          {isSyncing && (
            <View style={styles.syncBadge}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.syncText}>New Bid Arrived...</Text>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.orderSummaryLabel}>ORDER #{orderId}</Text>
              <Text style={styles.orderSummaryService}>Laundry Request</Text>
            </View>
            {selectedBidId && (
              <TouchableOpacity 
                style={styles.trackOverlayBtn}
                onPress={() => navigation.navigate('TrackOrder', { orderId })}
              >
                <Text style={styles.trackText}>Track Rider →</Text>
              </TouchableOpacity>
            )}
          </View>
          {order?.clothImageUrl && (
            <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 }}>Your Attached Photo</Text>
              <Image source={{ uri: getImageUrl(order.clothImageUrl) }} style={{ width: '100%', height: 160, borderRadius: BorderRadius.md, backgroundColor: '#E2E8F0' }} />
            </View>
          )}
          <View style={styles.bidsCountRow}>
            <View style={styles.bidsCountBadge}>
              <Ionicons name="pricetag" size={14} color={Colors.primary} />
              <Text style={styles.bidsCountText}>{bids.length} Bids Received</Text>
            </View>
            {selectedBidId && (
              <View style={[styles.bidsCountBadge, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)', marginLeft: 8 }]}>
                <Ionicons name="checkmark-done" size={14} color={Colors.accent} />
                <Text style={[styles.bidsCountText, { color: Colors.accent }]}>Selection Finalized</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : bids.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="hourglass-outline" size={48} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, marginTop: 12 }}>Waiting for dhobis to bid...</Text>
            </View>
          ) : (
            bids.map((bid, i) => {
              const matchesSelected = selectedBidId === bid.id;
              const isLocked = selectedBidId !== null;

              return (
                <TouchableOpacity 
                  key={bid.id} 
                  activeOpacity={0.9}
                  onPress={() => openDhobiProfile(bid.dhobiId)}
                  style={[
                    styles.bidCard, 
                    i === 0 && !isLocked ? styles.bestValue : {},
                    matchesSelected ? styles.selectedCard : {}
                  ]}
                >
                  {matchesSelected ? (
                    <View style={styles.winnerBadge}>
                      <Ionicons name="ribbon" size={11} color="#fff" />
                      <Text style={styles.bestBadgeText}>CHOSEN WINNER</Text>
                    </View>
                  ) : i === 0 && !isLocked ? (
                    <View style={styles.bestBadge}>
                      <Ionicons name="trophy" size={11} color="#fff" />
                      <Text style={styles.bestBadgeText}>Best Offer</Text>
                    </View>
                  ) : null}

                  <View style={styles.bidHeader}>
                    <LinearGradient colors={matchesSelected ? Colors.gradientAccent : Colors.gradientPrimary} style={styles.dhobiAvatar}>
                      <Text style={styles.dhobiAvatarText}>{(bid.dhobiName || 'D').charAt(0)}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <View style={styles.dhobiNameRow}>
                        <Text style={styles.dhobiName}>{bid.dhobiName}</Text>
                        {bid.dhobiType === 2 && (
                          <View style={styles.premiumBadge}>
                            <Ionicons name="diamond" size={10} color="#fff" />
                            <Text style={styles.premiumText}>PREMIUM PARTNER</Text>
                          </View>
                        )}
                        <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
                      </View>
                      <View style={styles.ratingRow}>
                        {bid.dhobiReviewsCount > 0 ? (
                          <>
                            <Ionicons name="star" size={13} color={Colors.warning} />
                            <Text style={styles.ratingText}>
                              {bid.isRider ? 'Logistics Professional' : (bid.dhobiRating ? `${bid.dhobiRating.toFixed(1)} Rating` : 'New Partner')}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="shield-checkmark" size={13} color={Colors.primary} />
                            <Text style={styles.ratingText}>
                              {bid.isRider ? 'New Logistics Partner' : 'New Partner / Unrated'}
                            </Text>
                          </>
                        )}
                      </View>
                      {bid.hasOwnRider && (
                        <View style={styles.riderBadge}>
                          <Ionicons name="bicycle" size={12} color={Colors.accent} />
                          <Text style={styles.riderBadgeText}>VERIFIED SHOP RIDER</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.priceWrap}>
                      <Text style={styles.price}>Rs. {bid.price}</Text>
                      <Text style={styles.priceLabel}>total</Text>
                    </View>
                  </View>

                  <View style={styles.bidDetails}>
                    {[
                      { icon: 'time-outline', text: `${bid.deliveryDays} days`, color: Colors.warning },
                      { icon: 'location-outline', text: 'Nearby', color: Colors.accent },
                    ].map((d, di) => (
                      <View key={di} style={styles.detailItem}>
                        <Ionicons name={d.icon} size={14} color={d.color} />
                        <Text style={styles.detailText}>{d.text}</Text>
                      </View>
                    ))}
                  </View>

                  {isLocked ? (
                    matchesSelected ? (
                      <TouchableOpacity 
                        style={styles.winnerCta}
                        onPress={() => navigation.navigate('TrackOrder', { orderId })}
                      >
                        <Text style={styles.winnerCtaText}>✓ Your Logistics Partner</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.lockedBtn}>
                        <Text style={styles.lockedBtnText}>Selection Closed</Text>
                      </View>
                    )
                  ) : (
                    <AccentButton
                      title={bid.isRider ? "Accept Delivery Offer" : "Select This Dhobi"}
                      onPress={() => handleSelect(bid.id)}
                      style={{ marginTop: 12 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <DhobiProfileModal 
        visible={profileModalVisible}
        dhobiId={selectedDhobiId}
        onClose={() => setProfileModalVisible(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 24, gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textSecondary },
  orderSummary: { marginHorizontal: Spacing.lg, marginBottom: 20, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  orderSummaryLabel: { fontSize: 11, color: Colors.primary, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  orderSummaryService: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  bidsCountRow: { flexDirection: 'row' },
  bidsCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(108,99,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)' },
  bidsCountText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  bidCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: Colors.cardBorder, position: 'relative' },
  bestValue: { borderColor: Colors.accent, backgroundColor: 'rgba(0,212,170,0.04)' },
  bestBadge: { position: 'absolute', top: -1, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  bestBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  bidHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  dhobiAvatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dhobiAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  dhobiNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  dhobiName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  ratingText: { fontSize: 12, color: Colors.textSecondary },
  speciality: { fontSize: 11, color: Colors.textMuted },
  priceWrap: { alignItems: 'flex-end' },
  price: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  priceLabel: { fontSize: 11, color: Colors.textMuted },
  bidDetails: { flexDirection: 'row', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 12, color: Colors.textSecondary },
  selectedCard: { borderColor: Colors.accent, backgroundColor: 'rgba(16,185,129,0.02)', borderWidth: 2 },
  winnerBadge: { position: 'absolute', top: -1, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  trackOverlayBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  trackText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  winnerCta: { marginTop: 16, backgroundColor: Colors.accent, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  winnerCtaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  lockedBtn: { marginTop: 16, backgroundColor: Colors.surface, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  lockedBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  premiumBadge: { backgroundColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  premiumText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#BAE6FD' },
  syncText: { color: '#0369A1', fontSize: 11, fontWeight: '700' },
  riderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,212,170,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  riderBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.accent, letterSpacing: 0.5 },
});
