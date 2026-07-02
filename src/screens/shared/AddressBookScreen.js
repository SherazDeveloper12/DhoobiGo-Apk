import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { addressService } from '../../services/api';

export default function AddressBookScreen({ navigation, route }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: 'Home', addressLine: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await addressService.getAll();
      setAddresses(response.data);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!newAddress.addressLine) {
      Alert.alert('Validation Error', 'Please enter an address.');
      return;
    }

    setSaving(true);
    try {
      const response = await addressService.add({
        ...newAddress,
        isDefault: addresses.length === 0
      });
      setAddresses([...addresses, response.data]);
      setModalVisible(false);
      setNewAddress({ label: 'Home', addressLine: '' });
    } catch (error) {
      console.error('Failed to save address:', error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await addressService.delete(id);
      setAddresses(addresses.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete address:', error);
    }
  };

    const { onSelect } = route?.params || {};
    const isSelectionMode = !!onSelect;

    const handleSelect = (item) => {
        if (onSelect) {
            onSelect(item);
            navigation.goBack();
        }
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{isSelectionMode ? 'Select a Place' : 'Saved Places'}</Text>
        </View>
        
        <ScrollView contentContainerStyle={styles.scroll}>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : addresses.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.iconCircle}>
                <Ionicons name="location-outline" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Addresses Yet</Text>
              <Text style={styles.emptyText}>Save your Home or Work address for faster orders.</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.addBtnText}>Add New Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.addressList}>
              {addresses.map((item) => (
                <TouchableOpacity 
                    key={item.id} 
                    style={[styles.addressCard, isSelectionMode && { borderColor: Colors.primary, borderWidth: 1.5, backgroundColor: 'rgba(14,165,233,0.02)' }]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={isSelectionMode ? 0.7 : 1}
                >
                  <View style={styles.addressIcon}>
                    <Ionicons 
                      name={item.label.toLowerCase() === 'home' ? 'home-outline' : 'briefcase-outline'} 
                      size={24} 
                      color={Colors.primary} 
                    />
                  </View>
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressLabel}>{item.label}</Text>
                    <Text style={styles.addressText}>{item.addressLine}</Text>
                  </View>
                  {!isSelectionMode ? (
                    <TouchableOpacity onPress={() => handleDelete(item.id)}>
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-forward-outline" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            <TouchableOpacity style={[styles.addBtn, { marginTop: 20 }]} onPress={() => setModalVisible(true)}>
              <Text style={styles.addBtnText}>+ Add Another</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Address Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Place</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.labelRow}>
              {['Home', 'Work', 'Shop', 'Other'].map(label => (
                <TouchableOpacity 
                  key={label}
                  style={[styles.labelChip, newAddress.label === label && styles.activeChip]}
                  onPress={() => setNewAddress({ ...newAddress, label })}
                >
                  <Text style={[styles.chipText, newAddress.label === label && styles.activeChipText]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter full address or pick on map"
              value={newAddress.addressLine}
              onChangeText={(txt) => setNewAddress({ ...newAddress, addressLine: txt })}
              multiline
            />

            <TouchableOpacity 
              style={styles.mapBtn} 
              onPress={() => {
                setModalVisible(false);
                navigation.navigate('LocationPicker', {
                  onSelect: (data) => {
                    setNewAddress(prev => ({ ...prev, addressLine: data.address }));
                    setModalVisible(true);
                  }
                });
              }}
            >
              <Ionicons name="map-outline" size={20} color={Colors.primary} />
              <Text style={styles.mapBtnText}>Pick on Map (More Precise)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
              onPress={handleSaveAddress}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Address</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff' },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8F9FD', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  scroll: { flexGrow: 1, padding: Spacing.lg },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  iconCircle: { width: 96, height: 96, borderRadius: 32, backgroundColor: 'rgba(14,165,233,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 32, paddingHorizontal: 40, lineHeight: 22 },
  addressList: { gap: 12 },
  addressCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  addressIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(14,165,233,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  addressText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  addBtn: { backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#ffffffff', fontSize: 16, fontWeight: '800' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: Spacing.lg, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  labelRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  labelChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9' },
  activeChip: { backgroundColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  activeChipText: { color: '#fff' },
  input: { backgroundColor: '#F8F9FD', borderRadius: 16, padding: 16, fontSize: 16, color: Colors.textPrimary, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#EDF2F7', marginBottom: 12 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginBottom: 20, backgroundColor: 'rgba(14,165,233,0.05)', borderRadius: 12 },
  mapBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
