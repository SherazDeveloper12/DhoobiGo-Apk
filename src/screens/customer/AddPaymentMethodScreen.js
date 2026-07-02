import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { paymentService } from '../../services/api';

export default function AddPaymentMethodScreen({ route, navigation }) {
  const { type, brand } = route.params; // 'Card' or 'Wallet'
  const isCard = type === 'Card';

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    number: '',
    expiry: '',
    cvv: '',
    phone: '',
    pin: ''
  });

  const handleSave = async () => {
    // Basic Validation
    if (isCard && (form.number.length < 16 || form.expiry.length < 5)) {
      Alert.alert('Invalid Data', 'Please enter valid card details.');
      return;
    }
    if (!isCard && form.phone.length < 11) {
      Alert.alert('Invalid Data', 'Please enter a valid mobile number.');
      return;
    }

    try {
      setLoading(true);
      
      const payload = isCard ? {
        Brand: brand || 'Visa',
        Last4: form.number.slice(-4),
        ExpiryDate: form.expiry
      } : {
        Brand: brand, // 'Easypaisa' or 'JazzCash'
        Last4: form.phone.slice(-4),
        ExpiryDate: 'Permanent'
      };

      await paymentService.addPaymentMethod(payload);
      
      // Mocked "Verification" delay
      setTimeout(() => {
        setLoading(false);
        Alert.alert('Success', `${brand} linked successfully!`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }, 1500);

    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to link payment method.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Link {brand}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconWrap}>
          <Ionicons 
            name={isCard ? "card" : (brand === 'Easypaisa' ? "wallet" : "phone-portrait")} 
            size={48} 
            color={Colors.primary} 
          />
        </View>

        <Text style={styles.infoText}>
          {isCard 
            ? "Enter your bank card details. We encrypt your data with 256-bit security."
            : `Enter your ${brand} account details to link your wallet.`}
        </Text>

        <View style={styles.form}>
          {isCard ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Card Number</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="0000 0000 0000 0000"
                  keyboardType="numeric"
                  maxLength={16}
                  value={form.number}
                  onChangeText={(t) => setForm({...form, number: t})}
                />
              </View>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Expiry</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="MM/YY"
                    keyboardType="numeric"
                    maxLength={5}
                    value={form.expiry}
                    onChangeText={(t) => setForm({...form, expiry: t})}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>CVV</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="123"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={3}
                    value={form.cvv}
                    onChangeText={(t) => setForm({...form, cvv: t})}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="03XX XXXXXXX"
                  keyboardType="numeric"
                  maxLength={11}
                  value={form.phone}
                  onChangeText={(t) => setForm({...form, phone: t})}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Account PIN</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="XXXX"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={5}
                  value={form.pin}
                  onChangeText={(t) => setForm({...form, pin: t})}
                />
              </View>
            </>
          )}

          <TouchableOpacity 
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Link {brand}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.securityBox}>
          <Ionicons name="shield-checkmark" size={18} color="#10B981" />
          <Text style={styles.securityText}>Secured by DhoobiGO Bank-Grade Encryption</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8F9FD', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  scroll: { padding: Spacing.lg },
  iconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(14,165,233,0.05)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  infoText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 20 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginLeft: 4 },
  input: { backgroundColor: '#F8F9FD', borderRadius: 16, padding: 18, fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: '#F1F5F9' },
  row: { flexDirection: 'row', gap: 16 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, elevation: 4 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  securityBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, opacity: 0.8 },
  securityText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
});
