import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Switch, ActivityIndicator, Alert, Modal, TextInput, FlatList 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, AppShadows } from '../../theme/typography';
import { PrimaryButton } from '../../components/UIComponents';
import { userService } from '../../services/api';

export default function ManageServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCatalog, setShowCatalog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [addingService, setAddingService] = useState(null);
  
  // Form State
  const [price, setPrice] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      const [servicesResp, catalogResp] = await Promise.all([
        userService.getMyServices(),
        userService.getServiceCatalog()
      ]);
      setServices(servicesResp.data);
      setCatalog(catalogResp.data);
    } catch (error) {
      console.error(error);
      Alert.alert('System Error', 'Could not Manifest the service universe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleService = async (service) => {
    try {
      await userService.updateService(service.id, { 
        price: service.price, 
        isActive: !service.isActive 
      });
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Status Manifestation failed.');
    }
  };

  const handleEditPrice = (service) => {
    setEditingService(service);
    setPrice(service.price.toString());
  };

  const handleAddSelect = (item) => {
    // Check if dhobi already has this service
    if (services.some(s => s.serviceTypeId === item.id)) {
      Alert.alert('Already Managed', `You are already providing ${item.name}!`);
      return;
    }
    setAddingService(item);
    setPrice(item.basePrice.toString());
    setShowCatalog(false);
  };

  const saveService = async () => {
    if (!price || isNaN(price)) {
      Alert.alert('Rate Conflict', 'Please enter a professional numeric value.');
      return;
    }

    setUpdating(true);
    try {
      if (editingService) {
        await userService.updateService(editingService.id, {
          price: parseFloat(price),
          isActive: editingService.isActive
        });
      } else {
        await userService.addService({
          serviceTypeId: addingService.id,
          price: parseFloat(price)
        });
      }
      
      setEditingService(null);
      setAddingService(null);
      fetchData();
      Alert.alert('Manifested', 'Your business portfolio has been physically updated!');
    } catch (err) {
      Alert.alert('Error', 'Adjustment failed to reach the database.');
    } finally {
      setUpdating(false);
    }
  };

  const getCategoryColor = (cat) => {
    switch(cat?.toLowerCase()) {
      case 'cleaning': return '#3B82F6';
      case 'ironing': return '#F59E0B';
      case 'special': return '#8B5CF6';
      default: return Colors.primary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Service Portfolio</Text>
            <Text style={styles.headerSub}>Manage your professional rates and offerings</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.accent} />
            <Text style={styles.infoText}>Platform-guided pricing ensures a fair and competitive marketplace for everyone.</Text>
          </View>

          {services.map((service) => (
            <View key={service.id} style={[styles.serviceCard, !service.isActive && styles.inactiveCard]}>
              <View style={[styles.iconWrap, { backgroundColor: service.isActive ? Colors.primary + '15' : '#F1F5F9' }]}>
                <Ionicons name={service.serviceIcon || 'shirt'} size={24} color={service.isActive ? Colors.primary : Colors.textMuted} />
              </View>
              
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.serviceName, !service.isActive && { color: Colors.textMuted }]}>{service.serviceName}</Text>
                </View>
                
                <TouchableOpacity onPress={() => handleEditPrice(service)} style={styles.priceRow}>
                  <Text style={styles.servicePrice}>Rs. {service.price} / pc</Text>
                  <Ionicons name="create-outline" size={14} color={Colors.primary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>

              <Switch
                value={service.isActive}
                onValueChange={() => toggleService(service)}
                trackColor={{ false: '#E2E8F0', true: Colors.primary + '60' }}
                thumbColor={service.isActive ? Colors.primary : '#94A3B8'}
              />
            </View>
          ))}

          <TouchableOpacity 
            style={styles.addBtnContainer} 
            onPress={() => setShowCatalog(true)}
          >
            <LinearGradient colors={['#fff', '#F8FAFC']} style={styles.addBtn}>
               <Ionicons name="add-circle" size={32} color={Colors.primary} />
               <Text style={styles.addBtnText}>Add New Business Service</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CATALOG PICKER MODAL */}
      <Modal visible={showCatalog} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.catalogSheet}>
            <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Standard Catalog</Text>
               <TouchableOpacity onPress={() => setShowCatalog(false)}>
                 <Ionicons name="close" size={24} color={Colors.textMuted} />
               </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Select a professional category to expand your portfolio</Text>
            
            <FlatList 
              data={catalog}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.catalogItem} onPress={() => handleAddSelect(item)}>
                  <View style={[styles.catalogIcon, { backgroundColor: getCategoryColor(item.category) + '15' }]}>
                    <Ionicons name={item.icon} size={24} color={getCategoryColor(item.category)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catalogName}>{item.name}</Text>
                    <View style={[styles.badge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                       <Text style={[styles.badgeText, { color: getCategoryColor(item.category) }]}>{item.category}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* SETUP / EDIT MODAL */}
      <Modal visible={!!addingService || !!editingService} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.setupCard}>
            <Text style={styles.editTitle}>
              {addingService ? `Onboard ${addingService.name}` : `Adjust ${editingService?.serviceName}`}
            </Text>
            
            {addingService && (
               <View style={styles.platformGuide}>
                  <Ionicons name="information-circle" size={16} color={Colors.primary} />
                  <Text style={styles.guideText}>
                    Platform Standard Rate: <Text style={{ fontWeight: '800' }}>Rs. {addingService.basePrice}/pc</Text>
                  </Text>
               </View>
            )}

            <Text style={styles.inputLabel}>Your Custom Business Rate</Text>
            <View style={styles.inputWrap}>
               <Text style={styles.currencyLabel}>Rs.</Text>
               <TextInput 
                 style={styles.input}
                 value={price}
                 onChangeText={setPrice}
                 keyboardType="numeric"
                 autoFocus
               />
               <Text style={styles.unitLabel}>/ pc</Text>
            </View>

            <View style={styles.modalActions}>
               <TouchableOpacity 
                 style={styles.cancelBtn} 
                 onPress={() => { setAddingService(null); setEditingService(null); }}
               >
                 <Text style={styles.cancelText}>Cancel</Text>
               </TouchableOpacity>
               
               <TouchableOpacity 
                 style={[styles.saveBtn, { backgroundColor: Colors.primary }]} 
                 onPress={saveService}
                 disabled={updating}
               >
                 {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Manifest Service</Text>}
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 64, paddingBottom: 32, gap: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  body: { padding: 20, paddingBottom: 100 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(16,185,129,0.1)' },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', ...AppShadows.card },
  inactiveCard: { opacity: 0.6 },
  iconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  servicePrice: { fontSize: 14, color: Colors.primary, fontWeight: '800' },
  addBtnContainer: { marginTop: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.primary + '30', gap: 12 },
  addBtnText: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  
  // MODALS
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  catalogSheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 13, color: Colors.textMuted, marginBottom: 24 },
  catalogItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  catalogIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  catalogName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  setupCard: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30, paddingBottom: 50 },
  editTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 20 },
  platformGuide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary + '10', padding: 12, borderRadius: 12, marginBottom: 24 },
  guideText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 10, textAlign: 'center' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 30, borderWidth: 1, borderColor: '#E2E8F0' },
  currencyLabel: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginRight: 8 },
  input: { flex: 1, fontSize: 24, fontWeight: '800', color: Colors.primary },
  unitLabel: { fontSize: 14, fontWeight: '600', color: Colors.textMuted, marginLeft: 8 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: 16, backgroundColor: '#F1F5F9' },
  cancelText: { fontWeight: '700', color: Colors.textSecondary },
  saveBtn: { flex: 2, paddingVertical: 16, alignItems: 'center', borderRadius: 16, justifyContent: 'center' },
  saveText: { fontWeight: '800', color: '#fff', fontSize: 16 },
});
