import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, AppShadows } from '../../theme/typography';
import { PrimaryButton } from '../../components/UIComponents';
import MapComponent from '../../components/MapComponent';
import axios from 'axios';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { orderService } from '../../services/api';
import { useCallback, useEffect } from 'react';

const services = [
  { id: 1, name: 'Washing', icon: 'water', color: Colors.primary },
  { id: 2, name: 'Ironing', icon: 'flash', color: Colors.warning },
  { id: 3, name: 'Dry Cleaning', icon: 'star', color: Colors.accent },
  { id: 4, name: 'Blanket', icon: 'bed', color: '#FF6B9D' },
  { id: 5, name: 'Washing + Ironing', icon: 'checkmark-done', color: '#A78BFA' },
  { id: 6, name: 'Heavy Items', icon: 'bag', color: '#FB923C' },
];


export default function CreateOrderScreen({ navigation }) {
  const [selectedServices, setSelectedServices] = useState([]);
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [coords, setCoords] = useState(null);
  const [currentRegion, setCurrentRegion] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);
  const [image, setImage] = useState(null);
  const [isInsured, setIsInsured] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to pick your pickup point automatically.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const currentObj = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCoords(currentObj);
      setCurrentRegion({
        ...currentObj,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  const fetchSuggestions = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      // OpenStreetMap Nominatim API
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`, {
        headers: { 'User-Agent': 'DhoobiGO-App' }
      });
      const data = await response.json();
      setSuggestions(data.map(item => ({
        id: item.place_id,
        label: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      })));
    } catch (e) {
      console.warn('Search failed:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleAddressChange = (text) => {
    setAddress(text);
    if (searchTimer) clearTimeout(searchTimer);
    setSearchTimer(setTimeout(() => fetchSuggestions(text), 600));
  };

  const handleSuggestionSelect = (item) => {
    setAddress(item.label);
    const newCoords = { latitude: item.lat, longitude: item.lon };
    setCoords(newCoords);
    setCurrentRegion({
      ...newCoords,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
    setSuggestions([]);
  };

  const handleCurrentLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`, {
        headers: { 'User-Agent': 'DhoobiGO-App' }
      });
      const data = await response.json();
      const addr = data.address || {};
      const cleanAddress = [
        addr.road,
        addr.neighbourhood || addr.suburb || addr.residential,
        addr.city || addr.town || addr.village
      ].filter(Boolean).join(', ') || data.display_name;
      
      setAddress(cleanAddress);
      setCoords({ latitude, longitude });
    } catch (e) {
      Alert.alert('Error', 'Could not fetch current location.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickLocation = async () => {
    if (!currentRegion) return;
    setLoading(true);
    try {
      const { latitude, longitude } = currentRegion;
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`, {
        headers: { 'User-Agent': 'DhoobiGO-App' }
      });
      const data = await response.json();
      const addr = data.address || {};
      const cleanAddress = [
        addr.road,
        addr.neighbourhood || addr.suburb || addr.residential,
        addr.city || addr.town || addr.village
      ].filter(Boolean).join(', ') || data.display_name;

      setAddress(cleanAddress);
      setCoords({ latitude, longitude });
      Alert.alert('Location Set', 'Your pickup address has been updated based on the map center.');
    } catch (e) {
      Alert.alert('Error', 'Could not get address for this location.');
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (id) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

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

  const handleSubmit = async () => {
    if (!selectedServices.length || !address || !quantity) {
      Alert.alert('Incomplete', 'Please select services, quantity, and address.');
      return;
    }

    if (!image) {
      Alert.alert('Required', 'Please take a picture of your clothes to proceed. This helps Dhobis give you an accurate bid.');
      return;
    }

    if (!coords) {
      Alert.alert(
        'Location Not Pinned', 
        'Please confirm your location on the map by tapping "Pick This Location" or selecting an address suggestion.'
      );
      return;
    }
    try {
      // 1. Fetch active orders to prevent duplication
      const activeResp = await orderService.getMyOrders();
      const hasActive = activeResp.data.some(o => ['PendingBidding', 'BidSelected'].includes(o.status));
      
      if (hasActive) {
        setLoading(false);
        Alert.alert(
          'Active Request Found',
          'You already have a marketplace discovery in progress. Please complete or cancel your current request before posting another.',
          [{ text: 'View Active Order', onPress: () => navigation.navigate('CustomerTabs', { screen: 'Dashboard' }) }]
        );
        return;
      }

      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        Alert.alert('Error', 'User session not found.');
        navigation.replace('Login');
        return;
      }
      
      const { userId } = JSON.parse(userDataStr);
      const selectedNames = services
        .filter(s => selectedServices.includes(s.id))
        .map(s => s.name)
        .join(', ');

      let uploadedUrl = null;
      if (image) {
        const formData = new FormData();
        formData.append('file', {
          uri: image,
          name: `order_cloths_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        const uploadResp = await orderService.uploadImage(formData);
        uploadedUrl = uploadResp.data.imageUrl;
      }

      const response = await orderService.create({
        serviceDescription: `${selectedNames}${instructions ? ' - ' + instructions : ''}`,
        itemsCount: parseInt(quantity),
        pickupAddress: address,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        customerId: userId,
        clothImageUrl: uploadedUrl,
        isInsured: isInsured
      });

      setLoading(false);
      Alert.alert(
        'Order Posted',
        'Your order has been posted! Dhobis will start bidding soon.',
        [{ text: 'View Bids', onPress: () => navigation.navigate('ViewBids', { orderId: response.data.id }) }]
      );
    } catch (error) {
      setLoading(false);
      const data = error.response?.data;
      const msg = data?.Message || data?.message || (typeof data === 'string' ? data : null) || 'Failed to create order. Please check your connection.';
      Alert.alert('Error', msg);
    }
  };

  return (
    <LinearGradient colors={Colors.gradientWhite} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Create Order</Text>
            <Text style={styles.headerSub}>Dhobis will bid on your request</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Service Type */}
          <Text style={styles.sectionLabel}>Select Services</Text>
          <View style={styles.servicesGrid}>
            {services.map((s) => {
              const active = selectedServices.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => toggleService(s.id)}
                  style={[styles.serviceCard, active && { borderColor: s.color, backgroundColor: s.color + '18' }]}
                >
                  <View style={[styles.serviceIconWrap, { backgroundColor: s.color + '22' }]}>
                    <Ionicons name={s.icon} size={22} color={s.color} />
                  </View>
                  <Text style={[styles.serviceLabel, active && { color: s.color }]}>{s.name}</Text>
                  {active && (
                    <View style={[styles.checkMark, { backgroundColor: s.color }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quantity */}
          <Text style={styles.sectionLabel}>Number of Items</Text>
          <View style={styles.inputCard}>
            <TextInput 
              style={styles.quantityInput} 
              placeholder="e.g. 15" 
              value={quantity} 
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
          </View>

          {/* Insurance Card */}
          <View style={[styles.insuranceCard, isInsured && { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' }]}>
            <View style={styles.insuranceHeader}>
              <View style={[styles.insuranceIcon, { backgroundColor: isInsured ? Colors.primary : Colors.textMuted + '22' }]}>
                <Ionicons name="shield-checkmark" size={20} color={isInsured ? '#fff' : Colors.textMuted} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.insuranceTitle}>Order Insurance</Text>
                <Text style={styles.insuranceText}>Secure your clothes up to Rs. 5,000 against damage or loss.</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsInsured(!isInsured)}
                style={[styles.toggleBase, isInsured && { backgroundColor: Colors.primary }]}
              >
                <View style={[styles.toggleDot, isInsured && { alignSelf: 'flex-end' }]} />
              </TouchableOpacity>
            </View>
            <View style={styles.insuranceFooter}>
  <Text style={styles.insurancePriceText}>Cost: <Text style={{ fontWeight: 'bold' }}>10% of final bid amount</Text></Text>
  <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
</View>
          </View>

          {/* Address Label with Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
            <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Pickup Address</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={styles.actionLink}
                onPress={() => navigation.navigate('AddressBook', { 
                  onSelect: (item) => {
                    setAddress(item.addressLine);
                    // Since address book only has text, we fetch suggestions to get coords
                    fetchSuggestions(item.addressLine);
                  }
                })}
              >
                <Ionicons name="journal-outline" size={14} color={Colors.primary} />
                <Text style={styles.actionLinkText}>Address Book</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionLink} onPress={handleCurrentLocation}>
                <Ionicons name="navigate-outline" size={14} color={Colors.accent} />
                <Text style={[styles.actionLinkText, { color: Colors.accent }]}>Current</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Address suggestions list */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(item)}
                >
                  <Ionicons name="location-sharp" size={16} color={Colors.primary} />
                  <Text style={styles.suggestionText} numberOfLines={2}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Map Preview */}
          <View style={styles.mapContainer}>
            <MapComponent 
              pickupLocation={coords} 
              onLocationChange={setCurrentRegion}
            />
            {!coords && (
              <View style={styles.mapOverlay}>
                <Ionicons name="map-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.mapOverlayText}>
                  Set location using the map or search above
                </Text>
              </View>
            )}
            
            {/* Pick Location Button on Map */}
            <TouchableOpacity 
              style={styles.pickLocationBtn}
              onPress={handlePickLocation}
            >
              <LinearGradient colors={[Colors.accent, '#10B981']} style={styles.pickLocationGradient}>
                <Ionicons name="pin" size={16} color="#fff" />
                <Text style={styles.pickLocationText}>Pick This Location</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Cloth Image Upload (Mandatory) */}
          <Text style={styles.sectionLabel}>Photo of Clothes <Text style={{ color: Colors.accent }}>*</Text></Text>
          <View style={styles.photoContainer}>
            {image ? (
              <TouchableOpacity onPress={pickImage} style={{ width: '100%' }}>
                <View style={{ width: '100%', height: 180, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 2, borderColor: Colors.primary }}>
                  <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} />
                  <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Tap to retake photo</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
                <Ionicons name="camera-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.photoText}>Tap to take a picture of the clothes</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Special Instructions */}
          <Text style={styles.sectionLabel}>Special Instructions (Optional)</Text>
          <View style={[styles.inputWrap, { height: 'auto', paddingVertical: 14, alignItems: 'flex-start' }]}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} style={[styles.inputIcon, { marginTop: 2 }]} />
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              placeholder="e.g. Handle with care, delicate fabric..."
              placeholderTextColor={Colors.textMuted}
              value={instructions}
              onChangeText={setInstructions}
              multiline={true}
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="bulb-outline" size={16} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoText}>Multiple Dhobis will place competitive bids. You choose the best one!</Text>
              <Text style={[styles.infoText, { marginTop: 4, fontSize: 11, fontWeight: '700', color: Colors.primary }]}>
                <Ionicons name="shield-checkmark" size={10} /> 7% platform security commission applies to ensure verified handovers.
              </Text>
            </View>
          </View>

          <PrimaryButton
            title="Post for Bidding"
            onPress={handleSubmit}
            loading={loading}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: 24, gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginBottom: 12, marginTop: 20 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard: {
    width: '47%', backgroundColor: Colors.card, borderRadius: BorderRadius.lg,
    padding: 16, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.cardBorder,
    position: 'relative',
  },
  serviceIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  checkMark: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.cardBorder, paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 0 },
  addressRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 6 },
  searchBtn: { width: 56, height: 60, borderRadius: BorderRadius.md, overflow: 'hidden' },
  searchGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapContainer: { height: 260, marginTop: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: '#f1f5f9' },
  mapOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(248,250,252,0.95)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  mapOverlayText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  inputCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  quantityInput: { fontSize: 24, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  insuranceCard: {
    marginTop: 20, padding: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.cardBorder, backgroundColor: Colors.card
  },
  insuranceHeader: { flexDirection: 'row', alignItems: 'center' },
  insuranceIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  insuranceTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  insuranceText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  toggleBase: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', padding: 2 },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  insuranceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  insurancePriceText: { fontSize: 13, color: Colors.textPrimary },
  suggestionsContainer: {
    backgroundColor: '#fff', borderRadius: 12, marginTop: -8, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.cardBorder, ...AppShadows.card, zIndex: 10
  },
  suggestionItem: { flexDirection: 'row', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  suggestionText: { fontSize: 13, color: Colors.textPrimary, flex: 1 },
  pickLocationBtn: { position: 'absolute', bottom: 12, right: 12, borderRadius: 12, overflow: 'hidden', elevation: 5 },
  pickLocationGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  pickLocationText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(0,212,170,0.08)', borderRadius: BorderRadius.md,
    padding: 14, marginTop: 20, borderWidth: 1, borderColor: 'rgba(0,212,170,0.2)',
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  actionLink: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(14,165,233,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionLinkText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  photoContainer: { marginTop: 4, marginBottom: 12 },
  photoBox: { width: '100%', height: 120, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(15,23,42,0.1)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
});
