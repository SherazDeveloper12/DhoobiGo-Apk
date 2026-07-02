import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { PrimaryButton, OutlineButton } from '../../components/UIComponents';
import { orderService } from '../../services/api';

export default function UpdateStatusScreen({ navigation, route }) {
  const { taskId } = route.params;
  const [order, setOrder] = useState(null);
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [userRole, setUserRole] = useState(null);
  const [canUpdate, setCanUpdate] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        let role = null;
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          role = userData.role;
          setUserRole(role);
        }

        const response = await orderService.getById(taskId);
        const orderData = response.data;
        setOrder(orderData);

        // LOGISTICS GUARDRAILS: Check if current role owns the current leg
        let owner = false;
        const s = orderData.status;

        if (role === 'Rider') {
           owner = ['BidSelected', 'PickupScheduled', 'ReadyForDelivery', 'OutForDelivery'].includes(s);
        } else if (role === 'Dhobi') {
           owner = ['PickedUp', 'InLaundry'].includes(s);
        }
        setCanUpdate(owner);

      } catch (error) {
        Alert.alert('Error', 'Failed to fetch task details.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [taskId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    const s = order.status;
    let nextEntity = "";
    if (userRole === 'Rider') {
        if (s === 'PickedUp') nextEntity = "The Laundry Shop (Dhobi)";
        if (s === 'InLaundry' || s === 'Processing') nextEntity = "The Laundry Shop (Dhobi)";
    } else if (userRole === 'Dhobi') {
        if (s === 'BidSelected' || s === 'PickupScheduled') nextEntity = "The assigned Rider";
        if (s === 'ReadyForDelivery' || s === 'OutForDelivery') nextEntity = "The assigned Rider";
    }

    if (!canUpdate && nextEntity) {
        // Just let them view the screen but block the update button
        return;
    } else if (!canUpdate) {
        return;
    }

    if (step === 1) {
      setStep(2);
      return;
    }
    // ... same logic for photo and upload ...

    if (!image) {
      Alert.alert('Evidence Required', 'Please take a photo for the handover record.');
      return;
    }

    setActionLoading(true);
    try {
      let uploadedUrl = null;
      if (image) {
        const formData = new FormData();
        formData.append('file', {
          uri: image,
          name: `handover_task_${taskId}.jpg`,
          type: 'image/jpeg',
        });

        const uploadResp = await orderService.uploadImage(formData);
        uploadedUrl = uploadResp.data.imageUrl;
      }

      // 2. Map new status precisely by role
      let newStatusInt = -1; // -1 means "Don't update status"
      const s = order.status;

      if (userRole === 'Rider') {
          if (s === 'BidSelected' || s === 'PickupScheduled' || s === 'PendingBidding') {
              newStatusInt = 3; // -> PickedUp
          } else if (s === 'ReadyForDelivery') {
              newStatusInt = 6; // -> OutForDelivery
          } else if (s === 'OutForDelivery') {
              newStatusInt = 7; // -> Completed
          }
      } else if (userRole === 'Dhobi') {
          if (s === 'PickedUp') {
              newStatusInt = 4; // -> InLaundry
          } else if (s === 'InLaundry' || s === 'Processing') {
              newStatusInt = 5; // -> ReadyForDelivery
          }
      }

      // Safeguard: If we don't have a valid next state, don't call the API
      if (newStatusInt === -1) {
          console.warn('[LOGISTICS ERROR] No valid state transition found for status:', s);
          Alert.alert('Process Error', 'This task cannot be updated in its current state.');
          return;
      }

      await orderService.updateStatus(taskId, { 
        status: newStatusInt, 
        proofImageUrl: uploadedUrl 
      });
      
      Alert.alert('Success', 'Clothes Collected from Customer Successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('System Error', 'Failed to process update.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // LOGISTICS TERMINOLOGY: Who are we visiting right now?
  const s = order.status;
  let destinationName = "Marketplace";
  let destinationAddress = "Not Provided";
  let targetType = "Customer"; // Default to Customer

  if (userRole === 'Rider') {
    if (['BidSelected', 'PickupScheduled', 'PendingBidding'].includes(s)) {
        destinationName = order.customerName || 'Customer';
        destinationAddress = order.pickupAddress || 'No Address Provided';
        targetType = "Customer";
    } else if (s === 'PickedUp') {
        destinationName = order.dhobiName || 'Laundry Shop';
        destinationAddress = order.dhobiAddress || 'No Shop Address Provided';
        targetType = "Dhobi";
    } else if (s === 'ReadyForDelivery') {
        destinationName = order.dhobiName || 'Laundry Shop';
        destinationAddress = order.dhobiAddress || 'No Shop Address Provided';
        targetType = "Dhobi";
    } else if (s === 'OutForDelivery') {
        destinationName = order.customerName || 'Customer';
        destinationAddress = order.pickupAddress || 'No Address Provided';
        targetType = "Customer";
    }
  } else if (userRole === 'Dhobi') {
    destinationName = order.customerName || 'Customer';
    destinationAddress = order.pickupAddress || 'Customer Address';
    targetType = "Customer";
  }

  const isPickupFromCustomer = ['BidSelected', 'PickupScheduled'].includes(s) && userRole === 'Rider';
  const isDhobiReceiving = s === 'PickedUp' && userRole === 'Dhobi';
  const isRiderReturning = s === 'ReadyForDelivery' && userRole === 'Rider';

  const getStepContent = () => {
    if (step === 1) {
      let arrivalTitle = "Arrival at Destination";
      let arrivalSub = `Confirm you are at the location to start the handover.`;

      if (userRole === 'Rider') {
        if (s === 'BidSelected' || s === 'PickupScheduled') {
          arrivalTitle = "Arrived at Customer";
          arrivalSub = `Confirm you are at ${destinationName}'s location to pick up the order.`;
        } else if (s === 'PickedUp') {
          arrivalTitle = "Arrived at Laundry Shop";
          arrivalSub = `Confirm you are at ${destinationName} to drop off the clothes for washing.`;
        } else if (s === 'ReadyForDelivery') {
          arrivalTitle = "Back at Laundry Shop";
          arrivalSub = `Confirm you are at ${destinationName} to collect the clean clothes.`;
        } else if (s === 'OutForDelivery') {
          arrivalTitle = "Arrived at Customer";
          arrivalSub = `Confirm you are at ${destinationName}'s home for final delivery.`;
        }
      } else if (userRole === 'Dhobi') {
        arrivalTitle = "Ready for Handover";
        arrivalSub = `Confirm the Rider has arrived at your shop.`;
      }

      return {
        title: arrivalTitle,
        sub: arrivalSub,
        icon: 'location-outline',
        color: Colors.primary
      };
    }
    
    if (isPickupFromCustomer) {
      return {
        title: 'Evidence: Customer Pickup',
        sub: `Take a clear photo of the clothes received from ${destinationName}.`,
        icon: 'camera-outline',
        color: Colors.accent
      };
    }

    if (isDhobiReceiving) {
      return {
        title: 'Evidence: Shop Intake',
        sub: 'Take a photo of the clothes. "I confirm that I have received these clothes from the Rider."',
        icon: 'shield-checkmark-outline',
        color: Colors.accent
      };
    }

    if (s === 'InLaundry' && userRole === 'Dhobi') {
      return {
        title: 'Evidence: Wash Complete',
        sub: 'Take a photo of the clean, folded clothes. This notifies the Rider to come pick them up.',
        icon: 'checkmark-circle-outline',
        color: Colors.primary
      };
    }

    if (isRiderReturning) {
      return {
        title: 'Evidence: Shop Pickup',
        sub: `Take a photo of the clean clothes received from ${destinationName}.`,
        icon: 'shirt-outline',
        color: Colors.primary
      };
    }

    if (s === 'OutForDelivery' && userRole === 'Rider') {
      return {
        title: 'Evidence: Final Delivery',
        sub: `Take a photo of the clothes delivered to ${destinationName} to complete the order.`,
        icon: 'home-outline',
        color: Colors.success || '#10B981'
      };
    }

    return {
        title: 'Handover Evidence',
        sub: 'Take a photo of the clothes to record this handover.',
        icon: 'camera-outline',
        color: Colors.primary
    };
  };

  const content = getStepContent();

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {s === 'BidSelected' || s === 'PickupScheduled' ? 'Rider Pickup' : 
                 (s === 'PickedUp' && userRole === 'Rider') ? 'Dropping to Shop' :
                 (s === 'PickedUp' && userRole === 'Dhobi') ? 'Dhobi Intake' :
                 (s === 'InLaundry') ? 'Laundry in Progress' :
                 (s === 'ReadyForDelivery') ? 'Order Dispatch' : 'Final Delivery'}
              </Text>
              <Text style={styles.headerSub}>ORDER #{order.id}</Text>
            </View>
            <TouchableOpacity 
              style={styles.chatHeaderBtn}
              onPress={() => navigation.navigate('ChatRoom', { 
                chat: { 
                  name: order.customerName || 'Customer', 
                  role: 'Customer', 
                  initial: (order.customerName || 'C').charAt(0),
                  id: `${order.id}_Rider`,
                  orderId: order.id.toString()
                } 
              })}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.body}>
            <View style={styles.customerCard}>
              <View style={styles.customerHeader}>
                <View style={[styles.avatarMini, { backgroundColor: targetType === 'Dhobi' ? Colors.primary : Colors.accent }]}>
                    <Ionicons name={targetType === 'Dhobi' ? "shirt-outline" : "person-outline"} size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{targetType === 'Dhobi' ? 'Deliver to Shop:' : 'Go to Customer:'} {destinationName}</Text>
                  <Text style={styles.address}>{destinationAddress}</Text>
                </View>
                {isDhobiReceiving && (
                  <View style={styles.dhobiBadge}>
                    <Text style={styles.dhobiBadgeText}>Receiving Clothes</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.stepperCard}>
              <Text style={styles.stepperTitle}>{isPickupFromCustomer ? 'Step 1: Arrival' : 'Step 1: Delivery'}</Text>
              
              <View style={styles.stepsRow}>
                {[
                  { label: 'Arrival', icon: 'location' },
                  { label: 'Photo', icon: 'camera' },
                  { label: 'Done', icon: 'checkmark-done' }
                ].map((st, i) => (
                  <View key={i} style={styles.stepItem}>
                    <View style={[styles.stepIcon, step > i ? styles.stepIconDone : {}, step === i + 1 ? styles.stepIconActive : {}]}>
                      <Ionicons name={step > i + 1 ? 'checkmark' : st.icon} size={16} color={step > i ? '#fff' : Colors.textMuted} />
                    </View>
                    <Text style={[styles.stepLabel, step === i + 1 ? styles.stepLabelActive : {}]}>{st.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.contentArea}>
                <View style={styles.stepContent}>
                  {step === 2 && image ? (
                    <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center' }}>
                        <Image source={{ uri: image }} style={styles.previewImage} />
                        <Text style={styles.retakeText}>Change Photo</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <Ionicons name={content.icon} size={48} color={content.color} />
                      <Text style={styles.contentText}>{content.title}</Text>
                      <Text style={styles.contentSub}>{content.sub}</Text>
                      
                      {step === 2 && !image && (
                        <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
                            <Ionicons name="camera" size={24} color={Colors.textMuted} />
                            <Text style={styles.photoText}>Take a Photo</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>

              <PrimaryButton
                title={
                  !canUpdate ? 'Waiting for Partner' :
                  step === 1 ? 'Confirm Arrival' : 
                  (s === 'BidSelected' || s === 'PickupScheduled' ? 'Clothes Collected' : 
                   s === 'PickedUp' ? 'Handover Complete' :
                   s === 'InLaundry' ? 'Wash Complete' :
                   s === 'ReadyForDelivery' ? 'Clothes Received' : 'Order Delivered')
                }
                onPress={handleUpdate}
                loading={actionLoading}
                style={{ marginTop: 20, opacity: canUpdate ? 1 : 0.6 }}
                disabled={!canUpdate}
              />
            </View>
          </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 24, gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  chatHeaderBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: 100, paddingTop: 20 },
  customerCard: { backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  customerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarMini: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  address: { fontSize: 12, color: Colors.textSecondary },
  dhobiBadge: { backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  dhobiBadgeText: { fontSize: 10, fontWeight: '800', color: '#10B981', textTransform: 'uppercase' },
  stepperCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: 20, borderWidth: 1, borderColor: Colors.cardBorder },
  stepperTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 24, textAlign: 'center' },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, position: 'relative' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.06)' },
  stepIconActive: { borderColor: Colors.primary, backgroundColor: Colors.surface },
  stepIconDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  stepLabelActive: { color: Colors.textPrimary },
  contentArea: { minHeight: 220, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  stepContent: { alignItems: 'center', textAlign: 'center' },
  contentText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginTop: 16, marginBottom: 8 },
  contentSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  photoBox: { width: width * 0.7, height: 140, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(15,23,42,0.1)', marginTop: 20, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  previewImage: { width: width * 0.7, height: 180, borderRadius: BorderRadius.lg, marginBottom: 10 },
  retakeText: { color: Colors.primary, fontWeight: '700', fontSize: 13, textAlign: 'center' }
});
